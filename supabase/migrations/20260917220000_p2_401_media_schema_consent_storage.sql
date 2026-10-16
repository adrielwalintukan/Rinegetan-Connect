-- P2-401 Media Schema, Consent Rules, and Storage Policies

-- 1. Enums
create type public.media_category as enum (
  'ibadah',
  'pemuda',
  'sekolah_sabat',
  'sosial',
  'fellowship',
  'umum'
);

create type public.media_processing_state as enum (
  'pending',
  'ready',
  'failed'
);

create type public.consent_status as enum (
  'pending',
  'approved',
  'rejected',
  'revoked'
);

create type public.subject_age_group as enum (
  'general',
  'child'
);

-- 2. Media Assets Table
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique
    check (char_length(storage_path) between 1 and 255)
    check (storage_path = btrim(storage_path)),
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  bytes bigint not null
    check (bytes > 0),
  width integer
    check (width is null or width > 0),
  height integer
    check (height is null or height > 0),
  alt_text text not null
    check (char_length(alt_text) between 1 and 300)
    check (alt_text = btrim(alt_text)),
  caption text,
  captured_at timestamptz,
  processing_state public.media_processing_state not null default 'pending',
  public_download_enabled boolean not null default false,
  consent_status public.consent_status not null default 'pending',
  consent_recorded_at timestamptz,
  consent_recorded_by uuid references auth.users(id) on delete set null,
  subject_age_group public.subject_age_group not null default 'general',
  hidden_at timestamptz,
  hidden_reason text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,

  -- Child consent constraint: child photos cannot be published without approved consent
  constraint media_assets_child_consent_check check (
    subject_age_group != 'child'
    or status != 'published'
    or consent_status = 'approved'
  ),

  -- Hidden reason constraint: when hidden_at is set, hidden_reason must be provided
  constraint media_assets_hidden_reason_check check (
    hidden_at is null
    or (hidden_reason is not null and char_length(btrim(hidden_reason)) >= 3)
  )
);

create trigger media_assets_set_updated_at
before update on public.media_assets
for each row execute function private.set_updated_at();

-- 3. Media Albums Table
create table public.media_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null
    check (char_length(title) between 1 and 200)
    check (title = btrim(title)),
  slug text not null
    check (char_length(slug) between 1 and 220)
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    unique,
  category public.media_category not null default 'umum',
  event_id uuid references public.events(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  occurred_on date not null,
  description text,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  status public.content_status not null default 'draft',
  public_download_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create trigger media_albums_set_updated_at
before update on public.media_albums
for each row execute function private.set_updated_at();

-- 4. Album Assets Junction Table
create table public.album_assets (
  album_id uuid references public.media_albums(id) on delete cascade,
  asset_id uuid references public.media_assets(id) on delete cascade,
  position integer not null default 0 check (position >= 0),
  is_cover boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (album_id, asset_id)
);

-- 5. Consent Records Table
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.media_assets(id) on delete cascade,
  consent_status public.consent_status not null,
  subject_age_group public.subject_age_group not null,
  notes text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);

-- 6. Performance Indexes
create index media_albums_status_occurred_on_idx
  on public.media_albums (status, occurred_on desc);

create index media_albums_category_status_occurred_on_idx
  on public.media_albums (category, status, occurred_on desc);

create index media_albums_event_id_idx
  on public.media_albums (event_id)
  where event_id is not null;

create index media_albums_department_id_idx
  on public.media_albums (department_id)
  where department_id is not null;

create index media_assets_status_consent_hidden_idx
  on public.media_assets (status, consent_status, hidden_at);

create index media_assets_processing_consent_hidden_idx
  on public.media_assets (processing_state, consent_status, hidden_at);

create index media_assets_created_at_idx
  on public.media_assets (created_at desc);

create index album_assets_album_position_idx
  on public.album_assets (album_id, position);

create index album_assets_asset_id_idx
  on public.album_assets (asset_id);

create index consent_records_asset_recorded_idx
  on public.consent_records (asset_id, recorded_at desc);

-- 7. Enable RLS and Explicit Grants
alter table public.media_albums enable row level security;
alter table public.media_assets enable row level security;
alter table public.album_assets enable row level security;
alter table public.consent_records enable row level security;

revoke all on table
  public.media_albums,
  public.media_assets,
  public.album_assets,
  public.consent_records
from public, anon, authenticated;

