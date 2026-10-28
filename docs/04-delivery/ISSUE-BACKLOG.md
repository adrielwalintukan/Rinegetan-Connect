# Issue Backlog — Rinegetan Connect Phase 1–5

Backlog ini adalah indeks issue tingkat produk. Issue Phase 2 yang aktif memiliki acceptance criteria terperinci di [Phase 2 Issue Backlog](PHASE-2-ISSUE-BACKLOG.md). Sebelum issue masuk sprint, pemiliknya melengkapi scope/non-scope, acceptance criteria, test plan, dependensi, dan checklist privasi/RLS bila relevan.

## Phase 1 — Website resmi

| ID | Issue | Acceptance ringkas | Status |
| --- | --- | --- | --- |
| P1-001 | Pertahankan kontrak desain dan URL Phase 1 saat refactor. | Token, Creation Grid, simbol resmi, tujuh URL, serta perilaku mobile memiliki test kontrak sebelum cutover. | Selesai (PR #4) |
| P1-002 | Validasi aksesibilitas dan performa website publik. | Keyboard, fokus, landmark, heading, alternatif gambar, dan performance budget diperiksa pada rute utama. | Selesai (PR #79, commit `186ea61`); budget performa menunggu keputusan pemilik ([record](records/P1-002-2026-10-23.md)) |
| P1-003 | Ganti placeholder operasional. | Alamat, nomor, sosial, jadwal, dan foto diganti hanya setelah pemilik konten mengesahkan data serta consent dicatat. | Backlog operasional |
| P1-004 | Buat baseline analitik privasi. | Tidak ada tracker non-esensial sebelum kebijakan cookie/consent disepakati. | Backlog |

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

P3-003 (#46): PR #86 merge ke `development` pada 2026-10-25 (`6dc89ed`), CI hasil merge lulus. Belum dirilis ke production dan migration belum diterapkan di sana. Bukti: [P3-003](records/P3-003-2026-10-25.md). P3-004 (#47): selesai di branch fitur `feature/p3-004-study-interest`, menunggu merge ke `development`; belum production. Bukti: [P3-004](records/P3-004-2026-10-26.md). P3-005 dan seterusnya tetap backlog. Pernyataan lama bahwa P3-003 menunggu keputusan sumber/format/lisensi bersifat historis; keputusan pemilik 2026-10-25 ada di [desain](../superpowers/specs/2026-10-25-p3-003-course-import-design.md).

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P3-001 | Model Course dan Lesson. | Admin/Editor dapat mengelola draft/publish; publik hanya melihat konten published. | P2 Auth/RLS/CMS |
| P3-002 | Reader Pelajari Alkitab. | Navigasi course/lesson aksesibel; progres dan bookmark tersimpan hanya lokal pada browser. | P3-001 |
| P3-003 | Impor course eksternal. | Semua hasil impor menjadi draft, mencatat sumber/lisensi, dan memerlukan review sebelum publish. | P3-001 |
| P3-004 | Form minat belajar. | Consent eksplisit, anti-spam, dan lead hanya dapat dibaca Admin. | P2 security/RLS |
| P3-005 | Form doa dan kunjungan. | Turnstile diverifikasi server-side, rate limit serta honeypot aktif; data tidak terbaca Editor. | P2 security/RLS |
| P3-006 | Retensi dan respons pastoral. | Data sensitif memiliki 24 bulan default retention, audit akses, ekspor terbatas, serta runbook penghapusan. | P3-004, P3-005 |

## Phase 4 — Sekolah Sabat Digital

Urutan dependensi: P4-001 (adapter server) → P4-002/P4-003 (katalog dan reader online) → P4-004 (mekanisme paket lokal) → P4-005 (gate izin). Batas izin yang disepakati tetap berlaku: tidak ada cache/offline materi sebelum izin tertulis pemegang hak dicatat dan disetujui. Mekanisme teknis P4-001–P4-004 boleh dibangun, tetapi cache materi dan unduhan/offline tidak diaktifkan untuk publik sebelum P4-005 lulus. Keputusan pemilik yang masih terbuka: apakah cache server untuk penayangan online (acceptance P4-001) memerlukan izin tertulis yang sama dengan paket offline; sampai diputuskan, berlaku batas yang lebih ketat ini. Lihat [gate lisensi Adventech](../05-integrations/SABBATH-SCHOOL-ADVENTECH.md#gate-lisensi-wajib).

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P4-001 | Adapter Adventech server-side. | Sumber diambil lewat adapter, dinormalisasi, divalidasi, dicache, dan memiliki attribution. | P2 server foundation |
| P4-002 | Katalog kelas Bahasa Indonesia. | Tampilkan Kindergarten, Primary, PowerPoint, Cornerstone, Dewasa hanya bila materi Indonesia tersedia; fallback Dewasa. | P4-001 |
| P4-003 | Reader dan preview pelajaran. | Materi terkini dapat dibaca tanpa akun; error sumber memiliki fallback yang jelas. | P4-001 |
| P4-004 | Unduhan lokal dan update manifest. | Pengguna dapat memilih paket lokal, melihat versi/tanggal, dan memperbarui secara manual; progres tetap IndexedDB. | P4-003 |
| P4-005 | Register hak dan release gate. | Tidak ada cache/offline materi sebelum izin tertulis pemegang hak dicatat dan disetujui. | P4-004 |

## Phase 5 — PWA dan notifikasi

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P5-001 | PWA foundation. | Manifest valid, aplikasi installable, dan cache application shell memiliki strategi versioning/recovery. | P2 release foundation |
| P5-002 | Cache data dan pengelolaan update. | Konten cache tidak tampil usang tanpa penanda; pengguna dapat memperbarui dan pulih dari cache bermasalah. | P5-001 |
| P5-003 | Preference centre notifikasi. | Opt-in per kategori, stop-all, perubahan preferensi, serta audit consent tersedia sebelum pengiriman. | P2 Auth/RLS |
| P5-004 | Web Push delivery. | VAPID/secrets aman, frequency cap, unsubscribe, retry policy, dan observability diuji end-to-end. | P5-003 |
| P5-005 | Review layanan dan domain produksi. | Biaya, kebijakan Vercel/Supabase, domain, DNS, dan kebijakan privasi disetujui sebelum skala publik. | P5-001–P5-004 |
| P5-006 | Evaluasi adapter WhatsApp. | Dilakukan hanya dengan provider resmi, consent, anggaran, dan persetujuan baru; tidak diimplementasikan pada pilot gratis. | P5-003 |
