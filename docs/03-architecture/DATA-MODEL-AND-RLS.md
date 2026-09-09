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

courses, course_lessons, course_imports, study_interest_leads, prayer_requests, visitor_submissions, consent_records, dan form_rate_events.

### Tabel Phase 4–5

sabbath_content_cache, sabbath_offline_manifests, notification_preferences, push_subscriptions, notification_deliveries. Progres pelajaran tidak menjadi tabel karena tetap lokal di browser.

## Bentuk record penting

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
5. Masing-masing tabel mendapat policy per operasi: SELECT, INSERT, UPDATE, DELETE.
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
| audit_logs | (actor_id, created_at desc), (entity_type, entity_id, created_at desc) |

Tambah indeks hanya sesudah melihat pola query dan EXPLAIN ANALYZE pada data representatif. Hindari indeks duplikat dan indeks untuk kolom ber-cardinality rendah tanpa predicate yang tepat.

## Kontrak audit

Audit mencatat action, actor_id, entity_type, entity_id, occurred_at, request correlation ID, serta delta terredaksi. Jangan catat password, token, payload doa lengkap, nomor telepon lengkap, atau URL bertanda tangan di audit log.
