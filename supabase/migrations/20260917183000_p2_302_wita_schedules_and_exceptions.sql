-- Migration: 20260917183000_p2_302_wita_schedules_and_exceptions.sql
-- Description: Implement weekly recurring schedules and date-specific exceptions with RLS and audit triggers

create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  day_of_week smallint not null,
  start_time time without time zone not null,
  end_time time without time zone,
  timezone text not null default 'Asia/Makassar',
  location text not null default 'Gereja GMAHK Rinegetan',
  description text,
  category text not null default 'Ibadah',
  department_id uuid references public.departments(id) on delete set null,
  status public.content_status not null default 'draft'::public.content_status,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_schedules_day_of_week check (day_of_week between 0 and 6),
  constraint chk_schedules_slug check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint chk_schedules_timezone check (timezone = 'Asia/Makassar'),
  constraint chk_schedules_time_order check (end_time is null or end_time > start_time)
);

create index if not exists idx_schedules_lookup
  on public.schedules (status, day_of_week, position);

create index if not exists idx_schedules_department
  on public.schedules (department_id);

create table if not exists public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references public.schedules(id) on delete cascade,
  exception_date date not null,
  action text not null,
  custom_name text,
  custom_start_time time without time zone,
  custom_end_time time without time zone,
  custom_location text,
  reason text,
  status public.content_status not null default 'published'::public.content_status,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_schedule_exceptions_action check (action in ('cancelled', 'override', 'added')),
  constraint chk_schedule_exceptions_cancelled check (
    action != 'cancelled' or schedule_id is not null
  ),
  constraint chk_schedule_exceptions_override check (
    action != 'override' or (
      schedule_id is not null and (
        custom_name is not null or
        custom_start_time is not null or
        custom_location is not null
      )
    )
  ),
  constraint chk_schedule_exceptions_added check (
    action != 'added' or (
      custom_name is not null and custom_start_time is not null
    )
  ),
  constraint chk_schedule_exceptions_time_order check (
    custom_end_time is null or custom_start_time is null or custom_end_time > custom_start_time
  ),
  constraint uq_schedule_exception_per_schedule_date unique (schedule_id, exception_date)
);

create index if not exists idx_schedule_exceptions_lookup
  on public.schedule_exceptions (exception_date, status);

create index if not exists idx_schedule_exceptions_schedule
  on public.schedule_exceptions (schedule_id, exception_date);

-- Audit trigger function for schedules and exceptions
create or replace function private.record_schedule_mutation_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_action text;
  v_changes jsonb;
  v_entity_id uuid;
begin
  if tg_op = 'INSERT' then
    v_action := tg_table_name || '.created';
    v_entity_id := new.id;
    if tg_table_name = 'schedules' then
      v_changes := jsonb_build_object(
        'name', new.name,
        'slug', new.slug,
        'day_of_week', new.day_of_week,
        'start_time', new.start_time,
        'status', new.status
      );
    else
      v_changes := jsonb_build_object(
        'schedule_id', new.schedule_id,
        'exception_date', new.exception_date,
        'action', new.action,
        'status', new.status
      );
    end if;
  elsif tg_op = 'UPDATE' then
    v_entity_id := new.id;
    v_action := tg_table_name || '.updated';
    if tg_table_name = 'schedules' then
      v_changes := jsonb_build_object(
        'name', new.name,
        'slug', new.slug,
        'day_of_week', new.day_of_week,
        'old_status', old.status,
        'new_status', new.status
      );
    else
      v_changes := jsonb_build_object(
        'schedule_id', new.schedule_id,
        'exception_date', new.exception_date,
        'action', new.action,
        'old_status', old.status,
        'new_status', new.status
      );
    end if;
  elsif tg_op = 'DELETE' then
    v_action := tg_table_name || '.deleted';
    v_entity_id := old.id;
    if tg_table_name = 'schedules' then
      v_changes := jsonb_build_object(
        'name', old.name,
        'slug', old.slug,
        'status', old.status
      );
    else
      v_changes := jsonb_build_object(
        'schedule_id', old.schedule_id,
        'exception_date', old.exception_date,
        'action', old.action,
        'status', old.status
      );
    end if;
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    v_actor_id,
    v_action,
    tg_table_name,
    v_entity_id,
    v_changes
  );

  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$;

-- Triggers for updated_at
create trigger schedules_set_updated_at
before update on public.schedules
for each row execute function private.set_updated_at();

create trigger schedule_exceptions_set_updated_at
before update on public.schedule_exceptions
for each row execute function private.set_updated_at();

-- Triggers for audit logging
create trigger schedules_audit_mutation
after insert or update or delete on public.schedules
for each row execute function private.record_schedule_mutation_audit();

create trigger schedule_exceptions_audit_mutation
after insert or update or delete on public.schedule_exceptions
for each row execute function private.record_schedule_mutation_audit();

-- Grants and RLS configuration
revoke all on table public.schedules, public.schedule_exceptions from public, anon, authenticated;
grant select on table public.schedules, public.schedule_exceptions to anon, authenticated;
grant insert, update, delete on table public.schedules, public.schedule_exceptions to authenticated;

alter table public.schedules enable row level security;
alter table public.schedules force row level security;

alter table public.schedule_exceptions enable row level security;
alter table public.schedule_exceptions force row level security;

-- Policies for public.schedules
create policy schedules_select_policy on public.schedules
for select to anon, authenticated
using (
  status = 'published'::public.content_status
  or (select private.is_editor_or_admin())
);

create policy schedules_insert_policy on public.schedules
for insert to authenticated
with check ((select private.is_editor_or_admin()));

create policy schedules_update_policy on public.schedules
for update to authenticated
using ((select private.is_editor_or_admin()))
with check ((select private.is_editor_or_admin()));

create policy schedules_delete_policy on public.schedules
for delete to authenticated
using ((select private.is_admin()));

-- Policies for public.schedule_exceptions
create policy schedule_exceptions_select_policy on public.schedule_exceptions
for select to anon, authenticated
using (
  status = 'published'::public.content_status
  or (select private.is_editor_or_admin())
);

create policy schedule_exceptions_insert_policy on public.schedule_exceptions
for insert to authenticated
with check ((select private.is_editor_or_admin()));

create policy schedule_exceptions_update_policy on public.schedule_exceptions
for update to authenticated
using ((select private.is_editor_or_admin()))
with check ((select private.is_editor_or_admin()));

create policy schedule_exceptions_delete_policy on public.schedule_exceptions
for delete to authenticated
using ((select private.is_admin()));
