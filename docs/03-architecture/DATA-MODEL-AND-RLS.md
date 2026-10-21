# Model Data dan Row Level Security

## Prinsip model

- UUID sebagai primary key; timestamp memakai timestamptz dalam UTC.
- Setiap content record memiliki created_at, updated_at, created_by, updated_by, dan status bila layak dipublikasikan.
- ID dan slug bersifat stabil. Slug unik hanya dalam ruang lingkup jenis kontennya.
- Foreign key eksplisit, CHECK constraint untuk enum/status, dan indeks berdasarkan pola query.
- Tidak menyimpan data yang tidak diperlukan. Data sensitif dipisah dari konten publik.

## Tabel inti Phase 2

| Tabel | Tujuan | Akses publik |
| --- | --- | --- |
| profiles | Nama staf minimum dan status aktif, satu banding satu dengan auth.users | Tidak |
| staff_roles | Satu role Admin atau Editor per profil | Tidak |
| audit_logs | Mutasi staf yang dapat ditelusuri | Tidak |
| announcements | Pengumuman dengan lifecycle | Hanya Published |
| events | Kegiatan one-off/rentang waktu/department | Hanya Published |
| schedules | Aturan jadwal mingguan | Hanya Published aktif |
| schedule_exceptions | Penambahan/perubahan/pembatalan pada tanggal tertentu | Hanya Published aktif |
| departments | Informasi departemen gereja | Hanya Published |
| media_albums | Album galeri; relasi opsional ke event/department | Hanya Published |
| media_assets | Foto/doc/thumbnail dan metadata aman | Hanya Published + consent |
| album_assets | Urutan aset dalam album | Hanya melalui album/aset publik |
| public_download_jobs | Permintaan ZIP album/kategori yang dibatasi | Tidak |
| settings | Konfigurasi gereja non-rahasia dan versi kebijakan | Baca selektif atau server-rendered |

### Tabel Phase 3

P3-001 menyediakan courses dan course_lessons. Berikutnya: course_imports, study_interest_leads, prayer_requests, visitor_submissions, consent_records, dan form_rate_events.

### Tabel Phase 4–5

sabbath_content_cache, sabbath_offline_manifests, notification_preferences, push_subscriptions, notification_deliveries. Progres pelajaran tidak menjadi tabel karena tetap lokal di browser.

## Bentuk record penting

### courses dan course_lessons (P3-001)

Course menyimpan id UUID, title (1–200 karakter, terpangkas), slug (1–220, huruf kecil/angka/tanda hubung, unik global), summary (maksimal 500, terpangkas, default kosong), status (default Draft), published_at, created_at, updated_at, created_by, dan updated_by. Course kosong boleh Published.

Batas teks menghitung Unicode code point, sama dengan `char_length` PostgreSQL; emoji suplementer dihitung satu karakter. Pemangkasan tepi judul/ringkasan mengikuti ECMAScript `String.trim`: U+0009–000D, U+0020, U+00A0, U+1680, U+2000–200A, U+2028–2029, U+202F, U+205F, U+3000, U+FEFF. Whitespace di tengah teks dipertahankan; U+0085 dan U+200B tidak termasuk himpunan trim. Server menormalkan input form; constraint menolak input Data API yang belum terpangkas atau judul yang hanya whitespace. Migration lanjutan `20261021000000_p3_001_course_whitespace.sql` menambah pemeriksaan eksplisit tanpa mengubah migration 19 Oktober yang telah diterapkan lokal.

Daftar staf membaca seluruh course/lesson melalui halaman maksimum 500 baris per request memakai client sesi/RLS. Course diurutkan menurut created_at menurun lalu id; lesson menurut course_id, position, lalu id. Kegagalan halaman mana pun menggagalkan koleksi dengan pesan aman, sehingga data parsial tidak tampil sebagai daftar lengkap.

Lesson menambah course_id wajib (`ON DELETE RESTRICT`), body berupa teks berparagraf (maksimal 50.000 karakter, default kosong), dan position integer positif. Slug dan position unik dalam course; nomor urut boleh bercelah. Body Published harus berisi karakter selain whitespace. HTML/Markdown tidak dirender sebagai markup. Constraint unique `(course_id, slug)` dan `(course_id, position)` sekaligus melayani pencarian anak; tidak ada indeks duplikat.

Pemeriksaan body Published memakai himpunan `String.trim` eksplisit yang sama: BOM saja ditolak pada insert/revisi Published; U+0085 dan U+200B tetap teks non-trim seperti pada server. Pemeriksaan ini mengganti kelas whitespace locale pada migration lanjutan 21 Oktober; body tidak dipaksa terpangkas untuk caller Data API selama tetap berisi teks non-trim.

