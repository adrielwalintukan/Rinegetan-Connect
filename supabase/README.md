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

Isi dua nilai publik di `.env.local` dari Connect/API settings project Supabase. Jangan memasukkan nilai, project ref, token, password, service-role key, atau secret key ke `.env.example` maupun dokumentasi.

CLI adalah dependency project dan selalu dijalankan dari root repository melalui script frontend. Untuk menggunakan stack lokal, nyalakan Docker-compatible container runtime lalu jalankan:

```powershell
npm run supabase --prefix frontend -- start
```

Setelah pemilik project menyelesaikan autentikasi dan link CLI secara lokal, command berikut hanya membaca status migrasi remote:

```powershell
npm run supabase --prefix frontend -- migration list --linked
```

P2-201 tidak menerapkan migrasi remote dan tidak menjalankan `db push`, `migration up`, seed, perubahan Auth, Storage, RLS, atau Data API. P2-202 akan membuat migrasi schema pertama melalui pull request yang ditinjau.

## Isi direktori

- `migrations/` berisi migrasi SQL yang append-only. Buat file baru melalui `supabase migration new <nama>` setelah CLI dikonfigurasi dan sebelum menulis SQL; jangan mengubah migrasi yang sudah diterapkan.
- `tests/` menyimpan pengujian database yang menyertai kebijakan RLS, fungsi, trigger, dan Storage policy.
- `functions/` adalah rumah untuk Supabase Edge Functions ketika sebuah kebutuhan server-side telah disetujui.

## Aturan keamanan

- Penghubungan CLI lokal memerlukan sesi developer yang telah terautentikasi; jangan menyimpan project ref atau kredensial koneksi di repository ini.
- Jangan commit service-role key, secret key, password database, token pribadi, `.env.local`, atau data jemaat. Hanya `.env.example` kosong yang ditrack sebagai kontrak.
- Publishable key digunakan hanya melalui environment development/deployment ketika factory klien Supabase dipanggil; ia tidak dimasukkan ke source code atau screenshot.
- Setiap tabel pada schema yang diekspos nantinya harus mengaktifkan RLS dan kebijakan yang diuji. Akses Data API serta `GRANT` juga harus ditinjau secara eksplisit—RLS saja bukan pengganti konfigurasi exposure API.

## Tahap berikutnya

Migrasi, RLS, Auth, Storage, dan Edge Functions akan dibuat pada pekerjaan setelah P2-201. PR tersebut harus memverifikasi migrasi dan policy terhadap lingkungan yang aman sebelum perubahan dapat diterapkan ke proyek Singapore.
