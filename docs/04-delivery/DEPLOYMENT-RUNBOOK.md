# Runbook Deployment Phase 2

## Tujuan

Men-deploy pilot secara repeatable tanpa membocorkan rahasia, melewati migration tanpa perubahan manual tak terlacak, dan menyediakan rollback yang realistis.

## Prasyarat

- Project Supabase Singapore aktif dan project reference tersimpan di vault operasional.
- Domain produksi belum menjadi prasyarat pilot preview, tetapi wajib sebelum rilis publik produksi.
- Admin gereja telah menetapkan pemilik deployment, pemilik database, dan pemilik backup.
- Semua migration, RLS test, lint, typecheck, unit test, E2E penting, dan build lulus di commit kandidat rilis.
- Vercel dan Supabase berada pada paket yang masih sesuai batas/persyaratan penggunaan.

## Urutan deploy

1. Pastikan working tree bersih dan kandidat rilis memiliki commit yang dapat diidentifikasi.
2. Periksa environment target: URL Supabase dan publishable key benar; service-role key hanya ada di server bila memang dipakai.
3. Jalankan backup terenkripsi bila ada migration yang menyentuh struktur atau data.
4. Terapkan migration dari repository dengan Supabase CLI pada project target. Jangan menempel SQL yang tidak masuk source control ke production.
5. Jalankan test RLS terhadap environment yang aman dan lakukan smoke test role Admin/Editor.
6. Buat preview deployment Vercel; cek rute publik, login staf, publish/archival, dan galeri.
7. Promote ke production hanya setelah penanggung jawab menyetujui bukti hasil dan perubahan konten.
8. Catat commit, waktu, actor, migration terakhir, dan hasil smoke test dalam delivery record.

## Region fungsi untuk deployment berikutnya

Root deployment Next.js adalah `frontend/`. File `frontend/vercel.json` menetapkan satu region fungsi, `sin1` (Singapore), agar dekat dengan database Singapore. Ini konfigurasi source untuk deployment berikutnya; menambah file lokal tidak memindahkan fungsi production. Perubahan ini tidak memindahkan database, tidak menentukan region CDN statis, dan tidak memerlukan perubahan paket.

Sebelum promote, reviewer memeriksa preview dari commit kandidat, deployment summary yang menunjukkan region fungsi `sin1`, rute dinamis/proxy media, kontrol akses, dan smoke test. Header respons saja belum cukup membuktikan semua fungsi berpindah. Promote production memerlukan persetujuan eksplisit penanggung jawab; jangan melakukan promote hanya karena konfigurasi telah di-merge. Catat region yang benar-benar teramati pada preview dan setelah promote yang disetujui.

Acuan resmi, diperiksa 18 Oktober 2026: [konfigurasi region fungsi Vercel](https://vercel.com/docs/functions/configuring-functions/region) dan [daftar region Vercel](https://vercel.com/docs/regions).

## Penanda rilis Phase 2

Tag anotasi lokal `v2.0.0` dibuat pada commit rilis `main` `0615e638e902a310c9d7d5d61fc7876f51bb0ffb`. Tag lokal belum berarti tersedia di remote. Tag ini dipublikasikan ke remote pada 24 Oktober 2026 setelah persetujuan pemilik (OPS-005); langkah di bawah tetap menjadi acuan verifikasi. Verifikasi dari root repository dengan PowerShell 5.1:

```powershell
$phase2ReleaseCommit = '0615e638e902a310c9d7d5d61fc7876f51bb0ffb'
$phase2TagCommit = git rev-parse 'v2.0.0^{commit}'
if ($LASTEXITCODE -ne 0) { throw 'Tag lokal tidak dapat dibaca.' }
if ($phase2TagCommit -ne $phase2ReleaseCommit) { throw 'Target tag lokal tidak cocok dengan rilis Phase 2.' }
$phase2TagType = git cat-file -t refs/tags/v2.0.0
if ($LASTEXITCODE -ne 0) { throw 'Tipe tag lokal tidak dapat dibaca.' }
if ($phase2TagType -ne 'tag') { throw 'v2.0.0 harus berupa tag anotasi.' }
git ls-remote --tags origin refs/tags/v2.0.0 'refs/tags/v2.0.0^{}'
if ($LASTEXITCODE -ne 0) { throw 'Status tag remote belum dapat diperiksa.' }
```

Jika remote belum memiliki tag dan publikasi tag sudah disetujui, jalankan perintah berikut setelah verifikasi di atas. Bila nama tag sudah dipakai target lain, hentikan dan review; jangan gunakan force atau memindahkan tag rilis.

```powershell
git push origin refs/tags/v2.0.0
if ($LASTEXITCODE -ne 0) { throw 'Publikasi tag gagal; periksa hasil tanpa force push.' }
git ls-remote --tags origin refs/tags/v2.0.0 'refs/tags/v2.0.0^{}'
if ($LASTEXITCODE -ne 0) { throw 'Publikasi tag belum terverifikasi di remote.' }
```

## Smoke test produksi

- Beranda dan enam rute Phase 1 merespons serta navigasi mobile berfungsi.
- Konten Draft/Archived tidak muncul melalui halaman publik.
- Editor dapat membuat dan menerbitkan konten, tetapi tidak masuk halaman staf Admin dan tidak dapat hard-delete.
- Admin dapat membaca audit log dan mengelola staf.
- Media tanpa consent/yang di-hide tidak muncul, termasuk pada koleksi unduhan baru.
- Tidak ada error yang menampilkan detail database atau rahasia.

## Rollback

1. Jika masalah ada pada kode tanpa perubahan schema yang tidak kompatibel, rollback deployment Vercel ke commit sebelumnya (±2 detik pada drill P2-502; operator memilih deployment terverifikasi melalui alur rollback Vercel). Setelah rollback, Vercel berhenti auto-promote: deployment berikutnya wajib di-promote manual (`vercel promote`).
2. Jika masalah terkait konten, archive/hide konten melalui CMS dan tunggu revalidation.
3. Jika migration gagal, hentikan deploy berikutnya dan gunakan migration forward-only yang sudah direview. Jangan menghapus/menulis ulang migration yang pernah diterapkan.
4. Restore backup hanya setelah dampak, titik pemulihan, dan pemilik keputusan disetujui gereja. Lakukan terlebih dahulu pada environment nonproduksi bila memungkinkan.
5. Catat insiden, dampak, dan test regresi yang ditambahkan.

## Larangan

- Jangan deploy dari mesin yang berisi .env yang belum ditinjau.
- Jangan mengaktifkan fitur WhatsApp, push, form pastoral, atau offline Sekolah Sabat melalui flag tersembunyi.
- Jangan mencetak, mengirim chat, atau menaruh service-role key dalam tiket/commit.
