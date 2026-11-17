-- supabase/tests/p5_003_notification_preferences.test.sql
begin;
select no_plan();
-- Synthetic fixtures only; everything is rolled back.
select has_table('public', 'notification_subscriptions', 'notification_subscriptions exists');
select has_table('public', 'notification_consent_log', 'notification_consent_log exists');
select has_column('public', 'notification_subscriptions', 'endpoint', 'subscription stores the push endpoint');
select has_column('public', 'notification_subscriptions', 'p256dh', 'subscription stores its public key');
select has_column('public', 'notification_subscriptions', 'auth', 'subscription stores its auth secret');
select has_column('public', 'notification_subscriptions', 'categories', 'subscription stores enabled categories');
select has_column('public', 'notification_subscriptions', 'consent_version', 'subscription carries a consent version');
select has_column('public', 'notification_subscriptions', 'consented_at', 'subscription carries when consent was given');
select hasnt_column('public', 'notification_subscriptions', 'email', 'no email column may exist');
select hasnt_column('public', 'notification_subscriptions', 'phone', 'no phone column may exist');

-- A CHECK constraint runs with the inserting role's privileges, so service_role must be
-- able to execute the duplicate helper. Revoking it from service_role made every insert
-- fail with 42501 before the constraint was even evaluated (caught in CI, not locally).
select ok(
  coalesce((
    select has_function_privilege('service_role', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'notification_categories_unique'
  ), false),
  'service_role can execute the categories helper used by the CHECK constraint'
);
select ok(
  coalesce((
    select not has_function_privilege('anon', procedure.oid, 'execute')
    from pg_proc as procedure
    join pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private' and procedure.proname = 'notification_categories_unique'
  ), false),
  'anon cannot execute the categories helper'
);

-- The notification routes reuse the shared rate limiter, so its allow-list must accept them.
select ok(public.check_form_rate('notification_subscribe', repeat('a', 32), 10, '1 hour'),
  'notification subscribe key accepted');
select ok(public.check_form_rate('notification_stop', repeat('a', 32), 10, '1 hour'),
  'notification stop key accepted');
select ok(public.check_form_rate('prayer', repeat('b', 32), 5, '1 hour'),
  'the earlier prayer key is still accepted');

insert into auth.users (id, email) values
 ('95000000-0000-4000-8000-00000000000a', 'p5003-admin@example.invalid'),
 ('95000000-0000-4000-8000-00000000000e', 'p5003-editor@example.invalid');
insert into public.profiles (id, display_name, is_active) values
 ('95000000-0000-4000-8000-00000000000a', 'Synthetic Admin', true),
 ('95000000-0000-4000-8000-00000000000e', 'Synthetic Editor', true);
insert into public.staff_roles (user_id, role) values
 ('95000000-0000-4000-8000-00000000000a', 'admin'),
 ('95000000-0000-4000-8000-00000000000e', 'editor');

-- The server route subscribes a device; identity is the endpoint, never a person.
set local role service_role;
select lives_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('https://push.example.invalid/send/abc', 'public-key', 'auth-secret', array['pengumuman'], '2026-11-17') $$,
  'service_role subscribes a device');

-- Unknown categories are rejected so a typo cannot create a category nobody sends.
select throws_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('https://push.example.invalid/send/bad', 'k', 'a', array['promosi'], '2026-11-17') $$,
  '23514', null, 'unknown category is rejected');

-- An empty category set is rejected: stop-all is not a subscription.
select throws_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('https://push.example.invalid/send/empty', 'k', 'a', array[]::text[], '2026-11-17') $$,
  '23514', null, 'empty category set is rejected');

-- Duplicate categories are rejected rather than silently deduplicated.
select throws_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('https://push.example.invalid/send/dup', 'k', 'a', array['ibadah', 'ibadah'], '2026-11-17') $$,
  '23514', null, 'duplicate categories are rejected');

