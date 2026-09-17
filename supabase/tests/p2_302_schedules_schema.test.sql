begin;

select plan(36);

-- 1. Tables exist
select ok(to_regclass('public.schedules') is not null, 'schedules table exists');
select ok(to_regclass('public.schedule_exceptions') is not null, 'schedule_exceptions table exists');

-- 2. Primary keys
select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedules') and contype = 'p'
), 'schedules has primary key');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and contype = 'p'
), 'schedule_exceptions has primary key');

-- 3. Schedules columns & constraints
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedules' and column_name = 'slug'
), 'schedules has slug column');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedules') and contype = 'u'
), 'schedules has unique constraint on slug');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedules' and column_name = 'day_of_week'
), 'schedules has day_of_week column');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedules' and column_name = 'start_time'
), 'schedules has start_time column');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedules' and column_name = 'end_time'
), 'schedules has end_time column');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedules' and column_name = 'timezone'
    and column_default like '%Asia/Makassar%'
), 'schedules default timezone is Asia/Makassar');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedules' and column_name = 'status'
    and udt_name = 'content_status'
), 'schedules status column uses content_status enum');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedules') and conname = 'chk_schedules_day_of_week'
), 'schedules enforces day_of_week between 0 and 6 constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedules') and conname = 'chk_schedules_time_order'
), 'schedules enforces end_time > start_time constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedules') and conname = 'chk_schedules_timezone'
), 'schedules enforces Asia/Makassar timezone constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedules') and contype = 'f'
), 'schedules has foreign key to departments');

-- 4. Schedule Exceptions columns & constraints
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedule_exceptions' and column_name = 'exception_date'
), 'schedule_exceptions has exception_date column');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'schedule_exceptions' and column_name = 'action'
), 'schedule_exceptions has action column');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and conname = 'chk_schedule_exceptions_action'
), 'schedule_exceptions enforces action check constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and conname = 'chk_schedule_exceptions_cancelled'
), 'schedule_exceptions enforces cancelled requires schedule_id constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and conname = 'chk_schedule_exceptions_override'
), 'schedule_exceptions enforces override requires schedule_id and custom field constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and conname = 'chk_schedule_exceptions_added'
), 'schedule_exceptions enforces added requires custom_name and custom_start_time constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and conname = 'chk_schedule_exceptions_time_order'
), 'schedule_exceptions enforces custom time ordering constraint');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and conname = 'uq_schedule_exception_per_schedule_date'
), 'schedule_exceptions enforces unique constraint per schedule and date');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.schedule_exceptions') and contype = 'f'
), 'schedule_exceptions has foreign key to schedules');

-- 5. Row Level Security Enabled & Forced
select ok(relrowsecurity, 'RLS is enabled on schedules')
from pg_class where oid = to_regclass('public.schedules');

select ok(relforcerowsecurity, 'RLS is forced on schedules')
from pg_class where oid = to_regclass('public.schedules');

select ok(relrowsecurity, 'RLS is enabled on schedule_exceptions')
from pg_class where oid = to_regclass('public.schedule_exceptions');

select ok(relforcerowsecurity, 'RLS is forced on schedule_exceptions')
from pg_class where oid = to_regclass('public.schedule_exceptions');

-- 6. RLS Policies Exist
select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedules') and polname = 'schedules_select_policy'
), 'schedules has select policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedules') and polname = 'schedules_insert_policy'
), 'schedules has insert policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedules') and polname = 'schedules_update_policy'
), 'schedules has update policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedules') and polname = 'schedules_delete_policy'
), 'schedules has delete policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedule_exceptions') and polname = 'schedule_exceptions_select_policy'
), 'schedule_exceptions has select policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedule_exceptions') and polname = 'schedule_exceptions_insert_policy'
), 'schedule_exceptions has insert policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedule_exceptions') and polname = 'schedule_exceptions_update_policy'
), 'schedule_exceptions has update policy');

select ok(exists (
  select 1 from pg_policy where polrelid = to_regclass('public.schedule_exceptions') and polname = 'schedule_exceptions_delete_policy'
), 'schedule_exceptions has delete policy');

rollback;
