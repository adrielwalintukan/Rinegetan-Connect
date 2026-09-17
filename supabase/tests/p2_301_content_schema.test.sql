begin;

select plan(38);

-- 1. Enum content_status
select ok(to_regtype('public.content_status') is not null, 'content_status enum exists');
select results_eq(
  $$
    select enumlabel::text collate "default"
    from pg_enum
    where enumtypid = to_regtype('public.content_status')
    order by enumsortorder
  $$,
  array['draft', 'published', 'archived']::text[],
  'content_status permits only draft, published, and archived'
);

-- 2. Tables exist
select ok(to_regclass('public.departments') is not null, 'departments table exists');
select ok(to_regclass('public.announcements') is not null, 'announcements table exists');
select ok(to_regclass('public.events') is not null, 'events table exists');

-- 3. Departments columns & constraints
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'departments' and column_name = 'slug'
), 'departments has slug column');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.departments') and contype = 'u'
), 'departments has unique constraint (slug)');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.departments') and contype = 'p'
), 'departments has primary key');

-- 4. Announcements columns & constraints
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'announcements' and column_name = 'published_at'
), 'announcements has published_at column');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.announcements') and contype = 'f'
), 'announcements has foreign key constraint');

-- 5. Events columns & constraints
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'events' and column_name = 'timezone'
    and column_default like '%Asia/Makassar%'
), 'events has default timezone Asia/Makassar');

select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'events' and column_name = 'cover_asset_id'
), 'events has cover_asset_id column');

select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.events') and contype = 'c'
    and pg_get_constraintdef(oid) like '%ends_at >= starts_at%'
), 'events has ends_at >= starts_at check constraint');

-- 6. Indexes exist
select ok(to_regclass('public.idx_departments_status') is not null, 'departments status index exists');
select ok(to_regclass('public.idx_announcements_status') is not null, 'announcements status index exists');
select ok(to_regclass('public.idx_announcements_published_at') is not null, 'announcements published_at index exists');
select ok(to_regclass('public.idx_events_status_starts_at') is not null, 'events status starts_at index exists');
select ok(to_regclass('public.idx_events_department') is not null, 'events department index exists');

-- 7. RLS enabled on all three tables
select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.departments')
), 'departments has RLS enabled');

select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.announcements')
), 'announcements has RLS enabled');

select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.events')
), 'events has RLS enabled');

-- 8. Seed fixture data under postgres superuser/service role
savepoint test_fixtures;

insert into public.departments (id, name, slug, status)
values ('11111111-1111-4111-8111-111111111111', 'Pelayanan Pemuda', 'pelayanan-pemuda', 'published'),
       ('22222222-2222-4222-8222-222222222222', 'Departemen Rahasia', 'departemen-rahasia', 'draft');

insert into public.announcements (id, title, slug, summary, body, department_id, status, published_at)
values ('33333333-3333-4333-8333-333333333333', 'Warta Sabat Ini', 'warta-sabat-ini', 'Ringkasan warta', 'Isi lengkap warta', '11111111-1111-4111-8111-111111111111', 'published', now()),
       ('44444444-4444-4444-8444-444444444444', 'Draft Warta', 'draft-warta', 'Ringkasan draft', 'Isi draft', '11111111-1111-4111-8111-111111111111', 'draft', null),
       ('55555555-5555-4555-8555-555555555555', 'Arsip Warta', 'arsip-warta', 'Ringkasan arsip', 'Isi arsip', '11111111-1111-4111-8111-111111111111', 'archived', now() - interval '10 days');

insert into public.events (id, title, slug, summary, starts_at, ends_at, department_id, status, published_at)
values ('66666666-6666-4666-8666-666666666666', 'Kebaktian Sabat', 'kebaktian-sabat', 'Ibadah bersama', now(), now() + interval '2 hours', '11111111-1111-4111-8111-111111111111', 'published', now()),
       ('77777777-7777-4777-8777-777777777777', 'Rapat Internal Draft', 'rapat-internal-draft', 'Rapat komite', now(), now() + interval '1 hours', '11111111-1111-4111-8111-111111111111', 'draft', null);

