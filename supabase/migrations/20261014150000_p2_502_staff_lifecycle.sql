-- P2-502 smoke test: a deactivated Editor could never be reactivated or removed,
-- and re-inviting the same email fails because the Auth user still exists.
-- Both functions mirror public.deactivate_staff (P2-203): admin-only, audited, editors only.

create or replace function public.reactivate_staff(
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

  perform pg_catalog.pg_advisory_xact_lock(20320303::bigint);

  select staff_roles.role::text, profiles.is_active
  into v_target_role, v_target_active
  from public.staff_roles
  join public.profiles on profiles.id = staff_roles.user_id
  where staff_roles.user_id = p_target_user_id;

  if not found or v_target_role <> 'editor' or v_target_active then
    raise exception using errcode = 'P0001', message = 'target_not_inactive_editor';
  end if;

  update public.profiles
  set is_active = true
  where id = p_target_user_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    v_actor_id,
    'staff.reactivated',
    'staff_profile',
    p_target_user_id,
    jsonb_build_object('is_active', true, 'reason', v_reason)
  );
end;
$$;

-- Deletes the Editor's Auth account (profile and role cascade) in the same
-- transaction as its audit entry, so the log can never claim a deletion that did not happen.
create or replace function public.delete_staff(
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
  v_display_name text;
begin
  if v_actor_id is null then
    raise exception using errcode = 'P0001', message = 'not_authenticated';
  end if;

  if not private.is_admin() then
    raise exception using errcode = 'P0001', message = 'not_admin';
  end if;

  if p_target_user_id is null
    or v_reason is null
    or pg_catalog.char_length(v_reason) < 5
    or pg_catalog.char_length(v_reason) > 240 then
    raise exception using errcode = 'P0001', message = 'validation_error';
  end if;

  if p_target_user_id = v_actor_id then
    raise exception using errcode = 'P0001', message = 'cannot_delete_self';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(20320303::bigint);

  select staff_roles.role::text, profiles.display_name
  into v_target_role, v_display_name
  from public.staff_roles
  join public.profiles on profiles.id = staff_roles.user_id
  where staff_roles.user_id = p_target_user_id;

  if not found or v_target_role <> 'editor' then
    raise exception using errcode = 'P0001', message = 'target_not_editor';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes)
  values (
    v_actor_id,
    'staff.deleted',
    'staff_profile',
    p_target_user_id,
    jsonb_build_object('display_name', v_display_name, 'reason', v_reason)
  );

  delete from auth.users where id = p_target_user_id;
end;
$$;

revoke all on function public.reactivate_staff(uuid, text) from public, anon, authenticated;
grant execute on function public.reactivate_staff(uuid, text) to authenticated;

revoke all on function public.delete_staff(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_staff(uuid, text) to authenticated;
