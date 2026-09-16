begin;

select plan(45);

select ok(to_regtype('public.staff_role') is not null, 'staff_role exists');
select results_eq(
  $$
    select enumlabel::text collate "default"
    from pg_enum
    where enumtypid = to_regtype('public.staff_role')
    order by enumsortorder
  $$,
  array['admin', 'editor']::text[],
  'staff_role permits only admin and editor'
);
select ok(to_regclass('public.profiles') is not null, 'profiles exists');
select ok(to_regclass('public.staff_roles') is not null, 'staff_roles exists');
select ok(to_regclass('public.audit_logs') is not null, 'audit_logs exists');
select ok(exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'is_active'
), 'profiles has is_active');
select ok(exists (
  select 1
  from pg_constraint
  where conrelid = to_regclass('public.staff_roles')
    and contype = 'p'
), 'staff_roles has a primary key');
select ok(exists (
  select 1
  from pg_constraint
  where conrelid = to_regclass('public.staff_roles')
    and contype = 'f'
), 'staff_roles has a profile foreign key');
select ok(exists (
  select 1
  from pg_constraint
  where conrelid = to_regclass('public.audit_logs')
    and contype = 'c'
), 'audit_logs has check constraints');
select ok(
  to_regclass('public.audit_logs_actor_occurred_at_idx') is not null,
  'audit actor index exists'
);
select ok(
  to_regclass('public.audit_logs_entity_occurred_at_idx') is not null,
  'audit entity index exists'
);
select ok(exists (
  select 1
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'audit_logs'
    and column_name = 'changes'
    and data_type = 'jsonb'
), 'audit changes is jsonb');

-- Fixtures are local synthetic Auth identities only. They never reach the linked project.
set local role postgres;

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
  );

insert into public.profiles (id, display_name, is_active, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'Admin Test', true, '2000-01-01 00:00:00+00'),
  ('22222222-2222-2222-2222-222222222222', 'Editor Test', true, '2000-01-01 00:00:00+00'),
  ('33333333-3333-3333-3333-333333333333', 'Inactive Test', false, '2000-01-01 00:00:00+00');

insert into public.staff_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'editor'),
  ('33333333-3333-3333-3333-333333333333', 'editor');

insert into public.audit_logs (id, actor_id, action, entity_type, entity_id, changes) values
  (
    '55555555-5555-5555-5555-555555555555',
    '11111111-1111-1111-1111-111111111111',
    'staff.created',
    'staff_role',
    '22222222-2222-2222-2222-222222222222',
    '{}'::jsonb
  );

create function pg_temp.evaluate_staff_helper(subject uuid, helper_name text)
returns boolean
language plpgsql
security invoker
as $$
declare
  result boolean;
begin
  perform set_config('request.jwt.claim.sub', subject::text, true);

  if to_regprocedure(format('private.%I()', helper_name)) is null then
    return null;
  end if;

  execute format('select private.%I()', helper_name) into result;
  return result;
