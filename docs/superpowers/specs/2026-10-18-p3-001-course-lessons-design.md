# P3-001 — Model dan CMS Course/Lesson

**Status:** Disetujui pemilik project pada 2026-10-18; implementasi menunggu review rencana eksekusi.
**Dasar integrasi:** `development` pada `efed2c3`.
**Keputusan pemilik:** melanjutkan pengembangan Phase 3, menunda backup/persiapan rilis, dan memakai teks berparagraf untuk isi lesson.

## Tujuan dan ukuran selesai

Admin dan Editor aktif dapat membuat course, menambahkan lesson berurutan, menyunting, menerbitkan, mengembalikan ke Draft, dan mengarsipkan melalui portal staf. Publik hanya dapat membaca course Published serta lesson Published yang course induknya juga Published. Semua mutasi diaudit oleh database.

P3-001 menyediakan fondasi data dan CMS. P3-002 menyediakan halaman reader publik, navigasi belajar, bookmark/progres browser, dan perubahan CTA Pelajari Alkitab. Materi asli dimasukkan oleh staf; contoh sintetis hanya untuk pengujian lokal.

## Pendekatan yang dibandingkan

1. **Dua tabel relasional dan pengelola course khusus di portal staf (direkomendasikan).** Mengikuti RLS, lifecycle, modal, dan audit yang sudah ada; hubungan course/lesson tidak memaksa dialog CMS umum menangani struktur bertingkat.
2. Menyimpan seluruh lesson dalam JSON pada course. File lebih sedikit, tetapi validasi, pengurutan, audit, dan publikasi per lesson menjadi lebih sulit.
3. Memperluas pengumuman menjadi platform konten generik. Memerlukan refactor entitas yang sudah stabil dan memperlebar scope tanpa kebutuhan saat ini.

Pilih pendekatan 1, tanpa dependency baru. Logika yang dapat diuji berada di `.mjs`; `.ts` menjadi re-export dan deklarasi tipe bila diperlukan. Perilaku CMS lain tetap diuji sebagai regresi.

## Model data

Gunakan UUID, enum `public.content_status`, serta metadata lifecycle seperti entitas CMS saat ini. Migration baru bersifat lokal dan additive; migration Phase 2 yang sudah ada tidak diubah.

### `public.courses`

| Kolom | Aturan |
| --- | --- |
| id | UUID primary key |
| title | Teks terpangkas, 1–200 karakter |
| slug | Teks 1–220 karakter, huruf kecil/angka/tanda hubung, unik global |
| summary | Teks terpangkas maksimal 500 karakter; boleh kosong |
| status | Draft secara default; Published atau Archived melalui mutasi eksplisit staf |
| published_at | Waktu publikasi pertama diisi database; bukan input bebas dari klien |
| created_at, updated_at | Timestamptz UTC, dikelola database |
| created_by, updated_by | FK Auth user, dikelola database dari sesi terverifikasi |

### `public.course_lessons`

| Kolom | Aturan |
| --- | --- |
| id | UUID primary key, stabil untuk progres lokal pada P3-002 |
| course_id | FK course wajib, `ON DELETE RESTRICT`; tidak dapat dipindah setelah dibuat |
| title, slug, summary | Batas seperti course; slug unik dalam course yang sama |
| body | Teks berparagraf maksimal 50.000 karakter; boleh kosong dalam Draft, wajib berisi untuk Published |
| position | Bilangan bulat positif; unik dalam course; urutan ditentukan angka ini |
| status, published_at | Lifecycle independen dengan aturan waktu yang sama seperti course |
| created_at, updated_at, created_by, updated_by | Aturan sama seperti course |

Slug boleh diperbaiki sebelum publikasi pertama; setelah itu tetap stabil agar rute P3-002 tidak berubah tanpa redirect. ID tidak dapat ditentukan ulang lewat form. Nomor urut boleh memiliki celah; penggantian ke nomor yang sudah terpakai ditolak dengan pesan jelas. Drag-and-drop dan pengurutan massal tidak termasuk scope.

