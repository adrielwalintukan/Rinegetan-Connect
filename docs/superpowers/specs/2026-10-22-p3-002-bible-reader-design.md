# P3-002 — Reader Pelajari Alkitab

**Status:** Spesifikasi dan [rencana implementasi](../plans/2026-10-22-p3-002-bible-reader.md) disetujui pemilik pada 2026-10-22. Implementasi, review per tugas dan review seluruh branch selesai; bukti lokal/CI tercatat pada [record P3-002](../../04-delivery/records/P3-002-2026-10-22.md). [PR #42](https://github.com/adrielwalintukan/Rinegetan-Connect/pull/42) menuju development; checks commit terakhir tetap gerbang integrasi. Belum merge atau rilis production.
**Dasar integrasi:** `development`, commit `42a3d01`, hasil merge PR #41. CI hasil merge lulus.
**Branch:** `feature/p3-002-bible-reader`, menuju `development` melalui PR.
**Keputusan pemilik:** Progres memakai tombol **Tandai selesai**; membuka lesson tidak otomatis menyelesaikannya. Rancangan reader, penyimpanan lokal, cache/invalidation, dan batas scope disetujui untuk dituangkan menjadi spesifikasi.

## Tujuan dan ukuran selesai

Pengunjung dapat menemukan course Published, membaca lesson Published secara berurutan tanpa akun, menandai selesai, menyimpan bookmark, dan melanjutkan lesson terakhir pada browser yang sama. Materi dikelola melalui CMS P3-001; reader tidak menyediakan materi gereja buatan maupun contoh publik yang dianggap sebagai konten asli.

P3-002 melengkapi fondasi P3-001 dengan tiga permukaan publik, perilaku browser lokal, serta penghubung CTA dan invalidasi cache. Tidak ada perubahan schema database atau model peran. Seluruh halaman baru mengikuti sistem desain dan dapat dipakai pada 320, 375, 768, 1024, dan 1440px.

## Pendekatan yang dipilih

Gunakan Next.js Server Components dan client Supabase anonim untuk pengambilan materi; Client Components hanya menangani progres/bookmark lokal. Gunakan `localStorage` karena datanya berupa ID dan pilihan kecil, bukan salinan materi. Logika query dan penyimpanan yang dapat diuji berada pada `.mjs`; `.ts` hanya ekspor tipis dan tipe.

SPA penuh menambah JavaScript dan pengelolaan loading yang tidak diperlukan. IndexedDB menambah mekanisme asinkron untuk data kecil; penyimpanan paket materi/offline adalah pekerjaan fase lain. Keduanya tidak dipakai.

## Rute dan pengalaman membaca

| Rute | Isi |
| --- | --- |
| `/pelajari-alkitab` | Judul halaman, keterangan singkat, daftar course Published dengan judul/ringkasan dan tautan membuka course |
| `/pelajari-alkitab/[courseSlug]` | Identitas course, daftar lesson publik berurutan, progres course, penanda bookmark/selesai, serta Lanjut belajar bila tersedia |
| `/pelajari-alkitab/[courseSlug]/[lessonSlug]` | Breadcrumb, judul/ringkasan, isi berparagraf, tombol selesai/bookmark, tautan kembali ke course dan sebelumnya/berikutnya |

Slug mengacu pada kolom yang telah dikunci setelah publikasi pertama oleh P3-001. Lesson harus benar-benar milik course pada URL; lesson dengan slug sama di course lain tidak boleh tertukar. Nomor `position` dapat bercelah; navigasi mengambil tetangga dalam urutan lesson yang saat ini publik, bukan menghitung `position + 1`.

Daftar course diurutkan menurut `published_at` terbaru, lalu ID sebagai pemecah seri. Daftar lesson memakai `position` menaik, lalu ID. Tidak menambahkan pencarian/filter katalog, drag-and-drop, atau sistem kategori course.

Course Published tanpa lesson publik tetap dapat dibuka dan menampilkan keadaan kosong. Katalog tanpa course menampilkan pesan materi belum tersedia. Tidak ada konten contoh pengganti. Slug tidak valid, course tersembunyi, lesson tersembunyi, atau relasi URL salah menghasilkan tampilan tidak ditemukan yang tidak mengungkap judul/isi privat.

Isi lesson tetap teks biasa: paragraf dan baris baru dipertahankan, HTML/Markdown tidak dieksekusi maupun dirender sebagai markup. Teks panjang dan URL tanpa spasi tidak menimbulkan overflow. Tidak ada editor, gambar tersemat, audio, kuis, pencetakan khusus, atau unduhan materi dalam scope ini.

## Akses data dan batas kepercayaan

- Query publik memakai client anonim terpisah tanpa cookie sesi, penyimpanan sesi, atau admin client. Staf yang sedang login tetap melihat materi yang sama dengan pengunjung anonim pada reader.
- Gunakan proyeksi kolom publik eksplisit sesuai grants P3-001; jangan memakai `select('*')`, `created_by`, atau `updated_by`. Tipe publik terpisah tidak mengharuskan metadata actor yang tidak boleh dibaca anon.
- Course harus Published; lesson harus Published dan course induknya juga Published. Terapkan filter aplikasi untuk maksud query, sedangkan RLS tetap penegak akses. Akses ID/slug langsung juga harus mematuhi aturan ini.
- Daftar katalog dan daftar lesson menggunakan request berhalaman dengan urutan unik hingga lengkap. Jangan diam-diam berhenti pada batas 1.000 baris Data API. Body lesson hanya dimuat pada halaman lesson, bukan dalam seluruh katalog atau daftar lesson.
- Kegagalan konfigurasi/query/jaringan menjadi error aman dengan tindakan muat ulang. Bedakan hasil kosong yang sah, data tidak ditemukan, dan layanan gagal; jangan menyajikan layanan gagal sebagai sukses kosong atau menyimpan kegagalan sebagai cache konten valid.
- Jangan menulis progres, bookmark, identitas pembaca, atau event membaca ke Supabase maupun audit. Tidak menambah endpoint mutasi publik.

## Progres, bookmark, dan Lanjut belajar

Data lokal menggunakan satu key khusus aplikasi dengan versi schema. Data hanya memuat ID course, kumpulan ID lesson selesai, kumpulan ID lesson bookmark, dan ID lesson terakhir yang dibuka per course. Tidak menyimpan body, judul, profil, email, atau credential. Slug dan URL untuk navigasi selalu dibentuk dari data publik terbaru, bukan dipercaya dari penyimpanan browser.

| Tindakan | Perilaku |
| --- | --- |
| Membuka lesson | Menyimpan ID lesson terakhir untuk course tersebut; status selesai tetap |
| Tandai selesai | Menambahkan ID lesson ke kumpulan selesai; tombol berubah menjadi Batalkan selesai |
| Batalkan selesai | Menghapus ID lesson dari kumpulan selesai tanpa menghapus bookmark |
| Simpan bookmark | Menambahkan ID lesson ke kumpulan bookmark; dapat dibatalkan |
| Lanjut belajar | Pada halaman course, membuka lesson terakhir bila masih ada di daftar publik; bila tidak, menawarkan lesson publik pertama yang belum selesai, lalu lesson publik pertama bila semuanya selesai |

Tombol mulai/lanjut tidak ditampilkan bila course belum memiliki lesson publik. Bookmark dan selesai ditampilkan sebagai indikator pada baris lesson di halaman course; aksi mengubahnya berada pada halaman lesson. Bookmark berarti menandai pelajaran, bukan posisi scroll atau anotasi paragraf.

Progres dihitung dari irisan ID selesai dengan lesson yang saat ini publik pada course tersebut: jumlah selesai dari total lesson publik. ID untuk materi yang dihapus/ditarik tidak menghasilkan tautan, judul tersimpan, atau hitungan tambahan. ID lokal boleh tetap tersimpan agar pemulihan konten dengan ID sama tidak merusak progres sebelumnya. Revisi isi pada ID yang sama mempertahankan tanda selesai; tidak ada pelacakan versi materi atau reset otomatis.

Pembacaan storage dilakukan setelah browser tersedia; SSR/cache tidak memuat progres personal. Data rusak, versi tidak dikenal, tipe salah, ID tidak valid, dan akses storage yang melempar exception tidak boleh merusak reader. Bila penulisan gagal/kuota penuh, materi tetap terbaca dan UI memberi pemberitahuan bahwa perubahan tidak tersimpan secara persisten. Jangan mengklaim sukses menyimpan setelah kegagalan storage.

Tampilkan keterangan bahwa progres/bookmark hanya ada pada browser/perangkat ini dan dapat hilang jika data situs dibersihkan. Tidak ada login Member, sinkronisasi cloud, ekspor/impor progres, reset massal, atau analytics pembaca.

## Cache dan konsistensi dengan CMS

Konten publik menggunakan cache/revalidate 60 detik mengikuti pola halaman publik yang sudah ada. Cache hanya berisi data anonim Published; tidak menggunakan client sesi staf, progres lokal, atau hasil error. Semua rute reader memiliki kebijakan konsisten, termasuk metadata halaman dan hasil tidak ditemukan.

Tambahkan invalidasi khusus reader sesudah mutasi course/lesson berhasil pada `/api/staff/courses`. Invalidasi mencakup katalog, pola halaman course, dan pola halaman lesson; penghapusan memakai cakupan pola agar tidak memerlukan membaca ulang row yang telah hilang. Bila ada Data Cache bertag, tag reader juga harus kedaluwarsa segera, bukan hanya menyajikan salinan stale sambil memperbarui latar belakang. Gunakan API cache yang cocok dengan versi Next.js terpasang.

Simpan revisi Published tetap mempertahankan status seperti P3-001. Permintaan reader baru sesudah mutasi CMS berhasil harus mendapatkan revisi terbaru atau tidak ditemukan bila materi/induk ditarik. Kursus yang kembali Published menampilkan lagi lesson yang memenuhi syarat. Invalidasi tidak dilakukan untuk request yang ditolak atau mutasi database yang gagal, dan tidak boleh mengulang mutasi yang telah committed bila langkah invalidasi gagal. Bila kegagalan invalidasi terjadi setelah commit, pertahankan hasil simpan dan berikan peringatan aman; jangan mengklaim rollback atau gagal simpan yang tidak terjadi.

Uji cache melalui production build lokal: isi cache, lakukan mutasi melalui route CMS, lalu minta ulang URL katalog/course/lesson. Halaman yang sudah berada pada tab browser atau riwayat navigasi bukan mekanisme penarikan salinan yang pernah diterima pembaca. Perubahan langsung di luar CMS tidak memanggil hook invalidasi aplikasi dan mengikuti batas revalidasi 60 detik; RLS tetap mengatur setiap query database baru.

## Integrasi dan desain

- Gunakan public `PageShell`, Creation Grid, token navy/amber, dan identitas Advent resmi yang sudah ada. Reader fokus pada teks dengan lebar baca wajar; kolom ketujuh tidak diisi paragraf padat.
- Hubungkan CTA **Pelajari Alkitab** desktop/mobile dan Hero ke katalog. Pada seksi Alkitab di Pelayanan, sediakan akses ke reader. Rute Phase 1 dan anchor `/pelayanan#alkitab` tetap berfungsi; tidak mengubah seluruh navigasi atau konten lokal gereja.
- Pertahankan skip link, satu H1, hierarki heading, breadcrumb, fokus terlihat, target sentuh minimal 44px, label tombol dan state aksesibel. Tombol selesai/bookmark menyampaikan state aktif tanpa bergantung warna.
- Navigasi mobile tidak menutupi teks atau tombol. Seluruh kontrol dapat dipakai keyboard dan menghormati reduced motion; tidak menambah animasi berat.
- Metadata judul/deskripsi memakai materi publik yang benar. Error/not-found tidak membocorkan judul Draft. Tidak menambah sitemap global sebagai refactor terpisah bila proyek belum memiliki mekanismenya.

## Verifikasi dan acceptance

1. Query publik nyata atau batas jaringan terkontrol membuktikan proyeksi tanpa actor, filter Published/induk, relasi slug, urutan bercelah, pagination di atas 1.000 baris, serta error halaman lanjutan yang tidak menjadi daftar parsial.
2. Route/page nyata membuktikan HTML teks ter-escape, metadata publik, course kosong, tidak ditemukan, dan error aman. Membuka reader dengan sesi staf tidak membuat Draft terlihat.
3. Unit penyimpanan menguji selesai/batal, bookmark/batal, last-opened tanpa auto-complete, perhitungan progres, ID usang, input rusak/versi salah, browser tanpa storage, dan kegagalan baca/tulis/kuota tanpa klaim persistensi palsu.
4. Test handler CMS nyata membuktikan invalidasi setelah sukses simpan/status/hapus kedua entitas, tidak setelah penolakan, serta pelestarian hasil committed bila invalidasi gagal.
5. Browser lokal dengan fixture sintetis menguji katalog → course → lesson → selesai/bookmark → reload → lanjut; batal selesai/bookmark, hilangnya materi/induk sesudah cache terisi, revisi Published, storage gagal, dan navigasi sebelumnya/berikutnya. Tidak memakai akun/password production.
6. Chromium pada 320/375/768/1024/1440px: tanpa overflow, kontrol 44px, teks panjang, keyboard/fokus, dan CTA desktop/mobile benar. Screenshot hanya di artefak yang diabaikan Git.
7. Typecheck, lint, build, seluruh Node test, serta pgTAP yang sudah ada lulus. CI menjalankan migration dari database kosong; P3-002 tidak menambah migration atau dependency. Setiap bug yang ditemukan disertai regresi.
8. Dokumentasi operasi konten, backlog, dan record P3-002 mencatat bukti aktual dan batas perangkat/browser yang belum diuji. Perbarui baseline hasil merge P3-001 tanpa menghapus riwayat hasil sebelumnya.

## Di luar scope dan batas operasi

P3-003 impor course/lisensi, P3-004 lead minat belajar, P3-005 form pastoral/Turnstile, P3-006 retensi, integrasi Adventech/Sekolah Sabat, offline/PWA, push, akun Member, progres server, dan penyuntingan CMS baru tetap backlog. Tidak mengubah schema/RLS atau mekanisme audit P3-001.

Tidak ada secret nyata, akun production, pembacaan private key age, backup/rilis, SQL production, promote, atau merge `development`/`main` pada pekerjaan implementasi ini. Backup/persiapan rilis tetap ditunda sesuai arahan pemilik; penerapan migration P3-001 ke production adalah keputusan rilis terpisah. Jangan commit `.claude/`, `.ai-context/`, environment, backup, atau artefak test. Perintah manual untuk pemilik mengikuti PowerShell 5.1.

## Acuan

- [PRD Phase 3](../../01-product/PRD.md)
- [Issue backlog P3-002](../../04-delivery/ISSUE-BACKLOG.md)
- [Sistem desain](../../02-design/DESIGN-SYSTEM.md)
- [Arsitektur](../../03-architecture/ARCHITECTURE.md)
- [Model data dan RLS](../../03-architecture/DATA-MODEL-AND-RLS.md)
- [Keamanan dan privasi](../../03-architecture/SECURITY-PRIVACY.md)
- [Strategi pengujian](../../06-quality/TEST-STRATEGY.md)
- [Spec P3-001](2026-10-18-p3-001-course-lessons-design.md)
