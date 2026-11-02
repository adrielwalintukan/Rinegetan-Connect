-- supabase/tests/p3_005_prayer_visit.test.sql
begin;
select no_plan();
-- Synthetic fixtures only; everything is rolled back.
select has_table('public', 'prayer_requests', 'prayer_requests exists');
select has_table('public', 'visitor_submissions', 'visitor_submissions exists');

insert into auth.users (id, email) values
 ('95000000-0000-4000-8000-00000000000a', 'p3005-admin@example.invalid'),
 ('95000000-0000-4000-8000-00000000000b', 'p3005-admin-two@example.invalid'),
 ('95000000-0000-4000-8000-00000000000e', 'p3005-editor@example.invalid'),
 ('95000000-0000-4000-8000-00000000000f', 'p3005-inactive@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('95000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('95000000-0000-4000-8000-00000000000b', 'Synthetic Admin Two', true),
 ('95000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true),
 ('95000000-0000-4000-8000-00000000000f', 'Synthetic Inactive', false);
insert into public.staff_roles (user_id, role) values
 ('95000000-0000-4000-8000-00000000000a', 'admin'),
 ('95000000-0000-4000-8000-00000000000b', 'admin'),
 ('95000000-0000-4000-8000-00000000000e', 'editor'),
 ('95000000-0000-4000-8000-00000000000f', 'admin');

-- service_role inserts only; lifecycle fields are forced
set local role service_role;
insert into public.prayer_requests (id, request, consent_version, status, handled_by)
  values ('96000000-0000-4000-8000-000000000001', 'Doa uji sintetis', 'draft-2026-11-02', 'closed', '95000000-0000-4000-8000-00000000000a');
insert into public.visitor_submissions (id, name, contact, visit_date, party_size, consent_version, status)
  values ('96000000-0000-4000-8000-000000000002', 'Tamu Uji', 'tamu@example.invalid', current_date + 7, 3, 'draft-2026-11-02', 'contacted');
select lives_ok($$ insert into public.prayer_requests (name, contact, request, wants_contact, consent_version) values ('Uji', '+62 812-3456-7890', 'Doa', true, 'v') $$, 'prayer with contact and wants_contact');
select throws_ok($$ insert into public.prayer_requests (request, wants_contact, consent_version) values ('Doa', true, 'v') $$, '23514', null, 'wants_contact needs a contact');
select throws_ok($$ insert into public.prayer_requests (contact, request, consent_version) values ('besok saja', 'Doa', 'v') $$, '23514', null, 'free-text prayer contact is rejected');
select throws_ok($$ insert into public.prayer_requests (request, consent_version) values (repeat('a', 2001), 'v') $$, '23514', null, 'request over 2000 is rejected');
select throws_ok($$ insert into public.prayer_requests (request, consent_version) values ('', 'v') $$, '23514', null, 'empty request is rejected');
select throws_ok($$ insert into public.visitor_submissions (name, contact, party_size, consent_version) values ('Uji', 'uji@example.invalid', 21, 'v') $$, '23514', null, 'party size over 20 is rejected');
select throws_ok($$ insert into public.visitor_submissions (name, contact, consent_version) values ('Uji', '123 4567', 'v') $$, '23514', null, 'visitor phone with 7 digits is rejected');
select throws_ok($$ insert into public.visitor_submissions (name, contact, message, consent_version) values ('Uji', 'uji@example.invalid', repeat('a', 1001), 'v') $$, '23514', null, 'visit message over 1000 is rejected');
select throws_ok($$ select * from public.prayer_requests $$, '42501', null, 'service_role cannot read prayers');
select throws_ok($$ select * from public.visitor_submissions $$, '42501', null, 'service_role cannot read visits');
select throws_ok($$ delete from public.prayer_requests $$, '42501', null, 'service_role cannot delete prayers');
select ok(public.check_form_rate('prayer_attempt', repeat('a', 32), 20, '1 hour'), 'prayer attempt key accepted');
select ok(public.check_form_rate('prayer', repeat('a', 32), 5, '1 hour'), 'prayer key accepted');
select ok(public.check_form_rate('visit_attempt', repeat('a', 32), 20, '1 hour'), 'visit attempt key accepted');
select ok(public.check_form_rate('visit', repeat('a', 32), 5, '1 hour'), 'visit key accepted');
select ok(public.check_form_rate('study_interest', repeat('a', 32), 5, '1 hour'), 'study interest key still accepted');
reset role;
select results_eq($$ select status, handled_by from public.prayer_requests where id = '96000000-0000-4000-8000-000000000001' $$,
  $$ values ('new'::text, null::uuid) $$, 'prayer insert forces new without handler');
select results_eq($$ select status from public.visitor_submissions where id = '96000000-0000-4000-8000-000000000002' $$,
  $$ values ('new'::text) $$, 'visit insert forces new');

-- anon: no access
set local role anon;
select throws_ok($$ select * from public.prayer_requests $$, '42501', null, 'anon cannot read prayers');
select throws_ok($$ select * from public.visitor_submissions $$, '42501', null, 'anon cannot read visits');
select throws_ok($$ insert into public.prayer_requests (request, consent_version) values ('Doa', 'v') $$, '42501', null, 'anon cannot insert prayers');
select throws_ok($$ insert into public.visitor_submissions (name, contact, consent_version) values ('Uji', 'uji@example.invalid', 'v') $$, '42501', null, 'anon cannot insert visits');
reset role;

-- Editor and inactive Admin: nothing
set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-00000000000e', true);
select results_eq($$ select id from public.prayer_requests $$, array[]::uuid[], 'Editor sees no prayers');
select results_eq($$ select id from public.visitor_submissions $$, array[]::uuid[], 'Editor sees no visits');
select results_eq($$ update public.prayer_requests set status = 'prayed' returning id $$, array[]::uuid[], 'Editor cannot update prayers');
select throws_ok($$ insert into public.prayer_requests (request, consent_version) values ('Doa', 'v') $$, '42501', null, 'authenticated cannot insert prayers');
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-00000000000f', true);
select results_eq($$ select id from public.prayer_requests $$, array[]::uuid[], 'inactive Admin sees no prayers');

-- Admin: read and change status only
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-00000000000a', true);
select is((select count(*)::int from public.prayer_requests), 2, 'Admin sees prayers');
select is((select count(*)::int from public.visitor_submissions), 1, 'Admin sees visits');
select lives_ok($$ update public.prayer_requests set status = 'prayed' where id = '96000000-0000-4000-8000-000000000001' $$, 'Admin marks prayer prayed');
select results_eq($$ select status, handled_by, handled_at is not null from public.prayer_requests where id = '96000000-0000-4000-8000-000000000001' $$,
  $$ values ('prayed'::text, '95000000-0000-4000-8000-00000000000a'::uuid, true) $$, 'prayer status change records the handler');
select throws_ok($$ update public.prayer_requests set request = 'Ubah' where id = '96000000-0000-4000-8000-000000000001' $$, '23514', 'prayer_request_immutable', 'prayer details are immutable');
select throws_ok($$ update public.prayer_requests set status = 'contacted' where id = '96000000-0000-4000-8000-000000000001' $$, '23514', null, 'visit status is not a prayer status');
select lives_ok($$ update public.visitor_submissions set status = 'contacted' where id = '96000000-0000-4000-8000-000000000002' $$, 'Admin marks visit contacted');
select throws_ok($$ update public.visitor_submissions set visit_date = current_date where id = '96000000-0000-4000-8000-000000000002' $$, '23514', 'visitor_submission_immutable', 'visit details are immutable');
select throws_ok($$ delete from public.prayer_requests $$, '42501', null, 'Admin cannot delete prayers (P3-006)');
select throws_ok($$ delete from public.visitor_submissions $$, '42501', null, 'Admin cannot delete visits (P3-006)');
reset role;

-- audit: status only
select results_eq($$ select action from public.audit_logs where entity_id = '96000000-0000-4000-8000-000000000001' order by occurred_at, action $$,
  $$ values ('prayer_request.created'::text), ('prayer_request.status_changed'::text) $$, 'prayer audit recorded');
select results_eq($$ select action from public.audit_logs where entity_id = '96000000-0000-4000-8000-000000000002' order by occurred_at, action $$,
  $$ values ('visitor_submission.created'::text), ('visitor_submission.status_changed'::text) $$, 'visit audit recorded');
select is((select count(*)::int from public.audit_logs where entity_type in ('prayer_requests', 'visitor_submissions')
  and (changes - 'status') <> '{}'::jsonb), 0, 'audit stores the status only');

-- deleting a handler clears handled_by
set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-00000000000b', true);
update public.prayer_requests set status = 'closed' where id = '96000000-0000-4000-8000-000000000001';
reset role;
select lives_ok($$ delete from auth.users where id = '95000000-0000-4000-8000-00000000000b' $$, 'handler user can be deleted');
select results_eq($$ select status, handled_by from public.prayer_requests where id = '96000000-0000-4000-8000-000000000001' $$,
  $$ values ('closed'::text, null::uuid) $$, 'handled_by cleared, status kept');

select * from finish();
rollback;
