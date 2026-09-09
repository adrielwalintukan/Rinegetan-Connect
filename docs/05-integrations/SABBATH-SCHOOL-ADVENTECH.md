# Integrasi Sekolah Sabat — Adventech

## Tujuan

Sekolah Sabat digital adalah produk Phase 4 yang terpisah dari Pelajari Alkitab. Ia menyediakan penjelajahan materi Sekolah Sabat berbahasa Indonesia, cache server, preview, dan kemudian paket lokal yang dipilih pengguna. Tidak ada akun Member dan tidak ada progres cloud.

Sumber teknis yang direncanakan adalah [Adventech Sabbath School Lessons](https://github.com/Adventech/sabbath-school-lessons). Integrasi harus dibangun sebagai adapter server-side agar perubahan format API tidak menyebar ke UI.

## Kontrak integrasi

~~~text
Adventech upstream
  → client adapter server-only
  → normalizer + validator
  → cache database/HTTP dengan source version dan fetched_at
  → endpoint/read model publik
  → UI Sekolah Sabat dan manifest offline
~~~

Adapter memvalidasi bahasa, class, quarter, lesson ID, judul, urutan, isi, URL asset, attribution, dan version. Bila sumber gagal, UI menunjukkan status terakhir yang di-cache beserta waktu pembaruan, bukan mengarang konten.

## Bahasa dan kelas

Target UI hanya Bahasa Indonesia. Urutan kelas yang diinginkan:

1. Kindergarten
2. Primary
3. PowerPoint
4. Cornerstone
5. Dewasa

Kelas tampil hanya bila sumber benar-benar menyediakan versi Bahasa Indonesia yang valid. Bila materi anak/remaja Indonesia tidak ada, antarmuka menampilkan Dewasa Indonesia saja tanpa tab kosong dan tanpa mengganti bahasa secara diam-diam.

## Cache dan update

- Fetch hanya dari server; browser tidak mengakses upstream langsung.
- Simpan source identifier/version, fetched_at, checksum/etag bila tersedia, dan status validasi.
- Tetapkan TTL dan refresh on-demand/terjadwal sesuai batas penyedia serta kapasitas pilot.
- Publik melihat pesan Update tersedia ketika manifest lokal lebih baru; pengguna memilih kapan mengunduh pembaruan.
- Progres lokal memakai source/lesson ID stabil. Pembaruan konten tidak boleh menghapus progres bila lesson ID tetap ada.

## Offline

Paket offline disimpan di IndexedDB/Cache Storage browser dan memuat manifest, teks yang diizinkan, serta asset yang diperlukan. Paket memiliki version, size estimate, created_at, dan tombol hapus lokal. Tidak ada sinkronisasi identitas atau server.

Fase 4 menyediakan mekanisme konten/paket. Fase 5 menambahkan shell PWA installable, strategi cache aplikasi, dan mekanisme update yang matang.

## Gate lisensi wajib

Repository upstream menyatakan lisensi kode, tetapi materi pelajaran dapat memiliki hak cipta/pembatasan distribusi yang berbeda. Karena fitur offline membuat salinan lokal, gereja wajib menyimpan izin tertulis dari pemegang hak materi sebelum fitur download/offline aktif untuk publik.

Sebelum gate lulus:

- UI dapat menampilkan preview/tautan sesuai izin dan atribusi sumber yang berlaku.
- Tombol offline/download harus nonaktif atau tidak dirilis.
- Jangan mengasumsikan lisensi repository untuk kode otomatis memberi hak menggandakan isi pelajaran.

Setelah gate lulus, catat pemegang izin, cakupan bahasa/kelas, tanggal berlaku, batas perubahan/distribusi, dan orang penanggung jawab dalam register operasional gereja.

## Kegagalan dan privasi

- Jangan menyimpan identitas atau progres pengguna di Supabase.
- Jangan mengirim isi paket ke analytics.
- Jika data upstream tidak lengkap atau gagal divalidasi, jangan terbitkan sebagai materi baru.
- Pisahkan attribution dari konten agar sumber jelas pada halaman dan paket.
