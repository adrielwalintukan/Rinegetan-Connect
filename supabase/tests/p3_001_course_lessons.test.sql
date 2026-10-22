begin;
select no_plan();

-- Fixtures are synthetic and every mutation is rolled back.
-- Missing tables must fail before the feature migration is applied.
select has_table('public', 'courses', 'courses exists');
select has_table('public', 'course_lessons', 'course_lessons exists');

insert into auth.users (id, email) values
 ('71000000-0000-4000-8000-00000000000a', 'p3001-admin@example.invalid'),
 ('71000000-0000-4000-8000-00000000000e', 'p3001-editor@example.invalid'),
 ('71000000-0000-4000-8000-00000000000f', 'p3001-inactive@example.invalid'),
 ('71000000-0000-4000-8000-00000000000c', 'p3001-no-role@example.invalid'),
 ('71000000-0000-4000-8000-00000000000d', 'p3001-lifecycle@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('71000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('71000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('71000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false),
 ('71000000-0000-4000-8000-00000000000d', 'Synthetic Lifecycle', true);
insert into public.staff_roles (user_id, role) values
 ('71000000-0000-4000-8000-00000000000a', 'admin'),
 ('71000000-0000-4000-8000-00000000000e', 'editor'),
 ('71000000-0000-4000-8000-00000000000f', 'editor'),
 ('71000000-0000-4000-8000-00000000000d', 'editor');

insert into public.courses (id, title, slug, status) values
 ('72000000-0000-4000-8000-000000000001', 'Synthetic public', 'synthetic-public', 'published'),
 ('72000000-0000-4000-8000-000000000002', 'Synthetic draft', 'synthetic-draft', 'draft'),
 ('72000000-0000-4000-8000-000000000003', 'Synthetic archive', 'synthetic-archive', 'archived');
insert into public.course_lessons (id, course_id, title, slug, body, position, status) values
 ('73000000-0000-4000-8000-000000000001', '72000000-0000-4000-8000-000000000001', 'Public lesson', 'lesson', 'Synthetic text only', 1, 'published'),
 ('73000000-0000-4000-8000-000000000002', '72000000-0000-4000-8000-000000000002', 'Hidden lesson', 'lesson', 'Synthetic private text', 1, 'published'),
 ('73000000-0000-4000-8000-000000000003', '72000000-0000-4000-8000-000000000003', 'Archived parent lesson', 'lesson', 'Synthetic text only', 1, 'published'),
 ('73000000-0000-4000-8000-000000000004', '72000000-0000-4000-8000-000000000001', 'Draft lesson', 'draft-lesson', '', 3, 'draft'),
 ('73000000-0000-4000-8000-000000000005', '72000000-0000-4000-8000-000000000001', 'Archived lesson', 'archived-lesson', '', 5, 'archived');

-- Simulate records published in an earlier transaction: now() is stable inside pgTAP.
-- Disable only metadata triggers while seeding historical state; all behavior runs enabled.
alter table public.courses disable trigger courses_prepare_content;
alter table public.course_lessons disable trigger course_lessons_prepare_content;
update public.courses set created_at = '2001-01-01Z', updated_at = '2002-01-01Z', published_at = '2003-01-01Z'
 where id = '72000000-0000-4000-8000-000000000001';
update public.course_lessons set created_at = '2001-01-01Z', updated_at = '2002-01-01Z', published_at = '2003-01-01Z'
 where id = '73000000-0000-4000-8000-000000000001';
alter table public.courses enable trigger courses_prepare_content;
alter table public.course_lessons enable trigger course_lessons_prepare_content;

set local role anon;
set local request.jwt.claim.sub = '';
select results_eq($$ select id from public.courses order by id $$,
 array['72000000-0000-4000-8000-000000000001'::uuid], 'anon sees only Published course');
select results_eq($$ select id from public.course_lessons order by id $$,
 array['73000000-0000-4000-8000-000000000001'::uuid], 'anon sees only Published lesson under Published parent');
select results_eq($$ select id from public.course_lessons where id = '73000000-0000-4000-8000-000000000002' $$,
 array[]::uuid[], 'Published lesson under Draft course is hidden by direct ID');
select results_eq($$ select id from public.course_lessons where id = '73000000-0000-4000-8000-000000000003' $$,
 array[]::uuid[], 'Published lesson under Archived course is hidden by direct ID');
select throws_ok($$ select created_by from public.courses $$, '42501', null, 'anon cannot select course creator');
select throws_ok($$ select updated_by from public.courses $$, '42501', null, 'anon cannot select course updater');
select throws_ok($$ select created_by from public.course_lessons $$, '42501', null, 'anon cannot select lesson creator');
select throws_ok($$ select updated_by from public.course_lessons $$, '42501', null, 'anon cannot select lesson updater');
select throws_ok($$ insert into public.courses (title, slug) values ('Denied', 'denied') $$, '42501', null, 'anon cannot insert course');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000001', 'Denied', 'denied', 2) $$, '42501', null, 'anon cannot insert lesson');
select throws_ok($$ update public.courses set title = 'Denied' $$, '42501', null, 'anon cannot update course');
select throws_ok($$ update public.course_lessons set title = 'Denied' $$, '42501', null, 'anon cannot update lesson');
select throws_ok($$ delete from public.courses $$, '42501', null, 'anon cannot delete course');
select throws_ok($$ delete from public.course_lessons $$, '42501', null, 'anon cannot delete lesson');
select throws_ok($$ select * from public.audit_logs $$, '42501', null, 'audit is private to anon');

-- Both non-staff and inactive staff get exactly the public visibility/mutation boundary.
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000c', true);
select results_eq($$ select id from public.courses order by id $$, array['72000000-0000-4000-8000-000000000001'::uuid], 'non-staff only reads public course');
select results_eq($$ select id from public.course_lessons order by id $$, array['73000000-0000-4000-8000-000000000001'::uuid], 'non-staff only reads public lesson');
select throws_ok($$ insert into public.courses (title, slug) values ('Denied', 'denied') $$, '42501', null, 'non-staff cannot insert course');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000001', 'Denied', 'denied', 2) $$, '42501', null, 'non-staff cannot insert lesson');
select results_eq($$ update public.courses set title = 'Denied' returning id $$, array[]::uuid[], 'non-staff cannot update course');
select results_eq($$ update public.course_lessons set title = 'Denied' returning id $$, array[]::uuid[], 'non-staff cannot update lesson');
select results_eq($$ delete from public.courses returning id $$, array[]::uuid[], 'non-staff cannot delete course');
select results_eq($$ delete from public.course_lessons returning id $$, array[]::uuid[], 'non-staff cannot delete lesson');
select is((select count(*)::int from public.audit_logs), 0, 'non-staff cannot read audit');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000f', true);
select results_eq($$ select id from public.courses order by id $$, array['72000000-0000-4000-8000-000000000001'::uuid], 'inactive Editor only reads public course');
select results_eq($$ select id from public.course_lessons order by id $$, array['73000000-0000-4000-8000-000000000001'::uuid], 'inactive Editor only reads public lesson');
select throws_ok($$ insert into public.courses (title, slug) values ('Denied', 'denied') $$, '42501', null, 'inactive Editor cannot insert course');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000001', 'Denied', 'denied', 2) $$, '42501', null, 'inactive Editor cannot insert lesson');
select results_eq($$ update public.courses set title = 'Denied' returning id $$, array[]::uuid[], 'inactive Editor cannot update course');
select results_eq($$ update public.course_lessons set title = 'Denied' returning id $$, array[]::uuid[], 'inactive Editor cannot update lesson');
select results_eq($$ delete from public.courses returning id $$, array[]::uuid[], 'inactive Editor cannot delete course');
select results_eq($$ delete from public.course_lessons returning id $$, array[]::uuid[], 'inactive Editor cannot delete lesson');

select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000e', true);
select is((select count(*)::int from public.courses), 3, 'active Editor reads every course');
select is((select count(*)::int from public.course_lessons), 5, 'active Editor reads every lesson');
select lives_ok($$ insert into public.courses (id, title, slug, created_by, updated_by, created_at, updated_at, published_at)
 values ('72000000-0000-4000-8000-000000000004', 'Editor course', 'editor-course', '71000000-0000-4000-8000-00000000000a', '71000000-0000-4000-8000-00000000000a', '2000-01-01', '2000-01-01', '2000-01-01') $$,
 'Editor creates course while spoofed metadata is ignored');
select ok((select created_by = auth.uid() and updated_by = auth.uid() and created_at = now() and updated_at = now() and published_at is null and status = 'draft' and summary = '' from public.courses where id = '72000000-0000-4000-8000-000000000004'), 'course INSERT metadata/defaults come from database');
select lives_ok($$ insert into public.course_lessons (id, course_id, title, slug, position, status, body, created_by, updated_by, created_at, updated_at, published_at)
 values ('73000000-0000-4000-8000-000000000006', '72000000-0000-4000-8000-000000000004', 'Editor lesson', 'editor-lesson', 2, 'published', 'Synthetic audit body sentinel', '71000000-0000-4000-8000-00000000000a', '71000000-0000-4000-8000-00000000000a', '2000-01-01', '2000-01-01', '2000-01-01') $$,
 'Editor may insert Published lesson directly below Draft course');
select ok((select created_by = auth.uid() and updated_by = auth.uid() and created_at = now() and updated_at = now() and published_at = now() from public.course_lessons where id = '73000000-0000-4000-8000-000000000006'), 'lesson INSERT ignores forged attribution and publication time');
select lives_ok($$ update public.courses set title = 'Revised', slug = 'editor-revised', created_by = null, updated_by = '71000000-0000-4000-8000-00000000000a', created_at = '2000-01-01', updated_at = '2000-01-01', published_at = '2000-01-01' where id = '72000000-0000-4000-8000-000000000004' $$, 'Editor revises Draft slug and spoofed metadata');
select ok((select created_by = auth.uid() and updated_by = auth.uid() and created_at = now() and updated_at = now() and published_at is null from public.courses where id = '72000000-0000-4000-8000-000000000004'), 'course UPDATE preserves creator/time and rejects NULL creator spoof');
select lives_ok($$ update public.course_lessons set title = 'Revised Published lesson', body = 'Revised synthetic audit body sentinel', position = 4, created_by = null, updated_by = null, created_at = '2000-01-01', updated_at = '2000-01-01', published_at = null where id = '73000000-0000-4000-8000-000000000006' $$, 'Editor revises Published lesson without withdrawing it');
select ok((select status = 'published' and published_at = now() and created_at = now() and updated_at = now() and created_by = auth.uid() and updated_by = auth.uid() and position = 4 from public.course_lessons where id = '73000000-0000-4000-8000-000000000006'), 'lesson UPDATE preserves publication and trusted metadata');
select results_eq($$ delete from public.courses where id = '72000000-0000-4000-8000-000000000004' returning id $$, array[]::uuid[], 'Editor cannot permanently delete course');
select results_eq($$ delete from public.course_lessons where id = '73000000-0000-4000-8000-000000000006' returning id $$, array[]::uuid[], 'Editor cannot permanently delete lesson');
select is((select count(*)::int from public.audit_logs), 0, 'Editor cannot read audit');
select throws_ok($$ insert into public.audit_logs (action, entity_type) values ('content.created', 'courses') $$, '42501', null, 'Editor cannot forge audit log');

-- Constraints run under an authorized Editor, never hidden by a denied RLS write.
select throws_ok($$ insert into public.courses (title, slug) values ('', 'empty-title') $$, '23514', null, 'course requires nonempty title');
select throws_ok($$ insert into public.courses (title, slug) values (' padded ', 'padded-title') $$, '23514', null, 'course title must be trimmed');
select throws_ok($$ insert into public.courses (title, slug) values (repeat('a', 201), 'long-title') $$, '23514', null, 'course title max 200');
select throws_ok($$ insert into public.courses (title, slug) values ('Invalid', 'UPPER slug') $$, '23514', null, 'course slug format');
select throws_ok($$ insert into public.courses (title, slug) values ('Invalid', repeat('a', 221)) $$, '23514', null, 'course slug max 220');
select throws_ok($$ insert into public.courses (title, slug, summary) values ('Invalid', 'summary', repeat('a', 501)) $$, '23514', null, 'course summary max 500');
select throws_ok($$ insert into public.courses (title, slug, summary) values ('Invalid', 'summary-trim', ' padded ') $$, '23514', null, 'course summary must be trimmed');
select throws_ok($$ insert into public.courses (title, slug) values ('Duplicate', 'synthetic-public') $$, '23505', null, 'course slug globally unique');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', '', 'empty', 5) $$, '23514', null, 'lesson requires nonempty title');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', ' padded ', 'padded', 5) $$, '23514', null, 'lesson title must be trimmed');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', repeat('a',201), 'long', 5) $$, '23514', null, 'lesson title max 200');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'Invalid SLUG', 5) $$, '23514', null, 'lesson slug format');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', repeat('a',221), 5) $$, '23514', null, 'lesson slug max 220');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, summary, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'summary', repeat('a',501), 5) $$, '23514', null, 'lesson summary max 500');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, summary, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'summary-trim', ' padded ', 5) $$, '23514', null, 'lesson summary trimmed');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, body, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'long-body', repeat('a',50001), 5) $$, '23514', null, 'lesson body max 50000');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, body, position, status) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'empty-published', E' \t\n\r ', 5, 'published') $$, '23514', null, 'Published lesson rejects all whitespace body');
select throws_ok($$ update public.course_lessons set body = E'\t\n ' where id = '73000000-0000-4000-8000-000000000006' $$, '23514', null, 'Published revision cannot clear body');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'zero', 0) $$, '23514', null, 'position must be positive');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', 'Invalid', 'fraction', 1.5::text::integer) $$, '22P02', null, 'fractional position rejected at integer input boundary');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', 'Duplicate', 'editor-lesson', 5) $$, '23505', null, 'lesson slug unique per course');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000004', 'Duplicate', 'duplicate-position', 4) $$, '23505', null, 'lesson position unique per course');
select throws_ok($$ update public.course_lessons set position = 3 where id = '73000000-0000-4000-8000-000000000001' $$, '23505', null, 'reorder into occupied position rejected');
select throws_ok($$ insert into public.course_lessons (course_id, title, slug, position) values ('72000000-0000-4000-8000-000000000099', 'Orphan', 'orphan', 1) $$, '23503', null, 'missing parent rejected');
select throws_ok($$ update public.courses set id = '72000000-0000-4000-8000-000000000099' where id = '72000000-0000-4000-8000-000000000004' $$, '23514', null, 'course ID immutable');
select throws_ok($$ update public.course_lessons set id = '73000000-0000-4000-8000-000000000099' where id = '73000000-0000-4000-8000-000000000006' $$, '23514', null, 'lesson ID immutable');
select throws_ok($$ update public.course_lessons set course_id = '72000000-0000-4000-8000-000000000001' where id = '73000000-0000-4000-8000-000000000006' $$, '23514', null, 'lesson cannot move course');
select throws_ok($$ update public.course_lessons set slug = 'changed' where id = '73000000-0000-4000-8000-000000000006' $$, '23514', null, 'Published lesson slug locked');

