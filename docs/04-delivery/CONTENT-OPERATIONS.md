# Operasi Konten

## Peran operasional

| Aktivitas | Editor | Admin |
| --- | --- | --- |
| Membuat/mengubah/menerbitkan konten publik | Ya | Ya |
| Mengarsipkan konten | Ya | Ya |
| Upload dan mengatur galeri | Ya | Ya |
| Mengubah pengaturan gereja | Tidak | Ya |
| Mengundang/menonaktifkan staf | Tidak | Ya |
| Menghapus permanen | Tidak | Ya |
| Membaca data doa, kunjungan, dan lead | Tidak | Ya |
| Ekspor data privat | Tidak | Ya, dengan alasan/audit |

## Alur standar konten

1. Editor membuat Draft dan mengisi judul, ringkasan, isi, slug, kategori, tanggal, alt text, serta relasi yang relevan.
2. Preview dilakukan di desktop dan mobile. Periksa nama tempat, tanggal WITA, tautan, bahasa, aksesibilitas, serta hak pakai media.
3. Editor menerbitkan. Sistem mencatat actor dan waktu; cache publik direvalidasi.
4. Jika informasi lewat masa, Editor mengarsipkan. Konten tidak hilang dan dapat dirujuk/dipulihkan.
5. Untuk penghapusan permanen, Admin menilai relasi, dampak publik, backup, dan alasan. Tindakan serta target dicatat dalam audit log.

## Kegiatan dan jadwal

- Gunakan event untuk kegiatan pada tanggal/rentang tertentu.
- Gunakan schedule untuk pola mingguan; contoh Sekolah Sabat dan ibadah Sabat.
- Gunakan schedule exception untuk libur, perpindahan jam, atau acara khusus. Jangan membuat duplikasi jadwal mingguan untuk satu pengecualian.
- Tulis waktu dalam konteks WITA pada input dan halaman publik. Sistem menyimpan timestamp sebagai UTC.

## SOP galeri foto

1. Tentukan album, kategori, tanggal kegiatan, dan departemen/event bila relevan.
2. Pastikan setiap foto layak publik dan memiliki persetujuan. Foto anak wajib memiliki izin wali.
3. Optimalkan ke JPEG derivative, bersihkan metadata EXIF/geolocation, isi alt text dan caption bila perlu.
4. Upload ke draft album. Tandai aset atau album dapat diunduh hanya bila gereja memang mengizinkan.
5. Terbitkan album hanya saat semua aset yang terlihat berstatus consent approved.
6. Bila ada keberatan/consent dicabut, Admin menyembunyikan aset segera. Sistem mengeluarkannya dari grid, lightbox, dan ZIP baru.

## Aturan unduhan

- Satu foto: hanya derivative JPEG dengan flag public_download_enabled.
- Album/kategori: ZIP dibentuk dari aset yang pada saat request masih published, consent approved, tidak hidden, dan download-enabled.
- ZIP memiliki limit ukuran/file, expiry singkat, dan dapat gagal secara aman jika kuota/ukuran melewati batas.
- Original, foto pending consent, foto anak tanpa izin, dan aset hidden tidak pernah tersedia untuk unduhan publik.

## Operasi pastoral Phase 3

Permohonan doa, informasi pengunjung, dan lead belajar bukan konten editorial. Hanya Admin yang menangani:

- buka data melalui dashboard privat;
- beri status penanganan tanpa memasukkan informasi pastoral sensitif ke audit/log;
- ekspor hanya jika perlu, dengan alasan dan catatan audit;
- review/hapus mengikuti periode retensi yang ditetapkan Admin.

## Course Alkitab dan lesson

Admin/Editor aktif memakai tab **Pelajari Alkitab** untuk membuat course, memilih induknya, lalu mengelola lesson. Materi baru selalu Draft; publikasi dilakukan setelah materi tersimpan.

- Isi lesson berupa teks berparagraf maksimal 50.000 karakter. HTML/Markdown ditampilkan sebagai teks. Judul maksimal 200 karakter, slug maksimal 220 karakter, ringkasan maksimal 500 karakter.
- **Menyimpan revisi Published mempertahankan status dan langsung memperbarui konten publik bila induknya Published.** Gunakan **Jadikan Draft** sebelum merevisi materi yang perlu disembunyikan. Tidak ada salinan revisi atau versioning pada P3-001.
- Slug dapat diperbaiki sebelum publikasi pertama dan terkunci setelahnya, termasuk setelah materi diarsipkan atau dipulihkan.
- Lesson hanya terbaca publik bila lesson dan course induknya sama-sama Published. Course Draft/Arsip langsung menyembunyikan seluruh lesson tanpa mengubah status anak. Menerbitkan ulang course kembali menampilkan lesson yang masih Published. Course kosong boleh diterbitkan.
- Nomor urut lesson harus berupa integer positif dan unik dalam course. Nomor boleh bercelah; konflik nomor ditolak tanpa mengosongkan form. Tidak ada drag-and-drop/pengurutan massal.
- Hanya Admin dapat menghapus permanen melalui konfirmasi. Course yang masih memiliki lesson ditolak dengan RESTRICT; tangani lesson lebih dahulu. Penghapusan tidak melakukan cascade materi. Database mencatat mutasi dan actor; isi lesson tidak disalin ke audit.
- Kegagalan simpan mempertahankan form. Menutup form yang berubah memerlukan konfirmasi buang perubahan. Data halaman disegarkan setelah server mengonfirmasi sukses.

Reader publik, progres/bookmark, dan perubahan CTA tetap P3-002. Migration P3-001 baru diterapkan lokal; penerapan production mengikuti proses rilis terpisah.

## Impor course (backlog P3-003)

Impor dari pihak ketiga belum tersedia. Saat diimplementasikan:

1. Masuk ke staging/import record, bukan langsung ke course Published.
2. Validasi skema, URL/asset, bahasa, duplikasi, dan lisensi.
3. Editor meninjau preview dan memperbaiki konten.
4. Publikasi memakai lifecycle biasa.

Tidak ada auto-publish atau auto-sync sumber pihak ketiga.
