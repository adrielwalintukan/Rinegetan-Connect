# Spesifikasi Desain — CMS dan Fondasi Platform Phase 2

## Tujuan

Menyediakan fondasi Next.js dan Supabase yang aman, mempertahankan website publik Phase 1, serta memungkinkan Admin dan Editor mengelola informasi gereja dan galeri foto yang telah disetujui.

## Cerita pengguna

- Sebagai pengunjung, saya dapat membaca pengumuman, acara, jadwal, departemen, media, dan album foto terkini tanpa akun.
- Sebagai Editor, saya dapat membuat draf, menerbitkan, mengarsipkan, dan mengoreksi konten publik.
- Sebagai Admin, saya dapat mengundang/menonaktifkan staf, memeriksa audit trail, dan menghapus permanen secara aman.
- Sebagai pengunjung, saya hanya melihat foto dengan consent publik dan hanya dapat mengunduh aset/koleksi yang secara eksplisit diizinkan.

## Desain fungsional

### Akses staf

Aplikasi memiliki rute masuk staf; pendaftaran publik dinonaktifkan. Admin mengundang Editor dan penerima membuat kata sandi melalui alur Supabase Auth. Rute terlindungi memverifikasi sesi serta peran di server sebelum render atau mutasi.

### CMS

Area admin memuat pengumuman, acara, jadwal, pengecualian jadwal, departemen, album, dan aset. Setiap formulir mendukung Draft, Published, serta Archived. Daftar konten dapat disaring berdasarkan status dan waktu; halaman publik hanya mengambil rekaman Published yang memenuhi syarat.

### Galeri

Album memiliki kategori, tanggal kegiatan, relasi acara/departemen opsional, cover, deskripsi, dan urutan aset. Aset memiliki consent, status sembunyi, pemrosesan, alt text, serta flag unduhan. Galeri publik dimulai dari album yang dapat difilter, membuka tampilan grid/lightbox aksesibel, dan hanya menawarkan unduhan yang aman.

### Audit

Catat pembuatan, pembaruan, publikasi, pengarsipan, penyembunyian, perubahan peran, undangan, serta penghapusan permanen beserta pelaku, target, waktu, correlation ID, dan ringkasan perubahan yang telah disamarkan. Jangan mencatat secret atau payload pastoral.

## Desain nonfungsional

- Pertahankan Creation Grid tujuh kolom dan URL publik yang ada.
- Targetkan WCAG 2.2 AA dan tata letak mobile-first.
- Terapkan RLS/grant pada setiap tabel dan bucket yang terekspos.
- Simpan waktu dalam UTC dan tampilkan dalam Asia/Makassar.
- Jaga pilot dalam kuota storage media 1 GB yang dipantau.
- Jadikan migration, policy, dan test dapat direproduksi dari source control.

## Di luar scope

Form publik, course Alkitab, konten Adventech, PWA, push, WhatsApp, akun/peran Member, progres cloud, hosting video, dan page builder.

## Kriteria penerimaan

1. Izin Admin dan Editor dibuktikan oleh test RLS.
2. Konten publik tidak dapat menampilkan draf, arsip, field privat, atau media tanpa consent.
3. Identitas visual dan rute Phase 1 tetap dipertahankan setelah refactor.
4. Hasil unduhan galeri hanya berisi derivative JPEG yang eligible dan mematuhi batas.
5. Tim operasional dapat menggunakan CMS untuk konten Phase 2 tanpa menyunting source code.