-- Setup test profiles & staff roles
insert into auth.users (id, email)
values ('88888888-8888-4888-8888-888888888888', 'editor@test.com'),
       ('99999999-9999-4999-8999-999999999999', 'admin@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, is_active)
values ('88888888-8888-4888-8888-888888888888', 'Test Editor', true),
       ('99999999-9999-4999-8999-999999999999', 'Test Admin', true)
on conflict (id) do nothing;

insert into public.staff_roles (user_id, role)
values ('88888888-8888-4888-8888-888888888888', 'editor'),
       ('99999999-9999-4999-8999-999999999999', 'admin')
on conflict (user_id) do nothing;

-- 9. Test anon persona
set local role anon;
set local request.jwt.claim.sub = '';

-- Anon can read published
select results_eq(
  $$ select count(*)::int from public.announcements where status = 'published' $$,
  array[1],
  'anon can select published announcements'
);

-- Anon CANNOT see draft or archived announcements
select results_eq(
  $$ select count(*)::int from public.announcements where status != 'published' $$,
  array[0],
  'anon cannot see non-published announcements'
);

-- Anon CANNOT insert
select throws_ok(
  $$ insert into public.announcements (title, slug, summary, body, status) values ('Hacked', 'hacked', 'test', 'body', 'published') $$,
  '42501',
  null,
  'anon cannot insert announcements'
);

-- Anon CANNOT update
select results_eq(
  $$ update public.announcements set title = 'Changed' where id = '33333333-3333-4333-8333-333333333333' returning 1 $$,
  array[]::int[],
  'anon update on announcements affects 0 rows'
);

-- Anon CANNOT delete
select results_eq(
  $$ delete from public.announcements where id = '33333333-3333-4333-8333-333333333333' returning 1 $$,
  array[]::int[],
  'anon delete on announcements affects 0 rows'
);

-- 10. Test editor persona
set local role authenticated;
select set_config('request.jwt.claim.sub', '88888888-8888-4888-8888-888888888888', true);

-- Editor can see all announcements (published, draft, archived)
select results_eq(
  $$ select count(*)::int from public.announcements $$,
  array[3],
  'editor can view all announcements'
);

-- Editor can insert draft
select lives_ok(
  $$ insert into public.announcements (id, title, slug, summary, body, status)
     values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Editor Post', 'editor-post', 'Summary', 'Body', 'draft') $$,
  'editor can insert draft announcement'
);

-- Editor can update announcement
select lives_ok(
  $$ update public.announcements set summary = 'Updated summary' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' $$,
  'editor can update announcement'
);

-- Editor CANNOT delete permanently
select results_eq(
  $$ delete from public.announcements where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1 $$,
  array[]::int[],
  'editor delete on announcements affects 0 rows'
);

-- 11. Test admin persona
set local role authenticated;
select set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);

-- Admin CAN delete permanently
select results_eq(
  $$ delete from public.announcements where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1 $$,
  array[1],
  'admin can delete announcement permanently'
);

-- 12. Test constraint integrity
reset role;

-- Slug format rejection
select throws_ok(
  $$ insert into public.announcements (title, slug, summary, body) values ('Test', 'INVALID SLUG!', 'Sum', 'Body') $$,
  '23514',
  null,
  'invalid slug format is rejected'
);

-- Event date validity (ends_at < starts_at)
select throws_ok(
  $$ insert into public.events (title, slug, summary, starts_at, ends_at)
     values ('Invalid Event', 'invalid-event', 'Sum', now(), now() - interval '1 hour') $$,
  '23514',
  null,
  'event ends_at prior to starts_at is rejected'
);

-- 13. Test audit log integration
select ok(exists (
  select 1 from public.audit_logs where entity_type in ('departments', 'announcements', 'events')
), 'content mutations produce audit log entries');

select * from finish();
rollback;
