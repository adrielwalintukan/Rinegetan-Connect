begin;

select plan(12);

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

select * from finish();
rollback;
