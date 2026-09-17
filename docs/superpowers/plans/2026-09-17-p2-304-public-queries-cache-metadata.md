# P2-304: Public Queries, Cache Revalidation, Empty States, and Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghubungkan seluruh rute publik website GMAHK Rinegetan ke query Supabase berstatus `published`, menyediakan mekanisme cache Next.js dan revalidasi instan on-demand saat mutasi staf terjadi, merender komponen *Empty State* tematik saat data belum ada, serta melengkapi seluruh rute publik dengan metadata SEO terstandarisasi.

**Architecture:** Modul server `queries.ts` mengeksekusi query publik menggunakan client Supabase anonim murni yang di-cache via Next.js `unstable_cache` (`revalidate: 60`, tags: `public-content`, `public-events`, `public-schedules`, `public-departments`, `public-announcements`). Rute mutasi staf memicu `revalidateTag` & `revalidatePath` seketika. Halaman publik Server Components menyuplai data riil ke komponen UI dengan graceful fallback ke `EmptyState.tsx`. Seluruh 7 rute publik mengekspor metadata SEO lengkap.

**Tech Stack:** Next.js 16 (App Router, Turbopack, unstable_cache), TypeScript, Supabase SSR / Client, Tailwind CSS, Lucide React, Node.js native test runner.

**Spec:** [docs/superpowers/specs/2026-09-17-p2-304-public-queries-cache-metadata-design.md](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/superpowers/specs/2026-09-17-p2-304-public-queries-cache-metadata-design.md)

## Global Constraints

- Query publik dilarang membaca data berstatus selain `published`.
- Modul query publik tidak boleh memanggil `cookies()` agar dapat di-cache secara statis dan ISR oleh Next.js tanpa membocorkan sesi staf.
- Mutasi staf di `/api/staff/content/*` wajib memicu revalidasi tag cache publik dan path terkait.
- Komponen `EmptyState` harus menggunakan Design System gereja (`navy`, `sabbath`, `cream`, `container-site`).
- Setiap rute publik wajib memiliki objek `metadata: Metadata` lengkap (Title, Description, OpenGraph `id_ID`).
- Kualitas kode wajib memenuhi: 0 lint errors, 100% test:routes pass, dan Next.js production build bersih.

---

### Task 1: Public Queries Service Module and Revalidation Hooks with Test Contract

**Files:**
- Create: `frontend/src/lib/public/queries.mjs`
- Create: `frontend/src/lib/public/queries.ts`
- Modify: `frontend/src/app/api/staff/content/status/route.ts`
- Modify: `frontend/src/app/api/staff/content/save/route.ts`
- Modify: `frontend/src/app/api/staff/content/delete/route.ts`
- Test: `frontend/tests/p2-304-public-queries-metadata.test.mjs`

**Interfaces:**
- Consumes: `createClient` dari `@supabase/supabase-js`, `revalidateTag`, `revalidatePath` dari `next/cache`, `resolveWeeklyOccurrences` dari `@/lib/schedule-wita`
- Produces:
  - `getPublishedAnnouncements()`
  - `getPublishedEvents()`
  - `getPublishedSchedules(startDate?, endDate?)`
  - `getPublishedDepartments()`
  - `triggerPublicRevalidation(entityType)`

- [ ] **Step 1: Write the failing public queries and revalidation contract test suite**

Buat file `frontend/tests/p2-304-public-queries-metadata.test.mjs` yang memvalidasi:
1. `queries.mjs` mengekspor fungsi-fungsi: `getPublishedAnnouncements`, `getPublishedEvents`, `getPublishedSchedules`, `getPublishedDepartments`, `triggerPublicRevalidation`.
2. Query builder contract: fungsi query selalu memanggil `.eq("status", "published")`.
3. `triggerPublicRevalidation`: memanggil tag `public-content` dan `public-{entityType}`, serta rute-rute terkait.

- [ ] **Step 2: Run test suite and observe it fail**

Jalankan `node --test frontend/tests/p2-304-public-queries-metadata.test.mjs` dan pastikan gagal karena file `queries.mjs` belum ada.

- [ ] **Step 3: Implement public queries service and revalidation hooks**

1. Buat `frontend/src/lib/public/queries.mjs` dan `queries.ts` yang mengimplementasikan query Supabase anonim berstatus `published` dengan `unstable_cache` serta fungsi `triggerPublicRevalidation`.
2. Hubungkan `triggerPublicRevalidation` ke handler API:
   - `frontend/src/app/api/staff/content/status/route.ts`
   - `frontend/src/app/api/staff/content/save/route.ts`
   - `frontend/src/app/api/staff/content/delete/route.ts`

- [ ] **Step 4: Run test suite and confirm it passes**

Jalankan `node --test frontend/tests/p2-304-public-queries-metadata.test.mjs` dan pastikan seluruh assertions lulus.

- [ ] **Step 5: Commit Task 1**

```bash
git add frontend/src/lib/public/ frontend/src/app/api/staff/content/ frontend/tests/p2-304-public-queries-metadata.test.mjs
git commit -m "feat(public): implement published queries module, cache tags, and on-demand revalidation hooks"
```

---

### Task 2: Reusable EmptyState Component and Public Pages Live Integration

**Files:**
- Create: `frontend/src/components/ui/EmptyState.tsx`
- Modify: `frontend/src/app/(public)/page.tsx`
- Modify: `frontend/src/app/(public)/kegiatan/page.tsx`
- Modify: `frontend/src/app/(public)/sekolah-sabat/page.tsx`
- Modify: `frontend/src/app/(public)/pelayanan/page.tsx`
- Modify: `frontend/src/components/pages/KegiatanPage.jsx`
- Modify: `frontend/src/components/sections/EventsSection.jsx`
- Modify: `frontend/src/components/sections/DepartmentsSection.jsx`

