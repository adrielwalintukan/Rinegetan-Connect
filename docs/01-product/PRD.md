# PRD — Rinegetan Connect

## 1. Ringkasan

Rinegetan Connect adalah platform digital resmi GMAHK Rinegetan. Produk ini memperluas website gereja yang sudah selesai di Phase 1 menjadi sistem konten, pelayanan digital, Sekolah Sabat digital, dan PWA. Tujuannya adalah membuat informasi gereja mudah ditemukan, dikelola dengan aman, relevan bagi pengunjung baru, serta tetap setia pada identitas dan tata kelola gereja.

Produk menggunakan bahasa Indonesia, zona waktu Asia/Makassar, dan desain mobile-first. Pengunjung tidak perlu membuat akun untuk membaca konten publik, mengikuti Pelajari Alkitab, atau memakai progres lokal. Pada cakupan ini tidak ada peran Member dan tidak ada penyimpanan progres ke server.

## 2. Sasaran dan ukuran keberhasilan

| Sasaran | Indikator awal |
| --- | --- |
| Informasi gereja akurat dan mudah ditemukan | Editor dapat memperbarui konten tanpa deploy; konten terbit tampil di publik |
| Pelayanan digital aman | Form doa dan pengunjung hanya terlihat oleh Admin; spam diblokir berlapis |
| Arsip kegiatan bermakna | Foto berizin terkelompok per album/kategori dan unduhan mematuhi aturan aset |
| Belajar Alkitab terarah | Course dan lesson publik dapat diterbitkan serta progres tersimpan lokal |
| Sekolah Sabat siap bertumbuh | Integrasi Bahasa Indonesia, cache, offline bersyarat, dan PWA bertahap |
| Operasional tanpa biaya awal | Batas penyimpanan, egress, dan layanan gratis dipantau dengan jelas |

## 3. Pengguna dan hak akses

| Pengguna | Kebutuhan | Hak |
| --- | --- | --- |
| Pengunjung publik | Jadwal, kegiatan, media, pelayanan, Pelajari Alkitab, Sekolah Sabat | Baca konten Published; kirim form yang diizinkan |
| Editor | Mengelola komunikasi publik | Membuat, mengubah, menerbitkan, mengarsipkan seluruh konten publik |
| Admin | Tata kelola dan perlindungan data | Semua hak Editor; kelola staf, pengaturan, penghapusan permanen, audit, data doa dan pengunjung |

Editor dapat langsung menerbitkan konten karena gereja memilih alur ringan. Penghapusan permanen hanya oleh Admin dan harus tercatat. Peran disimpan di tabel database yang terlindungi, bukan di metadata pengguna yang dapat dimanipulasi dari klien.

## 4. Siklus hidup konten

Semua konten publik menggunakan status:

Draft → Published → Archived

Draft hanya terlihat staf yang berwenang. Published dapat dibaca publik sesuai tanggal publikasi dan aturan visibilitas. Archived tidak ditampilkan ke publik, tetap dapat dipulihkan oleh staf, dan tidak sama dengan penghapusan permanen.

## 5. Ruang lingkup roadmap

### Phase 1 — Website resmi

Sudah selesai sebagai fondasi visual. Cakupannya tujuh rute publik: Beranda, Tentang Kami, Kegiatan, Media, Pelayanan, Sekolah Sabat, dan Kontak. Desain memakai Adventist Creation Grid, simbol Advent resmi, konten Indonesia, WITA, aksesibilitas dasar, serta komponen visual editorial.

Dokumentasi Phase 1 tetap menjadi sumber kebenaran untuk identitas, token, rute yang dipertahankan, dan kontrak responsif.

### Phase 2 — CMS dan fondasi platform

Tujuan: memindahkan aplikasi React/CRACO ke Next.js App Router + TypeScript dan mengganti template FastAPI/MongoDB dengan Supabase.

Fitur:

- Login staf berbasis undangan email dan reset password; tanpa daftar publik maupun OAuth.
- Admin dan Editor beserta audit aktivitas.
- CMS untuk pengumuman, kegiatan, jadwal, departemen, media, album, dan aset.
- Jadwal mingguan berulang serta pengecualian untuk tanggal tertentu.
- Galeri foto publik dengan album dan kategori: Ibadah, Pemuda, Sekolah Sabat, Pelayanan, Penginjilan, Sosial, dan Departemen bila relevan.
- Persetujuan foto, status dapat diunduh, turunan JPEG yang telah dibersihkan dari EXIF/geolocation, serta unduhan satu foto, album, atau kategori.
- Supabase Storage dengan kuota keras pilot 1 GB. Hanya turunan JPEG teroptimasi disimpan; file asli tidak disimpan di pilot.
- Analytics operasional ringan dan dashboard CMS.

