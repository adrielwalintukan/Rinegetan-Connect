# P3-003 — Impor Course Pelajari Alkitab

**Status:** Desain disetujui pemilik project pada 2026-10-25; belum diimplementasikan.
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
- Trigger `before insert/update`: mengisi metadata dari `auth.uid()`/`now()`; menolak perubahan payload, data sumber/lisensi, atau transisi selain `pending → approved/rejected`.
- Trigger audit `after insert/update` ke `audit_logs` (`course_import.created/approved/rejected`, tanpa payload).

### Persetujuan: `public.approve_course_import(p_import_id uuid) returns uuid`

`security invoker`, `search_path = ''`, `execute` hanya untuk `authenticated`. Menolak bila bukan Admin aktif atau impor bukan `pending` (dikunci `for update`). Dalam satu transaksi: insert course Draft, insert semua lesson Draft dari payload, set impor `approved` beserta `course_id`. Pelanggaran unik slug membatalkan seluruh transaksi. Karena memakai hak pengguna, RLS dan trigger lifecycle/audit P3-001 tetap berlaku.

Penolakan memakai update biasa (`status = 'rejected'`, `review_note`) yang diizinkan RLS hanya untuk Admin.

### Grant dan RLS

- `anon`: tidak ada grant.
- `authenticated`: `select`, `insert`, `update`; tidak ada `delete` (jejak sumber/lisensi dipertahankan).
- Policy: select dan insert untuk `is_editor_or_admin()`; update hanya `is_admin()`.

## API dan UI

- `POST /api/staff/course-imports` — Editor/Admin; validasi lalu insert `pending`. Kesalahan validasi 400, slug bentrok 409.
- `POST /api/staff/course-imports/[id]` dengan aksi `approve` atau `reject` (alasan) — Admin. Setelah approve, revalidasi daftar course staf.
- Data impor dibaca melalui query staf yang sudah ada di dashboard (client sesi, RLS).
- Tab Course di portal staf:
  - Tombol **Impor JSON** (Editor/Admin) membuka dialog unggah memakai pola modal yang ada; berkas dibaca di browser dan dikirim sebagai JSON; kesalahan tampil per field.
  - Daftar **Impor** (status pending di atas) dengan preview course dan lesson sebagai teks berparagraf (seperti reader), sumber, pemegang hak, dan lisensi.
  - Admin: **Setujui** (konfirmasi) dan **Tolak** (alasan wajib). Editor melihat status tanpa tombol keputusan.
  - Setelah disetujui, course Draft muncul di daftar course dan dikelola lewat CMS P3-001.
- Mengikuti kontrak UI: Bahasa Indonesia, 320–1440 px tanpa overflow, target sentuh ≥ 44 px, keyboard/fokus, reduced motion.

## Pengujian

- **pgTAP:** grant/RLS per peran (anon ditolak, Editor tidak dapat approve/reject, tidak ada delete); payload dan data lisensi immutable; transisi status; approve membuat course + lesson Draft dan menautkan `course_id`; slug bentrok membatalkan seluruh approve; audit tercatat tanpa payload.
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