select lives_ok($$ update public.courses set title = 'Historical revision', created_at = '1999-01-01', updated_at = '1999-01-01', published_at = null where id = '72000000-0000-4000-8000-000000000001' $$, 'Editor revises historical Published course');
select ok((select created_at = '2001-01-01Z'::timestamptz and updated_at = now() and published_at = '2003-01-01Z'::timestamptz and status = 'published' from public.courses where id = '72000000-0000-4000-8000-000000000001'), 'historical course metadata remains stable across transactions');
select lives_ok($$ update public.course_lessons set status = 'draft', published_at = null where id = '73000000-0000-4000-8000-000000000001' $$, 'Editor withdraws historical Published lesson');
select throws_ok($$ update public.course_lessons set slug = 'withdrawn-changed' where id = '73000000-0000-4000-8000-000000000001' $$, '23514', null, 'withdrawn lesson slug stays locked');
select lives_ok($$ update public.course_lessons set status = 'archived' where id = '73000000-0000-4000-8000-000000000001' $$, 'Editor archives withdrawn lesson');
select lives_ok($$ update public.course_lessons set status = 'published', published_at = '1999-01-01', created_at = '1999-01-01', body = 'Historical revised synthetic text' where id = '73000000-0000-4000-8000-000000000001' $$, 'Editor republishes historical lesson');
select ok((select created_at = '2001-01-01Z'::timestamptz and published_at = '2003-01-01Z'::timestamptz and status = 'published' from public.course_lessons where id = '73000000-0000-4000-8000-000000000001'), 'lesson first publication survives archive and republication across transactions');
select lives_ok($$ update public.course_lessons set slug = 'corrected-draft-lesson' where id = '73000000-0000-4000-8000-000000000004' $$, 'lesson slug can be corrected before first publication');

