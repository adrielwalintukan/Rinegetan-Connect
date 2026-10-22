-- P3-001 follow-up: identify redacted content revisions without copying text.
create or replace function private.record_course_content_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_changes jsonb;
  v_action text;
  v_changed_fields text[];
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
    -- Stable allowlist excludes automatic metadata and immutable identifiers.
    v_changed_fields := array_remove(array[
      case when old.title is distinct from new.title then 'title' end,
      case when old.slug is distinct from new.slug then 'slug' end,
      case when old.summary is distinct from new.summary then 'summary' end,
      case when old.status is distinct from new.status then 'status' end
    ], null);
    if tg_table_name = 'course_lessons' then
      v_changed_fields := v_changed_fields || array_remove(array[
        case when old.body is distinct from new.body then 'body' end,
        case when old.position is distinct from new.position then 'position' end
      ], null);
    end if;
    v_changes := v_changes || jsonb_build_object('old_status', old.status, 'new_status', new.status,
      'changed_fields', v_changed_fields);
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
