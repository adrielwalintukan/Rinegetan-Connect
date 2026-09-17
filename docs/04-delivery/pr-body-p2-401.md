## 🎯 Ringkasan Perubahan (Issue P2-401)

Pull Request ini mengimplementasikan issue **`P2-401 — Schema media, consent, dan Storage policy`** yang membuka milestone **Sprint 4 (Galeri Kegiatan, Pustaka Media, dan Consent Privasi)**.

Modul ini meletakkan fondasi arsitektur basis data relasional di Supabase untuk pengelolaan foto dan media kegiatan jemaat, menegakkan aturan perlindungan anak (*child protection compliance*), serta menerapkan Row-Level Security (RLS) terpadu pada tabel publik dan Supabase Storage bucket `media`.

---

## 🏛️ Arsitektur & Model Data yang Dibangun

### 1. Enumerasi PostgreSQL (`enum`)
- `public.media_category`: `'ibadah'`, `'pemuda'`, `'sekolah_sabat'`, `'sosial'`, `'fellowship'`, `'umum'`
- `public.media_processing_state`: `'pending'`, `'ready'`, `'failed'`
- `public.consent_status`: `'pending'`, `'approved'`, `'rejected'`, `'revoked'`
- `public.subject_age_group`: `'general'`, `'child'`

### 2. Tabel & Relasi Inti
- **`public.media_albums`**: Metadata koleksi/album kegiatan (`title`, `slug`, `category`, `occurred_on`, `description`, `cover_asset_id`, `status`, `public_download_enabled`).
- **`public.media_assets`**: Metadata aset fisik (`storage_path`, `mime_type`, `bytes`, `width`, `height`, `alt_text`, `caption`, `processing_state`, `consent_status`, `subject_age_group`, `hidden_at`, `hidden_reason`, `status`).
- **`public.album_assets`**: Junction table relasi N:M antara album dan aset dengan urutan tampilan (`position`) dan flag sampul (`is_cover`).
- **`public.consent_records`**: Buku kas / audit trail riwayat hukum consent per aset.

---

## 🛡️ Aturan Keamanan & Child Protection Gate (Acceptance Criteria)

1. **Child Protection Check Constraint:**
   ```sql
   constraint media_assets_child_consent_check check (
     subject_age_group != 'child'
     or status != 'published'
     or consent_status = 'approved'
   )
   ```
   *Efek:* Aset dengan subjek anak (`child`) **dilarang keras** berstatus `published` tanpa consent yang disetujui (`approved`). Mesin basis data menolak mutasi ini pada level kernel SQL.

2. **Hidden Takedown Constraint:**
   ```sql
   constraint media_assets_hidden_reason_check check (
     hidden_at is null
     or (hidden_reason is not null and char_length(btrim(hidden_reason)) >= 3)
   )
   ```
   *Efek:* Jika ada keberatan dari subjek foto atau consent dicabut, pengisian `hidden_at` mewajibkan pencatatan alasan jelas minimal 3 karakter.

3. **Supabase Storage Bucket & Object RLS:**
   - Bucket `media` didaftarkan berstatus privat (`public = false`, limit 15MB, restricted mime types).
   - Policy `media_storage_public_read`: Pengunjung publik hanya dapat mengunduh/melihat object yang terdaftar pada `public.media_assets` dengan status `published`, `consent_status = 'approved'`, dan `hidden_at IS NULL`.
   - Staf Editor/Admin memiliki hak upload dan pembaruan terproteksi peran.
   - Admin memiliki hak eksklusif penghapusan permanen.

---

## 🧪 Hasil Verifikasi & Quality Gates

| Quality Gate | Perintah | Status | Catatan |
|---|---|---|---|
| **Test Runner (Contract & Routes)** | `npm --prefix frontend run test:routes` | ✅ **PASS (60/60)** | 3 test P2-401 baru + 57 regression tests |
| **pgTAP Contract** | `supabase/tests/p2_401_media_schema.test.sql` | ✅ **PASS (28 assertions)** | Enums, tables, RLS persona, & constraint tests |
| **ESLint** | `npm --prefix frontend run lint` | ✅ **PASS (0 errors, 0 warnings)** | Clean |
| **Production Build** | `npm --prefix frontend run build` | ✅ **PASS (19/19 routes)** | Turbopack compilation clean |

> **Catatan UI:** Issue P2-401 berfokus murni pada arsitektur database, RLS, Storage policy, dan TypeScript contracts. Tidak ada perubahan file UI visual pada issue ini; UI Galeri & CMS Media akan diimplementasikan pada issue **P2-403** lengkap dengan tangkapan layar verifikasi visual.

---

## 📋 File yang Disertakan
- `supabase/migrations/20260917220000_p2_401_media_schema_consent_storage.sql`
- `supabase/tests/p2_401_media_schema.test.sql`
- `frontend/src/types/media.ts`
- `frontend/tests/p2-401-media-schema.test.mjs`
- `docs/superpowers/specs/2026-09-17-p2-401-media-schema-consent-storage-design.md`
- `docs/superpowers/plans/2026-09-17-p2-401-media-schema-consent-storage.md`
- `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`

**Next Milestone:** Sprint 4 — `P2-402 — JPEG derivative dan upload guardrails`.
