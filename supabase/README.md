# Batas source control Supabase

Direktori ini adalah satu-satunya tempat source code infrastruktur Supabase untuk Rinegetan Connect. Konfigurasi CLI lokal berada di `config.toml`; metadata link dan cache CLI berada di `supabase/.temp/` dan tidak di-commit.

## Memulai workflow lokal

Gunakan Node.js 22 dan install dependency frontend melalui registry resmi:

```powershell
Set-Location frontend
npm ci --registry=https://registry.npmjs.org
Copy-Item .env.example .env.local
npm run supabase -- --help
```

Isi dua nilai publik di `.env.local` dari Connect/API settings project Supabase. `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` hanya diisi pada environment server lokal/deployment, tidak pada browser. Jangan memasukkan nilai, project ref, token, password, service-role key, atau secret key ke `.env.example` maupun dokumentasi.

CLI adalah dependency project dan selalu dijalankan dari root repository melalui script frontend. Untuk menggunakan stack lokal, nyalakan Docker-compatible container runtime lalu jalankan:

```powershell
npm run supabase --prefix frontend -- start
```

Setelah pemilik project menyelesaikan autentikasi dan link CLI secara lokal, command berikut hanya membaca status migrasi remote:

```powershell
npm run supabase --prefix frontend -- migration list --linked
```

P2-201 tidak menerapkan migrasi remote dan tidak menjalankan `db push`, `migration up`, seed, perubahan Auth, Storage, RLS, atau Data API. P2-202 menambahkan migration staff-access pertama melalui pull request yang ditinjau.

## Isi direktori

- `migrations/` berisi migrasi SQL yang append-only. Buat file baru melalui `supabase migration new <nama>` setelah CLI dikonfigurasi dan sebelum menulis SQL; jangan mengubah migrasi yang sudah diterapkan.
- `tests/` menyimpan pengujian database yang menyertai kebijakan RLS, fungsi, trigger, dan Storage policy.
- `functions/` adalah rumah untuk Supabase Edge Functions ketika sebuah kebutuhan server-side telah disetujui.

## Aturan keamanan

- Penghubungan CLI lokal memerlukan sesi developer yang telah terautentikasi; jangan menyimpan project ref atau kredensial koneksi di repository ini.
- Jangan commit service-role key, secret key, password database, token pribadi, `.env.local`, atau data jemaat. Hanya `.env.example` kosong yang ditrack sebagai kontrak.
- Publishable key digunakan hanya melalui environment development/deployment ketika factory klien Supabase dipanggil; ia tidak dimasukkan ke source code atau screenshot.
- Setiap tabel pada schema yang diekspos nantinya harus mengaktifkan RLS dan kebijakan yang diuji. Akses Data API serta `GRANT` juga harus ditinjau secara eksplisit—RLS saja bukan pengganti konfigurasi exposure API.

## P2-202 — staff access foundation

Migration `20260910151013_p2_202_access_control.sql` menyediakan enum `admin`/`editor`, `profiles`, `staff_roles`, `audit_logs`, helper authorization di schema `private`, trigger timestamp, explicit grants, dan RLS read-only. Tidak ada signup publik, user nyata, seed staf, client write, Storage, atau service-role key.

Jalankan dari root repository setelah container runtime lokal aktif. Karena proses `npm --prefix frontend` berjalan dari direktori `frontend`, path test memakai `../supabase/tests`:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_202_access_control.test.sql
npm run supabase --prefix frontend -- db advisors --local --type security --level warn
npm run supabase --prefix frontend -- db advisors --local --type performance --level warn
```

Sebelum perubahan remote, pemilik project harus memeriksa migration set dan dry-run:

```powershell
npm run supabase --prefix frontend -- migration list --linked
npm run supabase --prefix frontend -- db push --linked --dry-run --skip-vault
```

Hanya setelah dry-run menampilkan satu migration P2-202 yang diharapkan, pemilik project boleh menerapkannya:

```powershell
npm run supabase --prefix frontend -- db push --linked --skip-vault
```

Setelah push, verifikasi migration list dan Advisors remote secara read-only. Jangan menjalankan pgTAP fixture terhadap `--linked`; seluruh fixture test P2-202 hanya untuk database lokal dan selalu di-rollback.

## P2-203 — bootstrap dan lifecycle staf

Migration `20260916135514_p2_203_staff_bootstrap.sql` menambahkan tiga RPC terkontrol: `bootstrap_first_admin(text)`, `provision_invited_editor(uuid, text)`, dan `deactivate_staff(uuid, text)`. Ketiganya memakai `SECURITY DEFINER`, validasi Admin aktif, advisory lock yang relevan, audit log ter-redaksi, dan `EXECUTE` hanya untuk `authenticated`; tidak ada grant DML tabel kepada client.

`SUPABASE_SECRET_KEY` hanya digunakan oleh `frontend/src/lib/supabase/admin.ts` dan Route Handler server. Ia diperlukan untuk Auth Admin API saat `POST /api/staff/invite-editor`; jika provisioning RPC gagal, route memanggil `auth.admin.deleteUser` sebagai kompensasi sebelum mengembalikan error aman. `POST /api/staff/deactivate` tidak pernah memakai secret client dan hanya memanggil RPC melalui session caller-scoped.

Jalankan migration dan test lokal setelah stack Supabase hidup:

```powershell
npm run supabase --prefix frontend -- db push --local --skip-vault --yes
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_202_access_control.test.sql
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_203_staff_bootstrap.test.sql
npm run supabase --prefix frontend -- db advisors --local --type security --level warn
npm run supabase --prefix frontend -- db advisors --local --type performance --level warn
```

Bootstrap order:

1. Pemilik membuat Auth user pertama melalui Dashboard Supabase atau Auth Admin API.
2. User tersebut sign-in setelah P2-204 menyediakan UI/session flow, lalu server memanggil `bootstrap_first_admin` satu kali.
3. Admin memakai `POST /api/staff/invite-editor` untuk mengundang dan memasangkan Editor.
4. Admin memakai `POST /api/staff/deactivate` untuk menonaktifkan Editor; `profiles.is_active = false` langsung menghilangkan akses policy.

Pada project Supabase hosted, matikan `enable_signup` dan `auth.email.enable_signup` melalui Dashboard/Auth configuration secara manual. `supabase/config.toml` hanya mengatur local workflow dan tidak mengubah hosted Auth otomatis. P2-204 memiliki halaman sign-in, reset password, refresh-session proxy, dan route guard UI; P2-203 tidak menyediakan public signup.

Sebelum perubahan remote, pemilik project harus memeriksa migration set dan dry-run:

```powershell
npm run supabase --prefix frontend -- migration list --linked
npm run supabase --prefix frontend -- db push --linked --dry-run --skip-vault
```

Jangan menjalankan pgTAP fixture terhadap `--linked`; semua fixture P2-203 hanya untuk database lokal dan di-rollback pada akhir test.

## Tahap berikutnya

P2-204 melanjutkan sign-in, invitation acceptance, reset password, session refresh, dan route guard UI. Content tables, audit-producing CMS writes, Storage, dan Edge Functions tetap berada di issue berikutnya dan harus melalui migration serta policy terpisah.
