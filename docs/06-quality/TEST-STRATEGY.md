# Strategi Pengujian dan Kualitas

## Piramida pengujian

| Lapisan | Fokus |
| --- | --- |
| Unit | normalizer, validator, status lifecycle, waktu WITA, helper authorization |
| Database/RLS | grants, policy allow/deny, private data boundary, Storage policy |
| Integrasi | Route Handler, Auth invitation, mutation CMS, upload pipeline, cache invalidation |
| E2E | alur publik, sign-in staf, CMS publish, galeri, unduhan aman |
| Visual/a11y | rute Phase 1, Creation Grid, mobile breakpoint, keyboard, reduced motion |

## Kasus wajib Phase 2

### RLS

- anon membaca konten Published, tetapi tidak Draft/Archived.
- anon tidak dapat insert/update/delete konten.
- Editor dapat memutasi konten publik, tetapi tidak staff role, audit, doa, pengunjung, atau penghapusan permanen.
- Admin mengelola staf dan membaca audit/private records.
- Aset revoked, hidden, pending consent, atau non-downloadable tidak dapat dibaca/diunduh publik.
- Setiap tabel mendapatkan uji grants dan policy per operasi.

### CMS dan jadwal

- Draft tidak muncul di rute publik, sitemap, search, maupun API publik.
- Publish/Archive merevalidasi daftar/detail dengan benar.
- Schedule weekly serta override/cancel pada tanggal tertentu dirender benar dalam Asia/Makassar.
- Slug unik, validasi tanggal, dan validasi upload menolak input salah.

### Galeri

- Album/kategori menampilkan urutan dan cover yang benar.
- EXIF/geolocation tidak tersisa di derivative publik.
- Single download dan ZIP memasukkan tepat aset yang eligible.
- Aset yang di-hide setelah request tidak muncul dalam job baru.
- Limit ZIP dan rate limit memberi respons aman.

### Aksesibilitas dan visual

- Navigasi keyboard termasuk menu mobile, dialog/lightbox, filter, dan tombol unduh.
- Kontras AA, fokus terlihat, alt text, heading hierarchy, label form, dan error announcement.
- prefers-reduced-motion menghentikan animasi: framer-motion melalui `MotionGlobalConfig.skipAnimations`, parallax Hero melalui `motion-reduce`, animasi CSS melalui media query global. Diuji perilakunya di `npm run test:a11y`.
- Audit axe WCAG 2.2 AA, satu `<h1>`, alt, fokus keyboard, dan snapshot performa: `npm run test:a11y` (default terhadap production; `AUDIT_BASE_URL` untuk target lain; `AUDIT_START_SERVER=1` menyalakan build lokal). Di CI dijalankan tanpa snapshot performa, lihat bagian Regresi browser di CI.
- Screenshot/regression check pada 320, 375, 768, 1024, dan 1440px.

## Regresi browser di CI

Job `Browser regression (Playwright)` pada workflow CI. Pemilihan suite dan trigger disetujui pemilik pada 2026-10-23 (QA-CI-E2E, #73).

- **Trigger:** sama dengan job CI lain, yaitu pull request dan push ke `development` serta `main`.
- **Lingkungan:** Ubuntu runner, Chromium saja, Supabase CLI lokal versi yang dipin (`2.122.0`) dengan migration dari repository. Service yang tidak dipakai (realtime, imgproxy, mailpit, studio, edge-runtime, logflare, vector, supavisor, postgres-meta) tidak dinyalakan. Production build Next.js memakai URL loopback dan anon key bawaan CLI lokal. Tidak ada akses production.
- **Data:** fixture sintetis (`frontend/tests/helpers/local-course-fixture.mjs`) membuat Admin/Editor dan course milik test dengan email `example.invalid`, lalu menghapusnya. Login staf memakai JWT lokal yang ditandatangani secret CLI lokal, bukan password. Fixture memakai `CONTAINER_RUNTIME` (`docker` di CI, default `podman` lokal).

| Suite | Cakupan |
| --- | --- |
| `public-routes.spec.ts` | Tujuh rute Phase 1 tanpa overflow horizontal pada 320/375/390/768/1440px, menu mobile ditutup dengan Escape, skip link memindahkan fokus |
| `a11y-audit.spec.ts` | axe WCAG 2.2 AA dan struktur (satu `<main>`/`<h1>`, alt) pada sembilan rute di 320/1440px, fokus keyboard terlihat, perilaku reduced motion |
| `bible-reader.spec.ts` | Reader anonim, progres/bookmark lokal, storage gagal, revisi/penarikan/penghapusan CMS tidak bocor walau ada sesi staf, target sentuh 44px, keyboard pada lima lebar |
| `staff-courses.spec.ts` | Alur Admin/Editor nyata, batas Unicode, pagination >1.000 lesson, kegagalan jaringan/record hilang, konfirmasi hapus Admin, bottom sheet, keyboard pada lima lebar |

Dikecualikan di CI: screenshot baseline `home-desktop` (baseline hanya ada untuk Windows) dan snapshot performa audit a11y (hanya bermakna terhadap production). Setiap suite tetap dijalankan walau suite sebelumnya gagal, sehingga semua hasil terlihat di PR. Report dan screenshot diunggah sebagai artefak hanya saat gagal, disimpan 7 hari, dan berisi data sintetis. Output `supabase start` dibuang agar tabel key lokal tidak tercetak.

Batas: hanya Chromium; Safari/Firefox dan perangkat fisik belum tercakup. Bagian halaman publik yang bergantung data (kegiatan, pengumuman, foto) dirender sebagai empty state karena database CI kosong. Unggah media dan unduhan ZIP belum memiliki suite browser.

Risiko flakiness yang dipantau: pull image Supabase dari `public.ecr.aws` tanpa autentikasi sering mendapat `toomanyrequests` (teramati 23–24 Oktober: job browser 1–18 kali dan job pgTAP 11–33 kali per run). Supabase CLI me-retry tiap image dan semua run tetap lulus. Bila kegagalan job karena rate limit berulang, opsi berikutnya adalah pull terautentikasi atau cache image; keduanya memerlukan keputusan pemilik karena melibatkan secret registry.

## Kriteria merge

1. Typecheck, lint, unit, build, dan regresi browser CI lulus.
2. Migration dapat diterapkan ulang pada database kosong.
3. RLS/Storage test lulus termasuk negative tests.
4. Tidak ada rahasia/PII dalam fixture, log, atau snapshot.
5. Reviewer memeriksa perubahan UI terhadap Design System.
6. Perubahan schema mengubah migration, tipe, policy, test, dan dokumentasi secara bersamaan.

## Kriteria rilis

Selain kriteria merge: smoke test deployment preview, pemeriksaan konfigurasi environment, backup proof, rollback procedure, dan persetujuan owner untuk konten awal.