-- Parent visibility follows the current database status, even with lookup by ID.
update public.courses set status = 'published' where id = '72000000-0000-4000-8000-000000000002';
set local role anon;
set local request.jwt.claim.sub = '';
select results_eq($$ select id from public.course_lessons where id = '73000000-0000-4000-8000-000000000002' $$, array['73000000-0000-4000-8000-000000000002'::uuid], 'publishing parent exposes Published child');
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000e', true);
update public.courses set status = 'draft' where id = '72000000-0000-4000-8000-000000000002';
select throws_ok($$ update public.courses set slug = 'changed-after-first-publish' where id = '72000000-0000-4000-8000-000000000002' $$, '23514', null, 'course slug remains locked after withdrawal');
set local role anon;
set local request.jwt.claim.sub = '';
select results_eq($$ select id from public.course_lessons where id = '73000000-0000-4000-8000-000000000002' $$, array[]::uuid[], 'withdrawing parent immediately hides Published child');
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000e', true);
update public.courses set status = 'archived' where id = '72000000-0000-4000-8000-000000000002';
set local role anon;
set local request.jwt.claim.sub = '';
select results_eq($$ select id from public.course_lessons where id = '73000000-0000-4000-8000-000000000002' $$, array[]::uuid[], 'archiving parent keeps Published child hidden');
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000e', true);
update public.courses set status = 'published', published_at = '2000-01-01' where id = '72000000-0000-4000-8000-000000000002';
select ok((select published_at = now() from public.courses where id = '72000000-0000-4000-8000-000000000002'), 'republishing course preserves first database publication time');
select lives_ok($$ update public.courses set title = 'Published revision' where id = '72000000-0000-4000-8000-000000000002' $$, 'Published course can be revised in place');
set local role anon;
set local request.jwt.claim.sub = '';
select results_eq($$ select id from public.course_lessons where id = '73000000-0000-4000-8000-000000000002' $$, array['73000000-0000-4000-8000-000000000002'::uuid], 'republishing parent restores Published child');
select is((select title from public.courses where id = '72000000-0000-4000-8000-000000000002'), 'Published revision', 'Published course revision immediately visible publicly');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000a', true);
select is((select count(*)::int from public.courses), 4, 'Admin reads every course');
select is((select count(*)::int from public.course_lessons), 6, 'Admin reads every lesson');
select lives_ok($$ insert into public.courses (id, title, slug, status) values ('72000000-0000-4000-8000-000000000005', 'Empty Published', 'empty-published', 'published') $$, 'Admin may publish empty course directly');
select ok((select published_at = now() and created_by = auth.uid() from public.courses where id = '72000000-0000-4000-8000-000000000005'), 'direct Published course INSERT receives database metadata');
select lives_ok($$ update public.courses set summary = 'Admin revised', created_by = auth.uid(), updated_by = null where id = '72000000-0000-4000-8000-000000000004' $$, 'Admin updates Editor course');
select ok((select created_by = '71000000-0000-4000-8000-00000000000e'::uuid and updated_by = auth.uid() from public.courses where id = '72000000-0000-4000-8000-000000000004'), 'cross-user course update preserves creator and records actual updater');
select lives_ok($$ update public.course_lessons set summary = 'Admin revised', created_by = auth.uid(), updated_by = null where id = '73000000-0000-4000-8000-000000000006' $$, 'Admin updates Editor lesson');
select ok((select created_by = '71000000-0000-4000-8000-00000000000e'::uuid and updated_by = auth.uid() from public.course_lessons where id = '73000000-0000-4000-8000-000000000006'), 'cross-user lesson update preserves creator and records actual updater');
select ok(exists(select 1 from public.audit_logs where entity_id = '73000000-0000-4000-8000-000000000001' and action = 'content.status_changed' and changes->>'old_status' = 'archived' and changes->>'new_status' = 'published'), 'lesson audit records independent status lifecycle');

