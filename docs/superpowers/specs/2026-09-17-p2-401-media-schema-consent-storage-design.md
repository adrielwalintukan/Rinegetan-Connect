# Design Spec: P2-401 — Schema Media, Consent, dan Storage Policy

## Metadata
- **Issue:** P2-401
- **Sprint:** 4
- **Branch:** `feature/p2-401-media-schema-consent-storage`
- **Dependencies:** P2-202 (Access Control & Roles)
- **Status:** Proposed

---

## 1. Executive Summary & Problem Statement

Sistem GMAHK Rinegetan membutuhkan modul galeri kegiatan gereja dan pustaka media yang aman, menghormati privasi jemaat, dan mematuhi aturan perlindungan anak (*child protection compliance*). Sesuai arsitektur dan kebijakan gereja pada [`DATA-MODEL-AND-RLS.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/03-architecture/DATA-MODEL-AND-RLS.md) dan [`SECURITY-PRIVACY.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/03-architecture/SECURITY-PRIVACY.md):
1. **Foto/Aset Tanpa Consent Dilarang Publik:** Aset media dengan status consent `pending`, `rejected`, atau `revoked` dilarang keras tampil pada query publik maupun diunduh langsung.
2. **Child Protection Invariant:** Aset dengan kelompok subjek anak (`subject_age_group = 'child'`) tidak dapat berstatus `published` jika `consent_status != 'approved'`.
3. **Penyembunyian Instan (Takedown/Hidden):** Jika terdapat pencabutan izin atau permohonan keberatan, aset harus memiliki flag `hidden_at` dan `hidden_reason`, dan seketika terisolasi dari publik.
4. **Supabase Storage Isolation:** Bucket `media` diatur private (`public = false`), dengan Row Level Security pada `storage.objects` yang memverifikasi kepemilikan dan status publik di tabel `media_assets`.

---

## 2. Model Data & Skema Database

### 2.1 Enumerasi (`enum`)

```sql
-- Kategori album media
create type public.media_category as enum (
  'ibadah',
  'pemuda',
  'sekolah_sabat',
  'sosial',
  'fellowship',
  'umum'
);

-- Status pemrosesan derivatif gambar
create type public.media_processing_state as enum (
  'pending',
  'ready',
  'failed'
);

-- Status persetujuan consent
create type public.consent_status as enum (
  'pending',
  'approved',
  'rejected',
  'revoked'
);

-- Kelompok umur subjek foto
create type public.subject_age_group as enum (
  'general',
  'child'
);
```

*Catatan: Status publikasi menggunakan `public.content_status` yang telah ada ('draft', 'published', 'archived').*

---

### 2.2 Tabel `public.media_albums`

Menyimpan koleksi/album foto kegiatan gereja:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `title` (text, not null, 1..200 chars)
- `slug` (text, not null, unique, kebab-case)
- `category` (`public.media_category`, not null default `'umum'`)
- `event_id` (uuid, FK references `public.events(id)` on delete set null)
- `department_id` (uuid, FK references `public.departments(id)` on delete set null)
- `occurred_on` (date, not null)
- `description` (text)
- `cover_asset_id` (uuid, FK references `public.media_assets(id)` on delete set null)
- `status` (`public.content_status`, not null default `'draft'`)
- `public_download_enabled` (boolean, not null default false)
- `created_at` (timestamptz, not null default now())
- `updated_at` (timestamptz, not null default now())
- `created_by` (uuid, FK references `auth.users(id)` on delete set null)
- `updated_by` (uuid, FK references `auth.users(id)` on delete set null)

---

### 2.3 Tabel `public.media_assets`

Menyimpan metadata file media fisik:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `storage_path` (text, not null, unique, format: `^[a-z0-9/_\-\.]+$`)
- `mime_type` (text, not null, misal: `'image/jpeg'`, `'image/webp'`)
- `bytes` (bigint, not null, check `bytes > 0`)
- `width` (integer, check `width is null or width > 0`)
- `height` (integer, check `height is null or height > 0`)
- `alt_text` (text, not null, 1..300 chars, wajib deskriptif demi aksesibilitas)
- `caption` (text)
- `captured_at` (timestamptz)
- `processing_state` (`public.media_processing_state`, not null default `'pending'`)
- `public_download_enabled` (boolean, not null default false)
- `consent_status` (`public.consent_status`, not null default `'pending'`)
- `consent_recorded_at` (timestamptz)
- `consent_recorded_by` (uuid, FK references `auth.users(id)` on delete set null)
- `subject_age_group` (`public.subject_age_group`, not null default `'general'`)
- `hidden_at` (timestamptz)
- `hidden_reason` (text, check jika `hidden_at is not null` maka `hidden_reason` wajib diisi)
- `status` (`public.content_status`, not null default `'draft'`)
- `created_at` (timestamptz, not null default now())
- `updated_at` (timestamptz, not null default now())
- `created_by` (uuid, FK references `auth.users(id)` on delete set null)
- `updated_by` (uuid, FK references `auth.users(id)` on delete set null)

**Check Constraints Kritis:**
1. **Child Protection:**
   ```sql
   constraint media_assets_child_consent_check check (
     subject_age_group != 'child'
     or status != 'published'
     or consent_status = 'approved'
   )
   ```
