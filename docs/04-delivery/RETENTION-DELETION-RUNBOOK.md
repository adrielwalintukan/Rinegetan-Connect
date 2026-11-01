# Runbook Retensi dan Penghapusan Lead

## Tujuan dan pemilik

Menepati janji copy form "Data disimpan paling lama 24 bulan, lalu dihapus" untuk lead pastoral (saat ini `study_interest_leads` P3-004; diperluas ke doa/pengunjung saat P3-005 tersedia). Keputusan menghapus diambil **Admin gereja**; eksekusi SQL dilakukan **pemilik/operator database** yang berwenang. Jangan menjadikan runbook ini alasan menyalin isi lead ke chat, dokumen, atau alat lain.

## Dasar kebijakan

- Janji kepada peminat adalah batas atas: data disimpan **paling lama 24 bulan** sejak `created_at`, termasuk salinannya di arsip backup. Retensi lead **tidak dapat diperpanjang** untuk lead yang menyetujui versi consent `2026-10-29`, termasuk untuk kebutuhan pastoral. Perubahan kebijakan hanya berlaku untuk pengumpulan baru, lewat copy dan versi consent baru yang disahkan ([SECURITY-PRIVACY](../03-architecture/SECURITY-PRIVACY.md)).
- **Cut-off penghapusan: 24 bulan dikurangi 120 hari** (sekitar 20 bulan). Margin 120 hari menampung jeda tinjauan mingguan (7 hari) dan masa simpan arsip backup paling lama 90 hari ([runbook backup](BACKUP-RESTORE-RUNBOOK.md)), sehingga salinan terakhir hilang sebelum 24 bulan meski bulan kalender pendek.
- Runbook dijalankan **setiap minggu**.
- P3-004 **tidak** menyediakan tombol hapus: tidak ada grant `DELETE` untuk tabel ini ([DATA-MODEL-AND-RLS](../03-architecture/DATA-MODEL-AND-RLS.md)). Penghapusan karena itu manual lewat SQL, bukan portal staf.
- Penghapusan permanen hanya atas keputusan Admin, bukan untuk memperbaiki bug aplikasi (perbaiki dengan migration forward atau rollback deploy).

## Peran

| Peran | Tanggung jawab |
| --- | --- |
| Admin gereja | Meninjau daftar lead yang melewati cut-off dan menetapkan penghapusannya. |
| Pemilik/operator database | Menjalankan SQL di Supabase SQL Editor pada project yang benar, lalu mencatat bukti. |

## Prosedur

1. **Tinjau kandidat.** Jalankan SQL tinjau di bawah; salinan hasil yang bertahan hanya berupa **jumlah** dan **id**, tanpa nama/kontak/pesan.
2. **Putuskan.** Admin menetapkan id yang dihapus. Lead yang melewati cut-off wajib dihapus pada putaran yang sama; tidak ada perpanjangan.
3. **Catat sebelum hapus.** Simpan keputusan (tanggal, jumlah, id, penanggung jawab) pada catatan operasional gereja. Tidak ada PII di catatan.
4. **Jalankan penghapusan.** Jalankan SQL hapus. SQL hanya menghapus lead yang melewati cut-off dan membatalkan seluruh transaksi bila jumlah baris yang benar-benar terhapus tidak sama dengan jumlah id yang diputuskan.
5. **Verifikasi.** Jalankan SQL verifikasi; tabel harus bersih dari lead yang lebih tua dari cut-off.
6. **Tutup.** Catat tanggal, jumlah, dan pelaksana pada catatan operasional. Bila P3-006 tersedia nanti, alihkan langkah ini ke fitur tersebut.

## SQL (jalankan di Supabase SQL Editor project yang benar)

Cut-off di semua langkah adalah `now() - interval '24 months' + interval '120 days'` (24 bulan dikurangi 120 hari); jangan diubah per putaran.

```sql
-- 1. Tinjau: jumlah dan id lead yang melewati retensi (tanpa nama/kontak/pesan)
select id, created_at, status
from public.study_interest_leads
where created_at < now() - interval '24 months' + interval '120 days'
order by created_at;
```