grant select on table
  public.media_albums,
  public.media_assets,
  public.album_assets
to anon, authenticated;

grant insert, update, delete on table
  public.media_albums,
  public.media_assets,
  public.album_assets
to authenticated;

grant select, insert, delete on table
  public.consent_records
to authenticated;

-- 8. Row Level Security Policies

-- media_albums policies
create policy media_albums_public_read
on public.media_albums for select
to anon
using (status = 'published');

create policy media_albums_staff_select
on public.media_albums for select
to authenticated
using (status = 'published' or private.is_editor_or_admin());

create policy media_albums_staff_insert
on public.media_albums for insert
to authenticated
with check (private.is_editor_or_admin());

create policy media_albums_staff_update
on public.media_albums for update
to authenticated
using (private.is_editor_or_admin())
with check (private.is_editor_or_admin());

create policy media_albums_admin_delete
on public.media_albums for delete
to authenticated
using (private.is_admin());

-- media_assets policies
create policy media_assets_public_read
on public.media_assets for select
to anon
using (
  status = 'published'
  and consent_status = 'approved'
  and hidden_at is null
);

create policy media_assets_staff_select
on public.media_assets for select
to authenticated
using (
  (status = 'published' and consent_status = 'approved' and hidden_at is null)
  or private.is_editor_or_admin()
);

create policy media_assets_staff_insert
on public.media_assets for insert
to authenticated
with check (private.is_editor_or_admin());

create policy media_assets_staff_update
on public.media_assets for update
to authenticated
using (private.is_editor_or_admin())
with check (private.is_editor_or_admin());

create policy media_assets_admin_delete
on public.media_assets for delete
to authenticated
using (private.is_admin());

-- album_assets policies
create policy album_assets_public_read
on public.album_assets for select
to anon
using (
  exists (
    select 1 from public.media_albums ma
    where ma.id = album_assets.album_id
      and ma.status = 'published'
  )
  and exists (
    select 1 from public.media_assets ast
    where ast.id = album_assets.asset_id
      and ast.status = 'published'
      and ast.consent_status = 'approved'
      and ast.hidden_at is null
  )
);

create policy album_assets_staff_select
on public.album_assets for select
to authenticated
using (
  (
    exists (
      select 1 from public.media_albums ma
      where ma.id = album_assets.album_id
        and ma.status = 'published'
    )
    and exists (
      select 1 from public.media_assets ast
      where ast.id = album_assets.asset_id
        and ast.status = 'published'
        and ast.consent_status = 'approved'
        and ast.hidden_at is null
    )
  )
  or private.is_editor_or_admin()
);

create policy album_assets_staff_insert
on public.album_assets for insert
to authenticated
with check (private.is_editor_or_admin());

create policy album_assets_staff_update
on public.album_assets for update
to authenticated
using (private.is_editor_or_admin())
with check (private.is_editor_or_admin());

create policy album_assets_admin_delete
on public.album_assets for delete
to authenticated
using (private.is_admin());

-- consent_records policies
create policy consent_records_staff_select
on public.consent_records for select
to authenticated
using (private.is_editor_or_admin());

create policy consent_records_staff_insert
on public.consent_records for insert
to authenticated
with check (private.is_editor_or_admin());

create policy consent_records_admin_delete
on public.consent_records for delete
to authenticated
using (private.is_admin());

-- 9. Supabase Storage Bucket & Storage Object RLS Policies
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 15728640, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 15728640,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy media_storage_public_read
on storage.objects for select
to anon
using (
  bucket_id = 'media'
  and exists (
    select 1 from public.media_assets ma
    where ma.storage_path = storage.objects.name
      and ma.status = 'published'
      and ma.consent_status = 'approved'
      and ma.hidden_at is null
  )
);

create policy media_storage_staff_read
on storage.objects for select
to authenticated
using (
  bucket_id = 'media'
  and (
    private.is_editor_or_admin()
    or exists (
      select 1 from public.media_assets ma
      where ma.storage_path = storage.objects.name
        and ma.status = 'published'
        and ma.consent_status = 'approved'
        and ma.hidden_at is null
    )
  )
);

create policy media_storage_staff_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'media'
  and private.is_editor_or_admin()
);

create policy media_storage_staff_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'media'
  and private.is_editor_or_admin()
)
with check (
  bucket_id = 'media'
  and private.is_editor_or_admin()
);

create policy media_storage_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'media'
  and private.is_admin()
);
