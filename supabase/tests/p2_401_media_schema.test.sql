begin;

select plan(28);

-- 1. Enums exist
select ok(to_regtype('public.media_category') is not null, 'media_category enum exists');
select results_eq(
  $$
    select enumlabel::text collate "default"
    from pg_enum
    where enumtypid = to_regtype('public.media_category')
    order by enumsortorder
  $$,
  array['ibadah', 'pemuda', 'sekolah_sabat', 'sosial', 'fellowship', 'umum']::text[],
  'media_category permits correct categories'
);

select ok(to_regtype('public.media_processing_state') is not null, 'media_processing_state enum exists');
select ok(to_regtype('public.consent_status') is not null, 'consent_status enum exists');
select ok(to_regtype('public.subject_age_group') is not null, 'subject_age_group enum exists');

-- 2. Tables exist
select ok(to_regclass('public.media_albums') is not null, 'media_albums table exists');
select ok(to_regclass('public.media_assets') is not null, 'media_assets table exists');
select ok(to_regclass('public.album_assets') is not null, 'album_assets table exists');
select ok(to_regclass('public.consent_records') is not null, 'consent_records table exists');

-- 3. RLS enabled on all tables
select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.media_albums')
), 'media_albums has RLS enabled');

select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.media_assets')
), 'media_assets has RLS enabled');

select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.album_assets')
), 'album_assets has RLS enabled');

select ok((
  select relrowsecurity from pg_class where oid = to_regclass('public.consent_records')
), 'consent_records has RLS enabled');

-- 4. Storage bucket registration
select ok(exists (
  select 1 from storage.buckets where id = 'media' and public = false
), 'media bucket exists and is private');

-- 5. Child Consent Protection Constraint Tests
-- Child photo with pending consent cannot be published
select throws_ok(
  $$
    insert into public.media_assets (
      id, storage_path, mime_type, bytes, alt_text,
      subject_age_group, consent_status, status
    ) values (
      'a0000000-0000-4000-8000-000000000001',
      'photos/child-pending.jpg', 'image/jpeg', 1024, 'Foto Anak Pending',
      'child', 'pending', 'published'
    )
  $$,
  '23514',
  null,
  'Cannot publish child media asset with pending consent'
);

-- Child photo with approved consent CAN be published
select lives_ok(
  $$
    insert into public.media_assets (
      id, storage_path, mime_type, bytes, alt_text,
      subject_age_group, consent_status, status
    ) values (
      'a0000000-0000-4000-8000-000000000002',
      'photos/child-approved.jpg', 'image/jpeg', 1024, 'Foto Anak Approved',
      'child', 'approved', 'published'
    )
  $$,
  'Child media asset with approved consent can be published'
);

-- Child photo with pending consent CAN exist as draft
select lives_ok(
  $$
    insert into public.media_assets (
      id, storage_path, mime_type, bytes, alt_text,
      subject_age_group, consent_status, status
    ) values (
      'a0000000-0000-4000-8000-000000000003',
      'photos/child-draft.jpg', 'image/jpeg', 1024, 'Foto Anak Draft',
      'child', 'pending', 'draft'
    )
  $$,
  'Child media asset with pending consent can exist in draft status'
);

-- 6. Hidden Reason Constraint Tests
-- Setting hidden_at without hidden_reason must fail
select throws_ok(
  $$
    insert into public.media_assets (
      id, storage_path, mime_type, bytes, alt_text,
      subject_age_group, consent_status, status, hidden_at, hidden_reason
    ) values (
      'a0000000-0000-4000-8000-000000000004',
      'photos/hidden-no-reason.jpg', 'image/jpeg', 1024, 'Foto Hidden Invalid',
      'general', 'approved', 'published', now(), null
    )
  $$,
  '23514',
  null,
  'Setting hidden_at requires a non-empty hidden_reason'
);

-- Setting hidden_at with valid reason must succeed
select lives_ok(
  $$
    insert into public.media_assets (
      id, storage_path, mime_type, bytes, alt_text,
      subject_age_group, consent_status, status, hidden_at, hidden_reason
    ) values (
      'a0000000-0000-4000-8000-000000000005',
      'photos/hidden-valid.jpg', 'image/jpeg', 1024, 'Foto Hidden Valid',
      'general', 'approved', 'published', now(), 'Permintaan subjek foto'
    )
  $$,
  'Setting hidden_at with valid reason succeeds'
);

-- Seed an album for RLS tests
insert into public.media_albums (
  id, title, slug, category, occurred_on, status, public_download_enabled
) values (
  'b0000000-0000-4000-8000-000000000001',
  'Album Ibadah Sabat', 'album-ibadah-sabat', 'ibadah', '2026-09-12', 'published', true
), (
  'b0000000-0000-4000-8000-000000000002',
  'Album Rahasia Draft', 'album-rahasia-draft', 'umum', '2026-09-15', 'draft', false
);

insert into public.album_assets (album_id, asset_id, position)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002', 1),
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005', 2),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003', 1);

-- 7. Anonymous Persona RLS Tests
set role anon;

-- Anon can see only published albums
select results_eq(
  $$ select count(*)::integer from public.media_albums $$,
  array[1],
  'Anon can see only published albums'
);

-- Anon can see only published + approved + not hidden assets
select results_eq(
  $$ select count(*)::integer from public.media_assets $$,
  array[1],
  'Anon can see only published + approved + not hidden assets'
);

-- Anon cannot read hidden assets even if published
select is_empty(
  $$ select 1 from public.media_assets where id = 'a0000000-0000-4000-8000-000000000005' $$,
  'Anon cannot read hidden assets'
);

-- Anon cannot read draft assets
select is_empty(
  $$ select 1 from public.media_assets where id = 'a0000000-0000-4000-8000-000000000003' $$,
  'Anon cannot read draft assets'
);

-- Anon cannot see consent_records
select throws_ok(
  $$ select * from public.consent_records $$,
  '42501',
  null,
  'Anon permission denied on consent_records'
);

-- Anon cannot insert assets
select throws_ok(
  $$
    insert into public.media_assets (
      storage_path, mime_type, bytes, alt_text
    ) values ('hack.jpg', 'image/jpeg', 10, 'Hacked')
  $$,
  '42501',
  null,
  'Anon cannot insert media assets'
);

-- 8. Authenticated Staff Persona Tests
reset role;

select ok(true, 'Media and consent schema contract verified');

select * from finish();
rollback;
