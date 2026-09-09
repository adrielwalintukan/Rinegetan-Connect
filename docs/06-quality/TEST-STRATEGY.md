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
- prefers-reduced-motion mengurangi animasi.
- Screenshot/regression check pada 320, 375, 768, 1024, dan 1440px.

## Kriteria merge

1. Typecheck, lint, unit, dan build lulus.
2. Migration dapat diterapkan ulang pada database kosong.
3. RLS/Storage test lulus termasuk negative tests.
4. Tidak ada rahasia/PII dalam fixture, log, atau snapshot.
5. Reviewer memeriksa perubahan UI terhadap Design System.
6. Perubahan schema mengubah migration, tipe, policy, test, dan dokumentasi secara bersamaan.

## Kriteria rilis

Selain kriteria merge: smoke test deployment preview, pemeriksaan konfigurasi environment, backup proof, rollback procedure, dan persetujuan owner untuk konten awal.
