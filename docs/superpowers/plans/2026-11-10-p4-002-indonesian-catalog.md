# P4-002 Indonesian Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyiapkan katalog materi Indonesia yang diuji secara sintetis, mempertahankan informasi kelas jemaat, dan memperbaiki keterbacaan halaman pada mobile tanpa mengaktifkan sumber nyata.

**Architecture:** Filter katalog memakai normalizer yang sudah ada dan pemetaan kelas eksplisit dari lapisan tepercaya, bukan tebakan suffix upstream. Loader server tetap mengembalikan unavailable selama gate tertutup; halaman publik menampilkan pesan belum tersedia, bukan fixture. Cache privat dan pembatasan Admin tidak dibuka.

**Tech Stack:** Next.js, React, Tailwind, TypeScript, Node test runner, Playwright, PostgreSQL/pgTAP.

**Spec:** Issue #51; pilihan A disetujui pemilik dalam percakapan 2026-11-10; `docs/05-integrations/SABBATH-SCHOOL-ADVENTECH.md`; `docs/02-design/DESIGN-SYSTEM.md`.

## Global Constraints

- Tanpa worktree, clone, dependency baru, merge, atau perubahan pada `remotion/`.
- Gate server/database tetap tertutup; tanpa request materi/gambar upstream, fixture publik, atau perubahan grants.
- Hanya Bahasa Indonesia valid; urutan Kindergarten, Primary, PowerPoint, Cornerstone, Dewasa; kelas invalid/tidak tersedia disembunyikan.
- Tanpa reader, offline, akun Member, progres cloud, scheduler, atau pemetaan kelas upstream karangan.
- Informasi kelas jemaat dan jadwal tetap dipertahankan. UI mengikuti token situs, mengutamakan mobile, tanpa CTA yang belum berfungsi.
- GitHub tanpa nama AI, path lokal, atau bukti izin privat; PR ke development dan tunggu CI exact-HEAD, tanpa merge.

## Review Focus

- Bahasa asing, identitas kelas tidak dikenal, dan payload rusak tidak boleh tampil.
- Gate tertutup tidak boleh menyebabkan fetch, koneksi cache, atau pemuatan cover eksternal baru.
- Kegagalan satu kelas tidak menyembunyikan kelas valid lain; semua invalid menghasilkan unavailable.
- Label panjang dan metadata tidak menyebabkan overflow pada 320px; heading dan keyboard tetap masuk akal.
- Penutupan administratif #50 tidak boleh ditulis sebagai bukti acceptance atau izin aktivasi.

## Task 1: Seleksi katalog dan batas server

**Files:** Create `frontend/src/lib/sabbath/catalog.mjs`, `frontend/tests/p4-002-catalog.test.mjs`; modify `frontend/src/lib/sabbath/server.ts`, `frontend/tests/p4-001-adventech-server.test.mjs`.

**Interfaces:** `selectSabbathCatalog(entries)` menerima array internal `{ classId, payload }` dengan payload quarterly mentah; mengembalikan array `{ classId, label, quarterly }`. Class ID terbatas `kindergarten`, `primary`, `powerpoint`, `cornerstone`, `adult`; payload dinormalisasi ulang. `loadSabbathCatalog()` mengembalikan `{ status: "unavailable", classes: [] }` selama gate tertutup. Tidak menerima pemetaan dari browser.

- [x] Tulis test: semua kelas terurut, hanya Dewasa valid, kelas hilang/asing/invalid, input bukan array, dan semua invalid. Fixture sintetis bukan bukti pemetaan upstream.
- [x] Jalankan `node --test tests/p4-002-catalog.test.mjs` dari frontend; pastikan RED karena modul belum ada.
- [x] Implementasikan seleksi minimum, tanpa suffix parsing atau dependency baru; identitas kelas ambigu/duplikat ditolak untuk kelas tersebut.
- [x] Tambah test loader katalog: unavailable, classes kosong, nol fetch/koneksi; jalankan RED sebelum menambah loader.
- [x] Jalankan kedua test hingga GREEN; pertahankan test loader quarterly lama.

## Task 2: Halaman publik mobile-first

**Files:** Modify `frontend/src/app/(public)/sekolah-sabat/page.tsx`, `frontend/src/components/pages/SekolahSabatPage.jsx`; create `frontend/tests/p4-002-catalog-page.test.mjs`; extend `frontend/tests/visual/public-routes.spec.ts` jika diperlukan setelah membaca fixture/config suite.

**Interfaces:** Route memanggil loader katalog tanpa bergantung sesi staf dan meneruskan hasil sebagai prop `catalog` ke halaman. Komponen menampilkan section “Materi Sekolah Sabat” dengan pesan “Materi belum tersedia” ketika gate tertutup; tidak merender payload tanpa hasil loader yang sesuai. Metadata sumber sintetis hanya diuji secara lokal, bukan dimasukkan route.

- [x] Tulis test render menggunakan fasilitas React/server yang terpasang: kelas lokal tetap ada, bagian materi terpisah, unavailable tanpa tab/tautan baca/cover; fixture katalog valid menguji label berurutan dan attribution sebagai teks, tanpa reader palsu.
- [x] Jalankan test dan pastikan RED sebelum perubahan komponen/route.
- [x] Hubungkan loader; rapikan empat kartu lokal dengan heading kelompok, judul dan metadata jelas, border/token existing tanpa ikon repetitif. Satu kolom mobile, dua kolom saat ruang mencukupi; tidak ada carousel atau efek dekoratif baru. Pertahankan data, jadwal, media dan test ID existing.
- [x] Jalankan GREEN dan browser pada 320/375/768/1024/1440px: tidak overflow, tidak ada tab kosong/CTA palsu, satu h1, informasi lokal utuh. Periksa screenshot lokal sebelum menyatakan kualitas visual.

## Task 3: Bukti, dokumentasi, dan delivery

**Files:** Modify `docs/04-delivery/ISSUE-BACKLOG.md`, `docs/05-integrations/SABBATH-SCHOOL-ADVENTECH.md`; create `docs/04-delivery/records/P4-002-2026-11-10.md`; update checklist plan ini sesuai bukti.

- [x] Jalankan regresi cache/RPC pada PostgreSQL disposable dengan fixture sintetis; tanpa reset database bersama. Jika lingkungan gagal, catat blocker, jangan klaim lulus.
- [x] Jalankan `npm run test:all` serta Playwright publik/a11y relevan; catat hasil aktual. Pint/PHPStan/Vitest tidak berlaku karena tidak terpasang dan bukan stack produk.
- [x] Dokumentasikan keputusan pemilik, RED/GREEN, batas pemetaan/izin, dan bedakan mekanisme dari aktivasi/acceptance. Perbaiki status administratif #50 tanpa menghapus gap. Jangan membuat User Issues/Stories pengganti yang tidak diminta.
- [ ] Review `git diff` penuh termasuk file baru, cek grants tetap tertutup dan tidak ada data/tautan sumber nyata yang baru diambil. Stage hanya file task, commit, push, buat PR ke development tanpa klaim menutup seluruh #51.
- [ ] Tunggu seluruh CI pada SHA HEAD PR yang tepat, tangani temuan, laporkan PR dan batas yang tersisa; tanpa merge.
