-- Fix RLS permissions for public/anon reading content and fix audit trigger for departments

-- 1. Grant usage on schema private and execute on is_editor_or_admin to anon
-- Since is_editor_or_admin checks auth.uid(), for anon callers auth.uid() is null and safely evaluates to false.
grant usage on schema private to anon;
grant execute on function private.is_editor_or_admin() to anon;

-- 2. Fix record_content_mutation_audit trigger to support departments (which has 'name', not 'title')
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
  v_title text;
  v_old_title text;
begin
  if tg_op = 'INSERT' then
    v_action := 'content.created';
    v_entity_id := new.id;
    v_title := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'name', '');
    v_changes := jsonb_build_object(
      'title', v_title,
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
      v_title := coalesce(to_jsonb(new)->>'title', to_jsonb(new)->>'name', '');
      v_changes := jsonb_build_object(
        'title', v_title,
        'slug', new.slug,
        'status', new.status
      );
    end if;
  elsif tg_op = 'DELETE' then
    v_action := 'content.deleted';
    v_entity_id := old.id;
    v_old_title := coalesce(to_jsonb(old)->>'title', to_jsonb(old)->>'name', '');
    v_changes := jsonb_build_object(
      'title', v_old_title,
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
