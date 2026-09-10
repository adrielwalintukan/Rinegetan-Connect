# Rinegetan Connect

Platform digital GMAHK Rinegetan. Pengembangan mengikuti roadmap dan keputusan produk di [docs/README.md](docs/README.md).

## Struktur saat ini

- `frontend/` — aplikasi publik Next.js yang menjadi target build dan deployment setelah promosi struktur selesai.
- `supabase/` — source control untuk konfigurasi CLI, migrasi, database test, dan Edge Functions. Konfigurasi cloud tetap tidak diubah tanpa migrasi yang ditinjau.
- `archive/phase-1-web/` — referensi rollback aplikasi React/CRACO Phase 1 setelah promosi struktur selesai.
- `backend/` — template FastAPI/MongoDB lama yang tetap tersedia sementara, tetapi bukan runtime produk target.

## Menjalankan frontend

```powershell
Set-Location frontend
npm ci --registry=https://registry.npmjs.org
npm run dev
```

Untuk pemeriksaan produksi jalankan `npm run lint`, `npm run build`, dan `npm run test:routes` dari direktori `frontend/`.

## Workflow Supabase lokal

Instalasi dan command Supabase disimpan sebagai dependency frontend yang dipin agar semua developer memakai versi CLI yang sama. Salin kontrak environment tanpa memasukkan nilainya ke Git:

```powershell
Set-Location frontend
Copy-Item .env.example .env.local
npm run supabase -- --help
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` di `.env.local` dari Connect/API settings pada project Supabase. Kedua nilai publik tersebut tidak boleh diisi di `.env.example`.

Menjalankan stack Supabase lokal memerlukan Docker-compatible container runtime:

```powershell
npm run supabase -- start
```

Setelah CLI ditautkan secara lokal oleh pemilik project, gunakan `npm run supabase -- migration list --linked` hanya untuk memeriksa status migrasi remote. P2-201 tidak menjalankan `db push`, `migration up`, seed, perubahan Auth, Storage, atau RLS. P2-202 adalah fase pertama untuk schema dan policy.

## Keamanan

Jangan commit `.env.local`, service-role/secret key Supabase, password database, token pribadi, maupun data jemaat. `.env.example` yang nilainya kosong adalah satu-satunya exception environment file yang versioned. Pengubahan schema dan RLS harus dilakukan melalui migrasi yang ditinjau, diuji, dan diajukan melalui pull request.
