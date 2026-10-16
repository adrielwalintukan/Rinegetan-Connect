create type public.staff_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 120)
    check (display_name = btrim(display_name)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  request_id uuid,
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  occurred_at timestamptz not null default now()
);

create index audit_logs_actor_occurred_at_idx
  on public.audit_logs (actor_id, occurred_at desc);

create index audit_logs_entity_occurred_at_idx
  on public.audit_logs (entity_type, entity_id, occurred_at desc);

create schema if not exists private;
revoke all on schema private from public;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger staff_roles_set_updated_at
before update on public.staff_roles
for each row execute function private.set_updated_at();

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles as staff_role
    join public.profiles as profile on profile.id = staff_role.user_id
    where staff_role.user_id = (select auth.uid())
      and staff_role.role = 'admin'::public.staff_role
      and profile.is_active
  );
$$;

create function private.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles as staff_role
    join public.profiles as profile on profile.id = staff_role.user_id
    where staff_role.user_id = (select auth.uid())
      and staff_role.role in ('admin'::public.staff_role, 'editor'::public.staff_role)
      and profile.is_active
  );
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_editor_or_admin() from public;

grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_editor_or_admin() to authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

revoke all on table public.profiles, public.staff_roles, public.audit_logs from anon, authenticated;
grant select on table public.profiles, public.staff_roles, public.audit_logs to authenticated;

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_authenticated on public.profiles
for select to authenticated
using (
  (id = (select auth.uid()) and (select private.is_editor_or_admin()))
  or (select private.is_admin())
);

create policy staff_roles_select_authenticated on public.staff_roles
for select to authenticated
using (
  (user_id = (select auth.uid()) and (select private.is_editor_or_admin()))
  or (select private.is_admin())
);

create policy audit_logs_select_admin on public.audit_logs
for select to authenticated
using ((select private.is_admin()));