**Interfaces:**
- Consumes: `getPublishedAnnouncements`, `getPublishedEvents`, `getPublishedSchedules`, `getPublishedDepartments`, `EmptyState`
- Produces: Tampilan halaman publik dinamis berbasis data live Supabase dengan fallback `EmptyState`.

- [ ] **Step 1: Create reusable EmptyState component**

Buat `frontend/src/components/ui/EmptyState.tsx` dengan props `icon`, `title`, `description`, `actionLabel`, `actionHref`, `testId` yang mengaplikasikan Design System gereja.

- [ ] **Step 2: Update KegiatanPage and EventsSection to support live published events and EmptyState**

1. Perbarui `frontend/src/components/sections/EventsSection.jsx` agar menerima prop `events` dan menampilkan `EmptyState` jika array kosong.
2. Perbarui `frontend/src/components/pages/KegiatanPage.jsx` agar menerima `initialEvents` dari server loader dan merender `EmptyState` jika kosong.
3. Sambungkan `frontend/src/app/(public)/kegiatan/page.tsx` sebagai Server Component yang memanggil `getPublishedEvents()`.

- [ ] **Step 3: Update Beranda (HomePage), Sekolah Sabat, and Pelayanan pages**

1. `frontend/src/app/(public)/page.tsx`: Muat pengumuman aktif, kegiatan mendatang terdekat, dan jadwal Sabat.
2. `frontend/src/app/(public)/sekolah-sabat/page.tsx`: Muat jadwal mingguan riil dari `getPublishedSchedules()`, atau `EmptyState` jika kosong.
3. `frontend/src/app/(public)/pelayanan/page.tsx`: Muat departemen aktif dari `getPublishedDepartments()`, atau `EmptyState` jika kosong.

- [ ] **Step 4: Verify route tests and interactive rendering**

Jalankan `npm --prefix frontend run test:routes` dan verifikasi seluruh rute tetap memenuhi kontrak.

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/components/ui/EmptyState.tsx frontend/src/app/\(public\)/ frontend/src/components/
git commit -m "feat(public): create reusable EmptyState component and integrate public pages with live published queries"
```

---

### Task 3: Comprehensive SEO Metadata Across All Public Routes

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/(public)/page.tsx`
- Modify: `frontend/src/app/(public)/tentang-kami/page.tsx`
- Modify: `frontend/src/app/(public)/kegiatan/page.tsx`
- Modify: `frontend/src/app/(public)/media/page.tsx`
- Modify: `frontend/src/app/(public)/pelayanan/page.tsx`
- Modify: `frontend/src/app/(public)/sekolah-sabat/page.tsx`
- Modify: `frontend/src/app/(public)/kontak/page.tsx`

**Interfaces:**
- Consumes: `Metadata` dari `next`
- Produces: SEO Title, Description, OpenGraph, Canonical URL pada seluruh 7 rute publik.

- [ ] **Step 1: Enhance Root Layout metadata**

Perbarui `frontend/src/app/layout.tsx` dengan `metadataBase`, siteName, openGraph default `id_ID`, dan robots configuration.

- [ ] **Step 2: Add page-specific metadata to all 7 public routes**

Tambahkan ekspor `export const metadata: Metadata` pada:
1. `(public)/page.tsx` (Beranda)
2. `(public)/tentang-kami/page.tsx` (Tentang Kami)
3. `(public)/kegiatan/page.tsx` (Kegiatan)
4. `(public)/media/page.tsx` (Media)
5. `(public)/pelayanan/page.tsx` (Pelayanan)
6. `(public)/sekolah-sabat/page.tsx` (Sekolah Sabat)
7. `(public)/kontak/page.tsx` (Kontak)

- [ ] **Step 3: Expand test contract to verify metadata across all 7 routes**

Tambahkan uji pada `frontend/tests/p2-304-public-queries-metadata.test.mjs` untuk memeriksa eksistensi ekspor `metadata` dengan `title` dan `description` valid pada ketujuh rute. Jalankan test untuk memastikan lulus.

- [ ] **Step 4: Commit Task 3**

```bash
git add frontend/src/app/layout.tsx frontend/src/app/\(public\)/ frontend/tests/p2-304-public-queries-metadata.test.mjs
git commit -m "feat(seo): configure structured SEO metadata, OpenGraph, and title templates across all public routes"
```

---

### Task 4: Quality Gate Verification, Backlog Sync, and PR Preparation with Visual Documentation

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md` (P2-304 -> selesai, P2-401 -> ready)
- Modify: `docs/superpowers/plans/2026-09-17-p2-304-public-queries-cache-metadata.md` (check off steps)

- [ ] **Step 1: Run comprehensive quality gate verification**

1. `npm --prefix frontend run test:routes`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend run build`

- [ ] **Step 2: Capture visual preview for PR description**

Ambil tangkapan layar (screenshot) tampilan halaman publik dan empty state untuk disertakan pada deskripsi PR dan walkthrough.

- [ ] **Step 3: Update documentation and backlog**

Perbarui `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`:
- Tandai `P2-304` sebagai `selesai`.
- Tandai `P2-401` sebagai `ready`.

- [ ] **Step 4: Commit documentation, push branch, and open PR**

Push branch `feature/p2-304-public-queries-cache-metadata` ke origin dan buat PR via GitHub CLI dengan deskripsi lengkap dan dokumentasi visual.
