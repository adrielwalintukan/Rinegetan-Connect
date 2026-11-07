# Runbook Retensi dan Penghapusan Lead

## Tujuan dan pemilik

Menepati janji copy form "Data disimpan paling lama 24 bulan, lalu dihapus" untuk data pastoral: lead minat belajar (`study_interest_leads`, P3-004), permohonan doa (`prayer_requests`), dan data kunjungan (`visitor_submissions`, P3-005). Keputusan menghapus diambil **Admin gereja**; eksekusi SQL dilakukan **pemilik/operator database** yang berwenang. Jangan menjadikan runbook ini alasan menyalin isi lead ke chat, dokumen, atau alat lain.

## Dasar kebijakan

- Janji kepada peminat adalah batas atas: data disimpan **paling lama 24 bulan** sejak `created_at`, termasuk salinannya di arsip backup. Retensi **tidak dapat diperpanjang** untuk data yang disetujui dengan versi consent `2026-10-29` (minat belajar) atau versi doa/kunjungan yang disahkan, termasuk untuk kebutuhan pastoral. Perubahan kebijakan hanya berlaku untuk pengumpulan baru, lewat copy dan versi consent baru yang disahkan ([SECURITY-PRIVACY](../03-architecture/SECURITY-PRIVACY.md)).
- **Cut-off penghapusan: 24 bulan dikurangi 120 hari** (sekitar 20 bulan). Margin 120 hari menampung jeda tinjauan mingguan (7 hari) dan masa simpan arsip backup paling lama 90 hari, dijamin oleh pembersihan arsip mingguan pada umur 83 hari ([runbook backup](BACKUP-RESTORE-RUNBOOK.md#masa-simpan-arsip)); total paling lama 7 + 90 = 97 hari, di bawah margin 120 hari, sehingga salinan terakhir hilang sebelum 24 bulan meski bulan kalender pendek.
- Runbook dijalankan **setiap minggu**.
- Sejak P3-006, Admin menghapus lewat tombol **Hapus data kedaluwarsa** di tab **Log Audit** portal staf. Tombol memanggil `purge_expired_pastoral_data()`, yang hanya menghapus baris sebelum cut-off dan mencatat jumlahnya di audit. Tetap tidak ada grant `DELETE` untuk role mana pun ([DATA-MODEL-AND-RLS](../03-architecture/DATA-MODEL-AND-RLS.md)). SQL di bawah menjadi **cadangan** bila portal tidak dapat dipakai.
- Penghapusan permanen hanya atas keputusan Admin, bukan untuk memperbaiki bug aplikasi (perbaiki dengan migration forward atau rollback deploy).

## Peran

| Peran | Tanggung jawab |
| --- | --- |
| Admin gereja | Meninjau jumlah data yang melewati cut-off dan menjalankan penghapusan di portal. |
| Pemilik/operator database | Hanya untuk prosedur cadangan: menjalankan SQL di Supabase SQL Editor pada project yang benar, lalu mencatat bukti. |

## Prosedur portal (P3-006)

1. Buka portal staf sebagai Admin aktif, lalu tab **Log Audit**.
2. Panel **Retensi data pastoral** menampilkan jumlah data minat belajar, doa, dan kunjungan yang melewati cut-off.
3. Bila jumlahnya lebih dari 0, tekan **Hapus data kedaluwarsa**, lalu konfirmasi. Semua data yang melewati cut-off di ketiga tabel terhapus dalam satu transaksi; tidak ada pilihan per baris dan tidak ada perpanjangan.
4. Pastikan jumlah kembali 0. Audit `*.purged` (jumlah dan cut-off, juga untuk putaran tanpa data) menjadi bukti putaran mingguan; tidak perlu catatan operasional terpisah.

## Prosedur cadangan (SQL)

Dipakai hanya bila portal tidak dapat dipakai.

1. **Tinjau kandidat.** Jalankan SQL tinjau di bawah; salinan hasil yang bertahan hanya berupa **jumlah** dan **id**, tanpa nama/kontak/pesan.
2. **Putuskan.** Admin menetapkan id yang dihapus. Lead yang melewati cut-off wajib dihapus pada putaran yang sama; tidak ada perpanjangan.
3. **Catat sebelum hapus.** Simpan keputusan (tanggal, jumlah, id, penanggung jawab) pada catatan operasional gereja. Tidak ada PII di catatan.
4. **Jalankan penghapusan.** Jalankan SQL hapus. SQL hanya menghapus lead yang melewati cut-off dan membatalkan seluruh transaksi bila jumlah baris yang benar-benar terhapus tidak sama dengan jumlah id yang diputuskan.
5. **Verifikasi.** Jalankan SQL verifikasi; tabel harus bersih dari lead yang lebih tua dari cut-off.
6. **Tutup.** Catat tanggal, jumlah, dan pelaksana pada catatan operasional.

## SQL (jalankan di Supabase SQL Editor project yang benar)

Cut-off di semua langkah adalah `now() - interval '24 months' + interval '120 days'` (24 bulan dikurangi 120 hari); jangan diubah per putaran.

Tabel yang dicakup: `public.study_interest_leads` (P3-004), `public.prayer_requests`, dan `public.visitor_submissions` (P3-005). Langkah 2 dan 2b dijalankan **satu tabel per transaksi**; ganti nilai `v_table` sesuai tabel yang diputuskan.

```sql
-- 1. Tinjau: jumlah dan id yang melewati retensi di ketiga tabel (tanpa nama/kontak/isi)
select 'study_interest_leads' as tabel, id, created_at, status from public.study_interest_leads
where created_at < now() - interval '24 months' + interval '120 days'
union all
select 'prayer_requests', id, created_at, status from public.prayer_requests
where created_at < now() - interval '24 months' + interval '120 days'
union all
select 'visitor_submissions', id, created_at, status from public.visitor_submissions
where created_at < now() - interval '24 months' + interval '120 days'
order by tabel, created_at;
```

```sql
-- 2. Hapus dalam transaksi; isi tabel dan daftar id dari keputusan Admin (langkah 2).
-- Hanya baris yang melewati cut-off yang dapat terhapus. Bila jumlah baris yang benar-benar
-- terhapus berbeda dari jumlah id (id salah ketik, salah tabel, sudah terhapus, atau belum melewati cut-off),
-- blok raise exception dan seluruh transaksi batal; COMMIT setelah error menjadi ROLLBACK.
begin;
create temp table purge_ids (id uuid primary key) on commit drop;
insert into purge_ids (id) values
  ('00000000-0000-0000-0000-000000000000')  -- ganti dengan id hasil tinjauan
;

do $$
declare
  v_table text := 'study_interest_leads';  -- atau prayer_requests / visitor_submissions
  v_requested integer;
  v_deleted integer;
begin
  if v_table not in ('study_interest_leads', 'prayer_requests', 'visitor_submissions') then
    raise exception 'Tabel % tidak dicakup runbook ini.', v_table;
  end if;
  select count(*) into v_requested from purge_ids;
  execute format(
    'with gone as (delete from public.%I l using purge_ids p where l.id = p.id
       and l.created_at < now() - interval ''24 months'' + interval ''120 days'' returning l.id)
     select count(*) from gone', v_table) into v_deleted;
  if v_deleted <> v_requested then
    raise exception 'Terhapus % dari % id di %; transaksi dibatalkan. Periksa ulang tabel, id, dan cut-off.', v_deleted, v_requested, v_table;
  end if;
  raise notice 'Terhapus % baris dari %.', v_deleted, v_table;
end $$;
commit;
```

Bila Admin memutuskan menghapus seluruh baris yang lebih tua dari cut-off pada satu tabel, ganti langkah 2 dengan:

```sql
-- 2b. Hapus seluruh baris yang melewati cut-off pada satu tabel (hanya setelah tinjauan langkah 1)
begin;
do $$
declare
  v_table text := 'study_interest_leads';  -- atau prayer_requests / visitor_submissions
  v_deleted integer;
  v_left boolean;
begin
  if v_table not in ('study_interest_leads', 'prayer_requests', 'visitor_submissions') then
    raise exception 'Tabel % tidak dicakup runbook ini.', v_table;
  end if;
  execute format(
    'with gone as (delete from public.%I where created_at < now() - interval ''24 months'' + interval ''120 days'' returning id)
     select count(*) from gone', v_table) into v_deleted;
  execute format('select exists (select 1 from public.%I where created_at < now() - interval ''24 months'' + interval ''120 days'')', v_table) into v_left;
  if v_left then
    raise exception 'Masih ada baris melewati cut-off di %; transaksi dibatalkan.', v_table;
  end if;
  raise notice 'Terhapus % baris dari %.', v_deleted, v_table;
end $$;
commit;
```

```sql
-- 3. Verifikasi: semua nilai harus 0
select
  (select count(*) from public.study_interest_leads where created_at < now() - interval '24 months' + interval '120 days') as minat_belajar,
  (select count(*) from public.prayer_requests where created_at < now() - interval '24 months' + interval '120 days') as doa,
  (select count(*) from public.visitor_submissions where created_at < now() - interval '24 months' + interval '120 days') as kunjungan;
```

## Catatan

- **Jalankan di Supabase SQL Editor, bukan lewat aplikasi.** SQL Editor berjalan sebagai pemilik tabel sehingga melewati RLS/grants. Route server dan portal staf tidak dapat menghapus karena tidak ada grant `DELETE` untuk role mana pun. Jangan menambah grant `DELETE` hanya untuk runbook ini.
- **SQL cadangan tidak diaudit otomatis.** Trigger audit P3-004 dan P3-005 hanya mencatat `insert`/`update`; hanya penghapusan lewat portal (`purge_expired_pastoral_data()`) yang menulis audit. Untuk SQL cadangan, catatan operasional langkah 3/6 adalah bukti retensi. Jangan mengarang entri audit.
- **Tidak ada foreign key ke ketiga tabel**, jadi penghapusan tidak memicu kegagalan relasi. `audit_logs.entity_id` menyimpan id lead sebagai nilai biasa tanpa foreign key; baris audit lama tetap ada dan hanya berisi status, bukan data pribadi.
- **`form_rate_events` tidak perlu ditangani manual.** Rate limiter sudah menghapus event lebih tua dari 24 jam setiap kali form dipakai.
- **Backup terenkripsi terpisah.** Lead yang sudah dihapus dari database masih ada di arsip backup sampai arsip itu dihapus. Arsip backup dihapus paling lama 90 hari setelah dibuat ([runbook backup](BACKUP-RESTORE-RUNBOOK.md#masa-simpan-arsip)); cut-off 24 bulan dikurangi 120 hari memastikan salinan terakhir hilang sebelum 24 bulan. Bila arsip disimpan lebih lama dari 90 hari, janji retensi tidak lagi terpenuhi.
- **Restore mengembalikan data terhapus.** Setelah restore dari backup lama, jalankan lagi prosedur portal agar janji retensi kembali benar.

## Sumber

- [SECURITY-PRIVACY, retensi](../03-architecture/SECURITY-PRIVACY.md)
- [DATA-MODEL-AND-RLS, study_interest_leads, prayer_requests, visitor_submissions](../03-architecture/DATA-MODEL-AND-RLS.md)
- [CONTENT-OPERATIONS, operasi pastoral](CONTENT-OPERATIONS.md)
- [Runbook backup dan pemulihan](BACKUP-RESTORE-RUNBOOK.md)
