# P2-204 Staff Auth, Session, dan Route Guard — Design

**Status:** Draft implementasi, menunggu review spesifikasi
**Issue:** P2-204 — Staff sign-in, invitation acceptance, reset password, session refresh, dan route guard
**Branch:** `feature/p2-204-auth-session-guards`

## Tujuan

Menyediakan alur autentikasi staf Admin/Editor yang aman dan dapat digunakan di browser maupun server: sign-in email/password, penerimaan undangan Editor, reset password, refresh session berbasis cookie, logout, dan perlindungan rute staf. Public signup, role Member, OAuth, dan fitur CMS tetap di luar scope.

P2-204 melanjutkan P2-203. Database tetap menjadi enforcement authorization melalui `public.profiles.is_active` dan `public.staff_roles`; session hanya membuktikan identitas Auth dan tidak menjadi sumber role.

## Scope

### Termasuk

- Halaman `/staff/login` untuk sign-in email/password.
- Halaman `/staff/forgot-password` untuk meminta reset password.
- Halaman `/staff/update-password` untuk acceptance undangan dan reset password.
- Route Handler `/auth/callback` untuk menukar `code` Auth menjadi session cookie.
- Logout yang menghapus session melalui Supabase Auth.
- `frontend/src/proxy.ts` untuk refresh session cookie dan redirect awal rute `/staff/*`.
- Server authorization helper untuk memastikan user memiliki profile aktif dan role `admin` atau `editor`.
- Protected staff layout/landing route tanpa memindahkan atau mengubah URL publik Phase 1.
- Redirect `next` yang hanya menerima path internal agar tidak menjadi open redirect.
- `inviteUserByEmail` memakai callback URL yang konsisten dengan environment request.
- Test contract untuk form/route, callback, session refresh, role aktif/nonaktif, dan public signup boundary.
- Pembaruan backlog/runbook agar pembagian P2-203 dan P2-204 konsisten.

### Tidak termasuk

- Public signup, role Member, social login/OAuth, MFA, magic link, SMS, WhatsApp notification, dan passkey.
- CMS, Storage, Edge Function, notification service, atau perubahan schema database baru.
- Penggunaan `SUPABASE_SECRET_KEY` di browser, proxy, Client Component, atau response.
- Otorisasi hanya berdasarkan `user_metadata`, `app_metadata`, query parameter, atau state browser.
- Migrasi Auth hosted otomatis; pengaturan email/redirect allow-list tetap dilakukan pemilik project di Dashboard Supabase.
- Penghapusan permanen user Auth atau perubahan lifecycle RPC P2-203 selain callback invite yang diperlukan.

## Keputusan desain

### 1. Server-first authorization dengan `proxy.ts`

Next.js 16 memakai konvensi `proxy.ts`. Proxy menjadi boundary jaringan untuk refresh cookie dan optimistic redirect saja, bukan tempat authorization lengkap atau query database lambat. Proxy membuat client SSR dengan cookie request/response, memanggil `auth.getClaims()`, dan:

- meneruskan request publik tanpa session;
- mengarahkan request tanpa claims dari `/staff` ke `/staff/login?next=...`;
- mengizinkan `/staff/login`, `/staff/forgot-password`, `/staff/update-password`, dan callback tanpa redirect loop;
- tidak menentukan Admin/Editor dari claims atau metadata;
- tidak membaca `SUPABASE_SECRET_KEY`.

Layout dan Route Handler yang menyajikan data privat selalu melakukan pemeriksaan final memakai `auth.getUser()` lalu query `profiles` dan `staff_roles`. Dengan demikian user nonaktif kehilangan akses walaupun masih memiliki cookie/session yang belum kedaluwarsa.

### 2. Boundary client Supabase

`frontend/src/lib/supabase/browser.ts` tetap menjadi satu-satunya factory browser dan dipakai oleh form Client Component untuk `signInWithPassword`, `resetPasswordForEmail`, `updateUser`, dan `signOut`. `frontend/src/lib/supabase/server.ts` dipakai oleh proxy, layout, callback, dan Route Handler server.

`frontend/src/lib/supabase/admin.ts` tidak dipakai pada alur sign-in/reset/callback. Ia tetap hanya dipakai route invite P2-203 untuk Auth Admin API. Nilai secret tidak pernah masuk bundle, URL, log, response, fixture, atau metadata.

### 3. Rute Auth

