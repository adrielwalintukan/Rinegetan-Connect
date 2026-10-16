# P2-203 Staff Bootstrap dan Lifecycle — Design

**Status:** Draft implementasi, disetujui untuk ditulis pada 2026-09-16  
**Issue:** P2-203 — Bootstrap Admin dan lifecycle staf  
**Branch:** `feature/p2-203-staff-bootstrap`

## Tujuan

Menyediakan jalur bootstrap Admin pertama dan lifecycle Admin/Editor yang dapat diulang, diaudit, dan tidak membuka pendaftaran publik. Jalur ini hanya untuk staf internal; tidak ada role Member, public signup, atau operasi konten CMS di P2-203.

## Scope

### Termasuk

- Konfigurasi Supabase Auth lokal dengan signup publik dan email signup dinonaktifkan.
- Prosedur database terkontrol untuk bootstrap Admin pertama, provisioning Editor yang sudah diundang, dan deactivation staf.
- Validasi bahwa hanya Admin aktif yang dapat mengelola staf.
- Proteksi Admin terakhir agar tidak dapat dinonaktifkan.
- Audit log ter-redaksi untuk setiap mutasi lifecycle.
- Server-only Supabase admin client untuk memanggil Auth Admin API saat mengirim undangan.
- Route handler server untuk mengirim undangan Editor dan memasangkan user Auth ke profil/role.
- Test pgTAP allow/deny, one-time bootstrap, deactivation, audit, dan secret boundary.
- Runbook lokal dan remote untuk bootstrap pertama serta pengaturan Auth hosted.

### Tidak termasuk

- Halaman login, reset password, refresh-session proxy, atau route guard UI penuh; itu milik P2-204.
- Public signup, role Member, social login, MFA, WhatsApp notification, Storage, CMS content, dan Edge Function.
- Penghapusan permanen user Auth atau data profil.
- Penyimpanan email/password/token di `profiles` atau `audit_logs`.

## Keputusan desain

### 1. Database tetap menjadi enforcement utama

Role tetap dibaca dari `public.staff_roles` dan status dari `public.profiles.is_active`; tidak ada keputusan otorisasi dari `user_metadata`, `app_metadata`, atau klaim JWT buatan klien. Prosedur write dibuat sebagai RPC terkontrol pada schema `public` karena Supabase Data API tidak mengekspos schema `private`. Setiap RPC:

- memakai `SECURITY DEFINER`, `SET search_path = ''`, dan nama schema lengkap;
- mencocokkan `auth.uid()` dengan Admin aktif sebelum mutasi;
- mencatat `actor_id` dan delta ter-redaksi ke `public.audit_logs`;
- dicabut dari `PUBLIC` dan hanya diberi `EXECUTE` kepada `authenticated`;
- mengunci transaksi dengan advisory lock saat memeriksa kondisi one-time atau role target.

### 2. Bootstrap Admin pertama

Pemilik project membuat user Auth pertama melalui Dashboard atau Auth Admin API. Setelah user dapat sign-in, user memanggil `public.bootstrap_first_admin(display_name)` satu kali. Fungsi hanya berhasil jika belum ada baris pada `staff_roles` dan `auth.uid()` belum memiliki role. Fungsi membuat `profiles`, `staff_roles(role = 'admin')`, dan audit `staff.bootstrapped` dalam satu transaksi.

### 3. Invite dan provisioning Editor

Route server menerima email dan display name, memvalidasi input, lalu memastikan caller adalah Admin aktif memakai client SSR berbasis cookie. Route memakai client admin dengan `SUPABASE_SECRET_KEY` hanya untuk `auth.admin.inviteUserByEmail`. User ID hasil invite dipasangkan melalui `public.provision_invited_editor(target_user_id, display_name)`, yang memeriksa bahwa target Auth user ada, belum memiliki profile/role, dan caller adalah Admin aktif. Jika provisioning gagal setelah invite berhasil, route menghapus user Auth yang baru dibuat sebagai kompensasi dan mengembalikan error generik tanpa membocorkan secret atau payload internal.

### 4. Deactivation staf

`public.deactivate_staff(target_user_id, reason)` hanya dapat dipanggil Admin aktif dan hanya menonaktifkan target dengan role Editor. Fungsi mengubah `profiles.is_active = false` dan menulis audit `staff.deactivated`. Admin tidak dapat menonaktifkan Admin lain atau dirinya sendiri melalui fungsi ini, sehingga akun Admin terakhir tidak dapat terkunci karena operasi lifecycle biasa. Status aktif menjadi bagian dari setiap helper authorization sehingga sesi lama tidak lagi memiliki akses aplikasi setelah deactivation.

