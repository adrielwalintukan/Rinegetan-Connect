-- supabase/tests/p3_004_study_interest.test.sql
begin;
select no_plan();
-- Synthetic fixtures only; everything is rolled back.
select has_table('public', 'study_interest_leads', 'study_interest_leads exists');
select has_table('public', 'form_rate_events', 'form_rate_events exists');

insert into auth.users (id, email) values
 ('91000000-0000-4000-8000-00000000000a', 'p3004-admin@example.invalid'),
 ('91000000-0000-4000-8000-00000000000b', 'p3004-admin-two@example.invalid'),
 ('91000000-0000-4000-8000-00000000000e', 'p3004-editor@example.invalid'),
 ('91000000-0000-4000-8000-00000000000c', 'p3004-no-role@example.invalid'),
 ('91000000-0000-4000-8000-00000000000f', 'p3004-inactive@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('91000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('91000000-0000-4000-8000-00000000000b', 'Synthetic Admin Two', true),
 ('91000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('91000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false);
insert into public.staff_roles (user_id, role) values
 ('91000000-0000-4000-8000-00000000000a', 'admin'),
 ('91000000-0000-4000-8000-00000000000b', 'admin'),
 ('91000000-0000-4000-8000-00000000000e', 'editor'),
 ('91000000-0000-4000-8000-00000000000f', 'admin');

-- service_role (the server route) inserts; lifecycle fields are forced
set local role service_role;
insert into public.study_interest_leads (id, name, contact, message, consent_version, status, handled_by)
  values ('93000000-0000-4000-8000-000000000001', 'Peserta Uji', '+62 812-3456-7890', 'Ingin belajar', 'draft-2026-10-26', 'closed', '91000000-0000-4000-8000-00000000000a');
select results_eq($$ select status, handled_by from public.study_interest_leads where id = '93000000-0000-4000-8000-000000000001' $$,
  $$ values ('new'::text, null::uuid) $$, 'insert forces status new without handler');
select lives_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values ('Email', 'uji@example.invalid', 'draft-2026-10-26') $$, 'email contact is accepted');
select throws_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values ('Uji', 'besok saja', 'v') $$, '23514', null, 'free-text contact is rejected');
select throws_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values ('Uji', '123 4567', 'v') $$, '23514', null, 'phone with 7 digits is rejected');
select throws_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values (repeat('a', 101), 'uji@example.invalid', 'v') $$, '23514', null, 'name over 100 is rejected');
select throws_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values (' Uji', 'uji@example.invalid', 'v') $$, '23514', null, 'untrimmed name is rejected');
select throws_ok($$ insert into public.study_interest_leads (name, contact, message, consent_version) values ('Uji', 'uji@example.invalid', repeat('a', 1001), 'v') $$, '23514', null, 'message over 1000 is rejected');
select throws_ok($$ select * from public.form_rate_events $$, '42501', null, 'service_role has no direct access to rate events');

-- rate limiter: five allowed, sixth blocked, other hash independent
select results_eq($$ select array_agg(public.check_form_rate('study_interest', repeat('a', 32), 5, '1 hour')) from generate_series(1, 6) $$,
  $$ values (array[true, true, true, true, true, false]) $$, 'sixth submit within an hour is blocked');
select ok(public.check_form_rate('study_interest', repeat('b', 32), 5, '1 hour'), 'another hash is not blocked');
select ok(public.check_form_rate('study_interest_attempt', repeat('a', 32), 20, '1 hour'), 'attempt counter is separate from submit counter');
reset role;
insert into public.form_rate_events (form, ip_hash, created_at) values ('study_interest', repeat('c', 32), now() - interval '25 hours');
set local role service_role;
select ok(public.check_form_rate('study_interest', repeat('d', 32), 5, '1 hour'), 'limiter call succeeds');
reset role;
select is((select count(*)::int from public.form_rate_events where ip_hash = repeat('c', 32)), 0, 'events older than 24 hours are pruned');