select throws_ok($$ delete from public.courses where id = '72000000-0000-4000-8000-000000000004' $$, '23503', null, 'Admin cannot delete course that still has lessons');
select is((select count(*)::int from public.course_lessons where course_id = '72000000-0000-4000-8000-000000000004'), 1, 'FK RESTRICT preserves lessons');
select ok(exists(select 1 from public.audit_logs where entity_id = '73000000-0000-4000-8000-000000000006' and entity_type = 'course_lessons' and action = 'content.created' and actor_id = '71000000-0000-4000-8000-00000000000e' and changes->>'course_id' = '72000000-0000-4000-8000-000000000004' and changes->>'position' = '2'), 'lesson creation audit records session actor, relation and position');
select ok(exists(select 1 from public.audit_logs where entity_id = '73000000-0000-4000-8000-000000000006' and action = 'content.updated' and changes->>'old_position' = '2' and changes->>'new_position' = '4'), 'lesson reorder audit records old and new positions');
select ok(exists(select 1 from public.audit_logs where entity_id = '72000000-0000-4000-8000-000000000002' and action = 'content.status_changed' and changes->>'old_status' = 'archived' and changes->>'new_status' = 'published'), 'course publication audit records old and new status');
select ok(not exists(select 1 from public.audit_logs where entity_type in ('courses', 'course_lessons') and (changes ? 'body' or changes::text like '%audit body sentinel%')), 'audit never stores lesson body key or body copy');
select results_eq($$ delete from public.course_lessons where id = '73000000-0000-4000-8000-000000000006' returning id $$, array['73000000-0000-4000-8000-000000000006'::uuid], 'Admin permanently deletes lesson');
select results_eq($$ delete from public.courses where id = '72000000-0000-4000-8000-000000000004' returning id $$, array['72000000-0000-4000-8000-000000000004'::uuid], 'Admin deletes course after lessons removed');
select ok(exists(select 1 from public.audit_logs where entity_id = '73000000-0000-4000-8000-000000000006' and action = 'content.deleted' and actor_id = auth.uid() and changes->>'reason' = 'Penghapusan permanen lesson oleh Admin'), 'lesson deletion audit includes standard Admin reason without RPC');
select ok(exists(select 1 from public.audit_logs where entity_id = '72000000-0000-4000-8000-000000000004' and action = 'content.deleted' and actor_id = auth.uid() and changes->>'reason' = 'Penghapusan permanen course oleh Admin'), 'course deletion audit includes standard Admin reason without RPC');

