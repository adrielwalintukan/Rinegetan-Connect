# P2-104 Visual Baseline dan P2-201 Supabase Foundation Design

**Status:** disetujui untuk perencanaan dan implementasi oleh pemilik project pada 2026-09-10.

## Tujuan

Menutup Sprint 1 dengan baseline visual yang dapat ditinjau, lalu menyiapkan integrasi Supabase yang reproducible dan aman untuk Next.js tanpa membuat perubahan schema, Auth, Storage, RLS, atau data pada project Supabase remote.

## Ruang lingkup

1. P2-104 menambahkan pemeriksaan visual/responsif untuk tujuh URL publik Phase 1 pada viewport 320, 375, 390, 768, dan 1440 px. Satu screenshot desktop beranda disimpan untuk review visual; seluruh tujuh URL menjalani pemeriksaan tidak ada horizontal overflow. Uji juga memeriksa skip link, fokus keyboard, dan pembukaan/penutupan menu mobile.
2. P2-201 menambahkan Supabase CLI yang dipin, `supabase/config.toml`, kontrak environment, factory client browser/server yang terpisah, dan dokumentasi workflow developer.
3. CLI lokal ditautkan ke project Supabase Singapore milik gereja melalui sesi developer terautentikasi. State tautan lokal, token, password database, dan key tidak dicommit.

## Di luar ruang lingkup

- Tidak ada migration SQL atau tabel baru. P2-202 adalah satu-satunya tahap yang akan menambahkan profiles, roles, audit, grants, dan RLS.
- Tidak ada proxy Auth, UI sign-in, undangan Editor, reset password, route guard, service-role client, Edge Function, bucket Storage, atau perubahan Data API exposure.
- Tidak ada perubahan desain, copy, URL, atau perilaku produk publik Phase 1.
- Browser visual test tidak ditambahkan ke CI pada tahap ini; P2-502 menangani perluasan CI browser.

## Keputusan arsitektur

### Baseline visual

`@playwright/test` 1.63.0 dipasang sebagai dev dependency frontend. `playwright.config.ts` membangun lalu menjalankan Next production server pada port lokal khusus dan test di `tests/visual/public-routes.spec.ts`, sehingga HMR development tidak memengaruhi hasil interaksi. Setiap route menunggu `domcontentloaded`, konten utama, dan font; test tidak menunggu `networkidle` karena media pihak ketiga dapat tetap membuka koneksi tanpa memengaruhi layout.

- Snapshot beranda bersifat viewport-only, bukan full-page, agar artefak review tetap kecil dan fokus pada Creation Grid, identitas, navigasi, serta layout atas.
- Snapshot menggunakan animasi dinonaktifkan dan caret disembunyikan. Perubahan snapshot hanya diterima melalui command update eksplisit dan review Git.
- Matrix URL × viewport mengukur `document.documentElement.scrollWidth <= window.innerWidth`.
- Screenshot disimpan pada direktori snapshot standar Playwright di bawah `frontend/tests/visual/` dan hanya baseline yang disengaja yang dicommit.

### Tooling Supabase

Supabase CLI 2.117.0 dipasang sebagai dev dependency pada `frontend/package.json`, sehingga versi tooling tercatat oleh `frontend/package-lock.json`. Script `supabase` menjalankan CLI dengan `--workdir ..`; folder `supabase/` di root tetap menjadi satu-satunya boundary infrastruktur project.

`npm run supabase --prefix frontend -- --help` adalah command discovery awal. `npm run supabase --prefix frontend -- init` menghasilkan `supabase/config.toml` di root repository. Perintah link menggunakan project ref melalui sesi CLI lokal dan tidak menulis credential ke repository.

### Environment dan client

