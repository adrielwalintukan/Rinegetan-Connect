# Spesifikasi Desain — Struktur Repository dan Cutover Phase 2

**Status:** Menunggu peninjauan pemilik proyek
**Tanggal:** 9 September 2026
**Ruang lingkup:** Struktur kode dan langkah cutover awal Phase 2; bukan implementasi fitur CMS.

## Tujuan

Mengubah fondasi teknis dari React/CRACO dan template FastAPI/MongoDB menjadi aplikasi web Next.js + TypeScript dengan Supabase sebagai backend produk. Struktur harus mudah dibuka dari root repository, aman untuk refactor langsung, dan tetap menjaga seluruh hasil Phase 1 sebagai referensi yang dapat dipulihkan dari git maupun `archive/`.

## Keputusan yang disetujui

~~~text
frontend/        aplikasi produksi Next.js App Router + TypeScript
supabase/        database migrations, RLS policies, seed, tests, Edge Functions bila perlu
docs/            keputusan produk/desain, sprint, issue, runbook
archive/
  phase-1-web/   aplikasi React/CRACO Phase 1 sebagai referensi non-runtime
  fastapi-mongo/ template backend lama sebagai referensi non-runtime
~~~

`frontend/` dan `supabase/` berada langsung di root. Tidak ada folder bernama `frontend-next` pada struktur akhir. Tidak ada folder `backend/` yang berjalan di produksi: Supabase menyediakan Auth, Postgres, Storage, RLS, dan Edge Functions. Next.js Route Handlers hanya digunakan untuk kebutuhan server yang dekat dengan web, seperti verifikasi Turnstile atau unduhan media yang dibatasi.

## Kontrak yang tidak boleh rusak

- Tujuh halaman Phase 1 beserta alamatnya: `/`, `/tentang-kami`, `/kegiatan`, `/media`, `/pelayanan`, `/sekolah-sabat`, `/kontak`.
- Bahasa visual yang telah disetujui: token warna/typografi/spasi, Creation Grid, Adventist Symbol/Entity Lockup, motion yang menghormati `prefers-reduced-motion`, dan mobile-first layout.
- Tidak ada kredensial, data jemaat, file asli ber-EXIF, `node_modules`, build output, atau `.env` yang dipindahkan atau dicommit.
- Cabang `main` tetap release-only. PR dokumentasi ini dibuka sekarang ke `development`. Setelah dokumentasi disetujui dan digabung, refactor dibuat pada branch implementasi baru dari `development`; PR kode Phase 2 dibuat setelah scope Phase 2 selesai, sesuai arahan pemilik proyek saat ini.

## Urutan cutover yang aman

1. Selesaikan scaffold Next.js yang dapat di-install dan build secara reproducible, lalu buat baseline test kontrak URL/desain Phase 1.
2. Pindahkan React/CRACO lama dari `frontend/` ke `archive/phase-1-web/` dengan `git mv`; tidak ada penghapusan.
3. Promosikan aplikasi Next.js yang tervalidasi menjadi `frontend/` menggunakan `git mv`.
4. Tambahkan `supabase/` dengan Supabase CLI config, migration bernomor, seed yang non-rahasia, database tests, dan policy RLS. Jangan mengubah project Supabase Tokyo lama.
5. Setelah Supabase Auth/RLS foundation lolos verifikasi, pindahkan template FastAPI/MongoDB dari `backend/` ke `archive/fastapi-mongo/` dengan `git mv`.
6. Ubah CI agar build/test Node dijalankan dari `frontend/`, tambahkan pemeriksaan migration Supabase, dan pastikan CI tetap hijau sebelum CMS dibangun.

## Rollback dan perlindungan data

- Setiap langkah adalah perpindahan yang dicatat Git; rollback berarti revert commit cutover, bukan menghapus folder dengan paksa.
- Deploy Vercel baru hanya menerima output `frontend/` setelah build, test kontrak, dan environment check lulus.
- Migration database hanya bersifat append-only. Migration yang sudah diterapkan di lingkungan bersama tidak diedit; koreksi dilakukan dengan migration baru.
- Sebelum migration yang memengaruhi data, jalankan backup/restore drill sesuai runbook dan ambil keputusan rollback eksplisit.

## Kriteria selesai desain ini

- Dokumen struktur repository, roadmap sprint Phase 1–5, dan backlog issue Phase 1–5 tersedia di `docs/`.
- Pemilik proyek menyetujui struktur dan urutan cutover ini secara tertulis.
- Setelah persetujuan, dibuat rencana implementasi Phase 2 yang dapat dieksekusi sebelum perubahan struktur atau kode dimulai.

## Di luar scope dokumen ini

- Migrasi konten/foto produksi dan perubahan domain.
- Implementasi CMS, Supabase migration, Auth, RLS, atau galeri.
- Aktivasi PWA, Web Push, WhatsApp, atau unduhan offline Sekolah Sabat.