-- Auth deletion must SET NULL safely without permitting a caller to clear metadata.
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000d', true);
insert into public.courses (id, title, slug) values ('72000000-0000-4000-8000-000000000006', 'Lifecycle fixture', 'lifecycle-fixture');
insert into public.course_lessons (id, course_id, title, slug, position) values ('73000000-0000-4000-8000-000000000007', '72000000-0000-4000-8000-000000000006', 'Lifecycle lesson', 'lifecycle-lesson', 1);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000e', true);
insert into public.courses (id, title, slug) values ('72000000-0000-4000-8000-000000000007', 'Surviving creator fixture', 'surviving-creator-fixture');
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000d', true);
update public.courses set summary = 'Disposable updater' where id = '72000000-0000-4000-8000-000000000007';
insert into public.course_lessons (id, course_id, title, slug, position) values ('73000000-0000-4000-8000-000000000008', '72000000-0000-4000-8000-000000000006', 'Surviving updater fixture', 'surviving-updater-fixture', 2);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-00000000000a', true);
update public.course_lessons set summary = 'Surviving updater' where id = '73000000-0000-4000-8000-000000000008';
reset role;
set local request.jwt.claim.sub = '';
select lives_ok($$ delete from auth.users where id = '71000000-0000-4000-8000-00000000000d' $$, 'actual Auth creator deletion succeeds with actor FK SET NULL');
select ok((select created_by is null and updated_by is null from public.courses where id = '72000000-0000-4000-8000-000000000006'), 'course survives Auth deletion with NULL actors');
select ok((select created_by is null and updated_by is null from public.course_lessons where id = '73000000-0000-4000-8000-000000000007'), 'lesson survives Auth deletion with NULL actors');
select ok((select created_by = '71000000-0000-4000-8000-00000000000e'::uuid and updated_by is null from public.courses where id = '72000000-0000-4000-8000-000000000007'), 'deleting updater preserves surviving course creator');
select ok((select created_by is null and updated_by = '71000000-0000-4000-8000-00000000000a'::uuid from public.course_lessons where id = '73000000-0000-4000-8000-000000000008'), 'deleting creator preserves surviving lesson updater');
select ok(not has_function_privilege('anon','private.prepare_course_content()','execute') and not has_function_privilege('authenticated','private.prepare_course_content()','execute'), 'metadata trigger cannot be called by API roles');
select ok(not has_function_privilege('anon','private.record_course_content_audit()','execute') and not has_function_privilege('authenticated','private.record_course_content_audit()','execute'), 'audit trigger cannot be called by API roles');

select * from finish();
rollback;
