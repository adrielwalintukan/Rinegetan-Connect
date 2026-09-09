# Issue Backlog — Rinegetan Connect Phase 1–5

Backlog ini adalah indeks issue tingkat produk. Issue Phase 2 yang aktif memiliki acceptance criteria terperinci di [Phase 2 Issue Backlog](PHASE-2-ISSUE-BACKLOG.md). Sebelum issue masuk sprint, pemiliknya melengkapi scope/non-scope, acceptance criteria, test plan, dependensi, dan checklist privasi/RLS bila relevan.

## Phase 1 — Website resmi

| ID | Issue | Acceptance ringkas | Status |
| --- | --- | --- | --- |
| P1-001 | Pertahankan kontrak desain dan URL Phase 1 saat refactor. | Token, Creation Grid, simbol resmi, tujuh URL, serta perilaku mobile memiliki test kontrak sebelum cutover. | Berjalan bersama S2.1 |
| P1-002 | Validasi aksesibilitas dan performa website publik. | Keyboard, fokus, landmark, heading, alternatif gambar, dan performance budget diperiksa pada rute utama. | Backlog |
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

| ID | Issue | Acceptance ringkas | Dependensi |
| --- | --- | --- | --- |
| P3-001 | Model Course dan Lesson. | Admin/Editor dapat mengelola draft/publish; publik hanya melihat konten published. | P2 Auth/RLS/CMS |
| P3-002 | Reader Pelajari Alkitab. | Navigasi course/lesson aksesibel; progres dan bookmark tersimpan hanya lokal pada browser. | P3-001 |
| P3-003 | Impor course eksternal. | Semua hasil impor menjadi draft, mencatat sumber/lisensi, dan memerlukan review sebelum publish. | P3-001 |
| P3-004 | Form minat belajar. | Consent eksplisit, anti-spam, dan lead hanya dapat dibaca Admin. | P2 security/RLS |
| P3-005 | Form doa dan kunjungan. | Turnstile diverifikasi server-side, rate limit serta honeypot aktif; data tidak terbaca Editor. | P2 security/RLS |
| P3-006 | Retensi dan respons pastoral. | Data sensitif memiliki 24 bulan default retention, audit akses, ekspor terbatas, serta runbook penghapusan. | P3-004, P3-005 |

## Phase 4 — Sekolah Sabat Digital

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