```sql
-- 2. Hapus dalam transaksi; isi daftar id dari keputusan Admin (langkah 2).
-- Hanya lead yang melewati cut-off yang dapat terhapus. Bila jumlah baris yang benar-benar
-- terhapus berbeda dari jumlah id (id salah ketik, sudah terhapus, atau belum melewati cut-off),
-- blok raise exception dan seluruh transaksi batal; COMMIT setelah error menjadi ROLLBACK.
begin;
create temp table purge_ids (id uuid primary key) on commit drop;
insert into purge_ids (id) values
  ('00000000-0000-0000-0000-000000000000')  -- ganti dengan id hasil tinjauan
;

do $$
declare
  v_requested integer;
  v_deleted integer;
begin
  select count(*) into v_requested from purge_ids;
  with gone as (
    delete from public.study_interest_leads l
    using purge_ids p
    where l.id = p.id
      and l.created_at < now() - interval '24 months' + interval '120 days'
    returning l.id
  )
  select count(*) into v_deleted from gone;
  if v_deleted <> v_requested then
    raise exception 'Terhapus % dari % id; transaksi dibatalkan. Periksa ulang id dan cut-off.', v_deleted, v_requested;
  end if;
  raise notice 'Terhapus % lead.', v_deleted;
end $$;
commit;
```

Bila Admin memutuskan menghapus seluruh lead yang lebih tua dari cut-off, ganti langkah 2 dengan:

```sql
-- 2b. Hapus seluruh lead yang melewati cut-off (hanya setelah tinjauan langkah 1)
begin;
do $$
declare
  v_deleted integer;
begin
  with gone as (
    delete from public.study_interest_leads
    where created_at < now() - interval '24 months' + interval '120 days'
    returning id
  )
  select count(*) into v_deleted from gone;
  if exists (select 1 from public.study_interest_leads where created_at < now() - interval '24 months' + interval '120 days') then
    raise exception 'Masih ada lead melewati cut-off; transaksi dibatalkan.';
  end if;
  raise notice 'Terhapus % lead.', v_deleted;
end $$;
commit;
```

```sql
-- 3. Verifikasi
select count(*) as melewati_retensi
from public.study_interest_leads
where created_at < now() - interval '24 months' + interval '120 days';  -- harus 0
```

## Catatan

- **Jalankan di Supabase SQL Editor, bukan lewat aplikasi.** SQL Editor berjalan sebagai pemilik tabel sehingga melewati RLS/grants. Route server dan portal staf tidak dapat menghapus karena tidak ada grant `DELETE` untuk role mana pun. Jangan menambah grant `DELETE` hanya untuk runbook ini.
- **Tidak ada audit otomatis untuk DELETE.** Trigger audit P3-004 hanya mencatat `insert`/`update`; penghapusan tidak menghasilkan baris `audit_logs`. Karena itu catatan operasional langkah 3/6 adalah bukti retensi. Jangan mengarang entri audit.
- **Tidak ada foreign key ke tabel ini**, jadi penghapusan tidak memicu kegagalan relasi. `audit_logs.entity_id` menyimpan id lead sebagai nilai biasa tanpa foreign key; baris audit lama tetap ada dan hanya berisi status, bukan data pribadi.
- **`form_rate_events` tidak perlu ditangani manual.** Rate limiter sudah menghapus event lebih tua dari 24 jam setiap kali form dipakai.
- **Backup terenkripsi terpisah.** Lead yang sudah dihapus dari database masih ada di arsip backup sampai arsip itu dihapus. Arsip backup dihapus paling lama 90 hari setelah dibuat ([runbook backup](BACKUP-RESTORE-RUNBOOK.md#masa-simpan-arsip)); cut-off 24 bulan dikurangi 120 hari memastikan salinan terakhir hilang sebelum 24 bulan. Bila arsip disimpan lebih lama dari 90 hari, janji retensi tidak lagi terpenuhi.
- **Restore mengembalikan data terhapus.** Setelah restore dari backup lama, ulangi langkah 1 sampai 5 agar janji retensi kembali benar.

## Sumber

- [SECURITY-PRIVACY, retensi](../03-architecture/SECURITY-PRIVACY.md)
- [DATA-MODEL-AND-RLS, study_interest_leads](../03-architecture/DATA-MODEL-AND-RLS.md)
- [CONTENT-OPERATIONS, operasi pastoral](CONTENT-OPERATIONS.md)
- [Runbook backup dan pemulihan](BACKUP-RESTORE-RUNBOOK.md)