-- Endpoint is the identity, so the same device cannot subscribe twice.
select throws_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('https://push.example.invalid/send/abc', 'k2', 'a2', array['ibadah'], '2026-11-17') $$,
  '23505', null, 'the same endpoint cannot be stored twice');

-- A non-https endpoint is rejected.
select throws_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('http://push.example.invalid/send/x', 'k', 'a', array['ibadah'], '2026-11-17') $$,
  '23514', null, 'endpoint must be https');

-- The consent log records the change, not the person. service_role deliberately has no
-- direct SELECT on it, so the checks below run as the test owner (after reset role).
reset role;
select is((select count(*)::int from public.notification_consent_log), 1, 'subscribing writes one consent record');
select results_eq($$ select consent_version, enabled_categories from public.notification_consent_log $$,
  $$ values ('2026-11-17'::text, array['pengumuman']::text[]) $$, 'consent record keeps version and categories');

-- service_role must not be able to read the secrets back out in bulk for other devices.
set local role service_role;
select throws_ok($$ select * from public.notification_subscriptions $$, '42501', null, 'service_role has no direct read of subscriptions');
select throws_ok($$ select * from public.notification_consent_log $$, '42501', null, 'service_role has no direct read of the consent log');
reset role;

-- Changing categories writes another consent record and keeps the endpoint single.
set local role service_role;
select lives_ok($$ select public.update_notification_categories('https://push.example.invalid/send/abc', array['pengumuman', 'ibadah'], '2026-11-17') $$,
  'categories can be changed through the function');
reset role;
select is((select count(*)::int from public.notification_consent_log), 2, 'changing categories appends a consent record');
select results_eq($$ select categories from public.notification_subscriptions where endpoint = 'https://push.example.invalid/send/abc' $$,
  $$ values (array['pengumuman', 'ibadah']::text[]) $$, 'categories are replaced, not merged');

-- Stop-all deletes the subscription instead of storing an empty one.
set local role service_role;
select lives_ok($$ select public.stop_notification_subscription('https://push.example.invalid/send/abc') $$,
  'stop-all removes the subscription');
reset role;
select is((select count(*)::int from public.notification_subscriptions), 0, 'stopped subscription is gone');
select is((select count(*)::int from public.notification_consent_log where enabled_categories = array[]::text[]), 1,
  'stop-all is recorded as an explicit empty grant');

-- anon: no access at all
set local role anon;
select throws_ok($$ select * from public.notification_subscriptions $$, '42501', null, 'anon cannot read subscriptions');
select throws_ok($$ insert into public.notification_subscriptions (endpoint, p256dh, auth, categories, consent_version)
  values ('https://push.example.invalid/send/z', 'k', 'a', array['ibadah'], '2026-11-17') $$, '42501', null, 'anon cannot subscribe');
select throws_ok($$ select public.stop_notification_subscription('https://push.example.invalid/send/abc') $$, '42501', null, 'anon cannot stop a subscription');
reset role;

-- authenticated staff: still no direct access to push secrets
set local role authenticated;
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-00000000000a', true);
select throws_ok($$ select * from public.notification_subscriptions $$, '42501', null, 'Admin cannot read push secrets');
select throws_ok($$ select * from public.notification_consent_log $$, '42501', null, 'Admin cannot read the consent log');
select throws_ok($$ select public.notification_recipients('pengumuman') $$, '42501', null, 'Admin cannot list notification recipients');
select throws_ok($$ select public.update_notification_categories('https://push.example.invalid/send/abc', array['ibadah'], '2026-11-17') $$,
  '42501', null, 'Admin cannot rewrite a device subscription');
select set_config('request.jwt.claim.sub', '95000000-0000-4000-8000-00000000000e', true);
select throws_ok($$ select * from public.notification_subscriptions $$, '42501', null, 'Editor cannot read push secrets');
reset role;

select * from finish();
rollback;