-- anon: no access
set local role anon;
select throws_ok($$ select * from public.study_interest_leads $$, '42501', null, 'anon cannot read leads');
select throws_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values ('Uji', 'uji@example.invalid', 'v') $$, '42501', null, 'anon cannot insert leads');
select throws_ok($$ select * from public.form_rate_events $$, '42501', null, 'anon cannot read rate events');
select throws_ok($$ select public.check_form_rate('study_interest', repeat('e', 32), 5, '1 hour') $$, '42501', null, 'anon cannot call the limiter');
reset role;

-- authenticated non-staff, Editor and inactive Admin: nothing
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-00000000000c', true);
select results_eq($$ select id from public.study_interest_leads $$, array[]::uuid[], 'non-staff sees no leads');
select throws_ok($$ insert into public.study_interest_leads (name, contact, consent_version) values ('Uji', 'uji@example.invalid', 'v') $$, '42501', null, 'non-staff cannot insert');
select throws_ok($$ select public.check_form_rate('study_interest', repeat('e', 32), 5, '1 hour') $$, '42501', null, 'authenticated cannot call the limiter');
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-00000000000e', true);
select results_eq($$ select id from public.study_interest_leads $$, array[]::uuid[], 'Editor sees no leads');
select results_eq($$ update public.study_interest_leads set status = 'contacted' returning id $$, array[]::uuid[], 'Editor cannot update leads');
select throws_ok($$ delete from public.study_interest_leads $$, '42501', null, 'nobody can delete leads');
select throws_ok($$ select * from public.form_rate_events $$, '42501', null, 'Editor cannot read rate events');
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-00000000000f', true);
select results_eq($$ select id from public.study_interest_leads $$, array[]::uuid[], 'inactive Admin sees no leads');

-- Admin: read and change status only
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-00000000000a', true);
select is((select count(*)::int from public.study_interest_leads), 2, 'Admin sees leads');
select lives_ok($$ update public.study_interest_leads set status = 'contacted' where id = '93000000-0000-4000-8000-000000000001' $$, 'Admin changes status');
select results_eq($$ select status, handled_by, handled_at is not null from public.study_interest_leads where id = '93000000-0000-4000-8000-000000000001' $$,
  $$ values ('contacted'::text, '91000000-0000-4000-8000-00000000000a'::uuid, true) $$, 'status change records the handler');
select throws_ok($$ update public.study_interest_leads set name = 'Ubah' where id = '93000000-0000-4000-8000-000000000001' $$, '23514', 'study_interest_immutable', 'lead details are immutable');
select throws_ok($$ update public.study_interest_leads set status = 'unknown' where id = '93000000-0000-4000-8000-000000000001' $$, '23514', null, 'unknown status is rejected');
select throws_ok($$ delete from public.study_interest_leads $$, '42501', null, 'Admin cannot delete leads (P3-006)');
reset role;

-- audit: created and status_changed, never the personal fields
select results_eq($$ select action from public.audit_logs where entity_type = 'study_interest_leads' and entity_id = '93000000-0000-4000-8000-000000000001' order by occurred_at, action $$,
  $$ values ('study_interest.created'::text), ('study_interest.status_changed'::text) $$, 'lead audit recorded');
select is((select count(*)::int from public.audit_logs where entity_type = 'study_interest_leads'
  and (changes ? 'name' or changes ? 'contact' or changes ? 'message' or changes::text like '%Peserta Uji%')), 0, 'audit never stores personal fields');

-- deleting a handler clears handled_by instead of blocking the user deletion
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-00000000000b', true);
update public.study_interest_leads set status = 'closed' where id = '93000000-0000-4000-8000-000000000001';
reset role;
select lives_ok($$ delete from auth.users where id = '91000000-0000-4000-8000-00000000000b' $$, 'handler user can be deleted');
select results_eq($$ select status, handled_by from public.study_interest_leads where id = '93000000-0000-4000-8000-000000000001' $$,
  $$ values ('closed'::text, null::uuid) $$, 'handled_by cleared, status kept');

select * from finish();
rollback;
