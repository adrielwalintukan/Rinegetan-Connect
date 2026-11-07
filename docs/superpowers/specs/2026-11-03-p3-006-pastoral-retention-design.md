# P3-006 — Retensi dan Respons Pastoral

**Status:** Desain disetujui pemilik project pada 2026-11-03; diimplementasikan pada hari yang sama di branch `feature/p3-006-pastoral-retention`. Lihat [record](../../04-delivery/records/P3-006-2026-11-03.md).
**Dasar integrasi:** `development` pada `9a93f27`.
**Issue:** P3-006 (#49).

## Keputusan pemilik (2026-11-03)

| Hal yang belum ditentukan issue | Keputusan |
| --- | --- |
| Perubahan retensi oleh Admin (acceptance 1) | Tidak ada UI ubah retensi. Ketiga tabel tetap pada cut-off 24 bulan dikurangi 120 hari. Sesuai keputusan pemilik 2026-11-01 (review PR #88), retensi tidak dapat diperpanjang untuk data dengan copy "paling lama 24 bulan". Periode lain hanya untuk pengumpulan baru dengan versi consent baru yang disahkan, lewat issue terpisah bila dibutuhkan. |
| Periode alternatif | Tidak ada. |
| Penjadwal penghapusan | Tidak ada penjadwal otomatis (tanpa pg_cron). Admin menekan **Hapus data kedaluwarsa** di portal setiap minggu. Runbook SQL tetap menjadi cadangan. |
| Bentuk/format ekspor | Tidak ada ekspor di P3-006. Data hanya dibaca di portal; ekspor dibuat lewat issue terpisah bila ada kebutuhan nyata. |
| Nama status | Tetap memakai status P3-004/P3-005; tidak ada status baru. |
| Audit akses | Satu audit `pastoral.viewed` setiap kali portal memuat data pastoral untuk Admin. Isinya hanya jumlah baris per tabel. Log Audit menampilkannya dalam daftar terpisah **Akses data pastoral** agar entri lain tidak tenggelam. |

Catatan: portal memuat ketiga tabel pastoral sekaligus pada setiap muat halaman Admin (`page.tsx`), dan membuka tab Log Audit memicu `router.refresh()`. Karena itu audit dicatat per muat portal, bukan per tab yang diklik.

## Acceptance #49 dan pemenuhannya

1. Default review/hapus setelah 24 bulan. Dipenuhi lewat cut-off tetap dan tombol hapus Admin. Bagian "Admin dapat mengubah retensi" sengaja tidak dibuat sesuai keputusan di atas.
2. Dashboard privat dengan status penanganan tanpa isi pastoral di audit/log. Sudah ada dari P3-004/P3-005; audit baru juga tidak memuat isi.
3. Audit akses tersedia. Dipenuhi lewat `pastoral.viewed`. Ekspor tidak disediakan, sehingga tidak ada jalur ekspor yang perlu diaudit.
4. Runbook dan operasional pastoral disetujui, pengendalian diuji. Pengujian ada di PR ini. Persetujuan runbook oleh gereja tetap menjadi gate rilis production.

## Data

Satu migration aditif `20261103010000_p3_006_pastoral_retention.sql`. Tidak ada tabel atau kolom baru dan tidak ada grant `DELETE`.

- `private.pastoral_retention_cutoff()` mengembalikan `now() - interval '24 months' + interval '120 days'` (stable). Ini satu-satunya sumber cut-off di database.
- `public.expired_pastoral_counts()` mengembalikan `table(study_interest_leads bigint, prayer_requests bigint, visitor_submissions bigint)`, yaitu jumlah baris dengan `created_at` sebelum cut-off.
- `public.purge_expired_pastoral_data()` menghapus semua baris sebelum cut-off di ketiga tabel dalam satu transaksi. Untuk setiap tabel, fungsi menulis satu audit `<prefix>.purged` (`study_interest`, `prayer_request`, `visitor_submission`), dengan `entity_type` = nama tabel, `entity_id` null, dan `changes = {deleted, cutoff}`. Audit tetap ditulis bila jumlahnya 0, sebagai bukti putaran mingguan. Fungsi mengembalikan jumlah terhapus dengan bentuk yang sama.
- `public.record_pastoral_access(p_study_interest integer, p_prayer integer, p_visit integer)` menulis satu audit `pastoral.viewed`, dengan `entity_type = 'pastoral_data'`, `entity_id` null, dan `changes = {study_interest_leads, prayer_requests, visitor_submissions}`. Setiap nilai harus 0-50 (batas tampilan portal); nilai lain ditolak.
- Ketiga fungsi publik memakai `security definer`, `search_path = ''`, dan menolak pemanggil yang bukan Admin aktif (`private.is_admin()`, errcode `42501`). Execute dicabut dari `public`, `anon`, dan `service_role`, lalu diberikan hanya ke `authenticated`. Cut-off helper tidak dapat dieksekusi role Data API.
- Audit tidak pernah memuat id baris, nama, kontak, isi doa, pesan, tanggal kunjungan, atau token.

## Server

- `lib/forms/pastoral-admin.mjs`: `recordPastoralAccess(client, counts)`, `loadExpiredPastoralCounts(client)`, `purgeExpiredPastoralData(client, role)` (403 untuk non-Admin, error database lewat `publicErrorMessage`).
- `page.tsx`: setelah `Promise.all`, Admin memanggil `recordPastoralAccess` dengan jumlah baris yang berhasil dimuat. **Fail-closed:** bila audit gagal, ketiga daftar pastoral tidak dikirim ke klien dan ditampilkan pesan gagal muat. Jumlah kedaluwarsa dimuat bersamaan.
- `lib/staff/audit.mjs`: `loadAuditLogs` mengecualikan `pastoral.viewed` dari 50 entri utama dan memuat 20 entri `pastoral.viewed` terbaru secara terpisah.
- `POST /api/staff/pastoral-retention`: autentikasi staf aktif, Admin saja, tanpa body, lalu memanggil RPC purge dan mengembalikan jumlah terhapus. Pola error sama dengan route PATCH pastoral.

## UI staf (tab Log Audit, Admin saja)

- Panel **Retensi data pastoral** di atas linimasa. Panel menampilkan jumlah data yang melewati cut-off per jenis (Minat belajar, Doa, Kunjungan) dan teks kebijakan "Data dihapus sebelum genap 24 bulan; tidak dapat diperpanjang." Tombol **Hapus data kedaluwarsa** nonaktif bila jumlahnya 0 dan membuka `DeleteConfirmationDialog` yang sudah ada. Setelah sukses, portal memanggil `router.refresh()`.
- Daftar **Akses data pastoral** menampilkan waktu, aktor, dan jumlah per tabel dengan pola tampilan `AuditLogViewer`.
- Editor tidak melihat tab ini (aturan yang ada).

## Pengujian

- pgTAP `p3_006_pastoral_retention.test.sql` dengan data sintetis di kedua sisi cut-off untuk ketiga tabel: baris yang lewat cut-off terhapus, sedangkan baris yang belum lewat (misalnya cut-off + 1 hari) tetap ada. Tes juga mencakup jumlah dan isi audit purge (termasuk 0), `pastoral.viewed` tanpa isi, penolakan nilai di luar 0-50, serta penolakan untuk anon, Editor, Admin nonaktif, dan `service_role` pada ketiga fungsi. Tes P3-004/P3-005 yang menyatakan Admin tidak dapat `DELETE` langsung tetap lulus.
- Unit (Node): helper baru, route purge (non-Admin 403, sukses), filter audit loader, dan kontrak fail-closed loader portal.
- Playwright tidak ditambah. Tab Admin sudah diuji e2e, dan penghapusan butuh data berumur lebih dari 20 bulan yang hanya realistis di pgTAP.

## Dokumen

RETENTION-DELETION-RUNBOOK (langkah 2/4 lewat portal, SQL jadi cadangan, audit kini otomatis untuk purge portal), DATA-MODEL-AND-RLS, SECURITY-PRIVACY, CONTENT-OPERATIONS, ISSUE-BACKLOG, ROADMAP, spec ini, plan, dan record `docs/04-delivery/records/P3-006-2026-11-03.md`.

## Di luar lingkup

Ekspor, ubah/perpanjang retensi, periode alternatif, penjadwal otomatis, status baru, notifikasi, akses Editor, dan penghapusan per baris.

## Risiko dan batas

- Penghapusan bergantung pada Admin menekan tombol setiap minggu. Margin 120 hari tetap mengasumsikan jeda paling lama 7 hari; bila Admin melewatkan putaran, janji 24 bulan bisa terlanggar untuk salinan backup.
- Restore dari backup lama mengembalikan data terhapus. Tekan tombol lagi setelah restore.
- Audit akses mencatat pemuatan portal, bukan pembacaan per baris.
- Gate production: runbook dan operasional pastoral disahkan gereja; gate backup migration tetap berlaku.