Indeks awal mengikuti query: unique slug course, unique `(course_id, slug)` dan `(course_id, position)` untuk lesson, serta indeks course Published bila diperlukan oleh daftar publik. Hindari indeks duplikat yang sudah dicakup constraint.

Course kosong boleh disimpan dan diterbitkan. Reader P3-002 wajib menampilkan keadaan kosong bila belum ada lesson publik. Ini menghindari aturan publikasi induk/anak yang saling mengunci.

## Otorisasi dan batas publik

RLS aktif pada kedua tabel, grants dicabut dahulu lalu diberikan minimum per operasi.

| Persona | Baca | Buat/ubah/publish/archive | Hapus permanen |
| --- | --- | --- | --- |
| anon | Course Published; lesson Published dengan induk Published | Tidak | Tidak |
| Auth user tanpa peran / staf nonaktif | Hanya konten publik yang sama | Tidak | Tidak |
| Editor aktif | Semua course/lesson | Ya | Tidak |
| Admin aktif | Semua course/lesson | Ya | Ya |

Peran dan keaktifan memakai helper database yang sudah ada, bukan user metadata atau nilai role dari body request. Mutasi memakai client Supabase sesi staf; tidak memakai admin/secret client untuk melewati RLS.

Lesson boleh disiapkan sebagai Published di bawah course Draft, tetapi tetap tidak terbaca publik. Ketika course ditarik ke Draft atau Archived, seluruh lesson langsung tidak terbaca publik tanpa mengubah status anak. Publikasi kembali course akan menampilkan kembali lesson yang masih Published; UI memberi informasi dampak ini.

Policy lesson memeriksa status induk di database sehingga akses langsung ke Data API atau lookup melalui ID tidak membocorkan lesson di dalam course Draft/Archived. Kolom actor internal tidak diberikan kepada anon. Reader kelak menggunakan proyeksi kolom publik eksplisit dan client anonim.

## Mutasi, validasi, dan audit

- Form membuat Draft terlebih dahulu; publikasi merupakan tindakan eksplisit setelah tersimpan.
- Keputusan lanjutan pemilik: menyimpan revisi course/lesson Published mempertahankan status dan langsung memperbarui isi yang terbaca publik jika induknya Published. Staf menggunakan Jadikan Draft secara eksplisit bila materi perlu disembunyikan selama revisi; tidak ada salinan revisi/versioning pada P3-001.
- Server memverifikasi sesi serta staf aktif, UUID, action, tipe payload, panjang field, slug, integer position, dan whitelist kolom.
- Validasi penting diulang melalui constraint/trigger database untuk caller yang mengakses Data API langsung. Metadata actor/waktu dan identitas tidak dapat dipalsukan lewat payload.
- Batas Published: judul dan slug valid; isi lesson tidak boleh kosong/whitespace. Teks bukan HTML atau Markdown; tampilkan sebagai teks React dengan pemisahan paragraf, tanpa `dangerouslySetInnerHTML`.
- Gunakan trigger database untuk `content.created`, `content.updated`, `content.status_changed`, dan `content.deleted` dengan entity_type course/lesson yang sesuai. Delta audit mencatat identitas, status, relasi, dan perubahan urutan yang relevan; tidak menyalin body lesson.
- Hanya Admin dapat menghapus permanen melalui konfirmasi UI. Course yang masih memiliki lesson tidak dapat dihapus; tampilkan alasan relasi dan minta Admin menangani lesson terlebih dahulu. Tidak ada cascade yang menghapus materi diam-diam.
- Detail error database tidak masuk response. Gunakan `UserFacingError`, `publicErrorMessage`, dan `clientErrorMessage` sesuai pola project. Validasi/konflik memberi pesan Bahasa Indonesia, sesi kedaluwarsa meminta login kembali.
- Mutasi menyegarkan data portal staf. Tidak ada cache Draft yang dapat dipakai ulang sebagai response publik. Revalidasi reader ditambahkan bersama rute publik P3-002 agar tidak mengklaim integrasi rute yang belum ada.

## Alur portal staf

