# Inventaris Kontrak Phase 1 untuk Refactor

## Tujuan

Dokumen ini membatasi refactor Phase 2: migrasi teknologi tidak boleh menghapus pengalaman publik, identitas visual, maupun rute yang telah tersedia pada Phase 1. Item yang belum menjadi fitur nyata tetap dipertahankan sebagai preview sampai fase pemiliknya dimulai.

## Runtime saat ini

| Area | Kondisi Phase 1 | Arah Phase 2 |
| --- | --- | --- |
| Frontend | React 19, CRACO, React Router, JavaScript | Next.js App Router dan TypeScript |
| Styling | Tailwind CSS 3, token di index.css/tailwind.config.js | Bawa token dan komponen esensial ke struktur Next |
| Interaksi | Framer Motion, Lenis, Sonner, Lucide | Pertahankan bila menghormati reduced motion dan tidak membebani halaman |
| Data | src/data/content.js sebagai data contoh tunggal | Supabase bertahap; static fallback saat data belum dimigrasi |
| Backend | FastAPI/MongoDB template | Tidak menjadi runtime produk; pensiun setelah pengganti Supabase tervalidasi |

## Kontrak URL publik

| URL lama | Tujuan | Target App Router |
| --- | --- | --- |
| / | Beranda | app/(public)/page.tsx |
| /tentang-kami | Identitas gereja | app/(public)/tentang-kami/page.tsx |
| /kegiatan | Event dan jadwal | app/(public)/kegiatan/page.tsx |
| /media | Khotbah, renungan, foto, video, materi | app/(public)/media/page.tsx |
| /pelayanan | Preview pelayanan digital | app/(public)/pelayanan/page.tsx |
| /sekolah-sabat | Informasi Sekolah Sabat | app/(public)/sekolah-sabat/page.tsx |
| /kontak | Kontak dan panduan berkunjung | app/(public)/kontak/page.tsx |

Tidak ada redirect atau penggantian slug pada Sprint 1. Hash CTA yang sudah digunakan, terutama Pelajari Alkitab dan Saya Ingin Berkunjung, dipertahankan atau diberi anchor yang kompatibel.

## Kontrak desain dan layout

- Symbol Advent resmi berada di src/assets/adventist-symbol.svg dan tidak boleh diubah geometri/path-nya.
- EntityLockup, AdventistSymbol, GlobalNav, GlobalFooter, PageShell, dan CreationGrid adalah komponen identitas/layout yang perlu dipindahkan lebih dahulu.
- Desktop memakai Creation Grid tujuh kolom; kolom ketujuh menjadi Sabbath Column. Mobile menjadi satu kolom dengan aksen Sabat yang tidak menghalangi isi.
- Token navy, Sabbath Amber, gold, life, surface, radius, typography, focus ring, button, dan card harus tetap setara dengan DESIGN-SYSTEM.md.
- Motion utama: KineticLines, Reveal, marquee, dan smooth scroll. Semua perlu fallback prefers-reduced-motion.

## Komponen halaman yang dipertahankan

| Halaman | Komponen/isi utama |
| --- | --- |
| Beranda | Hero, SabbathMarquee, SabbathSection, Welcome, Events, Departments, Media, DigitalMinistry, Visit CTA |
| Tentang Kami | Narasi identitas, nilai, sejarah, dan arah jemaat |
| Kegiatan | Filter kategori dan daftar event |
| Media | Filter tipe konten, preview foto/sermon/video/materi |
| Pelayanan | Kartu Pelajari Alkitab, doa, dan kunjungan sebagai preview Phase 3 |
| Sekolah Sabat | Jadwal, kelas, dan preview Phase 4 |
| Kontak | Detail kontak, peta, serta form frontend-only |

## Data contoh dan migrasi bertahap

File src/data/content.js saat ini memuat:

- CHURCH, NAV_LINKS, SABBATH, IMAGES, dan MARQUEE_ITEMS;
- EVENT_CATEGORIES dan EVENTS;
- DEPARTMENTS;
- MEDIA_ITEMS;
- MINISTRY_CARDS;
- SABBATH_SCHOOL_CLASSES.

Migrasikan announcements/events/departments/media/schedules ke CMS Phase 2. CHURCH, NAV_LINKS, global identity copy, dan preview Phase 3–4 tetap static/MDX sampai ada kebutuhan CMS yang disetujui. Alamat, nomor telepon, email, sosial, dan foto saat ini adalah placeholder dan tidak boleh dianggap data gereja yang telah diverifikasi.

## Aksesibilitas dan QA yang diwariskan

- Semua item interaktif memiliki atau harus mempertahankan data-testid eksplisit.
- Header/navigation mobile, skip link, aria state, alt text, role alert, dan focus-visible ring adalah kontrak kualitas.
- Viewport regression minimum: 320, 375, 768, 1024, 1440px.
- Pastikan tidak ada horizontal overflow, terutama grid kartu media dan menu mobile.

## Batas refactor

1. Jangan sambungkan form kontak mock ke backend pada Sprint 1; itu menjadi Phase 3 dengan kontrol privasi.
2. Jangan menjadikan preview Pelayanan/Sekolah Sabat sebagai fitur aktif sebelum fase masing-masing.
3. Jangan memindahkan data ke Supabase dengan SQL manual tak terlacak; gunakan migration dan RLS test pada Sprint 2.
4. Jangan menghapus FastAPI/MongoDB sebelum halaman/data setara telah diuji dan backup/pengarsipan disetujui.

## Status P2-101

Inventaris ini memenuhi acceptance criteria P2-101. Sprint berikutnya dapat memakai dokumen ini sebagai checklist kontrak untuk P2-102 dan P2-103.