`frontend/.env.example` hanya mendokumentasikan:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` tetap di-ignore. Tidak ada `SUPABASE_SERVICE_ROLE_KEY` pada tahap ini karena tidak ada proses privileged yang membutuhkannya.

`@supabase/supabase-js` 2.116.0 dan `@supabase/ssr` 0.12.7 dipasang sebagai dependency runtime. Modul `frontend/src/lib/supabase/environment.ts` membaca environment secara lazy dan menolak URL/key kosong hanya ketika client diminta. Artinya build rute publik tetap tidak membutuhkan credential lokal.

`frontend/src/lib/supabase/browser.ts` hanya memakai `createBrowserClient`. `frontend/src/lib/supabase/server.ts` hanya memakai `createServerClient` dengan cookie adapter dari Next.js. Kedua factory belum diimpor oleh rute publik pada P2-201. Proxy refresh sesi ditunda sampai P2-204; ketika diperlukan, server-side protection harus menggunakan `getClaims()` dan bukan mempercayai `getSession()`.

## Kontrak keamanan

- Publishable key boleh dipakai browser; ia bukan service-role atau secret key.
- Role tidak dibaca dari browser maupun user metadata. Otorisasi belum diaktifkan sampai P2-202 dan P2-203 menambahkan tabel role serta RLS test.
- `supabase/config.toml` boleh dicommit; `supabase/.temp/`, `.supabase/`, `.env.local`, credential, database password, dan CLI token tidak boleh dicommit.
- Tidak ada query, mutation, atau perubahan remote pada P2-201. `migration list --linked` adalah inspeksi read-only setelah tautan lokal tersedia.

## Peta file

| File | Tanggung jawab |
| --- | --- |
| `frontend/package.json` dan `frontend/package-lock.json` | Dependency dan script Playwright/Supabase versi dipin. |
| `frontend/playwright.config.ts` | Server test dan viewport baseline. |
| `frontend/tests/visual/public-routes.spec.ts` | Overflow, keyboard/menu, dan satu snapshot desktop beranda. |
| `frontend/tests/visual/public-routes.spec.ts-snapshots/` | Screenshot baseline yang ditinjau. |
| `frontend/.env.example` | Nama environment public tanpa nilai. |
| `frontend/src/lib/supabase/environment.ts` | Kontrak lazy environment untuk client Supabase. |
| `frontend/src/lib/supabase/browser.ts` | Factory client browser. |
| `frontend/src/lib/supabase/server.ts` | Factory client server dengan cookie adapter. |
| `frontend/tests/supabase-foundation.test.mjs` | Kontrak environment, dependency, pemisahan browser/server, dan tidak adanya secret client. |
| `supabase/config.toml` | Konfigurasi CLI yang version-controlled. |
| `supabase/README.md` | Command developer, aturan link, dan batas tahap ini. |
| `.gitignore` | Mengizinkan `.env.example`; menolak environment nyata dan state CLI lokal. |

## Urutan verifikasi

1. Test kontrak P2-104 dan P2-201 ditulis lebih dahulu dan dibuktikan gagal.
2. Implementasi minimum dilakukan sampai test hijau.
3. Jalankan browser Chromium Playwright secara lokal, lalu review screenshot baseline desktop beranda.
4. Jalankan `npm run lint`, `npm run build`, `npm run test:routes`, dan `npm run test:visual`.
5. Jalankan `npm run supabase --prefix frontend -- --help`; setelah CLI link, jalankan `npm run supabase --prefix frontend -- migration list --linked` tanpa menerapkan migration.
6. Periksa `git diff --check`, `git status --ignored`, dan pencarian pola key/secret sebelum commit.

## Kriteria penerimaan

P2-104 selesai bila baseline screenshot yang ditinjau tersedia dan tujuh rute publik lulus pemeriksaan viewport/keyboard. P2-201 selesai bila CLI, config, environment contract, client browser/server, dan link lokal telah diverifikasi tanpa secret atau perubahan database remote. P2-202 baru boleh dimulai pada branch berikutnya setelah PR ini ditinjau.
