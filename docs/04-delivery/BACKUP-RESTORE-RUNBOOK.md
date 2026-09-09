# Runbook Backup dan Pemulihan

## Tujuan dan pemilik

Backup melindungi data gereja, bukan sekadar database. Pemilik backup ditunjuk Admin gereja; akses minimal dua penanggung jawab yang dipercaya dan disimpan pada daftar akses terbatas.

## Jadwal

| Waktu | Cakupan |
| --- | --- |
| Bulanan | Database dan manifest media/konfigurasi yang diperlukan |
| Sebelum migration berisiko | Database penuh dan catatan versi aplikasi |
| Sebelum hard delete material | Record relevan dan keputusan Admin |
| Enam bulanan | Restore drill pada lingkungan nonproduksi |

## Prosedur backup

1. Catat waktu, project target, commit aplikasi, dan migration terakhir.
2. Export database melalui mekanisme Supabase/Postgres yang sesuai dan terverifikasi.
3. Buat manifest object Storage yang mencatat path, ukuran, checksum bila tersedia, dan status consent; object sendiri dibackup sesuai kebutuhan/kebijakan.
4. Enkripsi arsip sebelum meninggalkan lingkungan tepercaya. Password/encryption key hanya disimpan pada vault, tidak pada nama file atau repository.
5. Simpan di lokasi yang dikelola gereja dengan akses terbatas dan redundansi yang disetujui.
6. Catat checksum, lokasi logical, retensi, dan penanggung jawab. Jangan menyertakan doa/nomor kontak dalam catatan terbuka.

## Restore drill

1. Pilih backup yang telah disetujui dan environment nonproduksi kosong.
2. Validasi checksum dan decrypt di lingkungan tepercaya.
3. Restore database lalu migrasikan hanya jika runbook skenario mengharuskannya.
4. Cocokkan row count kategori non-sensitif, migration version, kebijakan RLS, serta sampling media manifest.
5. Uji sign-in staf dummy, konten Published, dan penolakan akses privat untuk non-Admin.
6. Hapus lingkungan restore mengikuti kebijakan setelah verifikasi dan catat durasi, masalah, serta tindakan.

## Pemulihan insiden nyata

Restorasi production adalah keputusan Admin/pimpinan gereja. Tentukan:

- titik waktu pemulihan;
- data yang berisiko hilang/dikembalikan;
- siapa yang mendapat akses;
- komunikasi kepada pihak terdampak bila diperlukan;
- langkah validasi dan monitoring sesudah restore.

Jangan melakukan restore production hanya untuk memperbaiki bug aplikasi yang dapat diperbaiki dengan migration forward atau rollback deployment.
