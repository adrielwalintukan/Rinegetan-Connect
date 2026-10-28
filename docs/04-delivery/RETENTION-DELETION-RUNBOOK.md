# Runbook Retensi dan Penghapusan Lead

## Tujuan dan pemilik

Menepati janji copy form "Data disimpan paling lama 24 bulan, lalu dihapus" untuk lead pastoral (saat ini `study_interest_leads` P3-004; diperluas ke doa/pengunjung saat P3-005 tersedia). Keputusan menghapus diambil **Admin gereja**; eksekusi SQL dilakukan **pemilik/operator database** yang berwenang. Jangan menjadikan runbook ini alasan menyalin isi lead ke chat, dokumen, atau alat lain.

## Dasar kebijakan

- Retensi default 24 bulan sejak `created_at`; Admin dapat mengubah retensi untuk kebutuhan pastoral yang terdokumentasi ([SECURITY-PRIVACY](../03-architecture/SECURITY-PRIVACY.md) dan [CONTENT-OPERATIONS](CONTENT-OPERATIONS.md)).
- P3-004 **tidak** menyediakan tombol hapus: tidak ada grant `DELETE` untuk tabel ini ([DATA-MODEL-AND-RLS](../03-architecture/DATA-MODEL-AND-RLS.md)). Penghapusan karena itu manual lewat SQL, bukan portal staf.
- Penghapusan permanen hanya atas keputusan Admin, bukan untuk memperbaiki bug aplikasi (perbaiki dengan migration forward atau rollback deploy).

## Peran

| Peran | Tanggung jawab |
| --- | --- |
| Admin gereja | Meninjau daftar lead, memutuskan mana yang dihapus/perpanjang, menyimpan alasan. |
| Pemilik/operator database | Menjalankan SQL di Supabase SQL Editor pada project yang benar, lalu mencatat bukti. |

## Prosedur

1. **Tinjau kandidat.** Jalankan SQL tinjau di bawah; salinan hasil yang bertahan hanya berupa **jumlah** dan **id**, tanpa nama/kontak/pesan.
2. **Putuskan.** Admin menetapkan id yang dihapus. Jika memperpanjang retensi untuk kasus pastoral, catat alasan dan tanggal tinjau ulang.
3. **Catat sebelum hapus.** Simpan keputusan (tanggal, jumlah, id, penanggung jawab) pada catatan operasional gereja. Tidak ada PII di catatan.
4. **Jalankan penghapusan.** Jalankan SQL hapus di dalam transaksi; pastikan jumlah baris terhapus sama dengan jumlah id yang diputuskan.
5. **Verifikasi.** Jalankan SQL verifikasi; tabel harus bersih dari lead yang lebih tua dari cut-off.
6. **Tutup.** Catat tanggal, jumlah, dan pelaksana pada catatan operasional. Bila P3-006 tersedia nanti, alihkan langkah ini ke fitur tersebut.

## SQL (jalankan di Supabase SQL Editor project yang benar)

Cut-off retensi 24 bulan; sesuaikan bila Admin memutuskan periode lain.

```sql
-- 1. Tinjau: jumlah dan id lead yang melewati retensi (tanpa nama/kontak/pesan)
select id, created_at, status
from public.study_interest_leads
where created_at < now() - interval '24 months'
order by created_at;
```

```sql
-- 2. Hapus dalam transaksi; isi daftar id dari keputusan Admin (langkah 2)
begin;
create temp table purge_ids (id uuid primary key) on commit drop;
insert into purge_ids (id) values
  ('00000000-0000-0000-0000-000000000000')  -- ganti dengan id hasil tinjauan
;

delete from public.study_interest_leads l
using purge_ids p
where l.id = p.id;

select count(*) as terhapus from purge_ids;  -- harus sama dengan jumlah id yang diputuskan
commit;  -- batal: rollback;
```

Bila Admin memutuskan menghapus seluruh lead yang lebih tua dari cut-off, ganti langkah 2 dengan:

```sql
-- 2b. Hapus seluruh lead yang melewati cut-off (hanya setelah tinjauan langkah 1)
begin;
delete from public.study_interest_leads
where created_at < now() - interval '24 months';
select count(*) as tersisa from public.study_interest_leads
where created_at < now() - interval '24 months';  -- harus 0
commit;  -- batal: rollback;
```

```sql
-- 3. Verifikasi
select count(*) as melewati_retensi
from public.study_interest_leads
where created_at < now() - interval '24 months';  -- harus 0
```

## Catatan

- **Jalankan di Supabase SQL Editor, bukan lewat aplikasi.** SQL Editor berjalan sebagai pemilik tabel sehingga melewati RLS/grants. Route server dan portal staf tidak dapat menghapus karena tidak ada grant `DELETE` untuk role mana pun. Jangan menambah grant `DELETE` hanya untuk runbook ini.
- **Tidak ada audit otomatis untuk DELETE.** Trigger audit P3-004 hanya mencatat `insert`/`update`; penghapusan tidak menghasilkan baris `audit_logs`. Karena itu catatan operasional langkah 3/6 adalah bukti retensi. Jangan mengarang entri audit.
- **Tidak ada foreign key ke tabel ini**, jadi penghapusan tidak memicu kegagalan relasi. `audit_logs.entity_id` menyimpan id lead sebagai nilai biasa tanpa foreign key; baris audit lama tetap ada dan hanya berisi status, bukan data pribadi.
- **`form_rate_events` tidak perlu ditangani manual.** Rate limiter sudah menghapus event lebih tua dari 24 jam setiap kali form dipakai.
- **Backup terenkripsi terpisah.** Lead yang sudah dihapus dari database masih dapat ada pada arsip backup lama. Masa simpan backup mengikuti [runbook backup](BACKUP-RESTORE-RUNBOOK.md); jangan menganggap penghapusan ini mencakup arsip.
- **Restore mengembalikan data terhapus.** Setelah restore dari backup lama, ulangi langkah 1 sampai 5 agar janji retensi kembali benar.

## Sumber

- [SECURITY-PRIVACY, retensi](../03-architecture/SECURITY-PRIVACY.md)
- [DATA-MODEL-AND-RLS, study_interest_leads](../03-architecture/DATA-MODEL-AND-RLS.md)
- [CONTENT-OPERATIONS, operasi pastoral](CONTENT-OPERATIONS.md)
- [Runbook backup dan pemulihan](BACKUP-RESTORE-RUNBOOK.md)
