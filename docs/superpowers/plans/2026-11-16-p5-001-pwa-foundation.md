# P5-001 PWA foundation

**Goal:** Menjadikan situs dapat diinstal dan punya application shell offline yang aman, dengan batas privasi ditegakkan oleh kode — bukan oleh ingatan.

Issue: [#55](https://github.com/adrielwalintukan/Rinegetan-Connect/issues/55).

## Keputusan yang diambil pemilik (2026-11-16)

Issue #55 menyebut tiga hal sebagai belum diputuskan dan memerintahkan "jangan mengarangnya". Ketiganya sudah diputuskan pemilik sebelum implementasi:

| Pertanyaan | Keputusan |
| --- | --- |
| Library / strategi service worker | **Service worker tulis tangan**, tanpa dependency baru |
| Cakupan cache offline | **Hanya shell publik**: aset statis + halaman publik statis. Reader Sekolah Sabat dan `/pelajari-alkitab` **tidak** di-cache |
| Indikator versi | **Banner saat versi berubah**, dengan tombol "Muat ulang" |

Keputusan ini mengikat. Kalau salah satu perlu diubah, itu keputusan pemilik baru, bukan penyesuaian implementer.

## Bentuk yang dipilih, dan alasannya

**Versioning memakai build id Next.js, bukan konstanta yang di-bump tangan.** Nama cache memuat build id yang dibaca service worker dari aset build. Konstanta yang di-bump manual akan lupa di-bump tepat pada rilis yang salah, dan kegagalannya tidak terlihat sampai pengunjung memegang shell basi.

**Navigasi memakai network-first, aset ber-hash memakai cache-first.** HTML publik berubah tanpa service worker ikut berubah; network-first membuat perubahan langsung terlihat, dan cache hanya menjadi jaring saat offline. `/_next/static/*` immutable per build, jadi cache-first tidak pernah menyajikan versi salah.

**Batas privasi ditegakkan sebagai daftar tolak yang eksplisit.** `/staff`, `/api`, `/auth` tidak pernah masuk cache, dan permintaan navigasi ke sana tidak pernah dilayani dari cache. Ini bukan pengecualian yang bergantung pada rute yang kebetulan tidak ada di precache.

## Task 1: Ikon dan manifest

**Files:** create `frontend/scripts/generate-pwa-icons.mjs`, `frontend/public/icon-512.png`, `frontend/public/icon-maskable-512.png`, `frontend/public/apple-icon-180.png`; create `frontend/src/app/manifest.ts`; modify `frontend/src/app/layout.tsx`.

- [ ] Ikon 512 dan maskable 512 dibuat dari `public/icon.svg` lewat `sharp`, sehingga sumber kebenarannya tetap satu.
- [ ] `manifest.ts` mendeklarasikan `name`, `short_name`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `theme_color` navy `#0A2540`, `background_color`, `lang: "id"`, dan ikon 192/512 `any` + 512 `maskable`.
- [ ] `layout.tsx` mendeklarasikan `apple` icon dan `viewport.themeColor`.

## Task 2: Application shell offline

**Files:** create `frontend/public/sw.js`; create `frontend/src/app/offline/page.tsx`.

- [ ] Precache hanya shell publik: `/offline`, ikon, dan enam halaman publik statis.
- [ ] Daftar tolak eksplisit untuk `/staff`, `/api/`, `/auth/`, dan rute materi dinamis.
- [ ] `activate` menghapus seluruh cache yang bukan versi berjalan.
- [ ] `SKIP_WAITING` dan `RESET_CACHE` ditangani sebagai jalur pemulihan.

## Task 3: Registrasi dan indikator versi

**Files:** create `frontend/src/components/runtime/ServiceWorkerUpdate.tsx`; modify `frontend/src/app/(public)/layout.tsx`.

- [ ] Registrasi `updateViaCache: "none"`.
- [ ] Banner `role="status"` muncul hanya saat service worker baru siap menggantikan yang aktif.
- [ ] Tombol "Muat ulang" mengirim `SKIP_WAITING` lalu memuat ulang sekali, bukan berulang.

## Task 4: Bukti

**Files:** create `frontend/tests/p5-001-pwa.test.mjs`, `frontend/tests/visual/pwa.spec.ts`.

- [ ] Test node memeriksa bentuk manifest, ukuran ikon sebenarnya dari header PNG, dan bahwa daftar precache tidak memuat rute terlarang.
- [ ] Test browser membuktikan service worker mengambil kendali, shell tersedia offline, dan `/staff` tidak pernah dilayani dari cache saat offline.

## Verifikasi

`npm run test:all`, `npx playwright test tests/visual/pwa.spec.ts`, dan pemeriksaan manual `chrome://` installability tidak tersedia headless sehingga installability dibuktikan lewat kelengkapan manifest + registrasi service worker + ikon 192/512, bukan diklaim dari tangkapan layar.
