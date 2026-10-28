-- supabase/migrations/20261026000000_p3_004_study_interest.sql
-- P3-004: private study-interest leads; written only by the server route with the service key.
create table public.study_interest_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100 and name = btrim(name)),
  contact text not null check (
    char_length(contact) between 1 and 254 and contact = btrim(contact)
    and (contact ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      or (contact ~ '^[0-9 +()-]+$' and char_length(regexp_replace(contact, '[^0-9]', '', 'g')) between 8 and 15))
  ),
  message text not null default '' check (char_length(message) <= 1000 and message = btrim(message)),
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  consent_version text not null check (char_length(consent_version) between 1 and 64),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz
);
create index study_interest_leads_created_at_idx on public.study_interest_leads (created_at desc);

create table public.form_rate_events (
  id bigint generated always as identity primary key,
  form text not null check (form in ('study_interest', 'study_interest_attempt')),
  ip_hash text not null check (ip_hash ~ '^[0-9a-f]{32}$'),
  created_at timestamptz not null default now()
);
create index form_rate_events_lookup_idx on public.form_rate_events (form, ip_hash, created_at);

-- SECURITY DEFINER reads auth.users to recognise ON DELETE SET NULL cleanup of a removed handler.
create function private.prepare_study_interest_lead()
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

  -- ON DELETE SET NULL of a removed handler is the only change allowed besides a status decision.
  if (to_jsonb(new) - 'handled_by') = (to_jsonb(old) - 'handled_by')
    and new.handled_by is null and old.handled_by is not null
    and not exists (select 1 from auth.users where id = old.handled_by)
  then
    return new;
  end if;

  if (to_jsonb(new) - array['status', 'handled_by', 'handled_at'])
    is distinct from (to_jsonb(old) - array['status', 'handled_by', 'handled_at']) then
    raise check_violation using message = 'study_interest_immutable';
  end if;
  new.handled_by := auth.uid();
  new.handled_at := now();
  return new;
end;
$$;

-- Audit carries the status only: names, contacts and messages never reach audit_logs.
create function private.record_study_interest_audit()
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
    case when tg_op = 'INSERT' then 'study_interest.created' else 'study_interest.status_changed' end,
    'study_interest_leads',
    new.id,
    jsonb_build_object('status', new.status)
  );
  return new;
end;
$$;

revoke all on function private.prepare_study_interest_lead() from public, anon, authenticated;
revoke all on function private.record_study_interest_audit() from public, anon, authenticated;
create trigger study_interest_leads_prepare before insert or update on public.study_interest_leads
for each row execute function private.prepare_study_interest_lead();
create trigger study_interest_leads_audit after insert or update on public.study_interest_leads
for each row execute function private.record_study_interest_audit();

-- Sliding-window limiter for public forms; only the server (service_role) may call it.
create function public.check_form_rate(p_form text, p_ip_hash text, p_limit integer, p_window interval)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(p_form || ':' || p_ip_hash));
  delete from public.form_rate_events where form = p_form and created_at < now() - interval '24 hours';
  if (select count(*) from public.form_rate_events
      where form = p_form and ip_hash = p_ip_hash and created_at > now() - p_window) >= p_limit then
    return false;
  end if;
  insert into public.form_rate_events (form, ip_hash) values (p_form, p_ip_hash);
  return true;
end;
$$;
revoke all on function public.check_form_rate(text, text, integer, interval) from public, anon, authenticated;
grant execute on function public.check_form_rate(text, text, integer, interval) to service_role;

-- Supabase default privileges also grant service_role ALL on new tables; narrow it explicitly.
revoke all on table public.study_interest_leads from public, anon, authenticated, service_role;
revoke all on table public.form_rate_events from public, anon, authenticated, service_role;
grant select, update on table public.study_interest_leads to authenticated;
-- form_rate_events is reached only through check_form_rate(), so no role gets direct grants.
grant select, insert, update on table public.study_interest_leads to service_role;
alter table public.study_interest_leads enable row level security;
alter table public.form_rate_events enable row level security;

create policy study_interest_leads_admin_select on public.study_interest_leads for select to authenticated
using ((select private.is_admin()));
create policy study_interest_leads_admin_update on public.study_interest_leads for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
