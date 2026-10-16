begin;

select plan(35);

select ok(
  to_regprocedure('public.bootstrap_first_admin(text)') is not null,
  'bootstrap_first_admin exists'
);
select ok(
  to_regprocedure('public.provision_invited_editor(uuid,text)') is not null,
  'provision_invited_editor exists'
);
select ok(
  to_regprocedure('public.deactivate_staff(uuid,text)') is not null,
  'deactivate_staff exists'
);
select ok(
  coalesce((
    select prosecdef
    from pg_proc
    where oid = to_regprocedure('public.bootstrap_first_admin(text)')
  ), false),
  'bootstrap_first_admin is security definer'
);
select ok(
  coalesce((
    select prosecdef
    from pg_proc
    where oid = to_regprocedure('public.provision_invited_editor(uuid,text)')
  ), false),
  'provision_invited_editor is security definer'
);
select ok(
  coalesce((
    select prosecdef
    from pg_proc
    where oid = to_regprocedure('public.deactivate_staff(uuid,text)')
  ), false),
  'deactivate_staff is security definer'
);

select ok(
  not has_function_privilege('public', 'public.bootstrap_first_admin(text)', 'execute'),
  'PUBLIC cannot execute bootstrap_first_admin'
);
select ok(
  has_function_privilege('authenticated', 'public.bootstrap_first_admin(text)', 'execute'),
  'authenticated can execute bootstrap_first_admin'
);
select ok(
  not has_function_privilege('public', 'public.provision_invited_editor(uuid,text)', 'execute'),
  'PUBLIC cannot execute provision_invited_editor'
);
select ok(
  has_function_privilege('authenticated', 'public.provision_invited_editor(uuid,text)', 'execute'),
  'authenticated can execute provision_invited_editor'
);
select ok(
  not has_function_privilege('public', 'public.deactivate_staff(uuid,text)', 'execute'),
  'PUBLIC cannot execute deactivate_staff'
);
select ok(
  has_function_privilege('authenticated', 'public.deactivate_staff(uuid,text)', 'execute'),
  'authenticated can execute deactivate_staff'
);

set local role postgres;

truncate table public.audit_logs, public.staff_roles, public.profiles;

insert into auth.users (
  id,
  aud,
  role,
  email,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '10000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'bootstrap-test@example.invalid',
    '{}'::jsonb,
    '{}'::jsonb,
    '2000-01-01 00:00:00+00',
    '2000-01-01 00:00:00+00'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'admin-test@example.invalid',
    '{}'::jsonb,
    '{}'::jsonb,
    '2000-01-01 00:00:00+00',
    '2000-01-01 00:00:00+00'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'editor-test@example.invalid',
    '{}'::jsonb,
    '{}'::jsonb,
    '2000-01-01 00:00:00+00',
    '2000-01-01 00:00:00+00'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'inactive-test@example.invalid',
    '{}'::jsonb,
    '{}'::jsonb,
    '2000-01-01 00:00:00+00',
    '2000-01-01 00:00:00+00'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'authenticated',
    'authenticated',
    'no-role-test@example.invalid',
    '{}'::jsonb,
    '{}'::jsonb,
    '2000-01-01 00:00:00+00',
    '2000-01-01 00:00:00+00'
  ),
  (
    '66666666-6666-6666-6666-666666666666',
    'authenticated',
    'authenticated',
    'invite-target@example.invalid',
    '{}'::jsonb,
    '{}'::jsonb,
    '2000-01-01 00:00:00+00',
    '2000-01-01 00:00:00+00'
  );

set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000000', true);
select is(
  public.bootstrap_first_admin('Bootstrap Admin'),
  '10000000-0000-0000-0000-000000000000'::uuid,
  'first Auth user can bootstrap itself as Admin'
);
select is(
  (select role::text from public.staff_roles where user_id = '10000000-0000-0000-0000-000000000000'),
  'admin',
  'bootstrap creates the admin role'
);
select is(
  (select action from public.audit_logs where entity_id = '10000000-0000-0000-0000-000000000000'),
  'staff.bootstrapped',
  'bootstrap writes a structured audit action'
);
select throws_ok(
  $$ select public.bootstrap_first_admin('Second Bootstrap') $$,
  'P0001', 'already_bootstrapped', 'bootstrap is one-time'
);

set local role postgres;

