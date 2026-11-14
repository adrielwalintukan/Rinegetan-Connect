-- supabase/tests/p3_006_pastoral_retention.test.sql
begin;
select no_plan();
-- Synthetic fixtures only; everything is rolled back.
select has_function('public', 'purge_expired_pastoral_data', 'purge function exists');
select has_function('public', 'expired_pastoral_counts', 'expired count function exists');
select has_function('public', 'record_pastoral_access', array['integer', 'integer', 'integer'], 'access audit function exists');

insert into auth.users (id, email) values
 ('97000000-0000-4000-8000-00000000000a', 'p3006-admin@example.invalid'),
 ('97000000-0000-4000-8000-00000000000e', 'p3006-editor@example.invalid'),
 ('97000000-0000-4000-8000-00000000000f', 'p3006-inactive@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('97000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('97000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('97000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false);
insert into public.staff_roles (user_id, role) values
 ('97000000-0000-4000-8000-00000000000a', 'admin'),
 ('97000000-0000-4000-8000-00000000000e', 'editor'),
 ('97000000-0000-4000-8000-00000000000f', 'admin');

-- Rows on both sides of the cut-off (24 months minus 120 days). Replica mode skips the
-- insert triggers that would force created_at to now().
set local session_replication_role = replica;
insert into public.study_interest_leads (id, name, contact, consent_version, created_at) values
 ('98000000-0000-4000-8000-000000000001', 'Lama', 'lama@example.invalid', 'v', now() - interval '24 months' + interval '119 days'),
 ('98000000-0000-4000-8000-000000000002', 'Baru', 'baru@example.invalid', 'v', now() - interval '24 months' + interval '121 days');
insert into public.prayer_requests (id, request, consent_version, created_at) values
 ('98000000-0000-4000-8000-000000000003', 'Doa lama', 'v', now() - interval '23 months'),
 ('98000000-0000-4000-8000-000000000004', 'Doa baru', 'v', now() - interval '24 months' + interval '121 days');
insert into public.visitor_submissions (id, name, contact, consent_version, created_at) values
 ('98000000-0000-4000-8000-000000000005', 'Tamu lama', 'lama@example.invalid', 'v', now() - interval '24 months' + interval '119 days'),
 ('98000000-0000-4000-8000-000000000006', 'Tamu baru', 'baru@example.invalid', 'v', now() - interval '1 day');
set local session_replication_role = origin;

select is(private.pastoral_retention_cutoff(), now() - interval '24 months' + interval '120 days', 'cut-off is 24 months minus 120 days');

-- anon and service_role: no execute
set local role anon;
select throws_ok($$ select * from public.expired_pastoral_counts() $$, '42501', null, 'anon cannot count expired rows');
select throws_ok($$ select * from public.purge_expired_pastoral_data() $$, '42501', null, 'anon cannot purge');
select throws_ok($$ select public.record_pastoral_access(0, 0, 0) $$, '42501', null, 'anon cannot record access');
reset role;
set local role service_role;
select throws_ok($$ select * from public.purge_expired_pastoral_data() $$, '42501', null, 'service_role cannot purge');
select throws_ok($$ select public.record_pastoral_access(0, 0, 0) $$, '42501', null, 'service_role cannot record access');
reset role;

-- Editor and inactive Admin: rejected inside the functions
set local role authenticated;
select throws_ok($$ select private.pastoral_retention_cutoff() $$, '42501', null, 'authenticated cannot call the private cut-off');
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-00000000000e', true);
select throws_ok($$ select * from public.expired_pastoral_counts() $$, '42501', 'pastoral_admin_only', 'Editor cannot count expired rows');
select throws_ok($$ select * from public.purge_expired_pastoral_data() $$, '42501', 'pastoral_admin_only', 'Editor cannot purge');
select throws_ok($$ select public.record_pastoral_access(0, 0, 0) $$, '42501', 'pastoral_admin_only', 'Editor cannot record access');
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-00000000000f', true);
select throws_ok($$ select * from public.expired_pastoral_counts() $$, '42501', 'pastoral_admin_only', 'inactive Admin cannot count expired rows');
select throws_ok($$ select * from public.purge_expired_pastoral_data() $$, '42501', 'pastoral_admin_only', 'inactive Admin cannot purge');
select throws_ok($$ select public.record_pastoral_access(0, 0, 0) $$, '42501', 'pastoral_admin_only', 'inactive Admin cannot record access');

-- Admin: still no direct DELETE; purge removes only rows past the cut-off
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-00000000000a', true);
select throws_ok($$ delete from public.prayer_requests $$, '42501', null, 'Admin still cannot delete directly');
select results_eq($$ select * from public.expired_pastoral_counts() $$, $$ values (1::bigint, 1::bigint, 1::bigint) $$, 'Admin sees one expired row per table');
select results_eq($$ select * from public.purge_expired_pastoral_data() $$, $$ values (1::bigint, 1::bigint, 1::bigint) $$, 'purge reports deleted rows');
reset role;
select results_eq($$ select id from public.study_interest_leads where id::text like '98000000%' $$, $$ values ('98000000-0000-4000-8000-000000000002'::uuid) $$, 'lead inside retention is kept');
select results_eq($$ select id from public.prayer_requests where id::text like '98000000%' $$, $$ values ('98000000-0000-4000-8000-000000000004'::uuid) $$, 'prayer inside retention is kept');
select results_eq($$ select id from public.visitor_submissions where id::text like '98000000%' $$, $$ values ('98000000-0000-4000-8000-000000000006'::uuid) $$, 'visit inside retention is kept');
select results_eq(
  $$ select action, entity_type, entity_id, changes->'deleted', array(select jsonb_object_keys(changes) order by 1) from public.audit_logs
     where actor_id = '97000000-0000-4000-8000-00000000000a' and action like '%.purged' order by action $$,
  $$ values ('prayer_request.purged'::text, 'prayer_requests'::text, null::uuid, '1'::jsonb, array['cutoff', 'deleted']),
            ('study_interest.purged', 'study_interest_leads', null, '1'::jsonb, array['cutoff', 'deleted']),
            ('visitor_submission.purged', 'visitor_submissions', null, '1'::jsonb, array['cutoff', 'deleted']) $$,
  'purge audit holds counts and cut-off only');

set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-00000000000a', true);
select results_eq($$ select * from public.purge_expired_pastoral_data() $$, $$ values (0::bigint, 0::bigint, 0::bigint) $$, 'second purge deletes nothing');
reset role;
select is((select count(*)::int from public.audit_logs where actor_id = '97000000-0000-4000-8000-00000000000a' and action like '%.purged' and changes->>'deleted' = '0'), 3, 'zero-row purge is still audited');

-- Access audit: counts only, bounded to the portal view
set local role authenticated;
select set_config('request.jwt.claim.sub', '97000000-0000-4000-8000-00000000000a', true);
select lives_ok($$ select public.record_pastoral_access(1, 2, 3) $$, 'Admin records access');
select throws_ok($$ select public.record_pastoral_access(-1, 0, 0) $$, '23514', 'pastoral_access_count_invalid', 'negative count is rejected');
select throws_ok($$ select public.record_pastoral_access(0, 51, 0) $$, '23514', 'pastoral_access_count_invalid', 'count above 50 is rejected');
select throws_ok($$ select public.record_pastoral_access(0, 0, null) $$, '23514', 'pastoral_access_count_invalid', 'null count is rejected');
reset role;
select results_eq(
  $$ select entity_type, entity_id, changes from public.audit_logs where actor_id = '97000000-0000-4000-8000-00000000000a' and action = 'pastoral.viewed' $$,
  $$ values ('pastoral_data'::text, null::uuid, '{"study_interest_leads": 1, "prayer_requests": 2, "visitor_submissions": 3}'::jsonb) $$,
  'access audit holds counts only');

select * from finish();
rollback;
