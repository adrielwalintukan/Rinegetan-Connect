# P2-202 Access Control Database Design

**Status:** Disetujui pemilik project untuk ditulis sebagai spesifikasi pada 2026-09-10.

**Issue:** [#8 — P2-202 Profiles, roles, audit, grants, dan RLS](https://github.com/adrielwalintukan/Rinegetan-Connect/issues/8)

## Tujuan

Menyediakan fondasi kontrol akses staf yang aman dan dapat diuji untuk GMAHK Rinegetan. Fondasi ini mengenali hanya dua peran: `admin` dan `editor`; tidak menyediakan pendaftaran publik, role Member, UI Auth, konten CMS, atau Storage.

## Batas scope

Migration P2-202 membuat tiga tabel pada schema `public`:

| Objek | Fungsi | Akses Data API |
| --- | --- | --- |
| `profiles` | Identitas staf minimum dan status aktif, satu banding satu dengan `auth.users` | Staf aktif sesuai RLS; tidak publik |
| `staff_roles` | Satu role `admin` atau `editor` untuk setiap profil | Staf aktif sesuai RLS; tidak publik |
| `audit_logs` | Jejak mutasi staf yang sudah disanitasi | Admin aktif sesuai RLS; tidak publik |

Migration juga membuat schema privat untuk helper policy, explicit grants, default privileges deny-by-default, RLS policy, dan pgTAP tests. Tabel pengumuman, event, jadwal, departemen, media, consent, Storage, prayer request, dan course tidak termasuk.

## Pilihan otorisasi

### Role database, bukan JWT metadata

Role adalah enum Postgres `public.staff_role` dengan nilai tepat `admin` dan `editor`, disimpan di `public.staff_roles.user_id`. Satu profil hanya boleh memiliki satu role melalui primary key `user_id`.

Policy tidak membaca `raw_user_meta_data`, `user_metadata`, atau claim role yang dapat diubah pengguna. Role dari database mencegah browser menaikkan hak akses sendiri dan menghindari masalah JWT claim yang belum diperbarui.

### Helper pada schema privat

`private.is_admin()` dan `private.is_editor_or_admin()` adalah function tanpa parameter yang membaca `public.staff_roles` dan `public.profiles` menurut `auth.uid()`. Keduanya harus:

- bertipe `stable` dan `security definer` hanya untuk memutus recursion ketika policy membaca tabel role;
- menetapkan `search_path = ''` dan selalu memakai nama schema lengkap;
- menganggap staff tidak aktif sebagai tidak berwenang;
- tidak menerima nilai dari klien;
- berada di schema `private`, yang tidak diekspos melalui Data API;
- dicabut dari `PUBLIC`, lalu hanya diberi `USAGE`/`EXECUTE` untuk `authenticated`.

Policy memanggil helper sebagai `(select private.is_admin())` atau `(select private.is_editor_or_admin())` agar hasil auth dievaluasi sekali per statement. Helper tidak menjadi endpoint publik dan tidak digunakan dari browser.

## Bentuk schema

### `public.profiles`

| Kolom | Bentuk | Aturan |
| --- | --- | --- |
| `id` | UUID | Primary key; foreign key ke `auth.users(id)` dengan `on delete cascade` |
| `display_name` | text | Wajib, hasil trim tidak kosong, maksimum 120 karakter |
| `is_active` | boolean | Wajib; default `true`; menjadi bagian dari pemeriksaan staff aktif |
| `created_at` | timestamptz | Wajib; default `now()` |
| `updated_at` | timestamptz | Wajib; default `now()`; dipelihara trigger internal |

Email, password, token, nomor telepon, dan user metadata tidak disalin ke tabel ini.

### `public.staff_roles`

| Kolom | Bentuk | Aturan |
| --- | --- | --- |
| `user_id` | UUID | Primary key dan foreign key ke `profiles(id)` dengan `on delete cascade` |
| `role` | `public.staff_role` | Wajib, hanya `admin` atau `editor` |
| `created_at` | timestamptz | Wajib; default `now()` |
| `updated_at` | timestamptz | Wajib; default `now()`; dipelihara trigger internal |

Sebuah user Auth tanpa pasangan profil dan role bukan staf aplikasi. Tidak ada role ketiga dan tidak ada role Member pada database ini.

### `public.audit_logs`

| Kolom | Bentuk | Aturan |
| --- | --- | --- |
| `id` | UUID | Primary key; default `gen_random_uuid()` |
| `actor_id` | UUID nullable | Foreign key ke `profiles(id)` dengan `on delete set null`, supaya riwayat tidak menghalangi retensi akun |
| `action` | text | Wajib, maksimum 100 karakter, format action terstruktur seperti `staff.deactivated` |
| `entity_type` | text | Wajib, maksimum 80 karakter |
| `entity_id` | UUID nullable | Target mutasi bila target memiliki UUID |
| `request_id` | UUID nullable | Correlation ID request, tanpa URL bertanda tangan atau token |
| `changes` | jsonb | Wajib; default object kosong; hanya delta terredaksi |
| `occurred_at` | timestamptz | Wajib; default `now()` |

`changes` harus berupa JSON object. Tidak ada kolom untuk password, token, secret, nomor telepon lengkap, isi doa, atau payload form privat. Insert audit tidak diberi grant ke client; P2-203/P2-303 akan menambahkan jalur server yang tervalidasi untuk mencatat mutasi nyata.

Indeks hanya dibuat untuk query audit yang telah ditetapkan dalam dokumentasi: `(actor_id, occurred_at desc)` dan `(entity_type, entity_id, occurred_at desc)`. Tidak ada indeks role ber-cardinality rendah tanpa pola query terukur.

## Grants dan RLS

P2-202 menerapkan deny-by-default dalam satu migration:

1. Atur default privilege schema `public` agar tabel, sequence, dan function baru tidak otomatis dapat diakses `anon` atau `authenticated`.
2. Aktifkan RLS pada ketiga tabel yang berada pada schema exposed `public`.
3. Cabut semua privilege tabel dari `anon` dan `authenticated`.
4. Beri kembali hanya `SELECT` ke `authenticated` untuk tabel yang diperlukan; jangan beri `INSERT`, `UPDATE`, atau `DELETE` pada P2-202.
5. Policy per operasi hanya dibuat saat operasi itu memang tersedia. Tidak ada policy write pada P2-202 berarti direct mutation dari browser tertolak.

Matriks hasil yang harus berlaku:

| Aktor | `profiles` | `staff_roles` | `audit_logs` | Mutasi langsung |
| --- | --- | --- | --- | --- |
| `anon` | Tidak dapat membaca | Tidak dapat membaca | Tidak dapat membaca | Ditolak |
| Auth tanpa role / staff nonaktif | Tidak dapat membaca | Tidak dapat membaca | Tidak dapat membaca | Ditolak |
| Editor aktif | Hanya profil sendiri | Hanya role sendiri | Tidak dapat membaca | Ditolak |
| Admin aktif | Seluruh profil staf | Seluruh role staf | Seluruh audit | Ditolak pada P2-202 |

Policy Admin memakai `private.is_admin()`. Policy akses sendiri untuk staff memakai identitas `auth.uid()` sekaligus `private.is_editor_or_admin()` sehingga akun nonaktif langsung kehilangan akses aplikasi tanpa menghapus jejak audit. Semua policy memakai klausa `TO authenticated`; tidak memakai `auth.role()`.

## Bootstrap dan lifecycle

P2-202 menyediakan schema dan batas akses, tetapi tidak membuat account secara otomatis dari trigger `auth.users`. Admin pertama tetap dibuat oleh pemilik project melalui dashboard Supabase, lalu dipasangkan secara terkontrol melalui prosedur bootstrap P2-203. P2-203 juga akan membangun invite Editor, nonaktifkan staf, reset password, dan route guard.

Dengan pemisahan ini, migration pertama tidak mengaktifkan public signup dan tidak membuka jalur client yang mampu menambah role atau menulis audit.

## Rencana pengujian

Test database menggunakan pgTAP di `supabase/tests/` dan dijalankan pada stack Supabase lokal yang bersih. Fixture membuat user Auth terpisah untuk anon, Admin aktif, Editor aktif, staff nonaktif, dan authenticated user tanpa role.

Test minimal membuktikan:

1. enum hanya memiliki `admin` dan `editor`; primary key/foreign key/check constraint dan indeks audit tersedia;
2. RLS aktif dan `anon` tidak memiliki grant maupun baris pada ketiga tabel;
3. Editor aktif hanya dapat membaca profil serta role sendiri dan tidak dapat membaca audit;
4. Admin aktif dapat membaca seluruh profil/role/audit;
5. staff nonaktif dan authenticated user tanpa role tidak memperoleh baris;
6. baik Admin maupun Editor tidak dapat insert, update, atau delete langsung pada tiga tabel;
7. helper authorization tidak terbuka ke `PUBLIC`, schema privat tidak diekspos, dan secret tidak ada pada migration/test.

Sesudah test hijau, jalankan `supabase db advisors`, periksa `supabase migration list`, dan audit SQL grants/RLS. Migration hanya didorong ke project Supabase remote setelah seluruh verifikasi lokal lulus.

## Keamanan dan operasi

- Publishable key boleh dipakai frontend, tetapi tidak memberi akses karena grants dan RLS tetap menjadi penegak utama.
- Service-role/secret key tidak dibuat, tidak disimpan, dan tidak diuji pada P2-202.
- Migration bersifat additive. Tidak ada data produksi untuk diubah atau dihapus.
- Sebelum deployment remote, pemilik melakukan backup sesuai runbook; perubahan remote dilakukan sekali melalui migration versioned dan hasilnya diverifikasi dari CLI.
- UI dan route publik Phase 1 tidak berubah.

## Kriteria selesai

P2-202 selesai hanya jika migration versioned, pgTAP allow/deny tests, explicit grants, RLS, security-advisor review, dan verifikasi remote berhasil. P2-203 baru dapat dimulai setelah fondasi ini telah direview melalui PR ke `development`.
