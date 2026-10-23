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
- Batas judul/ringkasan/isi menghitung Unicode code point, sehingga emoji suplementer tidak terpotong oleh form. Isian yang melebihi batas tetap ada dan ditolak dengan pesan batas field dalam Bahasa Indonesia.
- **Menyimpan revisi Published mempertahankan status dan langsung memperbarui konten publik bila induknya Published.** Gunakan **Jadikan Draft** sebelum merevisi materi yang perlu disembunyikan. Tidak ada salinan revisi atau versioning pada P3-001.
- Slug dapat diperbaiki sebelum publikasi pertama dan terkunci setelahnya, termasuk setelah materi diarsipkan atau dipulihkan.
- Lesson hanya terbaca publik bila lesson dan course induknya sama-sama Published. Course Draft/Arsip langsung menyembunyikan seluruh lesson tanpa mengubah status anak. Menerbitkan ulang course kembali menampilkan lesson yang masih Published. Course kosong boleh diterbitkan.
- Nomor urut lesson harus berupa integer positif dan unik dalam course. Nomor boleh bercelah; konflik nomor ditolak tanpa mengosongkan form. Tidak ada drag-and-drop/pengurutan massal.
- Hanya Admin dapat menghapus permanen melalui konfirmasi. Course yang masih memiliki lesson ditolak dengan RESTRICT; tangani lesson lebih dahulu. Penghapusan tidak melakukan cascade materi. Database mencatat mutasi dan actor; isi lesson tidak disalin ke audit.
- Kegagalan simpan mempertahankan form. Menutup form yang berubah memerlukan konfirmasi buang perubahan. Data halaman disegarkan setelah server mengonfirmasi sukses.
- Sesudah simpan, tindakan mutasi menunggu penyegaran daftar selesai sebelum edit dapat dibuka kembali. Daftar course/lesson dimuat sampai lengkap melampaui batas 1.000 baris Data API; kegagalan pemuatan menampilkan pesan aman dan tombol muat ulang.

Status 2026-10-23: CMS course/lesson (P3-001) dan reader publik (P3-002) sudah merge ke `development` dan dirilis ke production melalui PR #39; migration P3-001 diterapkan ke production. Bukti: [record P3-002](records/P3-002-2026-10-22.md) dan [record rilis OPS-001](records/OPS-001-2026-10-23.md).

## Impor course (backlog P3-003)

Impor dari pihak ketiga belum tersedia. Saat diimplementasikan:

1. Masuk ke staging/import record, bukan langsung ke course Published.
2. Validasi skema, URL/asset, bahasa, duplikasi, dan lisensi.
3. Editor meninjau preview dan memperbaiki konten.
4. Publikasi memakai lifecycle biasa.

Tidak ada auto-publish atau auto-sync sumber pihak ketiga.


## Penggunaan reader P3-002

Pengunjung membuka **Pelajari Alkitab** dari CTA navigasi/Hero, card Alkitab, atau note `/pelayanan#alkitab` yang tetap tersedia. Pilih course dan lesson; course Published tanpa lesson memiliki pesan kosong. Materi tidak tersedia/ditarik memberi halaman tidak ditemukan. Kegagalan layanan memberi tombol **Coba lagi**, bukan katalog kosong palsu.

- Membuka lesson menyimpan posisi terakhir, tanpa otomatis selesai. **Tandai selesai** / **Batalkan selesai** dan **Simpan bookmark** / **Batalkan bookmark** bekerja hanya pada browser/perangkat ini. Membersihkan data situs dapat menghapusnya.
- **Lanjut belajar** memakai lesson terakhir yang masih publik; fallback adalah lesson publik pertama yang belum selesai, lalu lesson pertama. Materi tersembunyi tidak menghasilkan tautan atau hitungan tambahan. Revisi dengan ID sama mempertahankan progres.
- Bila storage tidak tersedia/penuh, materi tetap dapat dibaca dan warning menjelaskan perubahan tidak persisten. Pilihan di halaman aktif dipertahankan dalam memori, tetapi dapat hilang setelah reload/navigasi. Tidak ada kiriman progres ke staf/server.
- Untuk menarik materi, jadikan lesson atau induk Draft/Arsip melalui CMS. Request publik baru mengikuti invalidasi sesudah commit. Tab/riwayat yang telah menerima konten bukan salinan yang dapat ditarik kembali. Perubahan langsung di luar CMS mengikuti cache 60 detik.
- Warning penyegaran publik sesudah simpan berarti mutasi sudah tersimpan. Periksa ulang tampilan publik beberapa saat lagi; jangan mengulangi simpan seolah database rollback.

Impor, form minat/doa/kunjungan, retensi pastoral, dan offline/PWA tetap backlog. Akun Member tidak direncanakan.
