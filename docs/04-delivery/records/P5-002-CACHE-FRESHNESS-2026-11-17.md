# P5-002 (issue #56) — Penanda cache usang dan pemulihan (2026-11-17)

**Status:** Selesai dan terverifikasi pada situs production. Penanda salinan tersimpan, tombol **Perbarui** dan **Pulihkan**, serta halaman offline yang tidak lagi berubah menjadi halaman error semuanya terbukti bekerja pada `https://www.gmahkrinegetan.web.id`.

Issue: [#56](https://github.com/adrielwalintukan/Rinegetan-Connect/issues/56). Branch `feature/p5-002-cache-freshness`.

Rilis: PR #132 masuk `development` (`6760a62`), lalu PR #133 masuk `main` (`cd2dfe6`).

## Keputusan yang harus diambil sebelum kode

Issue #56 memerintahkan TTL umum, cakupan data cache, dan algoritma recovery **tidak dikarang**, melainkan ditetapkan sesuai hak dan privasi. Ketiganya ditanyakan ke pemilik:

| Pertanyaan | Keputusan pemilik |
| --- | --- |
| Apakah jemaat perlu membaca pengumuman dan agenda saat offline? | **Perlu**, sehingga cache data menjadi bagian pekerjaan |
| Ambang "usang" | **24 jam** ("24 jam pas") |

## Temuan yang mengubah lingkup: data sudah terbaca offline

Sebelum menulis kode, halaman publik diperiksa. Halaman publik sudah *network-first* dan dirender server dengan `revalidate = 60`, sehingga HTML yang tersimpan sudah berisi pengumuman dan agenda. Artinya jemaat **sudah** dapat membaca keduanya saat offline sebelum P5-002.

Yang benar-benar hilang bukan datanya, melainkan **kejujuran**: tidak ada yang memberi tahu bahwa yang sedang dibaca adalah salinan lama. Karena itu P5-002 tidak menambah tabel, API, atau cache data baru. Ia menambahkan penanda dan tindakan.

Menambah lapisan cache data baru justru akan memperbesar risiko privasi tanpa menambah kemampuan yang belum ada.

## Yang dibangun

### Cap waktu pada salinan yang disimpan

`src/lib/pwa/cache-status.mjs` menetapkan `CACHED_AT_HEADER` dan `CACHE_STATUS_MESSAGE`. `scripts/generate-sw.mjs` menstempel setiap halaman yang disimpan dengan waktu pengambilannya.

Cap itu **hanya** menempel pada salinan yang disimpan. Respons yang diterima halaman adalah respons asli yang tidak diubah, sehingga tidak ada perilaku halaman yang bergeser.

### Umur salinan dijawab oleh worker

Halaman bertanya lewat `postMessage` bertipe `CACHE_STATUS` dan worker menjawab `{ path, cachedAt }`.

Umur **tidak** ditebak dari `navigator.onLine`. Status online tidak memberi tahu apakah halaman ini baru datang dari jaringan atau keluar dari cache — justru itu pertanyaan yang ingin dijawab.

### Empat keadaan, dua kalimat

`cacheAgeState` dan `storedCopyNotice` adalah fungsi murni:

| Keadaan | Umur | Yang ditampilkan |
| --- | --- | --- |
| `unknown` | tidak ada cap | tidak ada |
| `recent` | < 5 menit | tidak ada |
| `saved` | 5 menit – 24 jam | "Salinan tersimpan · diperbarui 3 jam lalu." + **Perbarui** |
| `stale` | ≥ 24 jam | "Salinan lama — isinya mungkin sudah berubah..." + **Perbarui** dan **Pulihkan** |

Penanda **tidak muncul** saat halaman segar. Penanda yang muncul di setiap kunjungan akan dilatih untuk diabaikan.

**Pulihkan** memanggil `RESET_CACHE` yang sudah ada di worker sejak P5-001, tetapi sebelumnya hanya bisa dijangkau lewat devtools.

### Batas yang tidak berubah

`SHELL_ROUTES`, daftar tolak (`/staff`, `/api`, `/auth`, `/sekolah-sabat`, `/pelajari-alkitab`), dan `OFFLINE_ENABLED = false` tidak disentuh. Materi Sekolah Sabat tetap tertutup oleh gate P4-005.

Handler `CACHE_STATUS` hanya mengembalikan stempel waktu, tidak pernah isi respons. Ada test yang menjaganya, karena "berapa umur salinan ini" tidak boleh menjadi celah membaca salinan terlarang.

## Cacat nyata yang ditemukan, bukan diasumsikan

### Cacat 1: halaman offline berubah menjadi halaman error

Test P5-001 `a shell page with no cached copy falls back to the offline page` sesekali gagal. Pengukuran pada `development` — **sebelum** perubahan P5-002 — menunjukkan 4 kegagalan dari 8 percobaan. Jadi cacat ini sudah ada sejak P5-001.

Probe mengungkap sebabnya: worker menyimpan `/offline`, tetapi **tidak** menyimpan chunk JS yang dirujuk halaman itu (2 chunk hilang). Saat offline, HTML offline tersaji lalu hidrasi gagal dengan `ChunkLoadError`, dan error boundary aplikasi menimpanya dengan "Halaman belum dapat ditampilkan".

Akibatnya jemaat tanpa koneksi melihat pesan error, bukan halaman yang justru ditulis untuk menenangkan mereka.

Perbaikan: langkah install membaca markup halaman offline dan menyimpan aset `_next/static` yang dirujuknya. Sesudah perbaikan: 2 chunk hilang → 0, error boundary tidak muncul lagi setelah hidrasi, dan test yang sama lulus 10 dari 10 percobaan.

### Cacat 2: perbaikan pertama gagal secara diam-diam

Upaya pertama membaca markup **setelah** `cache.put`. Menyimpan respons mengonsumsi body-nya, sehingga `clone()` setelahnya melempar error yang tertelan `catch`. Probe yang menemukannya, bukan test — karena test masih gagal.

Urutan dibalik: baca markup dulu, baru simpan. Test penjaga sekarang memeriksa urutan itu, dan mutasi yang membalikkannya tertangkap.

### Cacat 3: stamping memperlambat penyimpanan

Stempel awalnya menyalin respons lewat `blob()`, sehingga menyimpan halaman selesai lebih lambat daripada respons yang ditunggu halaman. Body kini diteruskan sebagai stream.

## Verifikasi

### Verifikasi pada situs production

Dijalankan pada `https://www.gmahkrinegetan.web.id` setelah PR #133 masuk `main` (`cd2dfe6`).

`node tests/helpers/check-stored-copy-notice.mjs https://www.gmahkrinegetan.web.id`:

| Pemeriksaan | Hasil |
| --- | --- |
| Kunjungan segar | penanda **tidak** muncul (0) |
| Salinan 3 jam, offline | "Salinan tersimpan · diperbarui 3 jam lalu. Perbarui" — hanya Perbarui, tanpa Pulihkan |
| Salinan 30 jam, offline | "Salinan lama — isinya mungkin sudah berubah..." — Perbarui dan Pulihkan keduanya ada |
| Klik **Pulihkan** | penanda hilang, `main` tetap tampil |
| Klik **Perbarui** | penanda hilang |

`node tests/helpers/check-offline-fallback-stable.mjs https://www.gmahkrinegetan.web.id`:

| Pemeriksaan | Hasil |
| --- | --- |
| Halaman offline langsung tampil | ya |
| Tetap tampil setelah 6 detik (lewat hidrasi) | ya |
| "Halaman belum dapat ditampilkan" muncul | **tidak** (0) |

Tiga helper P5-001 juga dijalankan ulang pada build ini:

| Helper | Hasil |
| --- | --- |
| `check-offline-shell.mjs` | `OFFLINE SHELL: pass` — cache `rinegetan-shell-cd2dfe60288f`, 0 entri terlarang, `/staff` tidak pernah dilayani dari cache |
| `check-update-banner.mjs` | `UPDATE BANNER: pass` — tepat 1 muat dokumen setelah klik |
| `check-installability.mjs` | `INSTALLABLE: yes`, tanpa parse error |

### Verifikasi lokal

| Pemeriksaan | Hasil |
| --- | --- |
| `node --test tests/p5-002-cache-status.test.mjs` | 10/10 |
| `npm run test:routes` (seluruh suite node) | 513/513 |
| `npx playwright test pwa.spec.ts pwa-stored-copy.spec.ts` | 17/17 |
| `npm run typecheck` | bersih |
| `npm run lint` | bersih |
| `npm run build` | berhasil |

### Bukti test punya gigi (mutasi)

| Mutasi | Tertangkap oleh |
| --- | --- |
| Worker berhenti menstempel salinan | test node (sempat lolos, lalu test diperbaiki) |
| Ambang 24 jam dihapus | test node |
| Penanda muncul di halaman segar | test node |
| Komponen mengabaikan umur salinan | 3 dari 4 test browser |
| Precache chunk halaman offline dihapus | test node |
| Markup dibaca setelah halaman disimpan | test node |

Mutasi pertama awalnya **lolos**. Assertion lama hanya mencocokkan keberadaan header, sehingga worker yang mendefinisikan fungsi stempel lalu tidak pernah memanggilnya tetap lulus. Assertion diperbaiki agar memeriksa pemanggilannya. Mutasi yang tidak menggigit dicatat sebagai temuan, bukan diabaikan.

## Batas verifikasi

- **Sudah diverifikasi di production**, termasuk halaman offline yang tidak lagi berubah menjadi halaman error.
- Salinan yang tersimpan **sebelum** rilis ini tidak punya cap, sehingga tidak menampilkan penanda sampai kunjungan online berikutnya. Ini disengaja: mengarang umur lebih buruk daripada diam.
- Jam perangkat yang salah membuat umur salah, dan tidak ada cara memperbaikinya tanpa waktu server. Cap yang berada di masa depan diperlakukan sebagai **usang**, bukan segar, karena meremehkan keusangan adalah kesalahan yang lebih buruk.
- `MediaPage.tsx` memanggil `/api/media/download/album/{id}` lewat client fetch. `/api` ada di daftar tolak, jadi unduhan album tetap gagal saat offline. Penanda P5-002 menyatakan halaman itu salinan lama, tetapi tidak menjadikan unduhan bekerja offline.
- Suite browser berjalan sangat lambat di lokal karena Supabase tidak tersedia (muat halaman ≈ 4,4 detik). Dengan paralelisme penuh, test yang tidak diubah pun (P5-001) gagal karena `page.goto` melewati batas 30 detik. Dengan `--workers=1` seluruh 17 test lulus. Kegagalan itu lingkungan, bukan kode; CI yang menutupnya, dan job "Browser regression (Playwright)" lulus pada kedua PR.
- `test:a11y`, `bible-reader`, dan `staff-courses` tidak dapat dijalankan lokal tanpa Supabase; CI yang menjalankannya dan lulus.

## Berkas

- `frontend/src/lib/pwa/cache-status.mjs` — ambang, keadaan, dan kalimat penanda
- `frontend/src/components/runtime/StoredCopyNotice.tsx` — penanda dan tombol
- `frontend/src/app/(public)/layout.tsx` — satu-satunya tempat penanda dipasang
- `frontend/scripts/generate-sw.mjs` — stempel, jawaban `CACHE_STATUS`, precache aset halaman offline
- `frontend/public/sw.js` — worker ter-generate
- `frontend/tests/p5-002-cache-status.test.mjs` — 10 test penjaga
- `frontend/tests/visual/pwa-stored-copy.spec.ts` — 5 test browser
- `frontend/tests/helpers/check-stored-copy-notice.mjs` — verifikasi live penanda dan tombolnya
- `frontend/tests/helpers/check-offline-fallback-stable.mjs` — verifikasi live halaman offline bertahan setelah hidrasi