Tambahkan tab **Pelajari Alkitab** untuk Admin/Editor. Tab menampilkan daftar course dengan pencarian dan filter status; memilih course membuka daftar lesson berurutan dengan konteks induk yang selalu terlihat.

Course dan lesson mempunyai tambah/edit, status, serta tindakan arsip/pemulihan yang konsisten dengan CMS. Lesson menampilkan nomor urut dan peringatan bila induknya belum Published. Tombol kembali ke daftar course tidak membuang perubahan tanpa penanganan dialog yang sesuai.

Gunakan komponen UI yang sudah ada, label Bahasa Indonesia, warna navy/amber, fokus keyboard terlihat, target sentuh minimal 44px, dan state loading/error/kosong. Daftar menjadi kartu pada mobile; dialog mengikuti `Modal` dan `MODAL_BACKDROP`. Verifikasi 320, 375, 768, 1024, dan 1440px tanpa overflow. Isi panjang dan slug panjang harus membungkus dengan benar.

## Scope yang ditunda

- Reader publik dan progres/bookmark lokal: P3-002.
- Import pihak ketiga, sumber/lisensi, staging, dan preview import: P3-003; tetap draft-only saat diimplementasikan.
- Lead minat belajar, doa, kunjungan, consent pastoral, Turnstile, retensi, dan ekspor: P3-004–P3-006.
- Editor visual, Markdown, media tersemat, kuis, sertifikat, akun Member, dan progres server.
- Backup baru, migration production, merge rilis ke main, dan promote Vercel. Penundaan backup oleh pemilik berlaku untuk pekerjaan pengembangan ini; persyaratan rilis production tetap ditangani sebelum rilis kelak.

## Acceptance criteria dan bukti verifikasi

1. Database lokal kosong dapat dibangun dari seluruh migration; migration baru menyertakan grants, RLS, constraint, trigger, dan pgTAP dalam perubahan yang sama.
2. pgTAP menguji matriks persona di atas untuk kedua tabel, termasuk akses ID langsung, lesson Published di bawah induk Draft/Archived, perubahan visibilitas setelah induk ditarik, dan penolakan mutasi staf nonaktif/nonstaf.
3. pgTAP membuktikan Editor ditolak untuk permanent delete, relasi course tidak terhapus cascade, uniqueness/FK/position/body ditolak bila salah, metadata actor tidak dapat dipalsukan, dan setiap mutasi menghasilkan audit yang benar tanpa body lesson.
4. Test Node memanggil logika `.mjs` nyata untuk validasi/payload/mutasi dan penanganan error; input buruk tidak mencapai query mutasi, dan kegagalan database tidak dilaporkan sebagai sukses.
5. Uji integrasi memastikan route memakai sesi staf/RLS, menolak anon, tidak menerima target tabel sewenang-wenang, dan tidak mengembalikan error database mentah.
6. Uji UI lokal membuktikan Admin/Editor dapat membuat course/lesson Draft, menyunting, mengatur nomor urut, publish/archive, membaca peringatan induk, serta memulihkan state setelah refresh. Aksi destruktif hanya muncul untuk Admin.
7. `npm run test:all`, seluruh pgTAP, dan pemeriksaan responsif/keyboard lulus. Baseline sebelum implementasi: 165 test Node lulus; quality gate lengkap sebelumnya juga telah lulus pada development yang sama.

## Referensi

- [PRD](../../01-product/PRD.md)
- [Issue backlog P3-001 dan P3-002](../../04-delivery/ISSUE-BACKLOG.md)
- [Model data dan RLS](../../03-architecture/DATA-MODEL-AND-RLS.md)
- [Keamanan dan privasi](../../03-architecture/SECURITY-PRIVACY.md)
- [Sistem desain](../../02-design/DESIGN-SYSTEM.md)
- [Operasi konten](../../04-delivery/CONTENT-OPERATIONS.md)
- [Workflow Git](../../04-delivery/GIT-WORKFLOW.md)
- [Strategi pengujian](../../06-quality/TEST-STRATEGY.md)
