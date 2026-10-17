-- P2-405: Add check constraint for object_position and include object_position in audit log

-- 1. Check constraint for allowed positions
alter table public.site_section_media
  drop constraint if exists site_section_media_object_position_check;

alter table public.site_section_media
  add constraint site_section_media_object_position_check
  check (object_position in ('top', 'center', 'bottom', 'contain'));

-- 2. Update audit trigger function to track object_position
create or replace function private.record_section_media_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action text;
  v_changes jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := 'site_settings.create_section_media';
    v_changes := jsonb_build_object(
      'section_key', new.section_key,
      'asset_id', new.asset_id,
      'custom_alt_text', new.custom_alt_text,
      'custom_caption', new.custom_caption,
      'object_position', new.object_position
    );
  elsif tg_op = 'UPDATE' then
    v_action := 'site_settings.update_section_media';
    v_changes := jsonb_build_object(
      'section_key', new.section_key,
      'asset_id', new.asset_id,
      'old_asset_id', old.asset_id,
      'custom_alt_text', new.custom_alt_text,
      'custom_caption', new.custom_caption,
      'object_position', new.object_position,
      'old_object_position', old.object_position
    );
  elsif tg_op = 'DELETE' then
    v_action := 'site_settings.delete_section_media';
    v_changes := jsonb_build_object(
      'section_key', old.section_key,
      'asset_id', old.asset_id,
      'object_position', old.object_position
    );
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  ) values (
    auth.uid(),
    v_action,
    'site_section_media',
    coalesce(new.asset_id, old.asset_id),
    v_changes
  );

  return coalesce(new, old);
end;
$$;

-- 3. Support audit reason on content deletion
create or replace function public.set_audit_reason(p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_catalog.set_config('app.audit_reason', p_reason, true);
end;
$$;

grant execute on function public.set_audit_reason(text) to authenticated;

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
      'status', old.status,
      'reason', coalesce(
        nullif(current_setting('app.audit_reason', true), ''),
        'Penghapusan permanen ' || tg_table_name || ' oleh Admin'
      )
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
