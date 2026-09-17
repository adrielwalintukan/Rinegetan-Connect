# P2-401 Media Schema, Consent, and Storage Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi basis data Supabase untuk manajemen media galeri gereja (`media_albums`, `media_assets`, `album_assets`, `consent_records`), menegakkan aturan perlindungan anak (*child consent gate*), mengonfigurasi Row Level Security (RLS) serta Storage policy pada bucket `media`.

**Architecture:** Menerapkan schema SQL idempotent dengan trigger `updated_at`, declarative check constraint untuk penolakan publikasi foto anak tanpa consent disetujui, RLS policies untuk isolasi pengunjung vs staf (Editor/Admin), integrasi private bucket Supabase Storage, pengujian pgTAP, dan pemetaan TypeScript types ke frontend.

**Tech Stack:** PostgreSQL (Supabase SQL migrations), pgTAP, Supabase Storage RLS, Node.js (`node:test`), Next.js / TypeScript.

**Spec:** [`docs/superpowers/specs/2026-09-17-p2-401-media-schema-consent-storage-design.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/superpowers/specs/2026-09-17-p2-401-media-schema-consent-storage-design.md)

## Global Constraints

- **Dependency floor:** Memanfaatkan peran dan helper functions yang sudah dibangun di P2-202 (`private.is_admin()`, `private.is_editor_or_admin()`, `private.set_updated_at()`).
- **Child Protection Invariant:** `subject_age_group = 'child'` tidak boleh berstatus `status = 'published'` tanpa `consent_status = 'approved'`.
- **Zero Public Leak:** Aset berstatus `pending`, `rejected`, `revoked`, atau yang memiliki `hidden_at` dilarang lolos query publik atau diakses via Storage public policy.
- **Private Storage:** Bucket `media` diatur private (`public = false`) dengan file size limit 15MB.
- **Idempotency & Clean Grants:** Revoke all grants awal dari `public`, `anon`, dan `authenticated`, berikan kembali hak seminimal mungkin sesuai matriks RLS.

---

### Task 1: TypeScript Types and Schema Contract Test Suite

**Files:**
- Create: `frontend/src/types/media.ts`
- Create: `frontend/tests/p2-401-media-schema.test.mjs`

**Interfaces:**
- Consumes: Definisi skema pada design spec.
- Produces: `frontend/src/types/media.ts` (`MediaAlbum`, `MediaAsset`, `AlbumAsset`, `ConsentRecord`, enums) dan `frontend/tests/p2-401-media-schema.test.mjs`.

- [ ] **Step 1: Write failing schema contract test suite**

Buat file `frontend/tests/p2-401-media-schema.test.mjs` yang memverifikasi:
1. File migrasi `supabase/migrations/*_p2_401_media_schema_consent_storage.sql` ada.
2. File migrasi mendeklarasikan enum: `media_category`, `media_processing_state`, `consent_status`, `subject_age_group`.
3. File migrasi membuat tabel: `media_albums`, `media_assets`, `album_assets`, `consent_records`.
4. Tabel `media_assets` memiliki check constraint untuk child consent dan hidden reason.
5. Storage bucket `media` terdaftar dengan `public = false`.
6. TypeScript types file `frontend/src/types/media.ts` ada dan mengekspor tipe-tipe yang sesuai.

- [ ] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-401-media-schema.test.mjs`
Expected: FAIL karena file types dan migration belum dibuat.

- [ ] **Step 3: Create TypeScript definitions**

Buat `frontend/src/types/media.ts` dengan interface lengkap sesuai spesifikasi desain.

- [ ] **Step 4: Commit Task 1 scaffolding**

```bash
git add frontend/src/types/media.ts frontend/tests/p2-401-media-schema.test.mjs
git commit -m "test(media): add P2-401 schema contract test suite and TypeScript types"
```

---

### Task 2: Supabase Migration for Media, Consent, and Storage Policy

**Files:**
- Create: `supabase/migrations/20260917220000_p2_401_media_schema_consent_storage.sql`

**Interfaces:**
- Consumes: Helper functions dari `private` schema (`is_admin`, `is_editor_or_admin`, `set_updated_at`).
- Produces: Struktur database tabel `media_albums`, `media_assets`, `album_assets`, `consent_records`, bucket `media`, dan storage RLS policies.

- [ ] **Step 1: Write the Supabase migration SQL**

Tulis `supabase/migrations/20260917220000_p2_401_media_schema_consent_storage.sql` berisi:
1. Definisi enums: `media_category`, `media_processing_state`, `consent_status`, `subject_age_group`.
2. Tabel `media_albums`:
   - Kolom: `id`, `title`, `slug`, `category`, `event_id`, `department_id`, `occurred_on`, `description`, `cover_asset_id`, `status`, `public_download_enabled`, timestamp & user audit columns.
   - Trigger `set_updated_at`.
3. Tabel `media_assets`:
   - Kolom: `id`, `storage_path`, `mime_type`, `bytes`, `width`, `height`, `alt_text`, `caption`, `captured_at`, `processing_state`, `public_download_enabled`, `consent_status`, `consent_recorded_at`, `consent_recorded_by`, `subject_age_group`, `hidden_at`, `hidden_reason`, `status`, timestamp & user audit columns.
   - Constraint:
     - `media_assets_child_consent_check`
     - `media_assets_hidden_reason_check`
   - Trigger `set_updated_at`.
4. Tabel `album_assets`:
   - Kolom: `album_id`, `asset_id`, `position`, `is_cover`, `created_at`.
   - PK: `(album_id, asset_id)`.
5. Tabel `consent_records`:
   - Kolom: `id`, `asset_id`, `consent_status`, `subject_age_group`, `notes`, `recorded_by`, `recorded_at`.
6. Foreign keys dan index performa:
   - Index pada `media_albums`, `media_assets`, `album_assets`, dan `consent_records`.
7. RLS & Grants:
   - Enable RLS pada keempat tabel.
   - Revoke default privileges dari `public`, `anon`, `authenticated`.
   - Grant SELECT, INSERT, UPDATE, DELETE sesuai matriks otorisasi.
   - Pasang RLS policies:
     - `media_albums_public_read`: anon `SELECT` if `status = 'published'`.
     - `media_assets_public_read`: anon `SELECT` if `status = 'published'` and `consent_status = 'approved'` and `hidden_at is null`.
     - `album_assets_public_read`: anon `SELECT` if album & asset public.
     - `media_albums_staff_all`: staff `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
     - `media_assets_staff_all`: staff `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
     - `album_assets_staff_all`: staff `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
     - `consent_records_staff_policy`: staff `SELECT`, `INSERT`, `DELETE`.
8. Supabase Storage bucket `'media'` dan `storage.objects` policies:
   - Register bucket `'media'` di `storage.buckets`.
   - Storage policies untuk SELECT (anon publik jika aset approved & published & not hidden, atau staff), INSERT/UPDATE (editor/admin), DELETE (admin).

- [ ] **Step 2: Run schema contract test to confirm it passes**

Jalankan: `node --test frontend/tests/p2-401-media-schema.test.mjs`
Expected: PASS untuk seluruh schema assertions.

- [ ] **Step 3: Commit Task 2**

```bash
git add supabase/migrations/20260917220000_p2_401_media_schema_consent_storage.sql
git commit -m "feat(database): add P2-401 media schema, consent rules, and storage policies"
```

---

### Task 3: pgTAP Test Contract for Media Schema and Security Constraints

**Files:**
- Create: `supabase/tests/p2_401_media_schema.test.sql`

**Interfaces:**
- Consumes: `supabase/migrations/20260917220000_p2_401_media_schema_consent_storage.sql`
- Produces: `supabase/tests/p2_401_media_schema.test.sql` test contract.

- [ ] **Step 1: Write pgTAP test contract**

Tulis `supabase/tests/p2_401_media_schema.test.sql` yang menguji:
1. Eksistensi tipe data: `media_category`, `media_processing_state`, `consent_status`, `subject_age_group`.
2. Eksistensi tabel & kolom pada `media_albums`, `media_assets`, `album_assets`, `consent_records`.
3. Validasi Check Constraint Perlindungan Anak:
   - Gagal bila `subject_age_group = 'child'` dan `status = 'published'` dengan `consent_status = 'pending'`.
   - Sukses bila `consent_status = 'approved'`.
4. Validasi Check Constraint Hidden Reason:
   - Gagal bila `hidden_at` diisi tetapi `hidden_reason` kosong.
   - Sukses bila `hidden_reason` diisi minimal 3 karakter.
5. Verifikasi RLS anon vs staff:
   - Role anonim tidak dapat membaca asset yang berstatus draft, revoked, atau hidden.
   - Role anonim dapat membaca asset yang published + approved + not hidden.

- [ ] **Step 2: Verify test file syntax and structure**

Pastikan test terdaftar dan valid di pgTAP test contract repository.

- [ ] **Step 3: Commit Task 3**

```bash
git add supabase/tests/p2_401_media_schema.test.sql
git commit -m "test(supabase): add pgTAP test contract for P2-401 media schema and consent constraints"
```

---

### Task 4: Documentation, Backlog Sync, and Quality Gate Verification

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Modify: `docs/superpowers/plans/2026-09-17-p2-401-media-schema-consent-storage.md`

- [ ] **Step 1: Run comprehensive quality gate verification**

1. `npm --prefix frontend run test:routes`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend run build`

- [ ] **Step 2: Update documentation and backlog**

- Tandai `P2-401` sebagai `selesai` pada `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`.
- Tandai `P2-402` sebagai `ready` pada `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`.

- [ ] **Step 3: Commit, push branch, and open PR**

Push branch `feature/p2-401-media-schema-consent-storage` ke origin dan buat Pull Request dengan deskripsi komprehensif.
