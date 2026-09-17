# P2-403 — Galeri Publik dan CMS Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun antarmuka galeri publik dua tingkat (`/media`) yang aksesibel dengan modal Lightbox ramah keyboard, serta modul CMS Media Staf terpadu di portal `/staff` yang mematuhi batasan perlindungan anak (*child consent guard*).

**Architecture:** Menggunakan Next.js App Router dengan pemisahan tegas antara Server Components untuk fetch data publik ter-cache/ISR dan Client Components untuk interaktivitas (filter pil, Lightbox keyboard, modal unggah staf). Query publik secara ketat hanya menyajikan aset `status = 'published'`, `consent_status = 'approved'`, dan `hidden_at IS NULL`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, Tailwind CSS, Lucide React, Supabase JS Client, Node.js Test Runner.

**Spec:** [`docs/superpowers/specs/2026-09-17-p2-403-public-gallery-cms-design.md`](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/superpowers/specs/2026-09-17-p2-403-public-gallery-cms-design.md)

## Global Constraints
- Seluruh query publik **wajib** memfilter: `status = 'published' AND consent_status = 'approved' AND hidden_at IS NULL`.
- Aset subjek anak (`subject_age_group = 'child'`) dilarang keras dipublikasikan tanpa consent `approved`.
- Modal Lightbox wajib memiliki atribut aksesibilitas WCAG 2.1 AA (`role="dialog"`, `aria-modal="true"`, *focus trap*) dan mendukung keyboard (`Escape`, `ArrowLeft`, `ArrowRight`).
- Setiap penarikan/penyembunyian foto staf (`hidden_at`) mewajibkan alasan jelas (`hidden_reason` $\ge 3$ karakter).
- Verifikasi visual wajib dilakukan menggunakan browser subagent disertai bukti screenshot di deskripsi Pull Request.

---

### Task 1: Public Media Queries & Cache Revalidation Integration

**Files:**
- Modify: `frontend/src/lib/supabase/public-queries.ts`
- Modify: `frontend/src/lib/supabase/public-queries.mjs`
- Test: `frontend/tests/p2-403-public-gallery-cms.test.mjs`

**Interfaces:**
- Consumes: Supabase database schema (`public.media_albums`, `public.media_assets`, `public.album_assets`).
- Produces:
  - `getPublicMediaAlbums(): Promise<PublicMediaAlbum[]>`
  - `getPublicMediaAssets(options?: { category?: string; albumId?: string }): Promise<PublicMediaAsset[]>`
  - Updated `triggerPublicRevalidation(entity, path)` handling `'media-albums'` and `'media-assets'`.

- [x] **Step 1: Write failing public queries & revalidation contract test**

Buat file `frontend/tests/p2-403-public-gallery-cms.test.mjs` yang menguji:
1. `getPublicMediaAlbums` dan `getPublicMediaAssets` diekspor dari modul query publik.
2. Query SQL yang dihasilkan strictly memfilter `status = 'published'`, `consent_status = 'approved'`, dan `hidden_at IS NULL`.
3. `triggerPublicRevalidation` menyertakan cache tags `media-albums`, `media-assets`, dan rute `/media`.

