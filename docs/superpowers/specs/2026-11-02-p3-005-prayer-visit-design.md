# P3-005 — Form Doa dan Kunjungan

**Status:** Desain disetujui pemilik project pada 2026-11-02; diimplementasikan pada hari yang sama di branch `feature/p3-005-prayer-visit`. Lihat [record](../../04-delivery/records/P3-005-2026-11-02.md).
**Dasar integrasi:** `development` pada `b39e391`.
**Issue:** P3-005 (#48).

## Keputusan pemilik (2026-11-02)

| Keputusan | Pilihan |
| --- | --- |
| Struktur | Dua form terpisah di `/kontak`: **Permohonan doa** dan **Saya ingin berkunjung** (anchor `#berkunjung`). Dua tabel, dua route. |
| Field doa | Nama (opsional, maksimal 100), kontak WhatsApp atau email (opsional, maksimal 254), isi doa (wajib, 1-2000), "Saya ingin dihubungi" (hanya boleh benar bila kontak diisi). |
| Field kunjungan | Nama (wajib, maksimal 100), kontak (wajib, maksimal 254), rencana tanggal kunjungan (opsional, tidak boleh lampau menurut Asia/Makassar), jumlah orang (opsional, 1-20), pesan (opsional, maksimal 1000). |
| Copy privasi | Draf tujuan, retensi "paling lama 24 bulan, lalu dihapus", dan persetujuan ditulis tim mengikuti copy P3-004 yang disahkan; versi consent `draft-2026-11-02` sampai disahkan gereja. Tidak dirilis ke production sebelum disahkan. |
| Retensi | 24 bulan; penghapusan manual mingguan pada cut-off 24 bulan dikurangi 120 hari lewat runbook retensi yang diperluas ke dua tabel baru, tanpa perpanjangan. |
| Rate limit | Per form: 20 percobaan per jam per hash IP sebelum Turnstile, 5 submit tersimpan per jam setelah Turnstile (sama dengan P3-004). |
| Notifikasi | Tidak ada email. Admin melihat data baru di portal staf. |
| Arsitektur | Pakai ulang helper P3-004 lewat modul bersama `lib/forms/public-form.mjs`; route P3-004 dan perilakunya tidak berubah. |

Batas panjang menghitung Unicode code point; teks dipangkas sebelum divalidasi.

## Tujuan dan ukuran selesai

Acceptance issue #48:

1. Tujuan pemrosesan, retensi, dan checkbox consent eksplisit yang tidak tercentang default tersedia pada kedua form.
2. Turnstile diverifikasi di server; validasi skema/batas panjang, rate limit, honeypot, dan respons generik diterapkan.
3. Anonim dan Editor tidak dapat membaca doa atau data pengunjung; Admin menangani lewat dashboard privat dengan RLS/grant sesuai matriks.
4. Isi pastoral tidak masuk email atau log; tidak ada email notifikasi.

## Pendekatan yang dibandingkan

- **Dipilih: helper bersama.** Logika keamanan (body 8 KB, Turnstile, HMAC IP, urutan rate limit) ada di satu tempat; setiap form hanya punya parser skema.
- Salin pola P3-004 per form: tanpa menyentuh P3-004, tetapi logika keamanan terduplikasi tiga kali dan mudah menyimpang.
- Satu route generik `/api/forms/[jenis]`: paling sedikit kode, tetapi mengubah URL P3-004 yang sudah merge.

## Data

Satu migration aditif `20261102000000_p3_005_prayer_visit.sql`, pola sama dengan `study_interest_leads`.

### `public.prayer_requests`

| Kolom | Aturan |
| --- | --- |
| id | uuid, default `gen_random_uuid()` |
| name | text, default `''`, panjang 0-100 |
| contact | text, default `''`, panjang 0-254; bila tidak kosong harus email sederhana atau nomor telepon 8-15 digit (constraint sama dengan P3-004) |
| request | text, panjang 1-2000 |
| wants_contact | boolean, default false; constraint: `not wants_contact or contact <> ''` |
| status | `new` / `prayed` / `closed`, default `new` |
| consent_version, consented_at | wajib |
| created_at | default `now()` |
| handled_by | FK `auth.users` ON DELETE SET NULL |
| handled_at | timestamptz |

### `public.visitor_submissions`

| Kolom | Aturan |
| --- | --- |
| id, created_at, consent_version, consented_at, handled_by, handled_at | sama dengan di atas |
| name | 1-100 |
| contact | 1-254, email atau telepon |
| visit_date | date, opsional (validasi "tidak lampau" di server, bukan constraint, agar baris lama tetap valid) |
| party_size | integer opsional, 1-20 |
| message | default `''`, 0-1000 |
| status | `new` / `contacted` / `closed`, default `new` |

### Grant, RLS, trigger, audit

- Ditulis hanya oleh route server dengan server key. `service_role`: revoke all eksplisit (hak default Supabase), lalu grant insert saja. Anon dan authenticated tanpa insert.
- Authenticated: select dan update, RLS untuk Admin aktif (`private.is_admin()`). Tidak ada delete untuk role mana pun. Editor dan anon tidak dapat membaca.
- Trigger insert memaksa `status = 'new'` dan handled kosong. Trigger update hanya mengizinkan perubahan status dan pengisian handled_by/handled_at; perubahan kolom lain ditolak (`prayer_request_immutable`, `visitor_submission_immutable`); pembersihan ON DELETE SET NULL handled_by diizinkan.
- Audit `prayer_request.created`/`prayer_request.status_changed` dan `visitor_submission.created`/`visitor_submission.status_changed` hanya berisi status; tanpa nama, kontak, isi doa, tanggal, jumlah orang, atau pesan.
- Rate limit memakai `form_rate_events` dan `check_form_rate` yang ada, dengan key form `prayer_attempt`/`prayer` dan `visit_attempt`/`visit`. Tidak ada perubahan pada fungsi itu.

## Server

### `lib/forms/public-form.mjs` (baru)

Dipindah dari `study-interest.mjs` tanpa perubahan perilaku: `readFormBody` (JSON wajib → 415, maksimal 8 KB UTF-8 ketat), `verifyTurnstile` (fail-closed, timeout 5 detik), `hashFormIp`, `clientIp`, kelas error yang dapat ditampilkan, dan helper teks code point. Ditambah `submitPublicForm(input, { formKey, parse, success, ...deps })` dengan urutan:

1. allow-list kunci;
2. honeypot `website` terisi → sukses generik tanpa simpan;
3. rate `<formKey>_attempt` 20 per jam;
4. parse/validasi;
5. Turnstile;
6. rate `<formKey>` 5 per jam;
7. insert.

`study-interest.mjs` mempertahankan `parseStudyInterest`, `submitStudyInterest`, dan mengekspor ulang nama lama sehingga route dan tes P3-004 tidak berubah.

### Parser

- `lib/forms/prayer-request.mjs`: `PRAYER_CONSENT_VERSION = "draft-2026-11-02"`, `parsePrayerRequest`, `submitPrayerRequest`. `wantsContact` benar tanpa kontak ditolak dengan error field `contact`.
- `lib/forms/visit.mjs`: `VISIT_CONSENT_VERSION = "draft-2026-11-02"`, `parseVisit`, `submitVisit`. `visitDate` harus `YYYY-MM-DD` yang valid dan tidak sebelum tanggal hari ini di Asia/Makassar; `partySize` bilangan bulat 1-20 atau kosong.
- Setiap modul punya pasangan `.ts` seperti P3-004.

### Route

- `POST /api/doa` dan `POST /api/kunjungan`: Node runtime, server key, respons generik. Tanpa `SUPABASE_SECRET_KEY` atau `TURNSTILE_SECRET_KEY` → 503. Error memakai `publicErrorMessage`.
- `PATCH /api/staff/prayer-requests/[id]` dan `PATCH /api/staff/visits/[id]`: autentikasi Admin aktif sebelum membaca body, `Content-Type: application/json`, hanya `status` yang valid untuk tabel itu. Mengikuti pola `study-interest-admin`.

## UI publik (`/kontak`)

- Kartu "Sampaikan langsung saat Sabat" diganti **Permohonan doa** (`PrayerRequestForm`).
- Kartu `#berkunjung` tetap memuat info kunjungan dan diikuti **Saya ingin berkunjung** (`VisitForm`); CTA navigasi tetap mendarat di sana.
- Pola sama dengan `StudyInterestForm`: Turnstile `size: "flexible"`, honeypot tersembunyi, error per field dengan `aria-describedby`, alert yang menerima fokus ulang, status sukses, pesan "belum tersedia" bila site key kosong.
- Checkbox "Saya ingin dihubungi" nonaktif selama kontak kosong.
- Copy: tujuan (dibaca hanya oleh Admin gereja, tidak dipublikasikan atau dibagikan), "Data disimpan paling lama 24 bulan, lalu dihapus.", checkbox persetujuan tidak tercentang. Ditandai draf menunggu pengesahan gereja.
- Teks "Layanan doa dan kunjungan sedang disiapkan" di `DigitalMinistrySection` diperbarui.

## UI staf

Dua tab khusus Admin, **Doa** dan **Kunjungan**, seperti `StudyInterestManager`: 50 data terbaru, status, tanggal masuk, dan usia. Status doa: Baru, Sudah didoakan, Selesai. Status kunjungan: Baru, Sudah dihubungi, Selesai. Editor tidak melihat tab.

## Pengujian

- Unit: kedua parser (consent kosong, batas panjang, kontak, `wantsContact` tanpa kontak, tanggal lampau/tidak valid, jumlah orang di luar batas), `submitPublicForm` (urutan honeypot, rate, Turnstile), route, dan route PATCH. Tes P3-004 tetap lulus tanpa diubah.
- pgTAP: grant dan RLS (anon, Editor, Admin), revoke `service_role`, trigger, constraint, audit tanpa PII.
- Playwright: kedua form dengan test key Turnstile (consent kosong, submit valid) dan tab Admin (Editor tidak melihat).
- Tes kontrak env/audit diperbarui bila perlu.

## Dokumen

DATA-MODEL-AND-RLS, SECURITY-PRIVACY, CONTENT-OPERATIONS, RETENTION-DELETION-RUNBOOK (dua tabel baru), ISSUE-BACKLOG, ROADMAP, spec ini, dan record `docs/04-delivery/records/P3-005-2026-11-02.md` dengan gate rilis production: copy disahkan gereja, runbook retensi diterima Admin, key Turnstile production (sudah terpasang untuk P3-004), dan gate backup migration.

## Di luar lingkup

Email notifikasi, ekspor, penghapusan otomatis dan respons pastoral (P3-006), kunjungan pastoral ke rumah/alamat, publikasi doa, akses Editor, akun publik.

## Risiko dan batas

- Isi doa sangat sensitif: tidak ada logging isi, audit tanpa isi, dan Admin saja.
- `x-forwarded-for` dapat dipalsukan di luar Vercel; Turnstile tetap wajib.
- Tes e2e bergantung pada jaringan ke Cloudflare (test key).
- Validasi tanggal "tidak lampau" memakai jam server dalam Asia/Makassar.