| Rute | Akses | Perilaku |
| --- | --- | --- |
| `/staff/login` | publik | Email/password; error generik; redirect ke path internal `next` atau `/staff` |
| `/staff/forgot-password` | publik | Meminta reset email; response tidak membocorkan apakah email terdaftar |
| `/auth/callback` | publik dengan `code` | `exchangeCodeForSession(code)`, lalu redirect ke tujuan internal |
| `/staff/update-password` | session recovery/invite | `updateUser({ password })`, validasi password di UI/server boundary, lalu redirect `/staff` |
| `/staff` | staf aktif | Protected landing; role akhir diverifikasi server |
| `/auth/signout` atau aksi logout | session | `signOut`, cookie dibersihkan, redirect ke `/staff/login` |

Callback invite P2-203 akan memakai `redirectTo` berbasis origin request ke `/auth/callback?next=/staff/update-password`. Hosted Supabase harus memiliki URL callback tersebut pada allow-list. Origin tidak diambil dari input pengguna.

### 4. Redirect dan error contract

- `next` hanya valid jika diawali `/`, bukan `//`, tidak memiliki hostname, dan dinormalisasi ke path internal.
- Error sign-in dan forgot-password generik sehingga tidak mengungkap keberadaan akun.
- Callback tanpa/invalid `code` mengarah ke halaman Auth dengan pesan aman; tidak mencetak code/token.
- User yang authenticated tetapi tidak memiliki role aktif diarahkan ke `/staff/login?error=unauthorized` setelah session ditutup atau ditolak di server.
- User nonaktif tidak memperoleh data staff walaupun proxy menemukan claims.
- Reset/invite yang kedaluwarsa menghasilkan halaman pemulihan yang dapat dicoba ulang, tanpa stack trace atau token di UI.

### 5. Pembagian P2-203/P2-204

P2-203 bertanggung jawab atas bootstrap Admin, invite/provision Editor, deactivation, dan RPC/audit lifecycle. P2-204 bertanggung jawab atas acceptance link, sign-in/reset UI, session refresh, logout, route guard, dan callback. Backlog akan diperbaiki supaya acceptance criteria tidak lagi menggabungkan dua issue.

## Kontrak keamanan

- Tidak ada public signup: `supabase/config.toml` dan hosted Auth tetap `enable_signup = false`.
- Tidak menggunakan `getSession()` sebagai bukti authorization server; gunakan `getClaims()` pada proxy dan `getUser()`/query role pada server boundary.
- Route privat tidak mengandalkan redirect client sebagai satu-satunya kontrol.
- Semua akses database staf tetap tunduk pada RLS P2-202.
- Tidak ada query role dari browser untuk memutuskan akses Admin.
- `next` dan redirect origin divalidasi untuk mencegah open redirect.
- Cookie Supabase diteruskan melalui adapter SSR; proxy meneruskan response cookie yang dihasilkan refresh.

## Testing dan verifikasi

### Contract/unit

Test harus membuktikan:

1. `next` internal diterima dan external/protocol-relative URL ditolak.
2. Unauthenticated `/staff/*` diarahkan ke login, sedangkan route Auth tidak loop.
3. Claims/session valid tidak melewati pemeriksaan role server.
4. Admin dan Editor aktif dapat membuka staff boundary; user tanpa role dan staff nonaktif ditolak.
5. Sign-in success/error, forgot-password generic response, update-password validation, callback exchange, dan logout memakai client boundary yang benar.
6. Callback tidak pernah memantulkan code/token ke response atau log.
7. Browser bundle tidak mengimpor admin client atau `SUPABASE_SECRET_KEY`.
8. Public signup tetap tidak tersedia.

### Quality gates

`npm run test:routes`, test contract P2-204, `npm run lint`, `npm run build`, dan populated-secret scan harus lulus. Jika Supabase local aktif, jalankan migration/RLS test yang sudah ada untuk memastikan perubahan Auth tidak mengubah policy database.

## Acceptance criteria

- Admin/Editor dapat sign-in dengan email/password melalui UI yang terhubung ke Supabase Auth.
- Link undangan Editor dapat ditukar menjadi session dan mengarahkan user untuk menetapkan password.
- User dapat meminta dan menyelesaikan reset password tanpa public signup.
- Session cookie direfresh pada network boundary dan logout membersihkan sesi.
- `/staff/*` tidak dapat diakses unauthenticated, user tanpa role, atau staff nonaktif; pemeriksaan final berada di server.
- Redirect hanya menuju path internal yang tervalidasi.
- Tidak ada secret key di browser bundle, response, log, fixture, atau dokumentasi.
- Rute publik Phase 1 dan desainnya tidak berubah.
- Backlog dan runbook secara konsisten memisahkan scope P2-203 dan P2-204.
