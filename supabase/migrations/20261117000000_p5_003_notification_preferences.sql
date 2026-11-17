-- supabase/migrations/20261117000000_p5_003_notification_preferences.sql
-- P5-003: notification category preferences without a Member account.
--
-- Owner decision 2026-11-17: the subscription identity is the device/browser push
-- subscription, not a person. No email, phone number or display name is stored, so
-- there is nothing to join back to a jemaat. `endpoint` is the identity and is unique.
--
-- The server routes hold the service key and are the only writers. No role reads the
-- push secrets directly: everything goes through SECURITY DEFINER functions so a
-- compromised staff session cannot dump every device's keys.

-- The routes call check_form_rate with their own form names, so the allow-list from
-- P3-005 has to include them. Without this every notification request would fail the
-- constraint and return 500 instead of a rate-limit answer.
alter table public.form_rate_events drop constraint form_rate_events_form_check;
alter table public.form_rate_events add constraint form_rate_events_form_check
  check (form in (
    'study_interest', 'study_interest_attempt',
    'prayer', 'prayer_attempt',
    'visit', 'visit_attempt',
    'notification_subscribe', 'notification_stop'
  ));

-- Duplicate detection needs a helper: a CHECK constraint cannot contain a subquery.
create function private.notification_categories_unique(p_categories text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_categories) = (select count(distinct value) from unnest(p_categories) as value);
$$;
-- A CHECK constraint runs with the inserting role's privileges, so service_role keeps
-- execute and USAGE on the schema. Without these every insert fails with 42501 before the
-- constraint is even evaluated (this was caught in CI, not locally).
revoke all on function private.notification_categories_unique(text[]) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.notification_categories_unique(text[]) to service_role;

create table public.notification_subscriptions (
  endpoint text primary key check (
    char_length(endpoint) between 1 and 2048
    and endpoint = btrim(endpoint)
    and endpoint ~ '^https://'
  ),
  p256dh text not null check (char_length(p256dh) between 1 and 512 and p256dh = btrim(p256dh)),
  auth text not null check (char_length(auth) between 1 and 512 and auth = btrim(auth)),
  -- Allowed categories are fixed here so a typo cannot invent a category nobody sends.
  categories text[] not null check (
    cardinality(categories) between 1 and 4
    and categories <@ array['pengumuman', 'ibadah', 'pelajari-alkitab', 'sekolah-sabat']::text[]
    and private.notification_categories_unique(categories)
  ),
  consent_version text not null check (char_length(consent_version) between 1 and 64),
  consented_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The consent log keeps what changed, never who changed it.
create table public.notification_consent_log (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null,
  enabled_categories text[] not null,
  consent_version text not null check (char_length(consent_version) between 1 and 64),
  recorded_at timestamptz not null default now()
);
create index notification_consent_log_recorded_at_idx on public.notification_consent_log (recorded_at desc);

-- Subscribing or changing categories always appends an audit row in the same transaction.
create function private.record_notification_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_consent_log (endpoint, enabled_categories, consent_version)
  values (new.endpoint, new.categories, new.consent_version);
  return new;
end;
$$;
revoke all on function private.record_notification_consent() from public, anon, authenticated, service_role;
create trigger notification_subscriptions_consent after insert or update of categories on public.notification_subscriptions
for each row execute function private.record_notification_consent();

-- A category change replaces the set and refreshes the timestamp.
create function private.touch_notification_subscription()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.consented_at := now();
  return new;
end;
$$;
revoke all on function private.touch_notification_subscription() from public, anon, authenticated, service_role;
create trigger notification_subscriptions_touch before update on public.notification_subscriptions
for each row execute function private.touch_notification_subscription();

-- Route-facing functions. All three are SECURITY DEFINER so no role needs table access.
create function public.update_notification_categories(
  p_endpoint text,
  p_categories text[],
  p_consent_version text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_subscriptions
     set categories = p_categories,
         consent_version = p_consent_version
   where endpoint = p_endpoint;
  if not found then
    raise no_data_found using message = 'notification_subscription_missing';
  end if;
end;
$$;

-- Stop-all removes the row: there is no such thing as a subscription with no categories.
create function public.stop_notification_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_categories text[];
  v_version text;
begin
  delete from public.notification_subscriptions
   where endpoint = p_endpoint
   returning categories, consent_version into v_categories, v_version;
  if not found then
    return;
  end if;
  -- The AFTER trigger does not fire on delete, so the stop is logged explicitly.
  insert into public.notification_consent_log (endpoint, enabled_categories, consent_version)
  values (p_endpoint, array[]::text[], v_version);
end;
$$;

-- Which devices should receive a category. Used by the sender in P5-004.
create function public.notification_recipients(p_category text)
returns table (endpoint text, p256dh text, auth text)
language sql
security definer
set search_path = ''
as $$
  select s.endpoint, s.p256dh, s.auth
    from public.notification_subscriptions s
   where p_category = any (s.categories);
$$;

-- Supabase default privileges also grant service_role ALL on new tables; narrow it explicitly.
revoke all on table public.notification_subscriptions from public, anon, authenticated, service_role;
revoke all on table public.notification_consent_log from public, anon, authenticated, service_role;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_consent_log enable row level security;

-- The routes need to insert a subscription; reads go through the functions above.
grant insert on table public.notification_subscriptions to service_role;

revoke all on function public.update_notification_categories(text, text[], text) from public, anon, authenticated;
revoke all on function public.stop_notification_subscription(text) from public, anon, authenticated;
revoke all on function public.notification_recipients(text) from public, anon, authenticated;
grant execute on function public.update_notification_categories(text, text[], text) to service_role;
grant execute on function public.stop_notification_subscription(text) to service_role;
grant execute on function public.notification_recipients(text) to service_role;
