# Landing page publik: penyegaran ala adventist.org

Disetujui pemilik 2026-11-28 (pil amber, tanpa SEARCH).

## Maksud
Beranda publik terasa modern dan profesional seperti https://adventist.org/: hero foto
full-bleed dengan header transparan, konten mentok tepi, dan tiga kartu aksi foto di atas
latar bergelombang. Identitas navy/amber, Creation Grid, dan serif italic tetap.

## Pendekatan
- **Dipilih: ubah di tempat.** `GlobalNav`, `Hero`, `DigitalMinistrySection` diganti
  tampilannya. Rute, data, form, dan `data-testid` yang dipakai test tidak berubah.
- Ditolak: komponen paralel (`HeroV2` dsb.) — menggandakan kode dan dua jalur yang harus dirawat.
- Ditolak: tiru warna biru adventist.org — melanggar identitas navy/amber.

## Desain
1. **Header**: transparan dan teks putih di atas hero beranda; navy solid setelah scroll
   dan di semua halaman lain. Baris utilitas kecil (KUNJUNGI GEREJA · KEGIATAN · MENU) di
   desktop. Nav utama dengan tiga dropdown: Tentang (Tentang Kami, Pelayanan, Kontak),
   Ibadah & Belajar (Sekolah Sabat, Pelajari Alkitab), Kegiatan & Media (Kegiatan, Media).
   CTA pil amber "Pelajari Alkitab". Mobile tetap overlay menu yang sudah ada.
   Tanpa SEARCH: situs belum punya pencarian.
2. **Hero**: foto `home_hero` full-bleed hampir setinggi layar, gradasi navy, judul putih
   (kalimat dan KineticLines tetap, *Iman* serif italic). Kolom Sabat jadi garis amber
   vertikal di tepi kanan (desktop) dan baris di mobile.
3. **Full-width**: foto/latar mentok tepi; teks panjang tetap dibatasi lebar baca.
4. **Kartu foto**: Kunjungi Gereja, Permohonan Doa, Pelajari Alkitab; foto penuh, overlay
   gelap, judul besar, deskripsi, tombol pil amber, di atas section navy bertepi gelombang
   (SVG). Foto sementara dari `IMAGES` (Unsplash) sampai ada foto asli jemaat.

## Batasan
Logo tidak diubah; tidak ada data gereja baru; mobile wajib; `prefers-reduced-motion` dihormati;
`OFFLINE_ENABLED` tetap false.

## Diserahkan ke pembangun
Ukuran, spacing, dan detail motion mengikuti token dan `Reveal`/`KineticLines` yang ada.