end;
$$;

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select'),
  'anon has no profiles select grant'
);
select ok(
  not has_table_privilege('anon', 'public.staff_roles', 'select'),
  'anon has no staff_roles select grant'
);
select ok(
  not has_table_privilege('anon', 'public.audit_logs', 'select'),
  'anon has no audit_logs select grant'
);
select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'insert, update, delete'),
  'authenticated cannot mutate profiles'
);
select ok(
  not has_table_privilege('authenticated', 'public.staff_roles', 'insert, update, delete'),
  'authenticated cannot mutate staff_roles'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'insert, update, delete'),
  'authenticated cannot mutate audit_logs'
);
select ok(
  coalesce((
    select not has_function_privilege('public', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'is_admin'
  ), false),
  'PUBLIC cannot execute is_admin'
);
select ok(
  coalesce((
    select not has_function_privilege('public', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'is_editor_or_admin'
  ), false),
  'PUBLIC cannot execute is_editor_or_admin'
);
select ok(
  coalesce((
    select has_function_privilege('authenticated', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'is_admin'
  ), false),
  'authenticated may evaluate is_admin'
);
select ok(
  coalesce((
    select has_function_privilege('authenticated', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'is_editor_or_admin'
  ), false),
  'authenticated may evaluate is_editor_or_admin'
);
select ok(
  coalesce((
    select not has_function_privilege('public', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'set_updated_at'
  ), false),
  'PUBLIC cannot execute set_updated_at'
);
select ok(
  coalesce((
    select not has_function_privilege('authenticated', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'set_updated_at'
  ), false),
  'authenticated cannot execute set_updated_at'
);
select ok(
  coalesce((
    select not has_schema_privilege('public', namespace.oid, 'usage')
    from pg_namespace as namespace
    where namespace.nspname = 'private'
  ), false),
  'PUBLIC has no usage on private'
);
select ok(
  coalesce((
    select has_schema_privilege('authenticated', namespace.oid, 'usage')
    from pg_namespace as namespace
    where namespace.nspname = 'private'
  ), false),
  'authenticated has usage on private'
);
select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.profiles')), false),
  'profiles has RLS enabled'
);
select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.staff_roles')), false),
  'staff_roles has RLS enabled'
);
select ok(
  coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.audit_logs')), false),
  'audit_logs has RLS enabled'
);
select results_eq(
  $$
    select (policyname || ':' || cmd || ':' || array_to_string(roles, ',')) collate "default"
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'staff_roles', 'audit_logs')
    order by policyname
  $$,
  array[
    'audit_logs_select_admin:SELECT:authenticated',
    'profiles_select_authenticated:SELECT:authenticated',
    'staff_roles_select_authenticated:SELECT:authenticated'
  ]::text[],
  'only the five authenticated read policies exist'
);

set local role authenticated;

select results_eq(
  $$
    select pg_temp.evaluate_staff_helper(subject, 'is_admin')
    from (
      values
        ('admin'::text, '11111111-1111-1111-1111-111111111111'::uuid),
        ('editor'::text, '22222222-2222-2222-2222-222222222222'::uuid),
        ('inactive'::text, '33333333-3333-3333-3333-333333333333'::uuid),
        ('no_role'::text, '44444444-4444-4444-4444-444444444444'::uuid)
    ) as cases(label, subject)
    order by label
  $$,
  array[true, false, false, false]::boolean[],
  'is_admin permits only the active admin'
);
select results_eq(
  $$
    select pg_temp.evaluate_staff_helper(subject, 'is_editor_or_admin')
    from (
      values
        ('admin'::text, '11111111-1111-1111-1111-111111111111'::uuid),
        ('editor'::text, '22222222-2222-2222-2222-222222222222'::uuid),
        ('inactive'::text, '33333333-3333-3333-3333-333333333333'::uuid),
        ('no_role'::text, '44444444-4444-4444-4444-444444444444'::uuid)
    ) as cases(label, subject)
    order by label
  $$,
  array[true, true, false, false]::boolean[],
  'is_editor_or_admin permits active admin and editor only'
);

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
select results_eq($$ select id from public.profiles order by id $$, array[
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid
]::uuid[], 'admin can read all profiles');
select results_eq($$ select user_id from public.staff_roles order by user_id $$, array[
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid
]::uuid[], 'admin can read all staff roles');
select results_eq($$ select id from public.audit_logs order by id $$, array[
  '55555555-5555-5555-5555-555555555555'::uuid
]::uuid[], 'admin can read audit logs');

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
select results_eq($$ select id from public.profiles order by id $$, array[
  '22222222-2222-2222-2222-222222222222'::uuid
]::uuid[], 'editor can read only own profile');
select results_eq($$ select user_id from public.staff_roles order by user_id $$, array[
  '22222222-2222-2222-2222-222222222222'::uuid
]::uuid[], 'editor can read only own staff role');
select results_eq($$ select id from public.audit_logs order by id $$, array[]::uuid[], 'editor cannot read audit logs');

select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
select results_eq($$ select id from public.profiles order by id $$, array[]::uuid[], 'inactive staff cannot read profiles');
select results_eq($$ select user_id from public.staff_roles order by user_id $$, array[]::uuid[], 'inactive staff cannot read staff roles');
select results_eq($$ select id from public.audit_logs order by id $$, array[]::uuid[], 'inactive staff cannot read audit logs');

select set_config('request.jwt.claim.sub', '44444444-4444-4444-4444-444444444444', true);
select results_eq($$ select id from public.profiles order by id $$, array[]::uuid[], 'no-role user cannot read profiles');
select results_eq($$ select user_id from public.staff_roles order by user_id $$, array[]::uuid[], 'no-role user cannot read staff roles');
select results_eq($$ select id from public.audit_logs order by id $$, array[]::uuid[], 'no-role user cannot read audit logs');

set local role postgres;
update public.profiles
set display_name = 'Admin Test Updated'
where id = '11111111-1111-1111-1111-111111111111';
select ok(
  (select updated_at > '2000-01-01 00:00:00+00'::timestamptz from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'profile update refreshes updated_at'
);

select * from finish();
rollback;