2. **Hidden Reason Integrity:**
   ```sql
   constraint media_assets_hidden_reason_check check (
     hidden_at is null
     or (hidden_reason is not null and char_length(btrim(hidden_reason)) >= 3)
   )
   ```

---

### 2.4 Tabel `public.album_assets`

Junction table N:M antara album dan aset:
- `album_id` (uuid, FK references `public.media_albums(id)` on delete cascade)
- `asset_id` (uuid, FK references `public.media_assets(id)` on delete cascade)
- `position` (integer, not null default 0)
- `is_cover` (boolean, not null default false)
- `created_at` (timestamptz, not null default now())
- Primary Key: `(album_id, asset_id)`

---

### 2.5 Tabel `public.consent_records`

Buku kas / audit trail riwayat hukum consent per aset:
- `id` (uuid, PK, default `gen_random_uuid()`)
- `asset_id` (uuid, not null, FK references `public.media_assets(id)` on delete cascade)
- `consent_status` (`public.consent_status`, not null)
- `subject_age_group` (`public.subject_age_group`, not null)
- `notes` (text)
- `recorded_by` (uuid, FK references `auth.users(id)` on delete set null)
- `recorded_at` (timestamptz, not null default now())

---

## 3. Matriks Hak Akses & Row-Level Security (RLS)

Seluruh tabel mengaktifkan RLS (`alter table ... enable row level security;`). Default privilege di-revoke dari `public`, `anon`, dan `authenticated`.

| Tabel / Objek | Anonim (Pengunjung) | Editor | Admin |
|---|---|---|---|
| `media_albums` | `SELECT` jika `status = 'published'` | `SELECT`, `INSERT`, `UPDATE` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `media_assets` | `SELECT` jika `status = 'published'` **DAN** `consent_status = 'approved'` **DAN** `hidden_at IS NULL` | `SELECT`, `INSERT`, `UPDATE` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `album_assets` | `SELECT` jika album published **DAN** aset published + approved + not hidden | `SELECT`, `INSERT`, `UPDATE` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |
| `consent_records`| *Deny All* | `SELECT`, `INSERT` (pencatatan log) | `SELECT`, `INSERT`, `DELETE` |
| `storage.objects` (bucket `'media'`) | `SELECT` jika object path terdaftar di `media_assets` yang published + approved + not hidden | `SELECT`, `INSERT`, `UPDATE` | `SELECT`, `INSERT`, `UPDATE`, `DELETE` |

---

## 4. Supabase Storage Integration

1. **Bucket Configuration:**
   - Nama bucket: `'media'`
   - `public`: `false` (Akses melalui Storage RLS engine)
   - `file_size_limit`: 15 MB (15728640 bytes)
   - `allowed_mime_types`: `ARRAY['image/jpeg', 'image/png', 'image/webp']`

2. **Policy Objek Storage:**
   - **`media_storage_public_read`**: Mengizinkan `SELECT` bagi siapapun jika `name` berelasi dengan `public.media_assets` yang berstatus `published`, `consent_status = 'approved'`, dan `hidden_at is null`.
   - **`media_storage_staff_read`**: Mengizinkan `SELECT` jika `private.is_editor_or_admin()`.
   - **`media_storage_staff_insert`**: Mengizinkan `INSERT` jika `private.is_editor_or_admin()`.
   - **`media_storage_staff_update`**: Mengizinkan `UPDATE` jika `private.is_editor_or_admin()`.
   - **`media_storage_admin_delete`**: Mengizinkan `DELETE` jika `private.is_admin()`.

---

## 5. Indeks Performa Minimum

1. `media_albums`:
   - `(status, occurred_on desc)`
   - `(category, status, occurred_on desc)`
   - Unique on `(slug)`
2. `media_assets`:
   - `(status, consent_status, hidden_at)`
   - `(processing_state, consent_status, hidden_at)`
   - `(created_at desc)`
   - Unique on `(storage_path)`
3. `album_assets`:
   - `(album_id, position)`
   - `(asset_id)`
4. `consent_records`:
   - `(asset_id, recorded_at desc)`

---

## 6. Verifikasi & Pengujian

1. **pgTAP Test Contract (`supabase/tests/p2_401_media_schema.test.sql`):**
   - Menguji eksistensi tabel, enums, trigger `updated_at`, dan foreign keys.
   - **Child Consent Gate:** Memastikan `INSERT` atau `UPDATE` aset dengan `subject_age_group = 'child'` dan `status = 'published'` tanpa `consent_status = 'approved'` gagal (error thrown).
   - **Hidden Reason Gate:** Memastikan pengisian `hidden_at` tanpa `hidden_reason` ditolak.
   - **RLS Isolation:** Memverifikasi anonim hanya dapat melihat album/aset yang valid, dan tidak dapat melihat aset pending/revoked/hidden.
   - **Storage RLS:** Memverifikasi izin storage anon vs staff.
2. **TypeScript Types (`frontend/src/types/media.ts`):**
   - Menjamin antarmuka kode frontend sinkron dengan skema database.
3. **Route & Contract Suite (`frontend/tests/p2-401-media-schema.test.mjs`):**
   - Node test runner untuk memverifikasi migration file dan definisi type.