ID tidak dapat diubah dan lesson tidak dapat dipindah ke course lain. Slug boleh disunting sebelum publikasi pertama, lalu terkunci meski kembali Draft/Archived. Trigger `private.prepare_course_content()` mengabaikan metadata kiriman caller: database mengisi actor dari sesi, waktu insert/update, dan published_at pertama; created_at/created_by serta published_at pertama dipertahankan saat update. FK actor memakai `ON DELETE SET NULL`; pembersihan FK hanya dapat mengosongkan referensi lama yang benar-benar sudah tidak ada pada auth.users. Konten dan atribusi actor lain tetap bertahan saat akun staf dihapus.

| Persona | Baca course/lesson | Buat/ubah/publish/archive | Hapus permanen |
| --- | --- | --- | --- |
| anon, Auth tanpa role, staf nonaktif | Course Published; lesson Published dengan induk Published | Tidak | Tidak |
| Editor aktif | Semua status | Ya | Tidak |
| Admin aktif | Semua status | Ya | Ya, course harus tanpa lesson |

RLS lesson memeriksa status induk di database, termasuk lookup langsung melalui ID. Mengembalikan induk ke Draft/Archived segera menyembunyikan anak Published; publikasi ulang menampilkannya kembali tanpa mengubah status anak. Revisi konten Published mempertahankan status dan langsung terbaca publik jika induknya Published. Grants anon hanya meliputi kolom publik eksplisit, tanpa created_by/updated_by; pembaca publik wajib menggunakan proyeksi tersebut.

Trigger terpisah `private.record_course_content_audit()` mencatat `content.created`, `content.updated`, `content.status_changed`, dan `content.deleted`, dengan entity_type `courses`/`course_lessons`, actor sesi, status, course_id dan posisi lama/baru yang relevan. Setiap UPDATE menyertakan array `changed_fields` terurut dari allowlist `title`, `slug`, `summary`, `status`, serta `body`, `position` khusus lesson; hanya nama field yang benar-benar berubah dicatat, tanpa menyalin isi summary/body lama atau baru. Metadata otomatis dan identifier tidak termasuk; no-op menghasilkan `[]`. Perubahan status bersamaan dengan field lain tetap memakai `content.status_changed`. Delete mencatat alasan standar `Penghapusan permanen course oleh Admin` atau `Penghapusan permanen lesson oleh Admin` dalam transaksi yang sama, tanpa RPC alasan terpisah. Audit tetap hanya dapat dibaca Admin dan tidak dapat ditulis langsung oleh role Data API. Kedua fungsi trigger memiliki search_path kosong dan executable grant dicabut dari PUBLIC/anon/authenticated; SECURITY DEFINER metadata hanya digunakan untuk pemeriksaan lifecycle FK Auth.

### events

Memuat title, slug, summary, body, starts_at, ends_at, all_day, timezone, venue, department_id, cover_asset_id, status, published_at. Validasi: ends_at tidak boleh sebelum starts_at; timezone default Asia/Makassar.

### schedules dan schedule_exceptions

Schedule menyimpan day_of_week, start_local_time, end_local_time opsional, title, location, department_id, active_from, active_until, dan status. Exception menunjuk schedule opsional atau berdiri sendiri, memiliki exception_date, kind (override/add/cancel), dan detail. Tampilan kalender menghitung recurrence di server dengan zona Asia/Makassar, kemudian mengubah hasil ke UTC bila diperlukan.

### media_albums dan media_assets

Album: title, slug, category, event_id opsional, department_id opsional, occurred_on, description, cover_asset_id, status, public_download_enabled.

Aset: storage_path, mime_type, bytes, width, height, alt_text, caption, captured_at opsional, processing_state, public_download_enabled, consent_status, consent_recorded_at, consent_recorded_by, subject_age_group, hidden_at, hidden_reason. Geolocation dan EXIF tidak disimpan/ditampilkan dari derivative publik.

Status consent minimum: pending, approved, rejected, revoked. Aset yang revoked atau hidden tidak boleh muncul di query publik maupun paket unduhan.

## Relasi

~~~text
profiles ──1:1── auth.users
profiles ──1:1── staff_roles
profiles ──1:N── audit_logs

departments ──1:N── events
departments ──1:N── schedules
events ──0:N── media_albums
departments ──0:N── media_albums
media_albums ──N:M── media_assets melalui album_assets
media_assets ──1:N── consent_records
courses ──1:N── course_lessons (RESTRICT)
~~~

Gunakan soft archive untuk konten. Penghapusan permanen melakukan pemeriksaan relasi, penghapusan object Storage yang aman, dan audit log; hanya Admin.

## Matriks RLS

