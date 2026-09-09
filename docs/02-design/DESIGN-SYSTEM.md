# Sistem Desain — GMAHK Rinegetan

## Tujuan

Sistem desain ini menjaga kesinambungan tampilan Phase 1 ketika aplikasi direfactor ke Next.js dan ketika fitur CMS ditambahkan. Ini bukan instruksi untuk membuat merek baru. Gunakan [Adventist Identity Guideline System](https://www.adventist.design/) sebagai aturan induk; dokumen ini mengatur penerapannya untuk GMAHK Rinegetan.

## Prinsip visual

1. Identitas Advent resmi selalu lebih penting daripada dekorasi.
2. Creation Grid memberi ritme editorial, bukan garis dekoratif yang menghalangi isi.
3. Kolom ketujuh adalah Sabbath Column: ruang hening, aksen, foto, kutipan, atau lockup; tidak untuk paragraf padat.
4. Kejelasan, kontras, dan aksesibilitas mengalahkan efek gerak.
5. Foto komunitas yang autentik dan berizin lebih baik daripada stok yang tidak relevan.

## Layout dan grid

Desktop memakai tujuh kolom dengan maksimum container 1280px:

- Kolom 1–6: narasi, kartu, jadwal, formulir, daftar.
- Kolom 7: Sabbath Column dengan aksen amber, simbol, gambar, atau informasi singkat.
- Mobile: satu kolom fluid; Sabbath Column menjadi banner/border aksen pada bagian kunci.
- Gutter: 24px mobile dan 32px desktop. Padding container: 20px mobile, 32px tablet, 40px desktop.

Setiap halaman baru wajib tetap nyaman pada lebar 320px, 375px, 768px, 1024px, dan 1440px.

## Token visual

| Nama | Nilai | Penggunaan |
| --- | --- | --- |
| Navy | #0A2540 | brand primer, heading, tombol primer |
| Navy 700 | #0F2E4E | hover dan surface gelap |
| Sabbath Amber | #E5A93C | fokus, CTA Sabat, kolom ketujuh |
| Gold | #D4AF37 | aksen terbatas |
| Life Emerald | #0D9488 | status positif/kehidupan, bukan CTA utama |
| Background | #FAFAFC | latar utama |
| Surface | #FFFFFF | kartu dan panel |
| Text heading | #0F172A | judul |
| Text body | #334155 | isi |
| Border | #E2E8F0 | batas lembut |
| Danger | #C71F1F | status destruktif; bukan warna merek |
| Radius default | 10px | komponen standar |

Jangan memperkenalkan warna merek baru tanpa memperbarui token dan uji kontras. Dark Sabbath Mode adalah ide backlog, bukan requirement Phase 2.

## Tipografi

Gunakan stack sans: Plus Jakarta Sans, Noto Sans, system-ui, sans-serif sampai file Advent Sans berlisensi disediakan organisasi. Jangan menyatakan font fallback sebagai Advent Sans resmi.

| Peran | Skala |
| --- | --- |
| Hero | 36px mobile sampai 60px desktop, 800 |
| H1 | 30px sampai 48px, 700 |
| H2 | 24px sampai 36px, 600 |
| H3 | 20px sampai 24px, 600 |
| Isi | 16px, line-height 1.6–1.75 |
| Label/eyebrow | 11px, 600, uppercase, tracking lebar |

Cormorant Garamond hanya aksen editorial/kutipan, bukan teks UI. JetBrains Mono hanya metadata teknis, label jadwal, atau kode.

## Komponen dan states

Komponen dasar yang diwariskan:

- Primary, secondary, dan Sabbath button; tinggi sentuh minimum 44px.
- Card surface dengan border navy transparan, radius 10px, hover lift kecil.
- Chip kategori.
- Image frame dengan crop yang disengaja dan teks alternatif.
- Dialog, drawer, form control, table, empty state, skeleton, toast.
- CreationGrid, EntityLockup, GlobalNav, GlobalFooter, PageShell.

Setiap komponen interaktif memiliki hover, focus-visible, disabled, loading, error, dan state keyboard. Focus ring memakai amber dengan offset cukup; jangan menghapus outline browser tanpa pengganti.

## Media, galeri, dan privasi visual

- Tampilkan foto publik yang telah berstatus Published dan memiliki consent tercatat.
- Label unduhan muncul hanya bila aset atau album dapat diunduh publik.
- Thumbnail menggunakan JPEG teroptimasi; jangan mengungkap lokasi EXIF.
- Untuk foto anak, tampilan publik hanya setelah izin wali dicatat.
- Tampilan galeri memakai album dahulu, lalu grid foto; lightbox harus bisa ditutup dengan Escape dan memiliki alt/description.

## Gerak

Gerak Phase 1 boleh dipertahankan: reveal ringkas, marquee lambat, dan transisi hover. Semua gerak wajib menghormati prefers-reduced-motion. Tidak ada autoplay video/audio, parallax berat, atau animasi yang mengganggu pembacaan.

## Pemeriksaan desain sebelum merge

1. Symbol Advent resmi digunakan tanpa modifikasi geometri.
2. Tidak ada horizontal overflow pada viewport kecil.
3. Kontras teks/komponen lulus AA.
4. Tidak ada teks penting hanya di dalam gambar.
5. Navigasi keyboard dan fokus terlihat.
6. Setiap tindakan destruktif memakai konfirmasi UI dan disediakan informasi dampak.
7. Foto, dokumen, dan teks alt sudah diperiksa hak/consent-nya.