Tidak termasuk: formulir doa/pengunjung aktif, course Alkitab, integrasi API Sekolah Sabat, PWA, dan notifikasi.

### Phase 3 — Pelayanan digital

Tujuan: menawarkan pelayanan yang jelas tanpa menuntut akun publik.

Fitur:

- Pelajari Alkitab sebagai Course → Lesson, akses publik, Bahasa Indonesia, progres dan lanjut belajar di browser lokal.
- Impor course dari sumber pihak ketiga hanya ke draft, dengan preview, validasi struktur, dan pemeriksaan lisensi sebelum diterbitkan. Tidak ada sinkronisasi otomatis langsung ke publik.
- CTA persetujuan Ingin belajar bersama? yang membuat lead privat untuk Admin.
- Form permohonan doa dan data pengunjung dengan persetujuan eksplisit, Turnstile, validasi server, rate limiting, dan honeypot.
- Data doa dan pengunjung privat Admin; retensi default 24 bulan, dapat diubah Admin.

### Phase 4 — Sekolah Sabat digital

Tujuan: menyediakan pembacaan pelajaran Sekolah Sabat sebagai produk terpisah dari Pelajari Alkitab.

Fitur:

- Integrasi server-side dengan sumber Adventech, cache, atribusi sumber, dan Bahasa Indonesia.
- Kelas yang ditampilkan bila konten Indonesia tersedia: Kindergarten, Primary, PowerPoint, Cornerstone, dan Dewasa. Bila tidak tersedia, tampilkan Dewasa Indonesia saja.
- Preview pelajaran, paket lokal yang pengguna pilih untuk unduh, pembaruan manual saat paket baru tersedia, dan progres lokal berdasarkan lesson ID.
- Penggunaan tanpa Member, akun, atau sinkronisasi cloud.

Unduhan/offline hanya boleh diluncurkan setelah gereja memiliki izin tertulis dari pemegang hak materi. Kesiapan teknis bukan izin untuk mendistribusikan ulang materi.

### Phase 5 — PWA dan notifikasi

Tujuan: meningkatkan akses berulang dengan instalasi aplikasi dan notifikasi yang terukur.

Fitur:

- PWA installable, cache offline yang aman, indikator versi, dan strategi pemulihan bila cache usang.
- Web Push sebagai kanal utama setelah persetujuan pengguna.
- Preferensi: Pengumuman Gereja, Ibadah & Kegiatan, Pelajari Alkitab, Sekolah Sabat; pilihan berhenti berlangganan semua.
- Notifikasi mendesak segera, notifikasi rutin terjadwal/digest dengan frequency cap.
- WhatsApp hanya adapter opsional masa depan: memerlukan persetujuan eksplisit, bisnis terverifikasi, template, dan anggaran. Tidak diimplementasikan pada pilot gratis.

## 6. Kebutuhan nonfungsional

| Area | Ketentuan |
| --- | --- |
| Aksesibilitas | Target WCAG 2.2 AA, keyboard lengkap, fokus terlihat, teks alternatif bermakna |
| Performa | Gambar responsif/teroptimasi; konten publik di-cache; JavaScript klien minimum |
| Keamanan | RLS per tabel, grants least privilege, rahasia hanya server, audit mutasi staf |
| Privasi | Persetujuan jelas, minimisasi data, penghapusan/review terjadwal, hak akses berbasis peran |
| SEO | Metadata per halaman, canonical setelah domain tersedia, sitemap, robots, Open Graph |
| Operasi | Migrasi reproducible, backup manual terenkripsi bulanan dan sebelum migrasi, uji pemulihan |
| Observabilitas | Log server terstruktur tanpa PII/rahasia; error monitoring dipilih sebelum produksi |

## 7. Keputusan yang sengaja ditunda

- Domain produksi dan alamat email pengirim resmi.
- Anggaran/persetujuan layanan berbayar, termasuk WhatsApp.
- Lisensi Advent Sans resmi dan foto jemaat produksi.
- Bukti izin tertulis untuk paket offline Sekolah Sabat.
- Kebutuhan skala yang melampaui kuota pilot gratis.
