# Issue Backlog — Rinegetan Connect Phase 1–5

Backlog ini adalah indeks issue tingkat produk. Issue Phase 2 yang aktif memiliki acceptance criteria terperinci di [Phase 2 Issue Backlog](PHASE-2-ISSUE-BACKLOG.md). Sebelum issue masuk sprint, pemiliknya melengkapi scope/non-scope, acceptance criteria, test plan, dependensi, dan checklist privasi/RLS bila relevan.

## Phase 1 — Website resmi

| ID | Issue | Acceptance ringkas | Status |
| --- | --- | --- | --- |
| P1-001 | Pertahankan kontrak desain dan URL Phase 1 saat refactor. | Token, Creation Grid, simbol resmi, tujuh URL, serta perilaku mobile memiliki test kontrak sebelum cutover. | Selesai (PR #4) |
| P1-002 | Validasi aksesibilitas dan performa website publik. | Keyboard, fokus, landmark, heading, alternatif gambar, dan performance budget diperiksa pada rute utama. | Selesai (PR #79, commit `186ea61`); budget performa menunggu keputusan pemilik ([record](records/P1-002-2026-10-23.md)) |
| P1-003 | Ganti placeholder operasional. | Alamat, nomor, sosial, jadwal, dan foto diganti hanya setelah pemilik konten mengesahkan data serta consent dicatat. | Backlog operasional; [inventaris awal](records/P1-003-2026-11-08.md), menunggu pengesahan dan consent |
| P1-004 | Buat baseline analitik privasi. | Tidak ada tracker non-esensial sebelum kebijakan cookie/consent disepakati. | Backlog; [inventaris awal](records/P1-004-2026-11-08.md), kebijakan dan verifikasi lanjutan belum selesai |

## Phase 2 — CMS dan fondasi platform

| Kelompok | Rentang issue | Ruang lingkup |
| --- | --- | --- |
| Foundation | P2-000–P2-103 | Struktur repo, Next.js, kontrak UI/rute Phase 1, lint/build/test, dan CI. |
| Supabase | P2-200–P2-299 | CLI/migration, Auth, staff roles, RLS, audit, environment, dan hardening. |
| CMS | P2-300–P2-399 | Pengumuman, acara, departemen, jadwal/exception, lifecycle konten, dan publikasi. |
| Media | P2-400–P2-499 | Storage, derivative, album, consent, visibility, download tunggal/album/kategori, dan batas ZIP. |
| Release | P2-500–P2-599 | Backup/restore drill, Vercel, observability, UAT, dan pilot tertutup. |

Lihat [Phase 2 Issue Backlog](PHASE-2-ISSUE-BACKLOG.md) untuk daftar issue yang menjadi sumber kebenaran eksekusi.

## Phase 3 — Pelayanan Digital

Status per 2026-10-23:

| ID | Integrasi `development` | Production | Bukti |
| --- | --- | --- | --- |
| P3-001 | [PR #41](https://github.com/adrielwalintukan/Rinegetan-Connect/pull/41) merge 2026-10-22, commit `42a3d01`; CI hasil merge lulus | Dirilis 2026-10-23 melalui PR #39 (`main` `5b88773`); tiga migration P3-001 diterapkan | [P3-001](records/P3-001-2026-10-19.md), [OPS-001](records/OPS-001-2026-10-23.md) |
| P3-002 | [PR #42](https://github.com/adrielwalintukan/Rinegetan-Connect/pull/42) merge 2026-10-23 WITA, commit `14bf46a`; CI hasil merge lulus | Dirilis 2026-10-23 melalui PR #39 (`main` `5b88773`) | [P3-002](records/P3-002-2026-10-22.md), [OPS-001](records/OPS-001-2026-10-23.md) |

P3-003 (#46): PR #86 merge ke `development` pada 2026-10-25 (`6dc89ed`), CI hasil merge lulus. Belum dirilis ke production dan migration belum diterapkan di sana. Bukti: [P3-003](records/P3-003-2026-10-25.md). P3-004 (#47): PR #87 merge ke `development` pada 2026-11-01 (`8f1e0c4`); belum production, menunggu gate rilis di record. Bukti: [P3-004](records/P3-004-2026-10-26.md). P3-005 (#48): PR #89 merge ke `development` pada 2026-11-03 (`5c31d55`); belum production. Bukti: [P3-005](records/P3-005-2026-11-02.md). P3-006 (#49): implementasi di branch `feature/p3-006-pastoral-retention`, PR belum merge; retensi tetap 24 bulan tanpa ubah/perpanjangan, tanpa ekspor, sesuai keputusan pemilik 2026-11-03. Bukti: [P3-006](records/P3-006-2026-11-03.md). P3-007 dan seterusnya tetap backlog. Pernyataan lama bahwa P3-003 menunggu keputusan sumber/format/lisensi bersifat historis; keputusan pemilik 2026-10-25 ada di [desain](../superpowers/specs/2026-10-25-p3-003-course-import-design.md).

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P3-001 | Model Course dan Lesson. | Admin/Editor dapat mengelola draft/publish; publik hanya melihat konten published. | P2 Auth/RLS/CMS |
| P3-002 | Reader Pelajari Alkitab. | Navigasi course/lesson aksesibel; progres dan bookmark tersimpan hanya lokal pada browser. | P3-001 |
| P3-003 | Impor course eksternal. | Semua hasil impor menjadi draft, mencatat sumber/lisensi, dan memerlukan review sebelum publish. | P3-001 |
| P3-004 | Form minat belajar. | Consent eksplisit, anti-spam, dan lead hanya dapat dibaca Admin. | P2 security/RLS |
| P3-005 | Form doa dan kunjungan. | Turnstile diverifikasi server-side, rate limit serta honeypot aktif; data tidak terbaca Editor. | P2 security/RLS |
| P3-006 | Retensi dan respons pastoral. | Data sensitif memiliki 24 bulan default retention, audit akses, ekspor terbatas, serta runbook penghapusan. | P3-004, P3-005 |

## Phase 4 — Sekolah Sabat Digital

Pembaruan keputusan 2026-11-10: pemilik mengonfirmasi izin pemegang hak untuk fetch/display/cache server Indonesia dan menyetujui integrasi nyata katalog. Asumsi gate online tertutup pada catatan historis berikut telah digantikan untuk katalog HTTP; PostgreSQL privat dan offline tetap tertutup. Sumber memakai kode `in`, seri Dewasa aktif saja yang terverifikasi; lihat [aktivasi katalog](../05-integrations/SABBATH-SCHOOL-ADVENTECH.md#aktivasi-katalog-online-konfirmasi-2026-11-10). Reader online ditambahkan oleh P4-003; paket offline tetap bukan bagian perubahan ini.

Urutan dependensi: P4-001 (adapter server) → P4-002/P4-003 (katalog dan reader online) → P4-004 (mekanisme paket lokal) → P4-005 (gate izin). Keputusan cache server online telah diselesaikan melalui konfirmasi pemilik 2026-11-10 di atas; katalog memakai cache Next.js sesuai cakupan tersebut. Unduhan/offline tetap tidak diaktifkan sebelum izin tertulis untuk cakupan itu dicatat dan disetujui melalui P4-005. RPC cache PostgreSQL privat tetap tertutup; izin katalog online tidak membukanya. Lihat [gate lisensi Adventech](../05-integrations/SABBATH-SCHOOL-ADVENTECH.md#gate-lisensi-wajib).

P4-001: fondasi gate tertutup, validasi sintetis dan koneksi cache PostgreSQL sudah terintegrasi ke development melalui PR #92/#94. Issue #50 ditutup secara administratif atas permintaan pemilik; kedua gate tetap menolak akses, kontrak seluruh kelas/blok, TTL dan cakupan izin belum terbukti. Penutupan ini bukan pemenuhan seluruh acceptance atau izin aktivasi/rilis. Bukti: [catatan P4-001](records/P4-001-ANALYSIS-2026-11-07.md).

P4-002: tahap awal pilihan A pada 2026-11-10 membangun seleksi katalog sintetis dengan loader unavailable. Status itu telah digantikan oleh integrasi nyata setelah konfirmasi izin online: loader publik mengambil seri Dewasa Indonesia aktif dari `/in/`, memvalidasi metadata dan memakai cache Next.js satu jam tanpa sesi staf. Kelas anak/remaja belum terbukti tersedia; empat kelas jemaat lokal tetap terpisah. Issue #51 tetap terbuka untuk acceptance pemilik; offline dan RPC privat tidak diaktifkan. Bukti historis dan lanjutan: [catatan P4-002](records/P4-002-2026-11-10.md).

P4-003: reader anonim menambahkan daftar pelajaran triwulan, daftar hari, dan bacaan harian dari endpoint `/in/` dengan validasi induk-anak, sanitasi HTML, serta cache Next.js satu jam. Identifier invalid/bukan anggota menghasilkan 404; gangguan sumber menghasilkan halaman unavailable dengan atribusi dan tautan resmi. Tidak ada akun, progres Supabase, analytics isi, offline/download, atau pembukaan RPC privat. Issue #52 tetap terbuka untuk acceptance pemilik. Bukti: [catatan P4-003](records/P4-003-2026-11-11.md).

P4-004: kontrak manifest lokal dan gate tertutup disiapkan pada 2026-11-11 tanpa mengaktifkan unduhan/offline. Modul `offline.mjs` menetapkan manifest (version, size estimate, created_at, label terlihat), pesan "Update tersedia" tanpa unduhan otomatis, serta pemindahan progres berdasarkan lesson ID stabil. Gate `OFFLINE_ENABLED` adalah konstanta modul sehingga tidak bisa dibuka pemanggil, dan halaman reader dibuktikan tidak merender kontrol unduh/offline. Format arsip, skema IndexedDB, transport unduhan, dan UI unduhan **belum dibuat** karena issue #53 mencatatnya sebagai keputusan yang belum diambil dan acceptance-nya melarang rilis sebelum gate P4-005 lulus. Issue #53 tetap terbuka. Bukti: [catatan P4-004](records/P4-004-OFFLINE-2026-11-11.md).

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P4-001 | Adapter Adventech server-side. | Sumber diambil lewat adapter, dinormalisasi, divalidasi, dicache, dan memiliki attribution. | P2 server foundation |
| P4-002 | Katalog kelas Bahasa Indonesia. | Tampilkan Kindergarten, Primary, PowerPoint, Cornerstone, Dewasa hanya bila materi Indonesia tersedia; fallback Dewasa. | P4-001 |
| P4-003 | Reader dan preview pelajaran. | Materi terkini dapat dibaca tanpa akun; error sumber memiliki fallback yang jelas. | P4-001 |
| P4-004 | Unduhan lokal dan update manifest. | Pengguna dapat memilih paket lokal, melihat versi/tanggal, dan memperbarui secara manual; progres tetap IndexedDB. | P4-003 |
| P4-005 | Register hak dan release gate. | Catat hak per cakupan; izin katalog/cache server online dikonfirmasi, offline/download tetap menunggu izin tertulis dan persetujuan tersendiri. | P4-004 |

## Phase 5 — PWA dan notifikasi

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P5-001 | PWA foundation. | Manifest valid, aplikasi installable, dan cache application shell memiliki strategi versioning/recovery. | P2 release foundation |
| P5-002 | Cache data dan pengelolaan update. | Konten cache tidak tampil usang tanpa penanda; pengguna dapat memperbarui dan pulih dari cache bermasalah. | P5-001 |
| P5-003 | Preference centre notifikasi. | Opt-in per kategori, stop-all, perubahan preferensi, serta audit consent tersedia sebelum pengiriman. | P2 Auth/RLS |
| P5-004 | Web Push delivery. | VAPID/secrets aman, frequency cap, unsubscribe, retry policy, dan observability diuji end-to-end. | P5-003 |
| P5-005 | Review layanan dan domain produksi. | Biaya, kebijakan Vercel/Supabase, domain, DNS, dan kebijakan privasi disetujui sebelum skala publik. | P5-001–P5-004 |
| P5-006 | Evaluasi adapter WhatsApp. | Dilakukan hanya dengan provider resmi, consent, anggaran, dan persetujuan baru; tidak diimplementasikan pada pilot gratis. | P5-003 |
