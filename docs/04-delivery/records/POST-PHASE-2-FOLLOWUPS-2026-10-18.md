# Catatan Tindak Lanjut Pasca-Phase 2

- **Tanggal:** 18 Oktober 2026
- **Branch pekerjaan:** `chore/phase-2-followups`, dari `development` `87499d393f63ce2890fadee31fd628def67576da`.
- **Rilis production acuan:** `main` `0615e638e902a310c9d7d5d61fc7876f51bb0ffb` (PR #37); CI run `39065435981` sukses.
- **Cakupan:** pemeriksaan baca-saja, perbaikan lokal yang disetujui, dan dokumentasi operasional. Tidak ada migration production, perubahan dashboard, deployment production, promote, atau publikasi tag pada pekerjaan ini. Branch disiapkan untuk draft PR menuju `development`; push dapat memicu preview otomatis sesuai integrasi repository.

Catatan ini tidak memuat project reference, email, path pribadi, URL privat, atau nilai kredensial. Status selesai lokal tidak berarti sudah berlaku di production. Riwayat backup dan restore tetap mengacu pada [P2-502](P2-502-2026-10-15.md); review rilis awal pada [P2-503](P2-503-2026-10-16.md).

## Status sepuluh tindak lanjut

| # | Tindak lanjut | Status per 18 Oktober | Bukti dan langkah tersisa |
| --- | --- | --- | --- |
| 1 | Salinan backup ke penyimpanan kedua | Integritas sumber terverifikasi; menunggu pemilik | Kedua arsip terenkripsi ditemukan di penyimpanan lokal pemilik backup; byte dan SHA-256 cocok dengan P2-502. Tujuan kedua belum ditetapkan, salinan belum dibuat. Pemilik memilih tujuan dan memverifikasi hasil sesuai runbook. |
| 2 | Pemegang kunci `age` kedua | Prosedur selesai; menunggu pemilik | Runbook mewajibkan key dibuat pada perangkat pemegang kedua sendiri; hanya public recipient diberikan ke operator. Penunjukan pemegang dan public recipient kedua belum dikonfirmasi. Backup baru ke dua recipient belum dibuat. |
| 3 | Pencabutan key Supabase yang pernah terekspos | Belum terverifikasi; menunggu pemilik | Pemilik memeriksa status revoke/rotasi langsung di dashboard dan melaporkan hasil tanpa membagikan nilai key. Keberhasilan halaman publik bukan bukti revoke. |
| 4 | Leaked-password protection Supabase Auth | Ketersediaan terverifikasi; tidak tersedia pada Free | Dokumentasi resmi menyatakan fitur tersedia pada Pro ke atas. Pilot tetap pada Free; tidak ada upgrade paket atau perubahan Auth. Risiko fitur yang belum tersedia tetap dicatat untuk review paket oleh pemilik. |
| 5 | Region fungsi Vercel dekat database Singapore | Konfigurasi source selesai; belum diterapkan | `frontend/vercel.json` menetapkan `regions: ["sin1"]`. Respons proxy publik memberi indikasi runtime lama masih `iad1`; header saja tidak membuktikan seluruh fungsi. Region harus diverifikasi pada preview berikutnya; promote production tetap menunggu persetujuan eksplisit. |
| 6 | Penghapusan objek Storage saat hard delete dan toggle unduh album | Patch dan verifikasi lokal selesai | Metadata dihapus lebih dahulu; objek Storage dibersihkan hanya setelah DELETE berhasil, dengan peringatan bila cleanup gagal. Toggle album memakai client sesi/RLS, validasi ketat, dan audit trigger DB melalui satu migration lokal yang disetujui. Consent foto anak diturunkan ke Draft dalam UPDATE yang sama; audit Admin memakai `occurred_at` dan WITA. Penghapusan orphan historis tidak otomatis selesai oleh patch; inventaris baca-saja dan persetujuan pemilik tetap diperlukan sebelum pembersihan production. |
| 7 | Consent media "Global Youth Day" | Belum terverifikasi; menunggu pemilik | `GET /media` merespons 200 dan judul masih ada. Tampilan publik tidak membuktikan nilai consent atau bukti izinnya. Pemilik memeriksa bukti izin di portal staf; bila belum sah, kembalikan ke Draft/hide. Tidak ada mutasi consent production pada pekerjaan ini. |
| 8 | Penomoran Sprint 5 berbeda dengan backlog | Dokumentasi diselaraskan | Sprint plan mengikuti backlog: P2-501 quality gate/CI, P2-502 deployment/backup/restore, P2-506 UI mobile, P2-503 review/rilis. Backlog menjadi acuan penomoran. |
| 9 | Upgrade Supabase CLI | Ditunda dengan sengaja | Rilis stable `v2.121.0` tersedia; paket frontend, lockfile, dan CI tetap pin `2.117.0` untuk reproducibility. Upgrade dilakukan sebagai perubahan terpisah dengan verifikasi CLI/migration/RLS. |
| 10 | Tag rilis `v2.0.0` | Tag anotasi lokal dibuat; belum dipublikasikan | Target tag lokal terverifikasi pada commit rilis `main` `0615e638e902a310c9d7d5d61fc7876f51bb0ffb`. Remote belum memiliki tag saat pemeriksaan awal. Runbook memuat verifikasi target dan instruksi publikasi setelah disetujui; tidak ada push tag pada pekerjaan ini. |

## Verifikasi backup terenkripsi

| Arsip | Ukuran byte | SHA-256 | Hasil pemeriksaan 18 Oktober |
| --- | --- | --- | --- |
| `rinegetan-20261013T135853Z.tar.age` | 26.824 | `029b4835a51e3ec19c8b06cfbf362bb3170b3278d119692dea7e431df7f7ee25` | Cocok dengan P2-502 |
| `rinegetan-20261015T033323Z.tar.age` | 930.728 | `06c4cf9d198f2ed50288a944742fd317be99b656b87d4a1278272881a15153fc` | Cocok dengan P2-502 |

Pemeriksaan kali ini hanya membaca ciphertext; arsip tidak didekripsi dan private key tidak dibaca. Checksum cocok membuktikan integritas byte, bukan restore baru. Kedua backup mendahului perubahan schema 17–18 Oktober; backup terbaru diperlukan sebelum perubahan schema berikutnya. Belum ada bukti salinan kedua atau pemulihan dengan key pemegang kedua.

## Verifikasi kode dan batas bukti

Baseline sebelum patch: `npm ci` berhasil; `npm run test:all` lulus typecheck, lint, build, dan **125/125** test. Supabase lokal tidak aktif; build memakai fallback data kosong saat koneksi lokal gagal. Hasil ini tidak membuktikan akses database, RLS, atau login staf production.

Hasil setelah patch:

- `npm run test:all`: typecheck, lint, production build, dan **165/165** Node test lulus. Sebanyak 40 test regresi baru meliputi consent anak, urutan DELETE/cleanup, otorisasi dan validasi API album, perilaku toggle UI, serta audit Admin/WITA.
- pgTAP lokal: **8 file, 206 test, PASS**. Test audit album mula-mula gagal 8 dari 13 sebelum migration, kemudian lulus setelah migration lokal `20261018120000_p2_405_album_download_audit.sql`. Tidak ada perubahan policy/grant tabel. Migration ini belum diterapkan ke production.
- Chromium lokal: **12 kombinasi** tampilan (media Admin/Editor dan audit Admin; lebar 320, 375, 768, 1440) tanpa overflow halaman. Target label toggle minimal 44 px. Pemeriksaan memakai komponen aktual, CSS hasil build, dan data sintetis; bukan login staf atau E2E production.
- Review statis independen tidak menemukan masalah P1/P2 yang actionable. JSON region valid dan `git diff --check` bersih. Indeks audit di dokumen data model diselaraskan ke kolom aktual `occurred_at`.

Percobaan awal quality gate berhenti karena ESLint kehabisan heap ketika layanan Supabase lokal berjalan. Setelah test DB selesai, hanya layanan Supabase proyek ini dihentikan, lalu quality gate frontend diulang dan lulus. Container proyek lain tidak dihentikan. Build memberi log koneksi database lokal ditolak dan memakai fallback data kosong, sama seperti baseline; ini tidak membuktikan data production.

Login staf serta smoke test dengan data nyata tetap dijalankan oleh pemilik; jangan membuat akun production atau memasukkan password/kredensial melalui alat bantu agent. Sebelum rilis, buat backup terbaru, terapkan migration setelah konfirmasi production terpisah, dan verifikasi preview/region serta alur staf. Penghapusan Storage bersifat permanen; rollback kode tidak memulihkan file yang sudah dihapus.

## Acuan resmi yang diperiksa 18 Oktober 2026

- [Supabase password security](https://supabase.com/docs/guides/auth/password-security): ketersediaan leaked-password protection.
- [Konfigurasi region fungsi Vercel](https://vercel.com/docs/functions/configuring-functions/region) dan [daftar region Vercel](https://vercel.com/docs/regions): `regions` pada `vercel.json` dan `sin1` untuk Singapore.
- [Supabase CLI v2.121.0](https://github.com/supabase/cli/releases/tag/v2.121.0): rilis pembanding; pin proyek belum diubah.
- [Issue Backlog Phase 2](../PHASE-2-ISSUE-BACKLOG.md): acuan nomor dan cakupan Sprint 5.

## Konfirmasi pemilik yang masih diperlukan

Pemilik menetapkan tujuan penyimpanan kedua, menunjuk pemegang key kedua, memastikan revoke key yang terekspos, dan menilai consent "Global Youth Day". Catat hasil dan tanggal tanpa nilai key, bukti consent berisi data pribadi, atau URL privat. Publikasi tag serta promote production mengikuti persetujuan eksplisit dan gate pada [runbook deployment](../DEPLOYMENT-RUNBOOK.md).

## Pembaruan status — 2026-10-23

Pembaruan ini menambahkan keputusan pemilik dan hasil rilis sesudah 18 Oktober. Tabel di atas dipertahankan sebagai riwayat.

| # | Tindak lanjut | Status per 23 Oktober | Sumber |
| --- | --- | --- | --- |
| 1 | Salinan backup ke penyimpanan kedua | Deferred sampai akhir atas keputusan pemilik | OPS-003 (#63) |
| 2 | Pemegang kunci `age` kedua | Deferred sampai akhir atas keputusan pemilik | OPS-004 (#64) |
| 3 | Pencabutan key yang pernah terekspos | Selesai menurut konfirmasi pemilik 18 Oktober: secret key lama dihapus, secret key baru khusus Production, legacy API key dinonaktifkan. Agent tidak membaca atau mencoba nilai key. | PR #39 |
| 4 | Leaked-password protection | Tidak berubah: tidak tersedia pada paket Free | — |
| 5 | Region fungsi `sin1` | Diterapkan production 23 Oktober; rute dinamis teramati `sin1::sin1` | [OPS-001](OPS-001-2026-10-23.md) |
| 6 | Cleanup Storage saat hard delete dan toggle unduhan album | Kode merge (PR #38) dan dirilis 23 Oktober; migration audit album diterapkan. Orphan historis kondisional: inventaris baca-saja dahulu, pembersihan hanya atas persetujuan | OPS-007 (#67) |
| 7 | Consent media "Global Youth Day" | Sudah Draft sejak 18 Oktober; review bukti izin masih menunggu pemilik | OPS-006 (#66) |
| 8 | Penomoran Sprint 5 | Tidak berubah: selaras dengan backlog | — |
| 9 | Upgrade Supabase CLI | Opsional, tetap pin `2.117.0` | OPS-008 (#74) |
| 10 | Tag rilis `v2.0.0` | Tag anotasi lokal ada; belum dipublikasikan ke remote | OPS-005 (#65) |

Backup baru: dilewati untuk rilis 23 Oktober atas keputusan pemilik karena keempat migration aditif (pengecualian runbook, dicatat di OPS-001). Backup mutakhir dan cadence berikutnya deferred sampai akhir (OPS-002, #62). Backup terakhir tetap 15 Oktober.

## Pembaruan 24 Oktober 2026 — publikasi tag `v2.0.0` (OPS-005, #65)

Butir 10 selesai. Pemilik menyetujui publikasi secara eksplisit pada 24 Oktober sebelum push.

| Pemeriksaan | Hasil |
| --- | --- |
| Tag lokal sebelum push | Tipe `tag` (anotasi), pesan `release: Phase 2 CMS dan fondasi platform`, menunjuk `0615e638e902a310c9d7d5d61fc7876f51bb0ffb` (ada di `main`). |
| Remote sebelum push | Belum ada tag; tidak ada konflik target. |
| Publikasi | `git push origin refs/tags/v2.0.0` tanpa force: `[new tag] v2.0.0`. |
| Remote sesudah push | `refs/tags/v2.0.0` = objek tag `7aac1aaf646ff76a67faa20a029c8cb9ae9c5f25` (sama dengan lokal); `refs/tags/v2.0.0^{}` = `0615e638e902a310c9d7d5d61fc7876f51bb0ffb`. |

GitHub Release tidak dibuat; di luar scope OPS-005.

## Pembaruan 25 Oktober 2026 — inventaris orphan Storage (OPS-007, #67)

Butir 6 (orphan historis) selesai tanpa cleanup: tidak ada orphan.

Pemilik menjalankan query baca-saja di SQL Editor production (`begin read only` … `rollback`). Agent tidak mengakses production dan tidak memakai kredensial. Query hanya mengeluarkan jumlah, tanpa path atau metadata. Referensi yang dicocokkan adalah `media_assets.storage_path` terhadap objek bucket `media`, satu-satunya referensi Storage menurut migration dan kode. Objek berumur kurang dari 1 jam dihitung terpisah agar unggahan yang sedang berjalan tidak dianggap orphan. Query diuji lebih dulu pada Supabase lokal dengan data sintetis (satu objek terreferensi, satu orphan lama, satu orphan baru, satu baris tanpa objek); hasilnya sesuai, termasuk dalam transaksi `read only`.

| Ukuran | Hasil production |
| --- | --- |
| Bucket | 1 (`media`) |
| Objek di luar bucket `media` | 0 |
| Objek bucket `media` | 5 |
| Baris `media_assets` | 5 |
| Objek orphan (≥ 1 jam) | 0 (0 byte) |
| Objek tanpa baris (< 1 jam) | 0 |
| Baris tanpa objek | 0 |

Tidak ada penghapusan, sehingga tidak ada dampak rollback. Bila cleanup diperlukan di masa depan, rollback kode tidak memulihkan file yang telah dihapus; target tetap harus ditinjau dan disetujui pemilik lebih dahulu.

<details>
<summary>Query inventaris</summary>

```sql
begin read only;
select
  (select count(*) from storage.buckets) as total_bucket,
  (select count(*) from storage.objects where bucket_id <> 'media') as objek_di_luar_bucket_media,
  (select count(*) from storage.objects where bucket_id = 'media') as objek_media,
  (select count(*) from public.media_assets) as baris_media_assets,
  (select count(*) from storage.objects o
     where o.bucket_id = 'media' and o.created_at < now() - interval '1 hour'
       and not exists (select 1 from public.media_assets ma where ma.storage_path = o.name)) as objek_orphan,
  (select coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.objects o
     where o.bucket_id = 'media' and o.created_at < now() - interval '1 hour'
       and not exists (select 1 from public.media_assets ma where ma.storage_path = o.name)) as byte_orphan,
  (select count(*) from storage.objects o
     where o.bucket_id = 'media' and o.created_at >= now() - interval '1 hour'
       and not exists (select 1 from public.media_assets ma where ma.storage_path = o.name)) as objek_tanpa_baris_lt_1_jam,
  (select count(*) from public.media_assets ma
     where not exists (select 1 from storage.objects o where o.bucket_id = 'media' and o.name = ma.storage_path)) as baris_tanpa_objek;
rollback;
```

</details>
