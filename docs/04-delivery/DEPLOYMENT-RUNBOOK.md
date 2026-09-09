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

## Smoke test produksi

- Beranda dan enam rute Phase 1 merespons serta navigasi mobile berfungsi.
- Konten Draft/Archived tidak muncul melalui halaman publik.
- Editor dapat membuat dan menerbitkan konten, tetapi tidak masuk halaman staf Admin dan tidak dapat hard-delete.
- Admin dapat membaca audit log dan mengelola staf.
- Media tanpa consent/yang di-hide tidak muncul, termasuk pada koleksi unduhan baru.
- Tidak ada error yang menampilkan detail database atau rahasia.

## Rollback

1. Jika masalah ada pada kode tanpa perubahan schema yang tidak kompatibel, rollback deployment Vercel ke commit sebelumnya.
2. Jika masalah terkait konten, archive/hide konten melalui CMS dan tunggu revalidation.
3. Jika migration gagal, hentikan deploy berikutnya dan gunakan migration forward-only yang sudah direview. Jangan menghapus/menulis ulang migration yang pernah diterapkan.
4. Restore backup hanya setelah dampak, titik pemulihan, dan pemilik keputusan disetujui gereja. Lakukan terlebih dahulu pada environment nonproduksi bila memungkinkan.
5. Catat insiden, dampak, dan test regresi yang ditambahkan.

## Larangan

- Jangan deploy dari mesin yang berisi .env yang belum ditinjau.
- Jangan mengaktifkan fitur WhatsApp, push, form pastoral, atau offline Sekolah Sabat melalui flag tersembunyi.
- Jangan mencetak, mengirim chat, atau menaruh service-role key dalam tiket/commit.