- [x] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-403-public-gallery-cms.test.mjs`
Expected: FAIL karena modul belum mengekspor fungsi-fungsi query media.

- [x] **Step 3: Implement public media queries and cache revalidation tags**

Perbarui `frontend/src/lib/supabase/public-queries.mjs` dan `frontend/src/lib/supabase/public-queries.ts`:
1. Tambahkan `getPublicMediaAlbums`: select album terbitan diurutkan berdasarkan `occurred_on` descending.
2. Tambahkan `getPublicMediaAssets`: select aset terbitan, approved consent, hidden_at null, dengan filter kategori / album opsional.
3. Daftarkan tag `media-albums` dan `media-assets` pada pemetaan revalidasi.

- [x] **Step 4: Run test suite to verify passes**

Jalankan: `node --test frontend/tests/p2-403-public-gallery-cms.test.mjs`
Expected: PASS untuk seluruh pengujian Task 1.

- [x] **Step 5: Commit Task 1**

```bash
git add frontend/src/lib/supabase/public-queries.mjs frontend/src/lib/supabase/public-queries.ts frontend/tests/p2-403-public-gallery-cms.test.mjs
git commit -m "feat(media): implement public media queries and cache revalidation tags"
```

---

### Task 2: Accessible Lightbox & Public Gallery Page (`/media`)

**Files:**
- Create: `frontend/src/components/media/MediaLightbox.tsx`
- Replace: `frontend/src/components/pages/MediaPage.tsx`
- Remove/Migrate: `frontend/src/components/pages/MediaPage.jsx`
- Modify: `frontend/src/app/(public)/media/page.tsx`
- Test: `frontend/tests/p2-403-public-gallery-cms.test.mjs`

**Interfaces:**
- Consumes: `getPublicMediaAlbums`, `getPublicMediaAssets`, `PublicMediaAlbum`, `PublicMediaAsset`, `EmptyState`.
- Produces: Komponen `MediaLightbox` dan `MediaPage` yang fully-typed dan keyboard-accessible.

- [x] **Step 1: Write failing Lightbox accessibility & gallery component tests**

Tambahkan uji pada `frontend/tests/p2-403-public-gallery-cms.test.mjs`:
1. Memverifikasi struktur file `MediaLightbox.tsx` dan `MediaPage.tsx`.
2. Memverifikasi kontrak aksesibilitas Lightbox: atribut `role="dialog"`, `aria-modal="true"`, tombol tutup, dan event handler keyboard (`Escape`, `ArrowLeft`, `ArrowRight`).
3. Memverifikasi penanganan `EmptyState` pada galeri publik saat data kosong.

- [x] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-403-public-gallery-cms.test.mjs`
Expected: FAIL karena file komponen belum dibuat.

- [x] **Step 3: Implement MediaLightbox and two-tier MediaPage**

1. Bangun `frontend/src/components/media/MediaLightbox.tsx`:
   - Modal overlay dengan backdrop blur.
   - `useEffect` listener untuk tombol `Escape` (tutup), `ArrowRight` (foto berikutnya), `ArrowLeft` (foto sebelumnya).
   - Menampilkan foto derivatif resolusi tinggi, `alt_text`, `caption`, tag kategori, dan counter nomor foto.
2. Bangun `frontend/src/components/pages/MediaPage.tsx`:
   - Bagian 1: Korsel / Kartu "Album Kegiatan Pilihan" yang dapat diklik untuk memfilter aset.
   - Bagian 2: Bar filter pil kategori (`Semua`, `Ibadah`, `Pemuda`, `Sekolah Sabat`, `Sosial`, `Fellowship`, `Umum`) ditambah reset filter album aktif.
   - Grid foto responsif dengan aspect ratio terjaga, hover micro-animation, badge kategori, dan event klik pembuka Lightbox.
   - Menggunakan `EmptyState` jika daftar foto kosong.
3. Hubungkan ke `frontend/src/app/(public)/media/page.tsx` yang mengambil data server-side via `getPublicMediaAlbums()` dan `getPublicMediaAssets()`.

- [x] **Step 4: Run test suite to verify passes**

Jalankan: `node --test frontend/tests/p2-403-public-gallery-cms.test.mjs`
Expected: PASS.

- [x] **Step 5: Commit Task 2**

```bash
git add frontend/src/components/media/MediaLightbox.tsx frontend/src/components/pages/MediaPage.tsx frontend/src/app/(public)/media/page.tsx frontend/tests/p2-403-public-gallery-cms.test.mjs
git commit -m "feat(gallery): implement accessible lightbox and two-tier public media page"
```

---

### Task 3: Staff Media CMS Manager & Upload Integration (`/staff`)

**Files:**
- Create: `frontend/src/components/staff/MediaUploadDialog.tsx`
- Create: `frontend/src/components/staff/MediaManager.tsx`
- Modify: `frontend/src/components/staff/StaffDashboard.tsx`
- Modify: `frontend/src/app/staff/(protected)/page.tsx`
- Test: `frontend/tests/p2-403-public-gallery-cms.test.mjs`

**Interfaces:**
- Consumes: `/api/staff/media/upload` (P2-402), `MediaAsset`, `MediaAlbum`, `StaffRole`, Child Consent Invariant.
- Produces: Tab `Media & Galeri` pada `StaffDashboard` dengan konsol kurasi lengkap dan modal upload.

- [x] **Step 1: Write failing staff media CMS contract tests**