### 5. Secret boundary

`SUPABASE_SECRET_KEY` hanya boleh dibaca oleh module server/admin dan route handler. Nama variabel tidak memakai prefix `NEXT_PUBLIC_`, tidak pernah diimpor oleh browser module, dan tidak pernah ditulis ke response, audit, test fixture, atau dokumentasi dengan nilai terisi. `frontend/.env.example` hanya mencantumkan nama variabel kosong.

## Kontrak API server

### `POST /api/staff/invite-editor`

Request JSON:

```json
{
  "email": "editor@example.com",
  "displayName": "Nama Editor"
}
```

Success: HTTP `201` dengan `{ "userId": "<uuid>" }`.  
Unauthenticated/non-admin: HTTP `401` atau `403` tanpa membedakan apakah email target sudah ada.  
Validation: HTTP `400`.  
Conflict/error Auth: HTTP `409` atau `502` dengan pesan aman. Tidak ada email lengkap atau secret di audit response.

### `POST /api/staff/deactivate`

Request JSON:

```json
{
  "userId": "<uuid>",
  "reason": "Tidak lagi bertugas"
}
```

Success: HTTP `204`. Caller harus Admin aktif; target harus Editor aktif. Input reason dipangkas dan dibatasi panjangnya sebelum disimpan sebagai delta audit ter-redaksi.

## Error dan konsistensi

- Semua route memeriksa caller melalui `getUser()` dari client SSR; `getSession()` tidak dipakai sebagai bukti identitas.
- RPC mengembalikan exception terstruktur untuk `not_admin`, `already_bootstrapped`, `target_not_staff`, `target_not_editor`, `cannot_deactivate_self`, dan `validation_error`.
- Invite Auth dan provisioning database bukan transaksi lintas sistem. Route melakukan kompensasi `deleteUser` jika provisioning gagal dan mengembalikan hasil yang aman untuk retry.
- Deactivation database menjadi sumber kebenaran akses; kegagalan optional global sign-out tidak membatalkan deactivation.

## Testing dan verifikasi

### pgTAP lokal

Test harus membuktikan:

1. Auth user pertama dapat bootstrap tepat satu Admin.
2. Bootstrap kedua ditolak dan tidak membuat duplicate profile/role.
3. Admin aktif dapat provision Editor yang sudah diundang.
4. Editor, user tanpa role, staff nonaktif, dan anon ditolak untuk RPC lifecycle.
5. Admin tidak dapat provision role selain Editor melalui RPC.
6. Admin dapat menonaktifkan Editor; Editor/Admin target yang tidak valid ditolak.
7. Admin tidak dapat menonaktifkan dirinya sendiri atau Admin terakhir.
8. Mutasi membuat audit dengan `actor_id`, action terstruktur, dan delta tanpa secret/email/password/token.
9. `PUBLIC` tidak memiliki execute; hanya `authenticated` yang dapat memanggil RPC.

### TypeScript/route tests

- Secret module hanya berjalan di server dan tidak terimpor dari browser boundary.
- Request validation menolak email kosong, display name kosong, UUID tidak valid, reason terlalu panjang, dan JSON malformed.
- Route menghasilkan status code kontrak dan memanggil kompensasi Auth saat RPC gagal.

### Quality gates

`supabase db reset --local --no-seed`, pgTAP P2-203, Security/Performance Advisor lokal, route tests, lint, production build, dan populated-secret scan harus lulus sebelum PR.

## Operasional

- Pengaturan hosted Supabase Auth `enable_signup` dan `auth.email.enable_signup` harus dinonaktifkan melalui Dashboard/project configuration karena `config.toml` lokal tidak mengubah hosted Auth secara otomatis.
- Pemilik project mengisi secret hanya pada environment deployment/server lokal yang sesuai; nilai tidak dicommit.
- P2-203 tidak melakukan `db push` remote tanpa dry-run migration list, review SQL, dan persetujuan deploy.

## Acceptance criteria

- Bootstrap Admin pertama dapat dilakukan satu kali tanpa public signup.
- Admin dapat mengundang dan memasangkan Editor melalui server-only path.
- Admin dapat menonaktifkan Editor; akses database dan aplikasi staf nonaktif terblokir.
- Setiap lifecycle mutation memiliki audit log ter-redaksi.
- Tidak ada service/secret key pada bundle browser, response, fixture, atau repository.
- Seluruh migration/test/runbook dapat dijalankan ulang pada Supabase local workflow.
