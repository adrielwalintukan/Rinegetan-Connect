# P3-003 — Impor Course Pelajari Alkitab

**Status:** Desain disetujui pemilik project pada 2026-10-25; diimplementasikan dan ditinjau per tugas pada hari yang sama. Verifikasi lokal lulus (Node 285/285, pgTAP 12 file/485 tes, Playwright staff-courses 15/15). PR menuju `development` menunggu CI dan merge; belum production. Lihat [record](../../04-delivery/records/P3-003-2026-10-25.md).
**Dasar integrasi:** `development` pada `ccb9618`.
**Issue:** P3-003 (#46).

## Keputusan pemilik (2026-10-25)

| Keputusan | Pilihan |
| --- | --- |
| Lingkup | Pelajari Alkitab (Course → Lesson P3-001). Bukan Sekolah Sabat; Adventech tetap Phase 4. |
| Sumber | Berkas yang disiapkan staf dari sumber apa pun; sumber dan lisensi diisi per impor. Tidak ada koneksi ke situs/API pihak ketiga. |
| Format | Satu berkas JSON berisi satu course dan lesson-lessonnya. |
| Batas | Berkas maksimal 2 MB; 1–100 lesson per course. |
| Peran | Editor dan Admin mengimpor; hanya Admin menyetujui lisensi. |
| Duplikat | Slug course yang sudah dipakai ditolak; impor tidak pernah menimpa course yang ada. |
| Pendekatan | Staging terpisah; course dan lesson Draft dibuat hanya setelah Admin menyetujui lisensi. |

## Tujuan dan ukuran selesai

Staf dapat memasukkan satu seri materi dari luar tanpa mengetik ulang, dengan jaminan:

- Semua hasil impor masuk staging (`course_imports`) lalu Draft; tidak ada hasil langsung Published.
- Validasi mencakup struktur, URL, bahasa, duplikasi, sumber dan lisensi.
- Staf meninjau preview sebelum keputusan; perbaikan isi setelah Draft memakai CMS P3-001.
- Sumber/lisensi tercatat dan disetujui Admin sebelum materi masuk tabel course, sehingga tidak dapat diterbitkan sebelum review hak pakai.
- Publik tidak pernah melihat data staging maupun course hasil impor sebelum diterbitkan lewat lifecycle biasa.

## Pendekatan yang dibandingkan

1. **Staging terpisah, course dibuat setelah persetujuan lisensi (dipilih).** Materi tanpa izin tidak pernah berada di `courses`; trigger lifecycle course P3-001 yang sudah dirilis tidak diubah. Perbaikan sebelum persetujuan dilakukan dengan mengunggah ulang berkas.
2. Course Draft langsung dibuat, publish dikunci trigger baru sampai lisensi disetujui. Edit lebih awal, tetapi mengubah trigger yang sudah rilis dan menyimpan materi berizin belum jelas di tabel course.
3. Validasi di browser saja. Ditolak: dokumen mewajibkan staging/import record.

Tanpa dependency baru. Logika yang dapat diuji berada di `.mjs`, mengikuti pola `lib/courses`.

## Format berkas

```json
{
  "format": "rinegetan-course-import/1",
  "language": "id",
  "source": { "name": "Nama penerbit/pelayanan", "url": "https://contoh.invalid/seri", "rights_holder": "Pemegang hak" },
  "license": { "name": "Nama lisensi atau izin", "url": "https://contoh.invalid/izin", "notes": "Cakupan dan batasan izin" },
  "course": { "title": "Judul course", "slug": "judul-course", "summary": "Ringkasan" },
  "lessons": [
    { "position": 1, "title": "Judul lesson", "slug": "judul-lesson", "summary": "Ringkasan", "body": "Isi berparagraf" }
  ]
}
```

Contoh lengkap disimpan sebagai `docs/04-delivery/templates/course-import-example.json` (data sintetis).

## Validasi server

Satu parser (`lib/courses/imports.mjs`) dipakai API; pesan kesalahan berbahasa Indonesia menyebut lokasi field (mis. `lessons[3].slug`).

| Aturan | Detail |
| --- | --- |
| Ukuran | Body permintaan maksimal 2 MB (dicek dari panjang byte sebelum parse); 1–100 lesson |
| Struktur | Objek dengan kunci persis seperti format; kunci lain ditolak; `format` harus `rinegetan-course-import/1` |
| Teks | Normalisasi dan batas sama dengan CMS P3-001: judul 1–200, ringkasan ≤ 500, isi lesson 1–50.000 karakter (wajib terisi), tanpa karakter NUL; slug pola P3-001 maksimal 220 |
| Posisi | Bilangan bulat 1–2.147.483.647 |
| Bahasa | `language` wajib `"id"`; isi tidak dideteksi otomatis, staf memeriksa di preview |
| URL | Opsional; bila ada hanya `https://`, maksimal 2.048 karakter, tanpa userinfo, harus terurai oleh `URL` |
| Sumber/lisensi | `source.name`, `source.rights_holder`, `license.name` wajib (1–200); `license.notes` opsional ≤ 1.000 |
| Duplikasi dalam berkas | Slug lesson dan nomor urut lesson unik |
| Duplikasi data | Slug course belum dipakai di `courses` maupun impor `pending` lain (dicek server, dijamin index/constraint) |

## Model data

Migration baru, aditif; migration lama tidak diubah.

### `public.course_imports`

| Kolom | Aturan |
| --- | --- |
| id | UUID primary key |
| status | `pending` / `approved` / `rejected` (check), default `pending` |
| payload | jsonb hasil validasi (course + lessons); tidak dapat diubah setelah insert |
| course_title, course_slug | Salinan untuk daftar dan pengecekan duplikat; pola sama dengan `courses` |
| lesson_count | 1–100 |
| source_name, source_url, rights_holder | Sumber; URL opsional |
| license_name, license_url, license_notes | Lisensi/izin |
| created_by, created_at | Dikelola database dari sesi |
| reviewed_by, reviewed_at | Diisi saat keputusan Admin |
| review_note | Wajib saat `rejected` (1–500) |
| course_id | FK `courses` `on delete set null`; terisi saat `approved` |

- Partial unique index pada `course_slug` untuk `status = 'pending'`.
- Database tidak mempercayai input meski API dilewati (insert langsung lewat PostgREST):
  - Check: `octet_length(payload::text) <= 2097152`; `payload->'lessons'` berupa array 1–100 dan sama dengan `lesson_count`; `payload->'course'->>'slug' = course_slug`.
  - Trigger `before insert`: memaksa `status = 'pending'`, `created_by = auth.uid()`, `created_at = now()`, mengosongkan `reviewed_*`, `review_note`, `course_id`; menolak bila `course_slug` sudah dipakai di `courses`.
  - Trigger `before update`: menolak perubahan payload, data sumber/lisensi, metadata pembuat, atau transisi selain `pending → approved/rejected`; mengisi `reviewed_by`/`reviewed_at` dari sesi.
- Trigger audit `after insert/update` ke `audit_logs` (`course_import.created/approved/rejected`, tanpa payload).

### Persetujuan: `public.approve_course_import(p_import_id uuid) returns uuid`

`security definer`, `search_path = ''`, `execute` hanya untuk `authenticated` (dicabut dari `public`/`anon`), mengikuti pola fungsi privat yang ada. Baris pertama menolak bila `private.is_admin()` salah. Baris impor dikunci `for update` dan harus `pending` (mencegah persetujuan ganda bersamaan). Dalam satu transaksi: insert course Draft, insert semua lesson Draft, set impor `approved` beserta `course_id`. Hanya `title`, `slug`, `summary`, `body`, `position` yang disalin dari payload; status selalu `draft`, field lain diabaikan. Constraint `courses`/`course_lessons` tetap memvalidasi teks dan slug; pelanggaran unik slug membatalkan seluruh transaksi. Fungsi melewati RLS `courses` karena pemeriksaan Admin eksplisit; `auth.uid()` tetap dari sesi sehingga trigger lifecycle/audit P3-001 mencatat Admin yang menyetujui.

Approve hanya lewat fungsi ini. Update langsung oleh Admin hanya untuk penolakan (`status = 'rejected'`, `review_note` terisi, `course_id` kosong).

### Grant dan RLS

- `anon`: tidak ada grant.
- `authenticated`: `select`, `insert`, `update`; tidak ada `delete` (jejak sumber/lisensi dipertahankan).
- Policy: select dan insert untuk `is_editor_or_admin()`; update `using is_admin()` dengan `with check (status = 'rejected' and course_id is null and review_note is not null)`.

## API dan UI

- `POST /api/staff/course-imports` — Editor/Admin; validasi lalu insert `pending`. Kesalahan validasi 400, slug bentrok 409.
- `POST /api/staff/course-imports/[id]` dengan aksi `approve` atau `reject` (alasan) — Admin. Setelah approve, UI me-refresh daftar course staf.
- Daftar impor memuat metadata saja (tanpa payload), maksimal 50 terbaru dengan `pending` di atas, lewat client sesi (RLS). Payload untuk preview diambil per `id` saat staf membuka **Lihat preview**.
- Tab Pelajari Alkitab di portal staf:
  - Tombol **Impor JSON** (Editor/Admin) membuka dialog unggah memakai pola modal yang ada; berkas dibaca di browser dan dikirim sebagai JSON; kesalahan tampil per field.
  - Daftar **Impor** (status pending di atas) dengan sumber, pemegang hak, dan lisensi; **Lihat preview** menampilkan course dan lesson sebagai teks berparagraf seperti reader (dirender React sebagai teks, bukan HTML).
  - Bila pengunggah dan penyetuju orang yang sama, tampil label "Diunggah dan disetujui oleh orang yang sama"; Admin tetap boleh menyetujui impornya sendiri.
  - Admin: **Setujui** (konfirmasi) dan **Tolak** (alasan wajib). Editor melihat status tanpa tombol keputusan.
  - Setelah disetujui, course Draft muncul di daftar course dan dikelola lewat CMS P3-001.
- Mengikuti kontrak UI: Bahasa Indonesia, 320–1440 px tanpa overflow, target sentuh ≥ 44 px, keyboard/fokus, reduced motion.

## Pengujian

- **pgTAP:** grant/RLS per peran (anon ditolak, Editor tidak dapat approve/reject, tidak ada delete); insert langsung dengan status/metadata palsu dipaksa `pending`; payload melebihi batas/jumlah lesson tidak cocok ditolak; slug yang sudah dipakai course ditolak saat insert; payload dan data lisensi immutable; Admin tidak dapat update langsung ke `approved`; approve membuat course + lesson Draft dari field yang diizinkan saja dan menautkan `course_id`; approve kedua pada impor yang sama ditolak; slug bentrok membatalkan seluruh approve; audit tercatat tanpa payload.
- **Unit (Node):** parser untuk berkas valid dan setiap aturan yang dilanggar (ukuran, kunci asing, format, bahasa, URL, teks, posisi/slug ganda, sumber/lisensi kosong, jumlah lesson).
- **Kontrak/route:** rute baru menolak staf tidak aktif dan peran yang salah.
- **Playwright (suite staff-courses, CI):** Editor mengimpor dan melihat preview; Editor tidak melihat tombol keputusan; Admin menolak dengan alasan; Admin menyetujui lalu course Draft tampil; anonim tidak melihat course sebelum terbit; 320 px dan keyboard.

## Di luar scope

Auto-publish, auto-sync atau pengambilan dari URL sumber, impor ZIP/CSV/Markdown, mengedit payload pending (unggah ulang), menghapus catatan impor, perubahan reader/progres P3-002, Sekolah Sabat/Adventech.

## Dokumentasi saat implementasi

- `docs/04-delivery/CONTENT-OPERATIONS.md` — panduan impor.
- `docs/03-architecture/DATA-MODEL-AND-RLS.md` — `course_imports`.
- `docs/04-delivery/ISSUE-BACKLOG.md`, `ROADMAP.md`, `SPRINT-PLAN.md` — status P3-003.
- Record delivery P3-003 dengan bukti verifikasi.

## Stress Test Results: impor course P3-003 (2026-10-25)

### Resolved Decisions
- Database menegakkan aturan impor walau API dilewati: insert dipaksa `pending`, batas ukuran/jumlah lesson, slug course diperiksa, hanya field yang diizinkan disalin saat approve.
- Approve hanya lewat fungsi `security definer` dengan cek Admin eksplisit; RLS update Admin hanya untuk penolakan.
- Daftar impor memuat metadata saja (maks 50); payload preview dimuat saat dibuka.
- Admin boleh menyetujui impornya sendiri; audit mencatat pengunggah dan penyetuju, UI memberi label.
- Payload dan metadata disimpan permanen.

### Changes Made
- Fungsi approve berubah dari `security invoker` menjadi `security definer` dengan cek Admin.
- Ditambah check constraint payload, trigger insert, policy update terbatas, pemuatan preview per `id`, label persetujuan diri, dan kasus pgTAP terkait.
- Reflexion: pengecekan slug `courses` saat insert, kunci `for update` untuk persetujuan bersamaan, preview dirender sebagai teks.

### Deferred / Parking Lot
- Pembersihan payload impor lama; tinjau ulang bila penyimpanan database mendekati kuota paket.

### Confidence Assessment
- Overall: High
- Areas of concern: fungsi `security definer` melewati RLS `courses`; dijaga cek Admin eksplisit dan diuji pgTAP.
