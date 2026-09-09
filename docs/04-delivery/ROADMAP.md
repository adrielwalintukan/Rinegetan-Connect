# Roadmap Delivery

## Urutan fase yang disetujui

| Fase | Nama | Status | Hasil utama |
| --- | --- | --- | --- |
| 1 | Website resmi | Selesai, perlu dipertahankan/didokumentasikan | Rute publik dan identitas visual |
| 2 | CMS dan fondasi platform | Berikutnya | Refactor Next.js, Supabase, Admin/Editor, CMS, galeri |
| 3 | Pelayanan digital | Sesudah fondasi stabil | Course Alkitab, form doa/pengunjung, lead privat |
| 4 | Sekolah Sabat digital | Sesudah Phase 3 | Integrasi Adventech, cache, offline bersyarat |
| 5 | PWA dan notifikasi | Terakhir | Installability, Web Push, preferensi |

Tidak ada fase Community/Member. Pengalaman publik tetap tanpa akun; progres pembelajaran disimpan lokal pada perangkat pengguna.

## Exit criteria Phase 1

- Rute publik dan mobile layout terdokumentasi.
- Token dan aturan Creation Grid terkodifikasi.
- Tidak ada perubahan visual tak disengaja saat refactor.

## Exit criteria Phase 2

- Next.js/TypeScript menggantikan runtime React/CRACO tanpa memutus rute publik penting.
- Supabase Singapore aktif; environment development dan production dipisahkan sesuai kuota/anggaran.
- Auth staf invitation/reset berfungsi, tanpa public sign-up.
- Admin/Editor diatur melalui RLS yang diuji.
- CMS mengelola announcement, event, schedule/exception, department, media album/aset.
- Media public menggunakan consent + derivative JPEG, galeri dan download sesuai policy.
- Audit, backup runbook, test, accessibility, dan rollback deploy dipraktikkan.

## Exit criteria Phase 3

- Course/Lesson publik dalam Bahasa Indonesia dengan progres browser lokal.
- Import course terlindungi, draft-only, dan menjalani pemeriksaan lisensi.
- Form doa/pengunjung/interest memakai consent, Turnstile server verification, rate limit, dan akses Admin-only.
- Retensi dan operasional pastoral disetujui.

## Exit criteria Phase 4

- Cache dan UI Sekolah Sabat Indonesia menunjukkan kelas hanya bila konten tersedia.
- Sumber/atribusi dan perilaku failure jelas.
- Fitur offline tidak aktif sebelum bukti izin tertulis disetujui.
- Paket lokal dapat diperbarui manual tanpa menghapus progres lokal.

## Exit criteria Phase 5

- PWA memenuhi checklist offline/update/installability.
- Web Push memakai consent eksplisit, category preference, unsubscribe, dan frequency cap.
- WhatsApp hanya dapat ditambahkan sesudah persetujuan anggaran/legal/operasional yang baru.

## Risiko urutan

| Risiko | Mitigasi |
| --- | --- |
| Refactor mengubah desain Phase 1 | Visual regression dan design review sebelum release |
| Kuota gratis habis karena galeri | JPEG derivative, kuota 1 GB, threshold, batas ZIP |
| Data pastoral terbuka | Skema terpisah, RLS deny-by-default, test privasi |
| API Sekolah Sabat/izin berubah | Adapter server/cache dan gate izin tertulis |
| Domain belum tersedia | Jangan mengaktifkan final SEO/email redirect sampai domain dikonfirmasi |
