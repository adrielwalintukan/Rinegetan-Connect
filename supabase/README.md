# Batas source control Supabase

Direktori ini adalah satu-satunya tempat source code infrastruktur Supabase untuk Rinegetan Connect. Refactor struktur ini **tidak menerapkan migrasi remote**, tidak membuat resource cloud, dan tidak menghubungkan CLI ke proyek Supabase mana pun.

## Isi direktori

- `migrations/` berisi migrasi SQL yang append-only. Buat file baru melalui `supabase migration new <nama>` setelah CLI dikonfigurasi dan sebelum menulis SQL; jangan mengubah migrasi yang sudah diterapkan.
- `tests/` menyimpan pengujian database yang menyertai kebijakan RLS, fungsi, trigger, dan Storage policy.
- `functions/` adalah rumah untuk Supabase Edge Functions ketika sebuah kebutuhan server-side telah disetujui.

## Aturan keamanan

- Penghubungan CLI lokal memerlukan sesi developer yang telah terautentikasi; jangan menyimpan project ref atau kredensial koneksi di repository ini.
- Jangan commit service-role key, secret key, password database, token pribadi, file `.env*`, atau data jemaat.
- Publishable key hanya digunakan melalui environment deployment saat klien Supabase benar-benar diperkenalkan; ia tidak diperlukan pada refactor ini.
- Setiap tabel pada schema yang diekspos nantinya harus mengaktifkan RLS dan kebijakan yang diuji. Akses Data API serta `GRANT` juga harus ditinjau secara eksplisit—RLS saja bukan pengganti konfigurasi exposure API.

## Tahap berikutnya

Migrasi, RLS, Auth, Storage, dan Edge Functions akan dibuat dalam pull request fondasi Supabase tersendiri. PR tersebut harus memverifikasi migrasi dan policy terhadap lingkungan yang aman sebelum perubahan dapat diterapkan ke proyek Singapore.
