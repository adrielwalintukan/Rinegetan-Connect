-- supabase/tests/p3_003_course_imports.test.sql
begin;
select no_plan();
-- Synthetic fixtures only; everything is rolled back.
select has_table('public', 'course_imports', 'course_imports exists');

insert into auth.users (id, email) values
 ('81000000-0000-4000-8000-00000000000a', 'p3003-admin@example.invalid'),
 ('81000000-0000-4000-8000-00000000000e', 'p3003-editor@example.invalid'),
 ('81000000-0000-4000-8000-00000000000c', 'p3003-no-role@example.invalid'),
 ('81000000-0000-4000-8000-00000000000f', 'p3003-inactive@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('81000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('81000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('81000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false);
insert into public.staff_roles (user_id, role) values
 ('81000000-0000-4000-8000-00000000000a', 'admin'),
 ('81000000-0000-4000-8000-00000000000e', 'editor'),
 ('81000000-0000-4000-8000-00000000000f', 'admin');
insert into public.courses (id, title, slug) values ('82000000-0000-4000-8000-000000000001', 'Existing', 'existing-course');

create temporary table import_payload as select jsonb_build_object(
  'format', 'rinegetan-course-import/1', 'language', 'id',
  'source', jsonb_build_object('name', 'Sumber', 'url', null, 'rights_holder', 'Pemegang'),
  'license', jsonb_build_object('name', 'Izin', 'url', null, 'notes', ''),
  'course', jsonb_build_object('title', 'Seri Impor', 'slug', 'seri-impor', 'summary', 'Ringkas'),
  'lessons', jsonb_build_array(
    jsonb_build_object('position', 1, 'title', 'Satu', 'slug', 'satu', 'summary', '', 'body', 'Isi satu.', 'status', 'published'),
    jsonb_build_object('position', 2, 'title', 'Dua', 'slug', 'dua', 'summary', '', 'body', 'Isi dua.'))) as p;
grant select on import_payload to anon, authenticated;

-- anon: no access at all
set local role anon;
select throws_ok($$ select * from public.course_imports $$, '42501', null, 'anon cannot read imports');
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '42501', null, 'anon cannot approve');
reset role;

-- non-staff cannot read or insert
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000c', true);
select results_eq($$ select id from public.course_imports $$, array[]::uuid[], 'non-staff sees no imports');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select p, 'Seri Impor', 'seri-impor', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$, '42501', null, 'non-staff cannot insert');

-- Editor inserts; forged lifecycle fields are overwritten
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000e', true);
insert into public.course_imports (id, status, payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name, created_by, reviewed_by, reviewed_at, review_note, course_id)
  select '83000000-0000-4000-8000-000000000001', 'approved', p, 'Seri Impor', 'seri-impor', 2, 'Sumber', 'Pemegang', 'Izin',
    '81000000-0000-4000-8000-00000000000a', '81000000-0000-4000-8000-00000000000a', now(), 'palsu', '82000000-0000-4000-8000-000000000001' from import_payload;
select results_eq($$ select status, created_by, reviewed_by, review_note, course_id from public.course_imports where id = '83000000-0000-4000-8000-000000000001' $$,
  $$ values ('pending'::text, '81000000-0000-4000-8000-00000000000e'::uuid, null::uuid, null::text, null::uuid) $$, 'insert forced to pending with session creator');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select p, 'Seri Impor', 'seri-impor', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$, '23505', null, 'pending slug is unique');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select jsonb_set(jsonb_set(p, '{course,slug}', '"existing-course"'), '{course,title}', '"Existing"'), 'Existing', 'existing-course', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$,
  '23505', 'course_import_slug_taken', 'slug used by a course is rejected');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select jsonb_set(jsonb_set(p, '{course,slug}', '"lain"'), '{course,title}', '"Lain"'), 'Lain', 'lain', 3, 'Sumber', 'Pemegang', 'Izin' from import_payload $$,
  '23514', null, 'lesson_count must match payload');
select throws_ok($$ insert into public.course_imports (payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select jsonb_set(jsonb_set(jsonb_set(p, '{course,slug}', '"besar"'), '{course,title}', '"Besar"'), '{license,notes}', to_jsonb(repeat('a', 2100000))), 'Besar', 'besar', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload $$,
  '23514', null, 'payload over 2 MB is rejected');
select results_eq($$ update public.course_imports set status = 'rejected', review_note = 'x' returning id $$, array[]::uuid[], 'Editor cannot reject');
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '42501', 'course_import_admin_only', 'Editor cannot approve');
select throws_ok($$ delete from public.course_imports $$, '42501', null, 'nobody can delete imports');

