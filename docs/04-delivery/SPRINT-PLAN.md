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
| S2.0 | Kontrak refactor: inventaris Phase 1, struktur repository, standar cabang/PR, dan CI awal. | Berjalan |
| S2.1 | Promosikan aplikasi Next.js + TypeScript, pertahankan URL/desain Phase 1, dan buat regression contract test. | Backlog |
| S2.2 | Buat migration Supabase, bootstrap Admin, Auth Admin/Editor, RLS, dan audit dasar. | Backlog |
| S2.3 | Sediakan CMS pengumuman, acara, departemen, jadwal beserta pengecualian, serta status Draft/Published/Archived. | Backlog |
| S2.4 | Sediakan Media Library dan galeri album: consent, derivative JPEG, visibility, dan unduhan aman. | Backlog |
| S2.5 | Tambahkan quality gate, backup/restore drill, hardening deployment Vercel, dan pilot tertutup. | Backlog |

## Phase 3 — Pelayanan Digital

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S3.0 | Bentuk model Course/Lesson dan reader publik untuk Pelajari Alkitab; progres hanya di browser pengguna. | Backlog |
| S3.1 | Buat CMS course/lesson dan impor pihak ketiga yang selalu masuk sebagai draft serta melewati pemeriksaan lisensi. | Backlog |
| S3.2 | Buat form minat belajar, permohonan doa, dan kunjungan dengan consent, anti-spam, dan akses Admin-only. | Backlog |
| S3.3 | Uji retensi 24 bulan, audit akses, ekspor terkontrol, dan prosedur respons data pastoral. | Backlog |

## Phase 4 — Sekolah Sabat Digital

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S4.0 | Buat adapter Adventech di server, normalisasi/validasi data, attribution, dan cache terukur. | Backlog |
| S4.1 | Rilis reader Bahasa Indonesia dengan kelas Kindergarten, Primary, PowerPoint, Cornerstone, Dewasa hanya saat sumber Indonesia tersedia; fallback Dewasa. | Backlog |
| S4.2 | Tambahkan preview dan paket unduh lokal berorientasi manifest, pengecekan update, serta progres IndexedDB tanpa akun. | Backlog |
| S4.3 | Aktifkan offline materi hanya setelah register menyimpan izin tertulis dari pemegang hak; tanpa izin, reader tetap online-only. | Release gate |

## Phase 5 — PWA dan Notifikasi

| Sprint | Sasaran dan keluaran | Status |
| --- | --- | --- |
| S5.0 | Tambahkan manifest, installability, offline application shell, dan strategi update/recovery yang aman. | Backlog |
| S5.1 | Tambahkan Web Push opt-in: kategori, frekuensi, preference centre, unsubscribe, dan observability pengiriman. | Backlog |
| S5.2 | Lakukan security/privacy review, capacity review layanan gratis, dan release readiness untuk domain produksi. | Backlog |
| S5.3 | Nilai adapter WhatsApp hanya jika ada consent, persetujuan anggaran, dan provider resmi; tidak termasuk pilot gratis. | Deferred |

## Exit criteria per fase

- **Phase 1:** Semua URL publik, desain, mobile, aksesibilitas, dan konten contoh tersedia; placeholder mudah ditelusuri.
- **Phase 2:** Admin/Editor, RLS, CMS, jadwal, galeri consent-aware, backup/restore drill, dan CI tervalidasi.
- **Phase 3:** Course publik serta form pastoral memiliki consent, anti-spam, retensi, dan akses Admin-only yang diuji.
- **Phase 4:** Sekolah Sabat Indonesia terintegrasi dan cache tervalidasi; offline hanya aktif setelah izin tertulis pemegang hak.
- **Phase 5:** PWA installable, update/recovery aman, Web Push opt-in/category/unsubscribe siap; WhatsApp tetap opsi masa depan berbiaya.

Dokumen [Phase 2 Sprint Plan](PHASE-2-SPRINT-PLAN.md) adalah rincian eksekusi aktif untuk S2.0–S2.5. Dokumentasi direview melalui PR awal; sprint menghasilkan issue kecil dengan bukti verifikasi, sedangkan PR kode Phase 2 menuju `development` dibuka setelah seluruh scope Phase 2 selesai sesuai keputusan saat ini.
