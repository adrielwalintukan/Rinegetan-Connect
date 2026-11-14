-- supabase/migrations/20261102000000_p3_005_prayer_visit.sql
-- P3-005: private prayer requests and visit notices; written only by the server routes with the service key.
alter table public.form_rate_events drop constraint form_rate_events_form_check;
alter table public.form_rate_events add constraint form_rate_events_form_check
  check (form in ('study_interest', 'study_interest_attempt', 'prayer', 'prayer_attempt', 'visit', 'visit_attempt'));

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null default '' check (char_length(name) <= 100 and name = btrim(name)),
  contact text not null default '' check (
    char_length(contact) <= 254 and contact = btrim(contact)
    and (contact = '' or contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or (contact ~ '^[0-9 +()-]+$' and char_length(regexp_replace(contact, '[^0-9]', '', 'g')) between 8 and 15))
  ),
  request text not null check (char_length(request) between 1 and 2000 and request = btrim(request)),
  wants_contact boolean not null default false,
  status text not null default 'new' check (status in ('new', 'prayed', 'closed')),
  consent_version text not null check (char_length(consent_version) between 1 and 64),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  constraint prayer_requests_contact_for_reply check (not wants_contact or contact <> '')
);
create index prayer_requests_created_at_idx on public.prayer_requests (created_at desc);

create table public.visitor_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  contact text not null check (
    char_length(contact) between 1 and 254 and contact = btrim(contact)
    and (contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or (contact ~ '^[0-9 +()-]+$' and char_length(regexp_replace(contact, '[^0-9]', '', 'g')) between 8 and 15))
  ),
  -- "not in the past" is checked by the route so older rows stay valid.
  visit_date date,
  party_size integer check (party_size between 1 and 20),
  message text not null default '' check (char_length(message) <= 1000 and message = btrim(message)),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  consent_version text not null check (char_length(consent_version) between 1 and 64),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz
);
create index visitor_submissions_created_at_idx on public.visitor_submissions (created_at desc);

-- Shared lifecycle for pastoral rows; TG_ARGV[0] is the immutable-violation message.
-- SECURITY DEFINER reads auth.users to recognise ON DELETE SET NULL cleanup of a removed handler.
create function private.prepare_pastoral_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.status := 'new';
    new.handled_by := null;
    new.handled_at := null;
    new.created_at := now();
    new.consented_at := now();
    return new;
  end if;

  if (to_jsonb(new) - 'handled_by') = (to_jsonb(old) - 'handled_by')
    and new.handled_by is null and old.handled_by is not null
    and not exists (select 1 from auth.users where id = old.handled_by)
  then
    return new;
  end if;

  if (to_jsonb(new) - array['status', 'handled_by', 'handled_at'])
    is distinct from (to_jsonb(old) - array['status', 'handled_by', 'handled_at']) then
    raise check_violation using message = tg_argv[0];
  end if;
  -- Re-sending the current status (retry, stale view) keeps the original handler and time;
  -- the audit trigger records nothing for it either.
  if new.status = old.status then
    new.handled_by := old.handled_by;
    new.handled_at := old.handled_at;
    return new;
  end if;
  new.handled_by := auth.uid();
  new.handled_at := now();
  return new;
end;
$$;

-- Audit carries the status only; TG_ARGV[0] is the action prefix.
create function private.record_pastoral_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status = old.status then
    return new;
  end if;
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    auth.uid(),
    tg_argv[0] || case when tg_op = 'INSERT' then '.created' else '.status_changed' end,
    tg_table_name,
    new.id,
    jsonb_build_object('status', new.status)
  );
  return new;
end;
$$;

revoke all on function private.prepare_pastoral_row() from public, anon, authenticated;
revoke all on function private.record_pastoral_audit() from public, anon, authenticated;
create trigger prayer_requests_prepare before insert or update on public.prayer_requests
for each row execute function private.prepare_pastoral_row('prayer_request_immutable');
create trigger prayer_requests_audit after insert or update on public.prayer_requests
for each row execute function private.record_pastoral_audit('prayer_request');
create trigger visitor_submissions_prepare before insert or update on public.visitor_submissions
for each row execute function private.prepare_pastoral_row('visitor_submission_immutable');
create trigger visitor_submissions_audit after insert or update on public.visitor_submissions
for each row execute function private.record_pastoral_audit('visitor_submission');

-- Supabase default privileges also grant service_role ALL on new tables; narrow it explicitly.
revoke all on table public.prayer_requests from public, anon, authenticated, service_role;
revoke all on table public.visitor_submissions from public, anon, authenticated, service_role;
grant select, update on table public.prayer_requests, public.visitor_submissions to authenticated;
grant insert on table public.prayer_requests, public.visitor_submissions to service_role;
alter table public.prayer_requests enable row level security;
alter table public.visitor_submissions enable row level security;

create policy prayer_requests_admin_select on public.prayer_requests for select to authenticated
using ((select private.is_admin()));
create policy prayer_requests_admin_update on public.prayer_requests for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
create policy visitor_submissions_admin_select on public.visitor_submissions for select to authenticated
using ((select private.is_admin()));
create policy visitor_submissions_admin_update on public.visitor_submissions for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
