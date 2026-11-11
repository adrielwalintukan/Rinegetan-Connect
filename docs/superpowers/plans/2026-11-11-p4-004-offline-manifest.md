# P4-004 Local package manifest and rights gate

**Goal:** Menyiapkan mekanisme paket lokal P4-004 sejauh yang sudah diputuskan, dengan unduhan/offline tetap **tertutup** sampai gate izin P4-005 lulus.

**Why this shape:** Issue #53 memisahkan dua hal — "mekanisme teknis dapat disiapkan, aktivasi materi publik bersyarat hak P4-005". Acceptance-nya juga mewajibkan tombol download/offline nonaktif sebelum gate lulus. Jadi pekerjaan ini menyiapkan kontrak yang sudah diputuskan dan **tidak** mengarang yang belum.

**Sudah diputuskan (dikerjakan):**

- Manifest memuat version, size estimate, created_at, dan versi yang terlihat (issue #53 acceptance 1).
- "Update tersedia" bila ada versi lebih baru; pengguna yang memilih (acceptance 3).
- Progres memakai ID lesson stabil dan tidak hilang saat update mempertahankan lesson ID (acceptance 4).
- Gate izin tertutup dan tidak bisa dilewati caller baru (acceptance 5).

**Belum diputuskan (sengaja tidak dibuat):**

- Format arsip/protokol paket dan library-nya. Issue #53 menyebutnya eksplisit sebagai blocker yang belum diputuskan.
- Skema IndexedDB dan transport unduhan — keduanya bergantung pada format arsip di atas.
- Tombol/UI unduhan, karena acceptance 5 melarangnya dirilis sebelum P4-005.

Mengarang salah satu dari itu akan mengubah keputusan pemilik menjadi asumsi implementer.

## Task 1: Modul kontrak + gate

**Files:** create `frontend/src/lib/sabbath/offline.mjs`; create `frontend/tests/p4-004-offline.test.mjs`.

- [x] Gate `OFFLINE_ENABLED = false` sebagai satu-satunya sumber kebenaran, dengan `offlineEnabled()`.
- [x] `createManifest` hanya menerima ID triwulan/lesson yang sah dan menolak metadata invalid.
- [x] `parseManifest` memvalidasi ulang manifest dari storage (trust boundary), bukan mempercayai bentuk objek.
- [x] `compareVersions`/`updateAvailable` untuk pesan "Update tersedia" tanpa unduhan otomatis.
- [x] `carryProgress` mempertahankan progres hanya untuk paket yang masih ada, memakai ID stabil.

## Task 2: Bukti gate tertutup di UI

**Files:** modify `frontend/tests/visual/sabbath-reader.spec.ts`.

- [x] Asersi bahwa halaman reader tidak merender kontrol unduh/offline selama gate tertutup.

## Task 3: Dokumentasi

**Files:** update `docs/05-integrations/SABBATH-SCHOOL-ADVENTECH.md`, `docs/04-delivery/ISSUE-BACKLOG.md`; create `docs/04-delivery/records/P4-004-2026-11-11.md`.

- [x] Catat apa yang sudah menjadi kontrak, apa yang masih menunggu keputusan, dan bahwa gate belum lulus.

## Verifikasi

`npm run test:all` (typecheck, lint, build, seluruh test node) dan `npx playwright test tests/visual/sabbath-reader.spec.ts`.