Tambahkan uji pada `frontend/tests/p2-403-public-gallery-cms.test.mjs`:
1. Memverifikasi keberadaan `MediaUploadDialog.tsx` dan `MediaManager.tsx`.
2. Memverifikasi logika child consent guard: dilarang mengubah status ke `published` jika `subject_age_group === 'child'` dan `consent_status !== 'approved'`.
3. Memverifikasi form upload memvalidasi `alt_text` wajib ada minimal 3 karakter.
4. Memverifikasi dialog instant takedown mewajibkan `hidden_reason` minimal 3 karakter.

- [x] **Step 2: Run test suite to verify failure**

Jalankan: `node --test frontend/tests/p2-403-public-gallery-cms.test.mjs`
Expected: FAIL karena komponen CMS media belum dibuat.

- [x] **Step 3: Implement MediaUploadDialog and MediaManager**

1. Bangun `frontend/src/components/staff/MediaUploadDialog.tsx`:
   - Dialog modal unggah file gambar (JPEG/PNG/WebP maks 15MB) dengan preview lokal.
   - Input wajib `alt_text` (min 3 karakter), input opsional `caption`, pilihan `category`, `subject_age_group` (general/child), `consent_status`, dan dropdown album.
   - Mengirimkan `FormData` ke `/api/staff/media/upload`.
2. Bangun `frontend/src/components/staff/MediaManager.tsx`:
   - Ringkasan kuota pilot (1 GB) dengan status aman/warning/freeze.
   - Daftar kartu/tabel media dengan badge consent, badge usia, status publikasi, dan indikator takedown.
   - Tombol "Unggah Foto Baru" yang membuka `MediaUploadDialog`.
   - Aksi perubahan status (*draft / published / archived*) dengan validasi child consent.
   - Aksi takedown cepat dengan modal isian `hidden_reason`.
   - Aksi hapus permanen khusus peran admin.
3. Integrasikan tab `"media"` ke `StaffDashboard.tsx` dan perbarui query awal di `frontend/src/app/staff/(protected)/page.tsx`.

- [x] **Step 4: Run test suite to verify passes**

Jalankan: `node --test frontend/tests/p2-403-public-gallery-cms.test.mjs`
Expected: PASS.

- [x] **Step 5: Commit Task 3**

```bash
git add frontend/src/components/staff/MediaUploadDialog.tsx frontend/src/components/staff/MediaManager.tsx frontend/src/components/staff/StaffDashboard.tsx frontend/src/app/staff/(protected)/page.tsx frontend/tests/p2-403-public-gallery-cms.test.mjs
git commit -m "feat(staff): integrate media management tab and upload dialog in staff portal"
```

---

### Task 4: Quality Gate, Browser Visual Verification, & PR Delivery

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Modify: `docs/superpowers/plans/2026-09-17-p2-403-public-gallery-cms.md`
- Create: `docs/04-delivery/pr-body-p2-403.md`

- [x] **Step 1: Run comprehensive quality gate verification**

1. `npm --prefix frontend run test:routes` -> Semua tes rute dan kontrak lulus (minimal 75+ tests).
2. `npm --prefix frontend run lint` -> 0 errors, 0 warnings.
3. `npm --prefix frontend run build` -> Next.js App Router build berhasil tanpa type error.

- [x] **Step 2: Browser visual verification with screenshots**

Jalankan browser subagent:
1. Buka `http://localhost:3000/media`:
   - Verifikasi tata letak dua tingkat (album dan kisi foto).
   - Verifikasi interaksi filter kategori dan penampil Lightbox.
   - Ambil tangkapan layar galeri dan Lightbox.
2. Buka `http://localhost:3000/staff`:
   - Navigasi ke tab `Media & Galeri`.
   - Verifikasi tampilan daftar media staf dan modal upload foto.
   - Ambil tangkapan layar antarmuka CMS media.
3. Simpan dan tautkan tangkapan layar ke `docs/04-delivery/pr-body-p2-403.md`.

- [x] **Step 3: Update documentation and backlog**

- Tandai `P2-403` sebagai `selesai` pada `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`.
- Tandai `P2-404` sebagai `ready` pada `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`.

- [x] **Step 4: Commit, push branch, and open PR**

```bash
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md docs/superpowers/plans/2026-09-17-p2-403-public-gallery-cms.md docs/04-delivery/pr-body-p2-403.md
git commit -m "docs: finalize P2-403 quality gates and backlog sync"
git push -u origin feature/p2-403-public-gallery-cms
gh pr create --base development --head feature/p2-403-public-gallery-cms --title "feat: implement P2-403 public gallery and media CMS" --body-file docs/04-delivery/pr-body-p2-403.md
```
