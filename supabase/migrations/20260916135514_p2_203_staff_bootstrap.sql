create or replace function public.bootstrap_first_admin(p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_display_name text := pg_catalog.btrim(p_display_name);
begin
  if v_actor_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if v_display_name is null
    or pg_catalog.char_length(v_display_name) < 1
    or pg_catalog.char_length(v_display_name) > 120 then
    raise exception using errcode = 'P0001', message = 'validation_error';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20320301::bigint);

  if exists (select 1 from public.staff_roles) then
    raise exception using errcode = 'P0001', message = 'already_bootstrapped';
  end if;

  if not exists (select 1 from auth.users where id = v_actor_id) then
    raise exception using errcode = 'P0001', message = 'target_not_found';
  end if;

  insert into public.profiles (id, display_name, is_active)
  values (v_actor_id, v_display_name, true)
  on conflict (id) do update
    set display_name = excluded.display_name,
        is_active = true;

  insert into public.staff_roles (user_id, role)
  values (v_actor_id, 'admin'::public.staff_role);

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    v_actor_id,
    'staff.bootstrapped',
    'staff_role',
    v_actor_id,
    jsonb_build_object('role', 'admin', 'is_active', true)
  );

  return v_actor_id;
end;
$$;

create or replace function public.provision_invited_editor(
  p_target_user_id uuid,
  p_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_display_name text := pg_catalog.btrim(p_display_name);
begin
  if v_actor_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if not private.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_admin';
  end if;

  if p_target_user_id is null
    or v_display_name is null
    or pg_catalog.char_length(v_display_name) < 1
    or pg_catalog.char_length(v_display_name) > 120 then
    raise exception using errcode = 'P0001', message = 'validation_error';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20320302::bigint);

  if not exists (select 1 from auth.users where id = p_target_user_id) then
    raise exception using errcode = 'P0001', message = 'target_not_found';
  end if;

  if exists (select 1 from public.profiles where id = p_target_user_id)
    or exists (select 1 from public.staff_roles where user_id = p_target_user_id) then
    raise exception using errcode = 'P0001', message = 'target_already_staff';
  end if;

  insert into public.profiles (id, display_name, is_active)
  values (p_target_user_id, v_display_name, true);

  insert into public.staff_roles (user_id, role)
  values (p_target_user_id, 'editor'::public.staff_role);

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    v_actor_id,
    'staff.invited',
    'staff_role',
    p_target_user_id,
    jsonb_build_object('role', 'editor', 'is_active', true)
  );

  return p_target_user_id;
end;
$$;

create or replace function public.deactivate_staff(
  p_target_user_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_id uuid := auth.uid();
  v_reason text := pg_catalog.btrim(p_reason);
  v_target_role text;
  v_target_active boolean;
begin
  if v_actor_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if not private.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_admin';
  end if;

  if p_target_user_id is null
    or v_reason is null
    or pg_catalog.char_length(v_reason) < 1
    or pg_catalog.char_length(v_reason) > 240 then
    raise exception using errcode = 'P0001', message = 'validation_error';
  end if;

  if p_target_user_id = v_actor_id then
    raise exception using errcode = 'P0001', message = 'cannot_deactivate_self';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20320303::bigint);

  select staff_roles.role::text, profiles.is_active
  into v_target_role, v_target_active
  from public.staff_roles
  join public.profiles on profiles.id = staff_roles.user_id
  where staff_roles.user_id = p_target_user_id;

  if not found or v_target_role <> 'editor' or not v_target_active then
    raise exception using errcode = 'P0001', message = 'target_not_editor';
  end if;

  update public.profiles
  set is_active = false
  where id = p_target_user_id;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    changes
  )
  values (
    v_actor_id,
    'staff.deactivated',
    'staff_profile',
    p_target_user_id,
    jsonb_build_object('is_active', false, 'reason', v_reason)
  );
end;
$$;

revoke all on function public.bootstrap_first_admin(text) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(text) to authenticated;

revoke all on function public.provision_invited_editor(uuid, text) from public, anon, authenticated;
grant execute on function public.provision_invited_editor(uuid, text) to authenticated;

revoke all on function public.deactivate_staff(uuid, text) from public, anon, authenticated;
grant execute on function public.deactivate_staff(uuid, text) to authenticated;
