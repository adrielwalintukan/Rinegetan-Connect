begin;
select plan(13);

select ok(to_regprocedure('private.record_media_album_audit()') is not null, 'album audit function exists');
select ok(exists (
  select 1 from pg_trigger where tgrelid = 'public.media_albums'::regclass
    and tgname = 'media_albums_audit_mutation' and not tgisinternal
), 'album mutations have an audit trigger');
select ok(exists (
  select 1 from pg_proc where oid = to_regprocedure('private.record_media_album_audit()')
    and prosecdef and array_to_string(proconfig, ',') like '%search_path=%'
), 'album audit uses a fixed search_path and SECURITY DEFINER');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'insert'), 'staff cannot forge audit entries');

insert into auth.users (id, email) values
  ('71800000-0000-4000-8000-00000000000e', 'album-audit@example.invalid');
insert into public.profiles (id, display_name, is_active) values
  ('71800000-0000-4000-8000-00000000000e', 'Editor album uji', true);
insert into public.staff_roles (user_id, role) values
  ('71800000-0000-4000-8000-00000000000e', 'editor');
insert into public.media_albums (id, title, slug, occurred_on, status) values
  ('71800000-0000-4000-8000-000000000001', 'Album uji audit', 'album-uji-audit', '2026-10-18', 'published');

set local role authenticated;
select set_config('request.jwt.claim.sub', '71800000-0000-4000-8000-00000000000e', true);
select lives_ok($$ update public.media_albums set public_download_enabled = true
  where id = '71800000-0000-4000-8000-000000000001' $$, 'active Editor can toggle album downloads');
select is((select count(*)::integer from public.audit_logs), 0, 'Editor cannot read the audit trail');
reset role;

select is((select count(*)::integer from public.audit_logs
  where entity_id = '71800000-0000-4000-8000-000000000001' and action = 'media.album_download_changed'),
  1, 'download toggle writes one audit entry');
select is((select actor_id::text from public.audit_logs
  where entity_id = '71800000-0000-4000-8000-000000000001' and action = 'media.album_download_changed'),
  '71800000-0000-4000-8000-00000000000e', 'audit actor is the authenticated Editor');
select is((select changes->>'old_public_download_enabled' from public.audit_logs
  where entity_id = '71800000-0000-4000-8000-000000000001' and action = 'media.album_download_changed'),
  'false', 'audit preserves previous permission');
select is((select changes->>'public_download_enabled' from public.audit_logs
  where entity_id = '71800000-0000-4000-8000-000000000001' and action = 'media.album_download_changed'),
  'true', 'audit preserves new permission');

update public.media_albums set public_download_enabled = true
  where id = '71800000-0000-4000-8000-000000000001';
select is((select count(*)::integer from public.audit_logs
  where entity_id = '71800000-0000-4000-8000-000000000001' and action = 'media.album_download_changed'),
  1, 'a retry with the same flag is not another permission change');

set local role anon;
select throws_ok($$ update public.media_albums set public_download_enabled = false
  where id = '71800000-0000-4000-8000-000000000001' $$, '42501', null, 'anon cannot toggle album downloads');
reset role;
update public.profiles set is_active = false where id = '71800000-0000-4000-8000-00000000000e';
set local role authenticated;
select results_eq($$ update public.media_albums set public_download_enabled = false
  where id = '71800000-0000-4000-8000-000000000001' returning 1 $$,
  array[]::integer[], 'inactive Editor cannot toggle album downloads');

reset role;
select * from finish();
rollback;