| Sumber data | anon | Editor | Admin |
| --- | --- | --- | --- |
| Konten publik | SELECT Published saja | CRUD seluruh konten publik | CRUD + permanent delete |
| Draft/Archived publik | Tidak | SELECT/CRUD | SELECT/CRUD |
| Album/aset | SELECT jika Published, consent approved, tidak hidden | CRUD termasuk upload | CRUD termasuk hide/purge |
| profiles/staff_roles | Tidak | Baca profil sendiri minimum | Kelola staf/role |
| audit_logs | Tidak | Tidak | SELECT |
| schedules/settings publik | SELECT filter Published | CRUD relevan | CRUD |
| prayer_requests/visitor_submissions/leads | Tidak | Tidak | CRUD/ekspor terkontrol |
| storage object | Read jika metadata mengizinkan | Scoped upload/edit | Scoped full control |

Policy publik tidak boleh menggunakan kondisi sekadar status Published jika aset foto consent-nya belum approved atau ter-hidden. Policy dan query server harus sama-sama menerapkan kondisi ini.

## Implementasi otorisasi

1. RLS aktif untuk setiap tabel exposed. Revoke seluruh grant awal untuk anon dan authenticated.
2. Berikan kembali SELECT anonim hanya untuk tabel/kolom konten yang benar-benar publik.
3. Buat fungsi helper security definer yang sempit, misalnya is_admin() dan is_editor_or_admin(), dengan search_path tetap dan tanpa parameter dari klien.
4. Role dibaca dari staff_roles milik auth.uid(); jangan dari raw user metadata.
5. Masing-masing tabel mendapat policy per operasi: SELECT, INSERT, UPDATE, DELETE. Jika beberapa persona berbagi operasi yang sama, gabungkan predicate dalam satu permissive policy agar tidak memunculkan `multiple_permissive_policies`.
6. View publik harus dibuat aman; view tidak otomatis mewarisi RLS pada cara yang aman.
7. Setiap migration berisi tabel + RLS + grants + policy + test dalam satu perubahan.

Supabase menegaskan bahwa tabel pada schema exposed tanpa RLS dapat diakses oleh role yang mempunyai grant; grants dan policy harus diperiksa bersama. Lihat [panduan RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Indeks minimum

| Tabel | Indeks |
| --- | --- |
| announcements | (status, published_at desc), unique(slug) |
| events | (status, starts_at), (department_id, starts_at), unique(slug) |
| schedules | (status, day_of_week, active_from) |
| schedule_exceptions | (exception_date, status), (schedule_id, exception_date) |
| media_albums | (status, occurred_on desc), (category, status, occurred_on desc), unique(slug) |
| media_assets | (processing_state, consent_status, hidden_at), (created_at desc) |
| album_assets | unique(album_id, asset_id), (album_id, position) |
| audit_logs | (actor_id, occurred_at desc), (entity_type, entity_id, occurred_at desc) |

Tambah indeks hanya sesudah melihat pola query dan EXPLAIN ANALYZE pada data representatif. Hindari indeks duplikat dan indeks untuk kolom ber-cardinality rendah tanpa predicate yang tepat.

## Kontrak audit

Audit mencatat action, actor_id, entity_type, entity_id, occurred_at, request correlation ID, serta delta terredaksi. Jangan catat password, token, payload doa lengkap, nomor telepon lengkap, atau URL bertanda tangan di audit log.

## Lifecycle staf P2-203

Mutasi staf tidak dilakukan melalui `insert`, `update`, atau `delete` Data API dari browser. Migration P2-203 menyediakan RPC berikut pada schema `public`:

| RPC | Caller | Hasil |
| --- | --- | --- |
| `bootstrap_first_admin(text)` | Auth user pertama, saat belum ada role | Membuat profile Admin dan audit `staff.bootstrapped` satu kali |
| `provision_invited_editor(uuid, text)` | Admin aktif | Memasangkan Auth user yang sudah diundang sebagai Editor dan audit `staff.invited` |
| `deactivate_staff(uuid, text)` | Admin aktif | Menonaktifkan Editor dan audit `staff.deactivated` |

RPC memakai `SECURITY DEFINER`, `SET search_path = ''`, nama schema lengkap, advisory lock, validasi `auth.uid()`, dan explicit `REVOKE PUBLIC`/`GRANT authenticated`. `SUPABASE_SECRET_KEY` hanya berada pada server admin client untuk Auth invitation dan tidak boleh masuk bundle browser, response, fixture, atau audit. Route invitation melakukan kompensasi `auth.admin.deleteUser` bila provisioning database gagal. UI sign-in, reset password, refresh-session, dan route guard penuh adalah scope P2-204.
