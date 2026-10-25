# P3-004 — Form Minat Belajar

**Status:** Desain disetujui pemilik project pada 2026-10-26; belum diimplementasikan.
**Dasar integrasi:** `development` pada `6dc89ed`.
**Issue:** P3-004 (#47).

## Keputusan pemilik (2026-10-26)

| Keputusan | Pilihan |
| --- | --- |
| Field | Nama (wajib, maksimal 100), kontak WhatsApp atau email (wajib, maksimal 254), pesan (opsional, maksimal 1000). Batas menghitung Unicode code point. |
| Copy privasi | Draf tujuan pemrosesan, retensi 24 bulan, dan persetujuan ditulis oleh tim; ditandai menunggu pengesahan gereja. Tidak dirilis ke production sebelum disahkan. |
| Turnstile | Lokal dan CI memakai test key publik resmi Cloudflare. Key production dimasukkan pemilik sendiri ke Vercel. |
| Rate limit | 5 submit per jam per hash IP. |
| Jalur tulis | Route Handler server memverifikasi lalu insert dengan server key; anon tidak punya grant ke tabel lead. |
| Consent | Disimpan di baris lead (`consent_version`, `consented_at`); `consent_records` milik media tidak diubah. |

## Tujuan dan ukuran selesai

Pengunjung yang ingin belajar Alkitab bersama dapat meninggalkan kontak dengan persetujuan eksplisit, dan hanya Admin yang dapat membacanya.

- Tujuan pemrosesan, retensi, dan checkbox persetujuan yang tidak tercentang default ditampilkan sebelum kirim.
- Validasi server ketat; Turnstile diverifikasi server; rate limit dan honeypot aktif; respons generik.
- Lead hanya dapat dibaca dan dikelola Admin aktif melalui RLS dan server; Editor dan anonim tidak.
- Isi form tidak masuk log, audit, maupun email.

## Pendekatan yang dibandingkan

1. **Route Handler + server key + rate limit di DB (dipilih).** Satu-satunya jalur insert melewati Turnstile, honeypot, validasi, dan rate limit; tidak ada grant tulis bagi klien sehingga Data API tidak bisa dipakai untuk melewatinya.
2. RPC SECURITY DEFINER yang dapat dipanggil anon. Ditolak: RPC dapat dipanggil langsung tanpa Turnstile.
3. Route Handler + rate limit di memori (pola unduhan media). Ditolak: batas tidak andal di serverless karena memori per instance.

## Data

Migration aditif `supabase/migrations/20261026000000_p3_004_study_interest.sql`.

### `public.study_interest_leads`

| Kolom | Aturan |
| --- | --- |
| `id` | uuid, default `gen_random_uuid()` |
| `name` | 1–100 code point, terpangkas (`= btrim`), tanpa NUL |
| `contact` | 1–254 code point, terpangkas |
| `message` | 0–1000 code point, default `''`, terpangkas |
| `status` | `new` / `contacted` / `closed`, default `new` |
| `consent_version` | 1–64 karakter, wajib |
| `consented_at` | timestamptz, wajib |
| `created_at` | default `now()` |
| `handled_by` | FK `auth.users` ON DELETE SET NULL |
| `handled_at` | timestamptz |

- Grant: `revoke all` dari public, anon, authenticated; authenticated hanya `select, update`. Insert hanya lewat server key (service role, melewati RLS).
- RLS select dan update: `private.is_admin()` (Admin aktif). Tidak ada policy insert atau delete untuk klien; delete termasuk P3-006.
- Trigger update: hanya `status` yang boleh berubah; trigger mengisi `handled_by = auth.uid()` dan `handled_at = now()`; perubahan kolom lain ditolak `study_interest_immutable`.
- Audit: `study_interest.created` dan `study_interest.status_changed` dengan `entity_id` dan status saja, tanpa nama, kontak, atau pesan.

### `public.form_rate_events`

| Kolom | Aturan |
| --- | --- |
| `id` | bigint identity |
| `form` | teks, `study_interest` untuk issue ini |
| `ip_hash` | 16 karakter hex (SHA-256 terpotong, pola `hashIp` media) |
| `created_at` | default `now()` |

- Tanpa grant apa pun untuk anon dan authenticated; hanya server key. Index `(form, ip_hash, created_at)`.
- `public.check_form_rate(p_form text, p_ip_hash text, p_limit int, p_window interval) returns boolean` (SECURITY DEFINER, `search_path=''`, execute hanya service_role): menghapus event lebih tua dari 24 jam untuk form tersebut, menghitung event dalam window, dan bila di bawah batas mencatat event baru lalu mengembalikan `true`. Advisory lock per `ip_hash` mencegah balapan dua submit bersamaan.

## API `POST /api/minat-belajar`

Runtime Node. Urutan:

1. Body maksimal 8 KB (cek `Content-Length` lalu baca streaming dengan batas), UTF-8 ketat, JSON objek.
2. Allow-list kunci: `name`, `contact`, `message`, `consent`, `website` (honeypot), `turnstileToken`. Kunci lain ditolak 400.
3. Honeypot `website` terisi → 200 dengan pesan sukses generik, tanpa menyimpan dan tanpa memanggil Turnstile.
4. Validasi: teks dinormalkan seperti CMS (CRLF → LF, trim, tolak NUL dan surrogate tunggal), batas code point, `consent === true`. Error per field dalam Bahasa Indonesia tanpa memantulkan isi.
5. Turnstile: `TURNSTILE_SECRET_KEY` wajib; bila tidak ada → 503 "Formulir sementara tidak tersedia". POST ke `https://challenges.cloudflare.com/turnstile/v0/siteverify` dengan timeout 5 detik; gagal atau error jaringan → 400 "Verifikasi gagal, silakan coba lagi".
6. Rate limit: IP dari entri pertama `x-forwarded-for` (Vercel), di-hash; `check_form_rate('study_interest', hash, 5, '1 hour')` false → 429 pesan umum.
7. Insert dengan `createSupabaseAdminClient()`; `consent_version = STUDY_INTEREST_CONSENT_VERSION`, `consented_at = now()`.
8. Sukses → 201 "Terima kasih. Tim kami akan menghubungi Anda." Error DB → 500 pesan umum.

Tidak ada `console.log` isi form; log error hanya kode/nama error. Tidak ada email.

Logika validasi dan alur ada di `frontend/src/lib/forms/study-interest.mjs` (+ `.ts` re-export) agar dapat diuji dengan dependency yang disuntik (Turnstile verifier, rate checker, insert).

## UI publik

- `/pelajari-alkitab`: bagian "Ingin belajar bersama?" (id `ingin-belajar`) di bawah katalog, berisi form.
- Halaman lesson: tautan "Ingin belajar bersama?" ke `/pelajari-alkitab#ingin-belajar`.
- Komponen klien `StudyInterestForm`: label terlihat, `aria-describedby` untuk error, ringkasan error yang menerima fokus, tombol nonaktif saat mengirim, pesan sukses di `role="status"`.
- Copy menampilkan tujuan pemrosesan, retensi 24 bulan, pengelola (Admin gereja), dan checkbox persetujuan yang tidak tercentang. Konstanta `STUDY_INTEREST_CONSENT_VERSION = "draft-2026-10-26"`; record mencatat copy masih menunggu pengesahan gereja.
- Widget Turnstile dimuat dari `https://challenges.cloudflare.com/turnstile/v0/api.js` dengan `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; tanpa site key, form menampilkan pesan bahwa formulir belum tersedia.
- Honeypot `website` disembunyikan secara visual dan dari pembaca layar (`aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`).
- Tanpa overflow pada 320 px; target sentuh minimal 44 px.

## UI staf

- Tab **Minat belajar** hanya untuk Admin, pola sama dengan tab Audit/Staf (Editor tidak melihat tab dan server tidak memuat datanya untuk Editor).
- Daftar 50 lead terbaru: nama, kontak, pesan, tanggal, status; pengubah status (`Baru`, `Sudah dihubungi`, `Selesai`) lewat `PATCH /api/staff/study-interest/[id]` (Admin, validasi status).

## Pengujian

- **Node:** validasi field dan batas, consent kosong, kunci tak dikenal, honeypot, Turnstile gagal/tanpa secret/timeout, rate limit 429, error DB generik, tidak ada isi form di log, body > 8 KB 413, route staf menolak non-Admin.
- **pgTAP:** anon/authenticated non-Admin/Editor tidak bisa select/insert/update/delete lead; Admin bisa select dan update status; kolom lain immutable; `form_rate_events` dan `check_form_rate` tertutup bagi anon/authenticated; `check_form_rate` memblokir submit ke-6 dalam satu jam; audit tanpa nama/kontak/pesan.
- **Playwright:** submit valid dengan test key Cloudflare yang selalu lulus; consent kosong menampilkan error; Admin melihat lead dan mengubah status; Editor tidak melihat tab; 320 px tanpa overflow.

## Dokumen

DATA-MODEL-AND-RLS, SECURITY-PRIVACY, CONTENT-OPERATIONS, ISSUE-BACKLOG, `frontend/.env.example` (nama variabel Turnstile tanpa nilai), dan record `docs/04-delivery/records/P3-004-2026-10-26.md`. Record P3-003 dan ISSUE-BACKLOG juga dicatat SHA merge `6dc89ed`.

## Di luar lingkup

Akun Member, email notifikasi, ekspor, penghapusan dan retensi otomatis (P3-006), akses lead untuk Editor, form doa dan kunjungan (P3-005).

## Risiko dan batas

- Hash IP SHA-256 terpotong tanpa salt mengikuti pola media; event dihapus setelah 24 jam untuk membatasi paparan.
- `x-forwarded-for` dipercaya karena Vercel menulisnya; di lingkungan lain header dapat dipalsukan sehingga rate limit melemah, tetapi Turnstile tetap wajib.
- Copy privasi belum disahkan gereja; fitur tidak boleh dirilis ke production sebelum pengesahan.
