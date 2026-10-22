begin;
select no_plan();

-- Real Editor/Admin mutations; synthetic fixtures and audit rows are rolled back.
insert into auth.users (id, email) values
 ('81000000-0000-4000-8000-00000000000a', 'audit-delta-admin@example.invalid'),
 ('81000000-0000-4000-8000-00000000000e', 'audit-delta-editor@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('81000000-0000-4000-8000-00000000000a', 'Synthetic audit Admin', true),
 ('81000000-0000-4000-8000-00000000000e', 'Synthetic audit Editor', true);
insert into public.staff_roles (user_id, role) values
 ('81000000-0000-4000-8000-00000000000a', 'admin'),
 ('81000000-0000-4000-8000-00000000000e', 'editor');

set local role authenticated;
set local request.jwt.claim.sub = '81000000-0000-4000-8000-00000000000e';
insert into public.courses (id, title, slug, summary) values
 ('82000000-0000-4000-8000-000000000001', 'Summary course', 'audit-summary-course', 'AUDIT_PRIVATE_course_summary_old'),
 ('82000000-0000-4000-8000-000000000002', 'Multi course', 'audit-multi-course', 'AUDIT_PRIVATE_multi_course_old'),
 ('82000000-0000-4000-8000-000000000003', 'No-op course', 'audit-noop-course', 'AUDIT_PRIVATE_noop_course');
insert into public.course_lessons (id, course_id, title, slug, summary, body, position) values
 ('83000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000001', 'Summary lesson', 'summary-lesson', 'AUDIT_PRIVATE_lesson_summary_old', 'AUDIT_PRIVATE_summary_body', 1),
 ('83000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000001', 'Body lesson', 'body-lesson', 'AUDIT_PRIVATE_body_summary', 'AUDIT_PRIVATE_body_old', 2),
 ('83000000-0000-4000-8000-000000000003', '82000000-0000-4000-8000-000000000001', 'Multi lesson', 'multi-lesson', 'AUDIT_PRIVATE_multi_summary_old', 'AUDIT_PRIVATE_multi_body_old', 3),
 ('83000000-0000-4000-8000-000000000004', '82000000-0000-4000-8000-000000000001', 'Status body lesson', 'status-body-lesson', '', 'AUDIT_PRIVATE_status_body_old', 4),
 ('83000000-0000-4000-8000-000000000005', '82000000-0000-4000-8000-000000000001', 'No-op lesson', 'noop-lesson', 'AUDIT_PRIVATE_noop_summary', 'AUDIT_PRIVATE_noop_body', 5);

update public.courses set summary = 'AUDIT_PRIVATE_course_summary_new'
 where id = '82000000-0000-4000-8000-000000000001';
update public.course_lessons set summary = 'AUDIT_PRIVATE_lesson_summary_new'
 where id = '83000000-0000-4000-8000-000000000001';
update public.course_lessons set body = 'AUDIT_PRIVATE_body_new'
 where id = '83000000-0000-4000-8000-000000000002';
update public.course_lessons set status = 'published', body = 'AUDIT_PRIVATE_status_body_new'
 where id = '83000000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.audit_logs), 0, 'Editor still cannot read audit deltas');
select throws_ok($$ insert into public.audit_logs (action, entity_type) values ('content.updated', 'courses') $$,
 '42501', null, 'Editor still cannot forge audit deltas');

set local request.jwt.claim.sub = '81000000-0000-4000-8000-00000000000a';
update public.courses set title = 'Revised course', slug = 'audit-revised-course',
 summary = 'AUDIT_PRIVATE_multi_course_new', status = 'published'
 where id = '82000000-0000-4000-8000-000000000002';
update public.course_lessons set title = 'Revised lesson', slug = 'revised-lesson',
 summary = 'AUDIT_PRIVATE_multi_summary_new', status = 'published', body = 'AUDIT_PRIVATE_multi_body_new', position = 6
 where id = '83000000-0000-4000-8000-000000000003';
-- Supplied metadata is normalized by the existing prepare trigger. The changed
-- updater on these cross-actor no-ops must not appear as a content edit.
update public.courses set title = title, summary = summary, created_at = '2000-01-01',
 updated_at = '2000-01-01', created_by = null, updated_by = null
 where id = '82000000-0000-4000-8000-000000000003';
update public.course_lessons set body = body, position = position, created_at = '2000-01-01',
 updated_at = '2000-01-01', created_by = null, updated_by = null
 where id = '83000000-0000-4000-8000-000000000005';

select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '82000000-0000-4000-8000-000000000001' and action = 'content.updated'),
 '["summary"]'::jsonb, 'course summary-only revision identifies summary without its value');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '83000000-0000-4000-8000-000000000001' and action = 'content.updated'),
 '["summary"]'::jsonb, 'lesson summary-only revision identifies summary without its value');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '83000000-0000-4000-8000-000000000002' and action = 'content.updated'),
 '["body"]'::jsonb, 'lesson body-only revision identifies body without its value');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '82000000-0000-4000-8000-000000000002' and action = 'content.status_changed'),
 '["title","slug","summary","status"]'::jsonb, 'course multi-field publication identifies every mutable field in stable order');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '83000000-0000-4000-8000-000000000003' and action = 'content.status_changed'),
 '["title","slug","summary","status","body","position"]'::jsonb, 'lesson multi-field publication identifies every mutable field in stable order');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '83000000-0000-4000-8000-000000000004' and action = 'content.status_changed'),
 '["status","body"]'::jsonb, 'simultaneous status and body edit retains content.status_changed and both names');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '82000000-0000-4000-8000-000000000003' and action = 'content.updated'),
 '[]'::jsonb, 'course no-op excludes normalized timestamps and changed updater');
