# Arsitektur Target dan Strategi Refactor

## Keputusan arsitektur

Refactor langsung dari aplikasi React 19/CRACO ke Next.js App Router + TypeScript. Template FastAPI dan MongoDB tidak menjadi runtime produk. Strategi ini menjaga tampilan serta rute publik Phase 1, tetapi memindahkan data dari file JavaScript ke Supabase secara bertahap dan dapat diuji.

Stack:

| Lapisan | Pilihan |
| --- | --- |
| Web | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, komponen yang telah disederhanakan dari Phase 1 |
| Data/auth/storage | Supabase Postgres, Auth, Storage, RLS |
| Batas server | Next.js Server Components, Route Handlers, Server Actions bila cocok |
| Proses tepercaya | Supabase Edge Functions atau Route Handler server-only |
| Hosting pilot | Vercel Hobby hanya bila penggunaan tetap sesuai syarat; evaluasi ulang sebelum produksi |
| Zona waktu | Simpan timestamp sebagai UTC; presentasi dan aturan jadwal memakai Asia/Makassar |

Supabase menggunakan Postgres sebagai inti dan menggabungkan Auth, Storage, Functions, serta API di sekitar database. Referensi: [Supabase Architecture](https://supabase.com/docs/guides/getting-started/architecture).

## Batas kepercayaan

~~~text
Pengunjung browser
  │ publik read-only / form terbatas
  ▼
Next.js di Vercel
  ├─ Server Components: query publik dan rendering
  ├─ Route Handlers: validasi, rate limit, Turnstile, unduhan ZIP
  └─ Admin UI: sesi staf melalui Supabase Auth
       │
       ▼
Supabase
  ├─ Auth: Admin/Editor via undangan
  ├─ Postgres: konten, peran, audit, data privat
  ├─ Storage: derivative JPEG, dokumen, thumbnail
  └─ RLS/grants: penegak akses utama
       │
       └─ Integrasi masa depan: Adventech melalui server/cache
~~~

Browser hanya menerima publishable key. Service-role key hanya berada di secret environment server/Edge Function, tidak pernah di bundle klien. Semua aktivitas yang melibatkan data privat atau pekerjaan istimewa tetap melewati server.

## Struktur aplikasi target

~~~text
app/
  (public)/            rute publik dan metadata
  (staff)/admin/       UI Admin/Editor, diproteksi server
  auth/                callback, reset, sign-in
  api/                 route handler validasi/form/unduhan
components/
  identity/ layout/ sections/ ui/
features/
  content/ gallery/ schedules/ auth/
lib/
  supabase/ validation/ authz/ time/
supabase/
  migrations/ tests/ seed.sql
~~~

Tetapkan satu kontrak tipe untuk status konten, kategori, role, dan payload form. Server Component membaca konten publik yang sudah ditapis; Client Component hanya dipakai untuk filter, dialog, upload UI, atau perilaku interaktif.

## Strategi refactor

1. Inventaris seluruh rute, token, asset, dan data contoh Phase 1.
2. Buat aplikasi Next.js/TypeScript di branch kerja terpisah dan bawa desain token, simbol resmi, serta komponen layout yang masih relevan.
3. Pertahankan URL publik Phase 1. Tambah redirect hanya bila URL harus berubah dan uji canonical/metadata.
4. Konfigurasikan client Supabase browser/server secara terpisah, tanpa menyimpan rahasia.
5. Buat migration database, policy RLS, Storage policy, dan seed development sebelum UI CMS bergantung padanya.
6. Pindahkan jenis konten satu per satu: pengumuman dan acara, kemudian jadwal/departemen, lalu media/album.
7. Buat admin shell, invitation flow, audit log, dan validation boundary.
8. Jalankan uji visual, aksesibilitas, unit, integrasi, dan RLS sebelum mematikan sumber data lama.
9. Arsipkan FastAPI/MongoDB dari jalur runtime hanya setelah fitur setara telah diverifikasi; jangan hapus data tanpa backup dan persetujuan Admin.

## Cache dan konsistensi

- Konten Published dapat di-cache/revalidate setelah mutasi CMS.
- Draft dan admin page tidak di-cache sebagai konten publik.
- Semua mutasi mencatat actor, target, waktu, ringkasan sebelum/sesudah yang telah disanitasi.
- Cache Adventech kelak bersifat server-side dengan TTL, version/etag bila tersedia, dan fallback tampilan terakhir yang legal.

## Batas fase

Phase 2 tidak menjalankan form pastoral, pelajaran Sekolah Sabat dari API, PWA, push, maupun WhatsApp. Batas ini mencegah fondasi CMS menjadi terlalu lebar sebelum keamanan, migrasi, dan operasi konten stabil.
