-- supabase/migrations/20261025000000_p3_003_course_imports.sql
-- P3-003: staged course imports; Draft content is created only after Admin license approval.

-- Payload contract mirrors parseCourseImport() output so a direct Data API insert cannot skip the parser.
create function private.course_import_text_ok(v jsonb, min_len integer, max_len integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(v) = 'string'
    and char_length(v #>> '{}') between min_len and max_len
    and v #>> '{}' = btrim(v #>> '{}'), false);
$$;

create function private.course_import_url_ok(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  -- Authority = bracketed IPv6 or a host without WHATWG forbidden code points, then an optional numeric port <= 65535.
  select coalesce(jsonb_typeof(v) = 'null'
    or (jsonb_typeof(v) = 'string' and char_length(v #>> '{}') <= 2048
      and v #>> '{}' ~ '^https://(\[[0-9A-Fa-f:.]+\]|[^][/?#@:<>\\^|%[:space:][:cntrl:]]+)(:[0-9]{0,5})?([/?#][^[:space:][:cntrl:]]*)?$'
      and coalesce(nullif(substring(v #>> '{}' from '^https://(?:\[[^]]*\]|[^/?#:]*):([0-9]+)'), '')::numeric, 0) <= 65535), false);
$$;

create function private.course_import_keys(v jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case when jsonb_typeof(v) = 'object' then (select coalesce(array_agg(k order by k), '{}') from jsonb_object_keys(v) k) end;
$$;

create function private.course_import_payload_valid(p jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_lesson jsonb;
  v_slugs text[] := '{}';
  v_positions numeric[] := '{}';
  v_position numeric;
begin
  -- SQL does not guarantee OR evaluation order, so type checks that guard casts run in their own IF.
  if private.course_import_keys(p) is distinct from array['course', 'format', 'language', 'lessons', 'license', 'source']
    or jsonb_typeof(p->'lessons') is distinct from 'array' then
    return false;
  end if;
  if p->'format' is distinct from '"rinegetan-course-import/1"' or p->'language' is distinct from '"id"'
    or private.course_import_keys(p->'source') is distinct from array['name', 'rights_holder', 'url']
    or not private.course_import_text_ok(p->'source'->'name', 1, 200)
    or not private.course_import_text_ok(p->'source'->'rights_holder', 1, 200)
    or not private.course_import_url_ok(p->'source'->'url')
    or private.course_import_keys(p->'license') is distinct from array['name', 'notes', 'url']
    or not private.course_import_text_ok(p->'license'->'name', 1, 200)
    or not private.course_import_text_ok(p->'license'->'notes', 0, 1000)
    or not private.course_import_url_ok(p->'license'->'url')
    or private.course_import_keys(p->'course') is distinct from array['slug', 'summary', 'title']
    or not private.course_import_text_ok(p->'course'->'title', 1, 200)
    or not private.course_import_text_ok(p->'course'->'slug', 1, 220)
    or p->'course'->>'slug' !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or not private.course_import_text_ok(p->'course'->'summary', 0, 500)
    or jsonb_array_length(p->'lessons') not between 1 and 100
  then
    return false;
  end if;

  for v_lesson in select value from jsonb_array_elements(p->'lessons') loop
    if private.course_import_keys(v_lesson) is distinct from array['body', 'position', 'slug', 'summary', 'title']
      or jsonb_typeof(v_lesson->'position') <> 'number' then
      return false;
    end if;
    v_position := (v_lesson->>'position')::numeric;
    if v_position <> trunc(v_position)
      or v_position not between 1 and 2147483647
      or v_position = any(v_positions)
      or not private.course_import_text_ok(v_lesson->'title', 1, 200)
      or not private.course_import_text_ok(v_lesson->'slug', 1, 220)
      or v_lesson->>'slug' !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
      or v_lesson->>'slug' = any(v_slugs)
      or not private.course_import_text_ok(v_lesson->'summary', 0, 500)
      or not private.course_import_text_ok(v_lesson->'body', 1, 50000)
    then
      return false;
    end if;
    v_slugs := v_slugs || (v_lesson->>'slug');
    v_positions := v_positions || v_position;
  end loop;
  return true;
end;
$$;

-- CHECK constraints run with the inserting role's privileges, so authenticated keeps execute.
revoke all on function private.course_import_text_ok(jsonb, integer, integer) from public, anon;
revoke all on function private.course_import_url_ok(jsonb) from public, anon;
revoke all on function private.course_import_keys(jsonb) from public, anon;
revoke all on function private.course_import_payload_valid(jsonb) from public, anon;
grant execute on function private.course_import_text_ok(jsonb, integer, integer) to authenticated;
grant execute on function private.course_import_url_ok(jsonb) to authenticated;
grant execute on function private.course_import_keys(jsonb) to authenticated;
grant execute on function private.course_import_payload_valid(jsonb) to authenticated;

create table public.course_imports (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and octet_length(payload::text) <= 2097152
    and jsonb_typeof(payload->'course') = 'object'
    and jsonb_typeof(payload->'lessons') = 'array'
  ),
  course_title text not null check (char_length(course_title) between 1 and 200 and course_title = btrim(course_title)),
  course_slug text not null check (char_length(course_slug) between 1 and 220 and course_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  lesson_count integer not null check (lesson_count between 1 and 100),
  source_name text not null check (char_length(source_name) between 1 and 200 and source_name = btrim(source_name)),
  source_url text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~ '^https://')),
  rights_holder text not null check (char_length(rights_holder) between 1 and 200 and rights_holder = btrim(rights_holder)),
  license_name text not null check (char_length(license_name) between 1 and 200 and license_name = btrim(license_name)),
  license_url text check (license_url is null or (char_length(license_url) <= 2048 and license_url ~ '^https://')),
  license_notes text check (license_notes is null or char_length(license_notes) <= 1000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or (char_length(review_note) between 1 and 500 and review_note = btrim(review_note))),
  course_id uuid references public.courses(id) on delete set null,
  constraint course_imports_lessons_match check (
    case when jsonb_typeof(payload->'lessons') = 'array' then jsonb_array_length(payload->'lessons') = lesson_count else false end
  ),
  constraint course_imports_payload_contract check (private.course_import_payload_valid(payload)),
  constraint course_imports_course_match check (
    payload->'course'->>'slug' = course_slug and payload->'course'->>'title' = course_title
  ),
  -- Denormalized license columns must be exactly what the Admin sees in the payload.
  constraint course_imports_source_license_match check (
    source_name = payload->'source'->>'name'
    and rights_holder = payload->'source'->>'rights_holder'
    and license_name = payload->'license'->>'name'
    and source_url is not distinct from nullif(payload->'source'->>'url', '')
    and license_url is not distinct from nullif(payload->'license'->>'url', '')
    and coalesce(license_notes, '') = coalesce(payload->'license'->>'notes', '')
  ),
  constraint course_imports_review_state check (
    (status = 'pending' and reviewed_by is null and reviewed_at is null and review_note is null and course_id is null)
    or (status = 'rejected' and reviewed_at is not null and review_note is not null and course_id is null)
    or (status = 'approved' and reviewed_at is not null and review_note is null)
  )
);
create unique index course_imports_pending_slug_idx on public.course_imports (course_slug) where status = 'pending';
create index course_imports_created_at_idx on public.course_imports (created_at desc);

-- SECURITY DEFINER reads courses for the slug check and missing FK targets during SET NULL cleanup.
create function private.prepare_course_import()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if exists (select 1 from public.courses where slug = new.course_slug) then
      raise unique_violation using message = 'course_import_slug_taken';
    end if;
    new.status := 'pending';
    new.created_by := auth.uid();
    new.created_at := now();
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    new.course_id := null;
    return new;
  end if;

  -- ON DELETE SET NULL of a removed user/course is the only change allowed after a decision.
  if (to_jsonb(new) - array['created_by', 'reviewed_by', 'course_id']) = (to_jsonb(old) - array['created_by', 'reviewed_by', 'course_id'])
    and (new.created_by is not distinct from old.created_by or (new.created_by is null and not exists (select 1 from auth.users where id = old.created_by)))
    and (new.reviewed_by is not distinct from old.reviewed_by or (new.reviewed_by is null and not exists (select 1 from auth.users where id = old.reviewed_by)))
    and (new.course_id is not distinct from old.course_id or (new.course_id is null and not exists (select 1 from public.courses where id = old.course_id)))
    and (new.created_by is distinct from old.created_by or new.reviewed_by is distinct from old.reviewed_by or new.course_id is distinct from old.course_id)
  then
    return new;
  end if;

  if old.status <> 'pending' or new.status not in ('approved', 'rejected') then
    raise check_violation using message = 'course_import_transition_invalid';
  end if;
  if (to_jsonb(new) - array['status', 'reviewed_by', 'reviewed_at', 'review_note', 'course_id'])
    is distinct from (to_jsonb(old) - array['status', 'reviewed_by', 'reviewed_at', 'review_note', 'course_id']) then
    raise check_violation using message = 'course_import_immutable';
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

create function private.record_course_import_audit()
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
    case when tg_op = 'INSERT' then 'course_import.created' else 'course_import.' || new.status end,
    'course_imports',
    new.id,
    jsonb_build_object(
      'course_title', new.course_title, 'course_slug', new.course_slug, 'lesson_count', new.lesson_count,
      'source_name', new.source_name, 'license_name', new.license_name, 'status', new.status, 'course_id', new.course_id
    ) || case when new.status = 'rejected' then jsonb_build_object('review_note', new.review_note) else '{}'::jsonb end
  );
  return new;
end;
$$;

revoke all on function private.prepare_course_import() from public, anon, authenticated;
revoke all on function private.record_course_import_audit() from public, anon, authenticated;
create trigger course_imports_prepare before insert or update on public.course_imports
for each row execute function private.prepare_course_import();
create trigger course_imports_audit after insert or update on public.course_imports
for each row execute function private.record_course_import_audit();

-- SECURITY DEFINER with an explicit Admin check; auth.uid() still comes from the session for course triggers.
create function public.approve_course_import(p_import_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_import public.course_imports;
  v_course_id uuid;
  v_lesson jsonb;
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'course_import_admin_only';
  end if;
  select * into v_import from public.course_imports where id = p_import_id for update;
  if not found then
    raise no_data_found using message = 'course_import_not_found';
  end if;
  if v_import.status <> 'pending' then
    raise check_violation using message = 'course_import_not_pending';
  end if;

  insert into public.courses (title, slug, summary, status)
  values (v_import.payload->'course'->>'title', v_import.payload->'course'->>'slug',
          coalesce(v_import.payload->'course'->>'summary', ''), 'draft')
  returning id into v_course_id;

  for v_lesson in select value from jsonb_array_elements(v_import.payload->'lessons') loop
    insert into public.course_lessons (course_id, title, slug, summary, body, position, status)
    values (v_course_id, v_lesson->>'title', v_lesson->>'slug', coalesce(v_lesson->>'summary', ''),
            v_lesson->>'body', (v_lesson->>'position')::integer, 'draft');
  end loop;

  update public.course_imports set status = 'approved', course_id = v_course_id where id = p_import_id;
  return v_course_id;
end;
$$;
revoke all on function public.approve_course_import(uuid) from public, anon;
grant execute on function public.approve_course_import(uuid) to authenticated;

revoke all on table public.course_imports from public, anon, authenticated;
grant select, insert, update on table public.course_imports to authenticated;
alter table public.course_imports enable row level security;

create policy course_imports_select on public.course_imports for select to authenticated
using ((select private.is_editor_or_admin()));
create policy course_imports_insert on public.course_imports for insert to authenticated
with check ((select private.is_editor_or_admin()));
-- Approval goes only through approve_course_import(); direct updates may only reject.
create policy course_imports_reject_admin on public.course_imports for update to authenticated
using ((select private.is_admin()) and status = 'pending')
with check ((select private.is_admin()) and status = 'rejected' and course_id is null and review_note is not null);