select is((select changes->'changed_fields' from public.audit_logs
 where entity_id = '83000000-0000-4000-8000-000000000005' and action = 'content.updated'),
 '[]'::jsonb, 'lesson no-op excludes identifiers, parent, normalized timestamps and changed updater');

select is((select count(*)::int from public.audit_logs
 where actor_id = '81000000-0000-4000-8000-00000000000e' and action = 'content.updated'
 and entity_id in ('82000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000001', '83000000-0000-4000-8000-000000000002')),
 3, 'summary/body revisions retain actual Editor actor and content.updated action');
select ok(exists(select 1 from public.audit_logs
 where entity_id = '83000000-0000-4000-8000-000000000003' and action = 'content.status_changed'
 and actor_id = auth.uid() and entity_type = 'course_lessons'
 and changes->>'course_id' = '82000000-0000-4000-8000-000000000001'
 and changes->>'title' = 'Revised lesson' and changes->>'slug' = 'revised-lesson'
 and changes->>'status' = 'published' and changes->>'old_status' = 'draft' and changes->>'new_status' = 'published'
 and changes->>'position' = '6' and changes->>'old_position' = '3' and changes->>'new_position' = '6'),
 'multi-field update retains Admin actor and existing lesson/status/position payload');
select ok(exists(select 1 from public.audit_logs
 where entity_id = '82000000-0000-4000-8000-000000000002' and action = 'content.status_changed'
 and actor_id = auth.uid() and entity_type = 'courses'
 and changes->>'title' = 'Revised course' and changes->>'slug' = 'audit-revised-course'
 and changes->>'old_status' = 'draft' and changes->>'new_status' = 'published'),
 'multi-field update retains existing course status payload');
select ok((select created_by = '81000000-0000-4000-8000-00000000000e'::uuid
 and updated_by = auth.uid() and created_at = now() and updated_at = now()
 from public.courses where id = '82000000-0000-4000-8000-000000000003'),
 'no-op keeps database attribution even when content delta is empty');

delete from public.course_lessons where course_id = '82000000-0000-4000-8000-000000000001';
delete from public.courses where id in ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000002', '82000000-0000-4000-8000-000000000003');
select is((select count(*)::int from public.audit_logs where actor_id = auth.uid()
 and entity_id in ('83000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000002',
 '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000005')
 and action = 'content.deleted' and changes->>'reason' = 'Penghapusan permanen lesson oleh Admin'),
 5, 'lesson deletion keeps existing Admin action and reason');
select is((select count(*)::int from public.audit_logs where actor_id = auth.uid()
 and entity_id in ('82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002','82000000-0000-4000-8000-000000000003')
 and action = 'content.deleted' and changes->>'reason' = 'Penghapusan permanen course oleh Admin'),
 3, 'course deletion keeps existing Admin action and reason');
select is((select count(*)::int from public.audit_logs where actor_id = '81000000-0000-4000-8000-00000000000e'
 and action = 'content.created' and entity_id in ('82000000-0000-4000-8000-000000000001','82000000-0000-4000-8000-000000000002',
 '82000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000001','83000000-0000-4000-8000-000000000002',
 '83000000-0000-4000-8000-000000000003','83000000-0000-4000-8000-000000000004','83000000-0000-4000-8000-000000000005')),
 8, 'creation retains Editor actor and content.created action');
select ok(not exists(select 1 from public.audit_logs
 where actor_id in ('81000000-0000-4000-8000-00000000000a','81000000-0000-4000-8000-00000000000e')
 and (changes ?| array['body','summary','old_body','new_body','old_summary','new_summary']
 or changes::text like '%AUDIT_PRIVATE_%')),
 'create/update/delete audit never copies body/summary keys or old/new private sentinels');

set local role anon;
set local request.jwt.claim.sub = '';
select throws_ok($$ select * from public.audit_logs $$, '42501', null, 'audit deltas remain private to anon');
reset role;
select ok(not has_function_privilege('anon', 'private.record_course_content_audit()', 'execute')
 and not has_function_privilege('authenticated', 'private.record_course_content_audit()', 'execute'),
 'API roles cannot call the audit trigger function');

select * from finish();
rollback;
