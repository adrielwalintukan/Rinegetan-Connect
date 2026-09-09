# Struktur Repository Final

## Keputusan

Repository memakai struktur root-level yang sederhana:

~~~text
frontend/        Next.js App Router + TypeScript, aplikasi web produksi
supabase/        migration, RLS, seed, database test, Edge Functions bila diperlukan
docs/            produk, desain, sprint, issue, runbook
archive/
  phase-1-web/   React/CRACO Phase 1 yang dipertahankan sebagai referensi
  fastapi-mongo/ template backend lama yang tidak lagi menjadi runtime
~~~

Folder frontend-next adalah scaffold sementara, bukan struktur rilis. Setelah frontend Phase 1 dipindahkan aman ke archive/phase-1-web, aplikasi Next.js dipromosikan menjadi frontend/ di root.

## Batas runtime

Supabase adalah backend produk: Auth, Postgres, Storage, RLS, dan Edge Functions. Tidak ada API FastAPI yang aktif pada arsitektur target. Route Handler Next.js hanya menangani pekerjaan server-side yang dekat dengan web, misalnya validasi form, verifikasi Turnstile, dan unduhan koleksi media.

## Aturan migrasi

1. Jangan menghapus frontend atau backend lama; gunakan git history dan archive sebagai fallback.
2. Pindahkan frontend baru ke frontend hanya setelah aplikasi dapat build dan rute Phase 1 memiliki test kontrak.
3. Pindahkan FastAPI/MongoDB ke archive hanya setelah Supabase foundation tervalidasi.
4. Jangan commit node_modules, .next, build, .env, backup, atau data gereja.
5. CI root menyesuaikan working-directory dari frontend ke frontend baru setelah promosi selesai.

## Alasan

Struktur ini memenuhi kebutuhan pemisahan yang jelas tanpa menambah monorepo abstractions yang belum diperlukan. Developer membuka frontend dan supabase langsung dari root; deployment Vercel menunjuk frontend dan migrasi database tetap berdekatan dengan kode.
