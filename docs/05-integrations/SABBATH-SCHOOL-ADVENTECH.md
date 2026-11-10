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

Fondasi P4-001 menyediakan normalisasi metadata dan segmen sintetis, mekanisme refresh/fallback, serta tabel cache privat tanpa grant tabel bagi aplikasi. RPC baca/tulis tersambung melalui sesi Supabase server, dengan pemeriksaan Admin aktif dan gate hak di database; gate database dan entri server tetap tertutup. Kode RPC diuji dengan fixture sintetis dan gate sementara dalam transaksi rollback. Register hak, pemetaan seluruh kelas dan jenis blok, reader, serta aktivasi nyata belum tersedia. Tidak ada cache materi atau pengambilan upstream yang diaktifkan oleh fondasi ini; lihat [catatan analisis P4-001](../04-delivery/records/P4-001-ANALYSIS-2026-11-07.md).

## Bahasa dan kelas

Target UI hanya Bahasa Indonesia. Urutan kelas yang diinginkan:

1. Kindergarten
2. Primary
3. PowerPoint
4. Cornerstone
5. Dewasa

Kelas tampil hanya bila sumber benar-benar menyediakan versi Bahasa Indonesia yang valid. Bila materi anak/remaja Indonesia tidak ada, antarmuka menampilkan Dewasa Indonesia saja tanpa tab kosong dan tanpa mengganti bahasa secara diam-diam.

Mekanisme P4-002 memakai pemetaan kelas eksplisit dari lapisan tepercaya, bukan tebakan suffix ID sumber. Input invalid, kelas tak dikenal dan kelas duplikat/ambigu diabaikan; kegagalan satu kelas tidak menyembunyikan kelas lain yang valid. Bila Dewasa juga invalid, jangan mengarang fallback. Fixture seluruh kelas hanya menguji aturan seleksi, bukan membuktikan ketersediaan upstream. Loader katalog server tetap mengembalikan unavailable dengan daftar kosong sampai pemetaan dan cakupan izin disahkan; belum ada jalur aktivasi atau read model cache publik. Halaman mempertahankan informasi kelas jemaat lokal yang tidak bergantung ketersediaan materi, dan menampilkan bagian materi terpisah tanpa cover upstream atau tombol baca yang belum berfungsi. Lihat [bukti P4-002](../04-delivery/records/P4-002-2026-11-10.md).

## Cache dan update

### Aktivasi katalog online (konfirmasi 2026-11-10)

Pemilik mengonfirmasi izin pemegang hak untuk fetch, penayangan dan cache server materi Indonesia, lalu menyetujui [rencana integrasi nyata](../superpowers/plans/2026-11-10-p4-002-live-catalog.md). Keputusan ini menggantikan asumsi gate katalog sintetis tertutup di atas. Dokumen izin privat tidak disalin ke repository; rincian pemegang izin/cakupan/tanggal dan penanggung jawab tetap dicatat dalam register operasional gereja. Izin offline tidak disimpulkan dari konfirmasi ini.

API Indonesia yang diverifikasi adalah `https://sabbath-school.adventech.io/api/v2/in/quarterlies/index.json`, bukan `/id/` (yang mengembalikan HTML SPA dengan status 200). Source identity `in-…` dipertahankan; label bahasa aplikasi tetap Indonesia (`id`). Seri quarterly standar Indonesia terverifikasi sebagai Dewasa; tidak ada pemetaan anak/remaja yang ditebak dari suffix. Katalog memilih hanya satu periode aktif berdasarkan tanggal sumber dan zona Asia/Makassar, tanpa fallback triwulan lama/mendatang atau bahasa lain.

Loader online memakai cache hasil tervalidasi Next.js selama satu jam, dipisah menurut tanggal WITA agar pergantian periode tidak memakai entri hari sebelumnya. Fetch tidak memakai cache respons mentah. HTML, redirect, JSON rusak, payload melebihi 2 MiB, sumber tanpa version, identitas/tanggal silang dan metadata invalid ditolak sebelum hasil disimpan. Kegagalan dilempar dari fungsi cache, lalu diterjemahkan menjadi unavailable di luar cache. Revalidasi Next.js dapat menyajikan hasil terakhir yang valid selama penyegaran latar belakang; waktu fetch ditampilkan pada UI. Snapshot yang kedaluwarsa pada pergantian hari tidak dibaca sebagai fallback lintas hari.

Probe 2026-11-10 menghasilkan “Karunia Nubuat”, periode 26/09/2026–25/12/2026, 13 pelajaran, `in-2026-04`. Metadata triwulan ini tidak menyertakan credits dan berkas credits bahasa resmi memiliki nilai kosong; UI menyebut Adventech sebagai sumber teknis, bukan mengarang penulis/penerbit atau mengambil credits triwulan lain. Credits yang disediakan harus valid dan dirender sebagai teks. UI menampilkan tautan ke materi situs resmi, bukan reader internal palsu; browser tidak fetch API/cover Adventech. Empat kelas jemaat lokal tetap terpisah.

RPC PostgreSQL privat tetap khusus Admin dengan gate tertutup. Aktivasi online tidak mengubah grant/RLS, tidak menyimpan progres/identitas pengunjung, dan tidak mengaktifkan paket offline, reader internal atau download.

Route Sekolah Sabat melewati boundary `connection()` sebelum memuat katalog sehingga Full Route Cache ISR tidak membekukan tanggal WITA; cache data katalog eksplisit tetap berlaku.

- Fetch hanya dari server; browser tidak mengakses upstream langsung.
- Simpan source identifier/version, fetched_at, checksum/etag bila tersedia, dan status validasi.
- Tetapkan TTL dan refresh on-demand/terjadwal sesuai batas penyedia serta kapasitas pilot.
- Publik melihat pesan Update tersedia ketika manifest sumber di server lebih baru daripada versi paket lokal di browser; pengguna tetap memilih kapan mengunduh pembaruan secara manual.
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

Wording backlog P4-005 lebih ketat: tidak ada cache/offline materi sebelum izin tertulis. Pemilik mengonfirmasi izin fetch/display/cache server online pada 2026-11-10, sebagaimana bagian aktivasi di atas; offline tetap memerlukan pengesahan cakupan tersendiri. Urutan dependensi: adapter server → katalog/reader online → mekanisme paket lokal → gate izin.

Setelah gate lulus, catat pemegang izin, cakupan bahasa/kelas, tanggal berlaku, batas perubahan/distribusi, dan orang penanggung jawab dalam register operasional gereja.

## Kegagalan dan privasi

### Fondasi yang dapat direview sebelum aktivasi

PR fondasi P4-001 membatasi implementasi pada normalizer metadata quarterly/lesson dan blok paragraph/heading, fetch server, cache PostgreSQL privat, serta penolakan akses ketika gate hak tertutup. Pemeriksaan integrasi lokal memakai Supabase/PostgREST dan akun sintetis anon, Editor, serta Admin; tes SQL mencakup penulisan/pembacaan dengan gate dibuka hanya dalam transaksi yang di-rollback. Ini belum menyediakan katalog/read model publik, renderer materi lengkap atau refresh berbasis TTL. Penerimaan penuh P4-001 tetap menunggu pemetaan kelas, TTL, format materi serta pengesahan hak; kesiapan review fondasi tidak berarti izin aktivasi.


- Jangan menyimpan identitas atau progres pengguna di Supabase.
- Jangan mengirim isi paket ke analytics.
- Jika data upstream tidak lengkap atau gagal divalidasi, jangan terbitkan sebagai materi baru.
- Pisahkan attribution dari konten agar sumber jelas pada halaman dan paket.
