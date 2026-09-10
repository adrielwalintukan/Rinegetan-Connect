# Rinegetan Connect

Platform digital GMAHK Rinegetan. Pengembangan mengikuti roadmap dan keputusan produk di [docs/README.md](docs/README.md).

## Struktur saat ini

- `frontend/` — aplikasi publik Next.js yang menjadi target build dan deployment setelah promosi struktur selesai.
- `supabase/` — source control untuk migrasi, database test, dan Edge Functions di fase berikutnya; belum menghubungkan atau mengubah proyek cloud.
- `archive/phase-1-web/` — referensi rollback aplikasi React/CRACO Phase 1 setelah promosi struktur selesai.
- `backend/` — template FastAPI/MongoDB lama yang tetap tersedia sementara, tetapi bukan runtime produk target.

## Menjalankan frontend

```powershell
Set-Location frontend
npm ci --registry=https://registry.npmjs.org
npm run dev
```

Untuk pemeriksaan produksi jalankan `npm run lint`, `npm run build`, dan `npm run test:routes` dari direktori `frontend/`.

## Keamanan

Jangan commit file `.env*`, secret key Supabase, service-role key, password database, maupun data jemaat. Pengubahan schema dan RLS harus dilakukan melalui migrasi yang ditinjau, diuji, dan diajukan melalui pull request.