insert into public.profiles (id, display_name, is_active, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'Admin Test', true, '2000-01-01 00:00:00+00'),
  ('22222222-2222-2222-2222-222222222222', 'Editor Test', true, '2000-01-01 00:00:00+00'),
  ('33333333-3333-3333-3333-333333333333', 'Inactive Test', false, '2000-01-01 00:00:00+00');

insert into public.staff_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'editor'),
  ('33333333-3333-3333-3333-333333333333', 'editor');

set local role authenticated;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select is(
  public.provision_invited_editor(
    '66666666-6666-6666-6666-666666666666',
    'Invited Editor'
  ),
  '66666666-6666-6666-6666-666666666666'::uuid,
  'active Admin can provision an invited Editor'
);
select is(
  (select role::text from public.staff_roles where user_id = '66666666-6666-6666-6666-666666666666'),
  'editor',
  'provisioning creates an Editor role'
);
select is(
  (select action from public.audit_logs where entity_id = '66666666-6666-6666-6666-666666666666'),
  'staff.invited',
  'provisioning writes a structured audit action'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select throws_ok(
  $$ select public.provision_invited_editor('44444444-4444-4444-4444-444444444444', 'No Role') $$,
  'P0001', 'not_admin', 'Editor cannot provision staff'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select throws_ok(
  $$ select public.provision_invited_editor('66666666-6666-6666-6666-666666666666', 'Duplicate') $$,
  'P0001', 'not_admin', 'user without a role cannot provision staff'
);

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select throws_ok(
  $$ select public.provision_invited_editor('66666666-6666-6666-6666-666666666666', 'Inactive') $$,
  'P0001', 'not_admin', 'inactive staff cannot provision staff'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select throws_ok(
  $$ select public.provision_invited_editor('66666666-6666-6666-6666-666666666666', 'Duplicate') $$,
  'P0001', 'target_already_staff', 'an existing staff target cannot be provisioned twice'
);
select throws_ok(
  $$ select public.provision_invited_editor('88888888-8888-8888-8888-888888888888', 'Missing') $$,
  'P0001', 'target_not_found', 'an unknown Auth target cannot be provisioned'
);
select throws_ok(
  $$ select public.provision_invited_editor('10000000-0000-0000-0000-000000000000', 'Bootstrap') $$,
  'P0001', 'target_already_staff', 'the bootstrap Admin cannot be provisioned again'
);

select lives_ok(
  $$ select public.deactivate_staff('22222222-2222-2222-2222-222222222222', 'Rotasi tugas') $$,
  'active Admin can deactivate an Editor'
);
select is(
  (select is_active from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  false,
  'deactivation marks the Editor inactive'
);
select is(
  (select action from public.audit_logs where entity_id = '22222222-2222-2222-2222-222222222222'),
  'staff.deactivated',
  'deactivation writes a structured audit action'
);
select throws_ok(
  $$ select public.deactivate_staff('22222222-2222-2222-2222-222222222222', 'Again') $$,
  'P0001', 'target_not_editor', 'an inactive Editor cannot be deactivated twice'
);
select throws_ok(
  $$ select public.deactivate_staff('10000000-0000-0000-0000-000000000000', 'Admin') $$,
  'P0001', 'target_not_editor', 'an Admin cannot be deactivated by this procedure'
);
select throws_ok(
  $$ select public.deactivate_staff('11111111-1111-1111-1111-111111111111', 'Self') $$,
  'P0001', 'cannot_deactivate_self', 'an Admin cannot deactivate itself'
);

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select throws_ok(
  $$ select public.deactivate_staff('66666666-6666-6666-6666-666666666666', 'Editor') $$,
  'P0001', 'not_admin', 'an Editor cannot deactivate staff'
);

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select throws_ok(
  $$ select public.deactivate_staff('66666666-6666-6666-6666-666666666666', 'No Role') $$,
  'P0001', 'not_admin', 'a user without a role cannot deactivate staff'
);

set local role anon;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select throws_ok(
  $$ select public.deactivate_staff('66666666-6666-6666-6666-666666666666', 'Anon') $$,
  '42501', 'permission denied for function deactivate_staff',
  'anon cannot execute lifecycle RPCs'
);

set local role postgres;
select ok(
  not exists (
    select 1
    from public.audit_logs
    where changes::text ~* '(password|token|secret|@example\.invalid)'
  ),
  'staff lifecycle audit changes contain no secrets or email addresses'
);

select * from finish();
rollback;