-- Inactive Admin cannot approve
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000f', true);
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '42501', 'course_import_admin_only', 'inactive Admin cannot approve');

-- Admin: direct approve, payload edit and reject without note are refused
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000a', true);
select throws_ok($$ update public.course_imports set status = 'approved' where id = '83000000-0000-4000-8000-000000000001' $$, '42501', null, 'Admin cannot approve by direct update');
select throws_ok($$ update public.course_imports set status = 'rejected', review_note = 'x', license_name = 'Ubah' where id = '83000000-0000-4000-8000-000000000001' $$, '23514', 'course_import_immutable', 'license data is immutable');
select throws_ok($$ update public.course_imports set status = 'rejected' where id = '83000000-0000-4000-8000-000000000001' $$, '42501', null, 'reject requires a note');

-- Approve creates Draft course + lessons from allowed fields only
select lives_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, 'Admin approves');
select results_eq($$ select c.status::text, c.created_by, i.status, i.reviewed_by, i.course_id = c.id
  from public.course_imports i join public.courses c on c.slug = 'seri-impor' where i.id = '83000000-0000-4000-8000-000000000001' $$,
  $$ values ('draft'::text, '81000000-0000-4000-8000-00000000000a'::uuid, 'approved'::text, '81000000-0000-4000-8000-00000000000a'::uuid, true) $$, 'approved import links a Draft course');
select results_eq($$ select l.position, l.status::text from public.course_lessons l join public.courses c on c.id = l.course_id where c.slug = 'seri-impor' order by l.position $$,
  $$ values (1, 'draft'::text), (2, 'draft'::text) $$, 'lessons are Draft even if payload says published');
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000001') $$, '23514', 'course_import_not_pending', 'second approval is rejected');
select results_eq($$ select action from public.audit_logs where entity_type = 'course_imports' and entity_id = '83000000-0000-4000-8000-000000000001' order by occurred_at, action $$,
  $$ values ('course_import.approved'::text), ('course_import.created'::text) $$, 'import audit recorded');
select is((select count(*)::int from public.audit_logs where entity_type = 'course_imports' and changes ? 'payload'), 0, 'audit never stores payload');

-- Slug conflict at approval rolls everything back
reset role;
insert into public.course_imports (id, payload, course_title, course_slug, lesson_count, source_name, rights_holder, license_name)
  select '83000000-0000-4000-8000-000000000002', jsonb_set(jsonb_set(p, '{course,slug}', '"konflik"'), '{course,title}', '"Konflik"'), 'Konflik', 'konflik', 2, 'Sumber', 'Pemegang', 'Izin' from import_payload;
insert into public.courses (title, slug) values ('Konflik CMS', 'konflik');
set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-00000000000a', true);
select throws_ok($$ select public.approve_course_import('83000000-0000-4000-8000-000000000002') $$, '23505', null, 'slug conflict aborts approval');
select results_eq($$ select status from public.course_imports where id = '83000000-0000-4000-8000-000000000002' $$, $$ values ('pending'::text) $$, 'import stays pending after failed approval');
select lives_ok($$ update public.course_imports set status = 'rejected', review_note = 'Slug sudah dipakai' where id = '83000000-0000-4000-8000-000000000002' $$, 'Admin rejects with note');
select results_eq($$ select status, reviewed_by from public.course_imports where id = '83000000-0000-4000-8000-000000000002' $$,
  $$ values ('rejected'::text, '81000000-0000-4000-8000-00000000000a'::uuid) $$, 'reject records reviewer');

-- FK cleanup still works on decided imports
reset role;
delete from public.course_lessons where course_id = (select course_id from public.course_imports where id = '83000000-0000-4000-8000-000000000001');
delete from public.courses where slug = 'seri-impor';
select results_eq($$ select status, course_id from public.course_imports where id = '83000000-0000-4000-8000-000000000001' $$,
  $$ values ('approved'::text, null::uuid) $$, 'deleting the course clears course_id only');

select * from finish();
rollback;
