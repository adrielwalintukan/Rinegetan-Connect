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

**Minat belajar (P3-004).** Pengunjung mengisi form "Ingin belajar bersama?" di halaman Pelajari Alkitab. Admin aktif membuka tab **Minat belajar** di portal staf, menghubungi peminat lewat kontak yang diberikan, lalu mengubah status menjadi **Sudah dihubungi** atau **Selesai**. Editor tidak melihat tab ini. Daftar menampilkan 50 lead terbaru beserta tanggal masuk dan usia lead. Penghapusan otomatis dan ekspor belum tersedia (P3-006); sampai itu ada, retensi 24 bulan dijalankan manual oleh Admin mengikuti [runbook retensi dan penghapusan lead](RETENTION-DELETION-RUNBOOK.md). Jangan menyalin isi lead ke dokumen atau chat lain.

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

## Impor course (P3-003)

Impor memasukkan satu course beserta lesson-nya dari berkas JSON yang disiapkan staf. Tidak ada koneksi ke situs atau API pihak ketiga, tidak ada auto-publish, dan tidak ada auto-sync. Status: selesai di branch fitur, menunggu merge ke `development`; belum dirilis ke production.

**Peran.** Editor dan Admin dapat mengunggah dan melihat preview. Hanya Admin yang menyetujui atau menolak. Admin boleh menyetujui impornya sendiri; daftar memberi label "Diunggah dan disetujui oleh orang yang sama".

**Format dan batas.** Contoh lengkap: [course-import-example.json](templates/course-import-example.json) (data sintetis; ganti seluruh isinya).

- `format` harus `rinegetan-course-import/1`, `language` harus `id`; kunci di luar format ditolak.
- Berkas maksimal 2 MB; 1-100 lesson per course.
- Judul 1-200 karakter, ringkasan maksimal 500, isi lesson 1-50.000 karakter (wajib terisi), slug maksimal 220 dengan pola yang sama seperti CMS. Nomor urut lesson bilangan bulat positif; slug dan nomor urut lesson unik dalam berkas.
- `source.name`, `source.rights_holder`, dan `license.name` wajib (maksimal 200); `license.notes` opsional (maksimal 1.000). URL opsional dan hanya `https://`.
- Slug course yang sudah dipakai course lain atau impor yang masih menunggu ditolak. Impor tidak pernah menimpa course yang ada.
- Isi tampil sebagai teks berparagraf; HTML/Markdown tidak dirender.

**Langkah.**

1. Di portal staf, tab **Pelajari Alkitab**, pilih **Impor JSON** dan pilih berkas. Bila ada kesalahan, pesan menyebut field-nya (mis. `lessons[3].slug`); perbaiki berkas lalu unggah ulang. Berkas yang ditolak tidak menyisakan catatan impor.
2. Berkas valid masuk daftar Impor berstatus menunggu, lengkap dengan sumber, pemegang hak, dan lisensi. Pilih **Lihat preview** untuk memeriksa course dan lesson. Bahasa tidak dideteksi otomatis; periksa sendiri di preview.
3. Admin memeriksa sumber dan izin lisensi, lalu memilih **Setujui** (dengan konfirmasi) atau **Tolak** (alasan wajib, maksimal 500 karakter).
4. Setelah disetujui, course dan semua lesson dibuat sebagai Draft dalam satu transaksi. Course muncul di daftar course; terbitkan lewat pengelola course seperti biasa. Hasil impor tidak pernah langsung Published.

**Perbaikan isi.** Sebelum keputusan: unggah ulang berkas yang sudah diperbaiki (payload impor tidak dapat diedit; impor lama yang salah ditolak lebih dahulu agar slug bebas). Sesudah menjadi Draft: edit lewat CMS course/lesson P3-001.

**Catatan.** Catatan impor, sumber, dan lisensi disimpan permanen dan tidak dapat dihapus dari aplikasi; payload ikut tersimpan. Tinjau pembersihan bila penyimpanan database mendekati kuota paket. Persetujuan dan penolakan tercatat di audit tanpa isi payload.

## Penggunaan reader P3-002

Pengunjung membuka **Pelajari Alkitab** dari CTA navigasi/Hero, card Alkitab, atau note `/pelayanan#alkitab` yang tetap tersedia. Pilih course dan lesson; course Published tanpa lesson memiliki pesan kosong. Materi tidak tersedia/ditarik memberi halaman tidak ditemukan. Kegagalan layanan memberi tombol **Coba lagi**, bukan katalog kosong palsu.

- Membuka lesson menyimpan posisi terakhir, tanpa otomatis selesai. **Tandai selesai** / **Batalkan selesai** dan **Simpan bookmark** / **Batalkan bookmark** bekerja hanya pada browser/perangkat ini. Membersihkan data situs dapat menghapusnya.
- **Lanjut belajar** memakai lesson terakhir yang masih publik; fallback adalah lesson publik pertama yang belum selesai, lalu lesson pertama. Materi tersembunyi tidak menghasilkan tautan atau hitungan tambahan. Revisi dengan ID sama mempertahankan progres.
- Bila storage tidak tersedia/penuh, materi tetap dapat dibaca dan warning menjelaskan perubahan tidak persisten. Pilihan di halaman aktif dipertahankan dalam memori, tetapi dapat hilang setelah reload/navigasi. Tidak ada kiriman progres ke staf/server.
- Untuk menarik materi, jadikan lesson atau induk Draft/Arsip melalui CMS. Request publik baru mengikuti invalidasi sesudah commit. Tab/riwayat yang telah menerima konten bukan salinan yang dapat ditarik kembali. Perubahan langsung di luar CMS mengikuti cache 60 detik.
- Warning penyegaran publik sesudah simpan berarti mutasi sudah tersimpan. Periksa ulang tampilan publik beberapa saat lagi; jangan mengulangi simpan seolah database rollback.

Form minat/doa/kunjungan, retensi pastoral, dan offline/PWA tetap backlog. Akun Member tidak direncanakan.
