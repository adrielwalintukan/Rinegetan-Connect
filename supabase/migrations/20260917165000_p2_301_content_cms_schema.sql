create type public.content_status as enum ('draft', 'published', 'archived');

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(name) between 1 and 100)
    check (name = btrim(name)),
  slug text not null
    check (char_length(slug) between 1 and 120)
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    unique,
  description text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null
    check (char_length(title) between 1 and 200)
    check (title = btrim(title)),
  slug text not null
    check (char_length(slug) between 1 and 220)
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    unique,
  summary text not null
    check (char_length(summary) between 1 and 500)
    check (summary = btrim(summary)),
  body text not null
    check (char_length(body) >= 1)
    check (body = btrim(body)),
  department_id uuid references public.departments(id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null
    check (char_length(title) between 1 and 200)
    check (title = btrim(title)),
  slug text not null
    check (char_length(slug) between 1 and 220)
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    unique,
  summary text not null
    check (char_length(summary) between 1 and 500)
    check (summary = btrim(summary)),
  body text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'Asia/Makassar',
  venue text not null default 'GMAHK Rinegetan'
    check (char_length(venue) between 1 and 200)
    check (venue = btrim(venue)),
  department_id uuid references public.departments(id) on delete set null,
  cover_asset_id uuid,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  constraint events_ends_at_check check (ends_at >= starts_at)
);

create index idx_departments_status on public.departments(status);
create index idx_announcements_status on public.announcements(status);
create index idx_announcements_published_at on public.announcements(published_at desc) where status = 'published';
create index idx_events_status_starts_at on public.events(status, starts_at);
create index idx_events_department on public.events(department_id);

create or replace function private.sync_published_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status = 'published'::public.content_status and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end;
$$;

create or replace function private.record_content_mutation_audit()
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
    v_action := 'content.created';
    v_entity_id := new.id;
    v_changes := jsonb_build_object(
      'title', case when tg_table_name = 'departments' then new.name else new.title end,
      'status', new.status,
      'slug', new.slug
    );
  elsif tg_op = 'UPDATE' then
    v_entity_id := new.id;
    if old.status is distinct from new.status then
      v_action := 'content.status_changed';
      v_changes := jsonb_build_object(
        'old_status', old.status,
        'new_status', new.status,
        'slug', new.slug
      );
    else
      v_action := 'content.updated';
      v_changes := jsonb_build_object(
        'title', case when tg_table_name = 'departments' then new.name else new.title end,
        'slug', new.slug,
        'status', new.status
      );
    end if;
  elsif tg_op = 'DELETE' then
    v_action := 'content.deleted';
    v_entity_id := old.id;
    v_changes := jsonb_build_object(
      'title', case when tg_table_name = 'departments' then old.name else old.title end,
      'slug', old.slug,
      'status', old.status
    );
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

create trigger departments_set_updated_at
before update on public.departments
for each row execute function private.set_updated_at();

create trigger announcements_set_updated_at
before update on public.announcements
for each row execute function private.set_updated_at();

create trigger announcements_sync_published_at
before insert or update on public.announcements
for each row execute function private.sync_published_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function private.set_updated_at();

create trigger events_sync_published_at
before insert or update on public.events
for each row execute function private.sync_published_at();

create trigger departments_audit_mutation
after insert or update or delete on public.departments
for each row execute function private.record_content_mutation_audit();

create trigger announcements_audit_mutation
after insert or update or delete on public.announcements
for each row execute function private.record_content_mutation_audit();

create trigger events_audit_mutation
after insert or update or delete on public.events
for each row execute function private.record_content_mutation_audit();

revoke all on table public.departments, public.announcements, public.events from public, anon, authenticated;
grant select on table public.departments, public.announcements, public.events to anon, authenticated;
grant insert, update, delete on table public.departments, public.announcements, public.events to authenticated;

alter table public.departments enable row level security;
alter table public.announcements enable row level security;
alter table public.events enable row level security;

-- Policies for public.departments
create policy departments_select_policy on public.departments
for select to anon, authenticated
using (
  status = 'published'::public.content_status
  or (select private.is_editor_or_admin())
);

create policy departments_insert_editor on public.departments
for insert to authenticated
with check ((select private.is_editor_or_admin()));

create policy departments_update_editor on public.departments
for update to authenticated
using ((select private.is_editor_or_admin()))
with check ((select private.is_editor_or_admin()));

create policy departments_delete_admin on public.departments
for delete to authenticated
using ((select private.is_admin()));

-- Policies for public.announcements
create policy announcements_select_policy on public.announcements
for select to anon, authenticated
using (
  status = 'published'::public.content_status
  or (select private.is_editor_or_admin())
);

create policy announcements_insert_editor on public.announcements
for insert to authenticated
with check ((select private.is_editor_or_admin()));

create policy announcements_update_editor on public.announcements
for update to authenticated
using ((select private.is_editor_or_admin()))
with check ((select private.is_editor_or_admin()));

create policy announcements_delete_admin on public.announcements
for delete to authenticated
using ((select private.is_admin()));

-- Policies for public.events
create policy events_select_policy on public.events
for select to anon, authenticated
using (
  status = 'published'::public.content_status
  or (select private.is_editor_or_admin())
);

create policy events_insert_editor on public.events
for insert to authenticated
with check ((select private.is_editor_or_admin()));

create policy events_update_editor on public.events
for update to authenticated
using ((select private.is_editor_or_admin()))
with check ((select private.is_editor_or_admin()));

create policy events_delete_admin on public.events
for delete to authenticated
using ((select private.is_admin()));
