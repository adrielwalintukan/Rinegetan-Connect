-- P3-001: independent course/lesson lifecycle, API grants, RLS and audit.
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200 and title = btrim(title)),
  slug text not null unique
    check (char_length(slug) between 1 and 220 and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '' check (char_length(summary) <= 500 and summary = btrim(summary)),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200 and title = btrim(title)),
  slug text not null
    check (char_length(slug) between 1 and 220 and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null default '' check (char_length(summary) <= 500 and summary = btrim(summary)),
  body text not null default '' check (char_length(body) <= 50000),
  position integer not null check (position > 0),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  unique (course_id, slug),
  unique (course_id, position),
  constraint course_lessons_published_body_check check (status <> 'published' or body ~ '[^[:space:]]')
);

-- SECURITY DEFINER only permits checking missing Auth references during FK cleanup.
create function private.prepare_course_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_creator_deleted boolean := false;
  v_updater_deleted boolean := false;
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := auth.uid();
    new.published_at := case when new.status = 'published' then now() else null end;
  else
    if new.id is distinct from old.id then
      raise check_violation using message = 'content_id_immutable';
    end if;
    if tg_table_name = 'course_lessons' then
      if new.course_id is distinct from old.course_id then
        raise check_violation using message = 'lesson_course_immutable';
      end if;
    end if;
    if old.published_at is not null and new.slug is distinct from old.slug then
      raise check_violation using message = 'published_slug_immutable';
    end if;

    v_creator_deleted := old.created_by is not null
      and not exists (select 1 from auth.users where id = old.created_by);
    v_updater_deleted := old.updated_by is not null
      and not exists (select 1 from auth.users where id = old.updated_by);
    new.created_at := old.created_at;
    new.created_by := case when v_creator_deleted then null else old.created_by end;
    new.published_at := coalesce(old.published_at, case when new.status = 'published' then now() else null end);
  end if;

  if v_creator_deleted or v_updater_deleted then
    -- Only actual missing old references allow SET NULL; caller-supplied NULL does not.
    new.updated_by := case when v_updater_deleted then null else old.updated_by end;
  else
    new.updated_by := auth.uid();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create function private.record_course_content_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_changes jsonb;
  v_action text;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_action := 'content.deleted';
  else
    v_row := to_jsonb(new);
    if tg_op = 'INSERT' then
      v_action := 'content.created';
    elsif old.status is distinct from new.status then
      v_action := 'content.status_changed';
    else
      v_action := 'content.updated';
    end if;
  end if;

  v_changes := jsonb_build_object('title', v_row->>'title', 'slug', v_row->>'slug', 'status', v_row->>'status');
  if tg_table_name = 'course_lessons' then
    v_changes := v_changes || jsonb_build_object('course_id', v_row->'course_id', 'position', v_row->'position');
  end if;
  if tg_op = 'UPDATE' then
    v_changes := v_changes || jsonb_build_object('old_status', old.status, 'new_status', new.status);
    if tg_table_name = 'course_lessons' then
      v_changes := v_changes || jsonb_build_object('old_position', old.position, 'new_position', new.position);
    end if;
  elsif tg_op = 'DELETE' then
    v_changes := v_changes || jsonb_build_object('reason',
      'Penghapusan permanen ' || case when tg_table_name = 'courses' then 'course' else 'lesson' end || ' oleh Admin');
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (auth.uid(), v_action, tg_table_name, (v_row->>'id')::uuid, v_changes);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.prepare_course_content() from public, anon, authenticated;
revoke all on function private.record_course_content_audit() from public, anon, authenticated;

create trigger courses_prepare_content before insert or update on public.courses
for each row execute function private.prepare_course_content();
create trigger course_lessons_prepare_content before insert or update on public.course_lessons
for each row execute function private.prepare_course_content();
create trigger courses_audit_mutation after insert or update or delete on public.courses
for each row execute function private.record_course_content_audit();
create trigger course_lessons_audit_mutation after insert or update or delete on public.course_lessons
for each row execute function private.record_course_content_audit();

revoke all on table public.courses, public.course_lessons from public, anon, authenticated;
grant select (id, title, slug, summary, status, published_at, created_at, updated_at) on public.courses to anon;
grant select (id, course_id, title, slug, summary, body, position, status, published_at, created_at, updated_at) on public.course_lessons to anon;
grant select, insert, update, delete on table public.courses, public.course_lessons to authenticated;
alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;

create policy courses_select on public.courses for select to anon, authenticated
using (status = 'published' or (select private.is_editor_or_admin()));
create policy courses_insert_editor on public.courses for insert to authenticated
with check ((select private.is_editor_or_admin()));
create policy courses_update_editor on public.courses for update to authenticated
using ((select private.is_editor_or_admin())) with check ((select private.is_editor_or_admin()));
create policy courses_delete_admin on public.courses for delete to authenticated
using ((select private.is_admin()));

create policy course_lessons_select on public.course_lessons for select to anon, authenticated
using (
  (select private.is_editor_or_admin())
  or (status = 'published' and exists (
    select 1 from public.courses as course where course.id = course_id and course.status = 'published'
  ))
);
create policy course_lessons_insert_editor on public.course_lessons for insert to authenticated
with check ((select private.is_editor_or_admin()));
create policy course_lessons_update_editor on public.course_lessons for update to authenticated
using ((select private.is_editor_or_admin())) with check ((select private.is_editor_or_admin()));
create policy course_lessons_delete_admin on public.course_lessons for delete to authenticated
using ((select private.is_admin()));
