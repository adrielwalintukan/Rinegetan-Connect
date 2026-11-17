# Sprint Plan — Rinegetan Connect Phase 1–5

Cadence usulan adalah satu minggu fokus per sprint. Bila ada blocker konten, izin, atau keamanan, sprint ditutup dengan keputusan tertulis; bukan dengan mengurangi quality gate. Status **selesai** berarti fondasi tersedia, bukan semua konten produksi sudah final.

## Phase 1 — Website Resmi

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S1.0 | Tetapkan identitas Adventist, Creation Grid, token visual, arsitektur informasi, dan konten placeholder yang jelas. | Selesai |
| S1.1 | Bangun tujuh rute publik: Beranda, Tentang, Kegiatan, Media, Pelayanan, Sekolah Sabat, dan Kontak. | Selesai |
| S1.2 | Tuntaskan responsivitas, aksesibilitas dasar, motion, dan validasi build untuk website statis. | Selesai |
| S1.3 | Ganti placeholder kontak/foto dengan data resmi dan bukti consent; dikerjakan saat data tersedia. | Backlog operasional |

## Phase 2 — CMS dan Fondasi Platform

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S2.0 | Kontrak refactor: inventaris Phase 1, struktur repository, standar cabang/PR, dan CI awal. | Selesai |
| S2.1 | Promosikan aplikasi Next.js + TypeScript, pertahankan URL/desain Phase 1, dan buat regression contract test. | Selesai |
| S2.2 | Buat migration Supabase, bootstrap Admin, Auth Admin/Editor, RLS, dan audit dasar. | Selesai |
| S2.3 | Sediakan CMS pengumuman, acara, departemen, jadwal beserta pengecualian, serta status Draft/Published/Archived. | Selesai |
| S2.4 | Sediakan Media Library dan galeri album: consent, derivative JPEG, visibility, dan unduhan aman. | Selesai |
| S2.5 | Tambahkan quality gate, backup/restore drill, hardening deployment Vercel, dan pilot tertutup. | Selesai (backup berikutnya deferred, lihat OPS-002) |

## Phase 3 — Pelayanan Digital

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S3.0 | Bentuk model Course/Lesson dan reader publik untuk Pelajari Alkitab; progres hanya di browser pengguna. | Selesai (P3-001, P3-002; production 2026-10-23) |
| S3.1 | Buat CMS course/lesson dan impor pihak ketiga yang selalu masuk sebagai draft serta melewati pemeriksaan lisensi. | Selesai dirilis (P3-001, P3-003 lewat PR #99) |
| S3.2 | Buat form minat belajar, permohonan doa, dan kunjungan dengan consent, anti-spam, dan akses Admin-only. | Selesai dirilis (P3-004, P3-005 lewat PR #99); rate limit dan Turnstile terbukti aktif di production, insert baris belum diuji end-to-end |
| S3.3 | Uji retensi 24 bulan, audit akses, ekspor terkontrol, dan prosedur respons data pastoral. | Selesai dirilis (P3-006 lewat PR #99); ekspor tidak disediakan sesuai keputusan pemilik 2026-11-03 |

## Phase 4 — Sekolah Sabat Digital

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S4.0 | Buat adapter Adventech di server, normalisasi/validasi data, attribution, dan cache terukur. | Selesai (P4-001) |
| S4.1 | Rilis reader Bahasa Indonesia dengan kelas Kindergarten, Primary, PowerPoint, Cornerstone, Dewasa hanya saat sumber Indonesia tersedia; fallback Dewasa. | Selesai (P4-002, P4-003; production) |
| S4.2 | Tambahkan preview dan paket unduh lokal berorientasi manifest, pengecekan update, serta progres IndexedDB tanpa akun. | Sebagian: kontrak manifest merge ke `development` (PR #98); format arsip, IndexedDB, transport, dan UI belum dibuat |
| S4.3 | Aktifkan cache materi dan offline hanya setelah register menyimpan izin tertulis dari pemegang hak (P4-005); tanpa izin, reader tetap online-only. S4.0–S4.2 membangun mekanisme tanpa mengaktifkannya untuk publik. | Release gate |

## Phase 5 — PWA dan Notifikasi

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S5.0 | Tambahkan manifest, installability, offline application shell, dan strategi update/recovery yang aman. | Selesai dan terverifikasi di production (P5-001 issue #55 dan P5-002 issue #56 ditutup) |
| S5.1 | Tambahkan Web Push opt-in: kategori, frekuensi, preference centre, unsubscribe, dan observability pengiriman. | Berjalan: P5-003 (preference centre) kode selesai dan seluruh test lulus, tetapi migration belum diterapkan ke production; P5-004 (pengiriman, cap, retry) belum dimulai — angkanya sudah diputuskan pemilik |
| S5.2 | Lakukan security/privacy review, capacity review layanan gratis, dan release readiness untuk domain produksi. | Backlog |
| S5.3 | Nilai adapter WhatsApp hanya jika ada consent, persetujuan anggaran, dan provider resmi; tidak termasuk pilot gratis. | Deferred |

## Exit criteria per fase

- **Phase 1:** Semua URL publik, desain, mobile, aksesibilitas, dan konten contoh tersedia; placeholder mudah ditelusuri.
- **Phase 2:** Admin/Editor, RLS, CMS, jadwal, galeri consent-aware, backup/restore drill, dan CI tervalidasi.
- **Phase 3:** Course publik serta form pastoral memiliki consent, anti-spam, retensi, dan akses Admin-only yang diuji.
- **Phase 4:** Sekolah Sabat Indonesia terintegrasi dan cache tervalidasi; offline hanya aktif setelah izin tertulis pemegang hak.
- **Phase 5:** PWA installable, update/recovery aman, Web Push opt-in/category/unsubscribe siap; WhatsApp tetap opsi masa depan berbiaya.

Dokumen [Phase 2 Sprint Plan](PHASE-2-SPRINT-PLAN.md) adalah rincian eksekusi historis untuk S2.0–S2.5 (Phase 2 selesai). Dokumentasi direview melalui PR awal; sprint menghasilkan issue kecil dengan bukti verifikasi, sedangkan PR kode Phase 2 menuju `development` dibuka setelah seluruh scope Phase 2 selesai sesuai keputusan saat ini.
