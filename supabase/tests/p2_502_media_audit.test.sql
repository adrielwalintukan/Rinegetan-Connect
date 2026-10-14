begin;

select plan(5);

select ok(exists (
  select 1 from pg_trigger
  where tgrelid = to_regclass('public.media_assets') and tgname = 'media_assets_audit_mutation'
), 'media_assets has an audit trigger');

insert into auth.users (id, email)
values ('a5020000-0000-4000-8000-000000000001', 'editor-p2502@test.com')
on conflict (id) do nothing;

insert into public.profiles (id, display_name, is_active)
values ('a5020000-0000-4000-8000-000000000001', 'Editor P2-502', true);

insert into public.staff_roles (user_id, role)
values ('a5020000-0000-4000-8000-000000000001', 'editor');

-- Act as the editor, exactly like the upload route does through the session client.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'a5020000-0000-4000-8000-000000000001', true);

insert into public.media_assets (id, storage_path, mime_type, bytes, alt_text, processing_state, status, created_by, updated_by)
values (
  'a5020000-0000-4000-8000-0000000000a1',
  'derivatives/2026/10/p2-502-audit.jpg',
  'image/jpeg',
  1024,
  'Foto uji audit',
  'ready',
  'draft',
  'a5020000-0000-4000-8000-000000000001',
  'a5020000-0000-4000-8000-000000000001'
);

update public.media_assets
set consent_status = 'approved', consent_recorded_at = now(), consent_recorded_by = 'a5020000-0000-4000-8000-000000000001'
where id = 'a5020000-0000-4000-8000-0000000000a1';

update public.media_assets set status = 'published'
where id = 'a5020000-0000-4000-8000-0000000000a1';

select throws_ok(
  $$ insert into public.audit_logs (actor_id, action, entity_type) values (auth.uid(), 'forged', 'x') $$,
  '42501',
  null,
  'staff still cannot write audit_logs directly'
);

reset role;

select is(
  (select count(*)::int from public.audit_logs
   where entity_id = 'a5020000-0000-4000-8000-0000000000a1' and action = 'media.uploaded'
     and actor_id = 'a5020000-0000-4000-8000-000000000001'),
  1,
  'editor upload is audited with the editor as actor'
);

select is(
  (select count(*)::int from public.audit_logs
   where entity_id = 'a5020000-0000-4000-8000-0000000000a1' and action = 'media.consent_changed'),
  1,
  'consent change is audited'
);

select is(
  (select changes->>'old_status' from public.audit_logs
   where entity_id = 'a5020000-0000-4000-8000-0000000000a1' and action = 'media.status_changed'),
  'draft',
  'publish is audited with the previous status'
);

select * from finish();
rollback;
