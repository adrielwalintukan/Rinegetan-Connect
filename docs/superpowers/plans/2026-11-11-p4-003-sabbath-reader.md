# P4-003 Sabbath Reader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pengunjung membuka daftar pelajaran triwulan Dewasa aktif, memilih pelajaran dan membaca materi harian Indonesia di situs tanpa akun.

**Architecture:** Gunakan katalog P4-002 sebagai daftar sumber tepercaya. Loader server mengambil metadata lesson dan bacaan harian dari endpoint `/in/`, memvalidasi identitas/tanggal terhadap induknya, menyanitasi HTML sebelum cache Next.js satu jam, lalu merender halaman publik dinamis. RPC PostgreSQL existing tetap tertutup.

**Tech Stack:** Next.js/React existing, Node test runner, Playwright. Gunakan sanitizer HTML terpelihara yang telah terpasang bila tersedia; jika tidak, tambahkan `sanitize-html` beserta tipe development yang diperlukan, bukan parser/sanitizer buatan sendiri.

**Spec:** Issue #52; persetujuan pemilik untuk reader anonim dengan atribusi/waktu pembaruan dalam percakapan 2026-11-11; hak fetch/display/cache server online dikonfirmasi sebelumnya, bukan izin offline. Alur daftar pelajaran → bacaan harian adalah rekomendasi implementer, bukan jawaban eksplisit pemilik atas pilihan halaman awal.

## Global Constraints

- Branch `feature/p4-003-sabbath-reader` dari `origin/development` setelah PR #95 merge; tanpa clone/worktree/merge, pertahankan `remotion/`.
- Indonesia `in` saja, Dewasa aktif yang terbukti; tidak menebak bahasa/kelas atau mengganti isi sumber.
- Tanpa akun, penyimpanan identitas/progres di Supabase, analytics isi, offline/download, atau pembukaan RPC privat.
- Jangan unggah dokumen izin privat, kredensial, nama AI atau path lokal ke GitHub.
- Pertahankan empat kelas lokal dan gaya situs; mobile-first, heading/fokus/navigation aksesibel.
- Sanitasi dengan parser terpelihara; jangan regex-strip HTML atau merender raw HTML upstream.

## Source Evidence (probe 2026-11-11)

- Lesson `2026-04/lessons/07/index.json`: object `{lesson,days,pdfs}`, 7 hari dengan ID/index/tanggal/read_path; jangan mengonsumsi `pdfs` atau cover.
- Day `2026-04/lessons/07/days/05/read/index.json`: `{id,date,index,title,bible,content}`; content adalah HTML (paragraf, code, entity, referensi ayat `<a class="verse" verse="…">`). `read.json` dan path lesson tanpa `/lessons/` mengembalikan HTML SPA berstatus 200.
- `bible` memuat HTML ayat tambahan. Tahap ini hanya merender `content`; referensi ayat tetap terbaca sebagai teks, tanpa popup Alkitab/fitur klik palsu. Jangan mempublikasikan isi penuh probe sebagai fixture.

## Review Focus

- HTML berbahaya/malformed, SVG/script/event handlers, URL javascript/data/protocol-relative dan resource remote tidak boleh dieksekusi/dimuat.
- Lesson/day yang tidak dimiliki katalog/lesson aktif harus ditolak sebelum fetch; URL dari payload tidak boleh menjadi target fetch.
- Payload foreign-language, index/tanggal silang, duplikat atau isi kosong tidak boleh dicache sebagai materi valid.
- Gangguan upstream harus memperlihatkan cache valid terakhir dan waktu bila cache masih tersedia, bukan materi karangan; jangan menjanjikan cache durable lintas deploy.
- Link langsung, keyboard, judul panjang dan isi lebar harus aman di 320px; cache halaman tidak boleh membekukan periode WITA.

## Task 1: Read model dan sanitasi

**Files:** Modify `frontend/src/lib/sabbath/server.ts`; create `frontend/src/lib/sabbath/reader.mjs`, `frontend/tests/p4-003-reader.test.mjs`; package manifest/lock hanya bila sanitizer belum tersedia.

**Interfaces:** `normalizeReaderLesson(payload, quarterly, lessonId)` menghasilkan metadata lesson/hari tervalidasi termasuk date; `normalizeReaderDay(payload, lesson, dayId)` menghasilkan `{id,index,title,date,html}` dengan HTML tersanitasi. Loader `loadSabbathLesson(quarterId, lessonId)` dan `loadSabbathDay(quarterId, lessonId, dayId)` menghasilkan `{status:"available",data,sourceUrl,sourceVersion,fetchedAt}` atau `{status:"unavailable"}`. ID route quarterly `YYYY-0[1-4]`, lesson/day dua digit; keanggotaan induk tetap wajib, regex bukan otorisasi tunggal.

- [ ] RED test endpoint asli `/lessons/.../days/.../read/index.json`, induk/anak cocok, date valid dalam periode, duplikat/asing/silang/unknown ditolak, unknown tidak melakukan fetch.
- [ ] RED sanitasi: pertahankan p/h2–h4/em/strong/ul/ol/li/blockquote/code/br/sup/sub; hapus script/style/iframe/svg/img dan semua atribut event/style/class/id. Heading upstream h1 turun menjadi h2. Anchor referensi ayat tanpa href diubah menjadi teks; link eksternal hanya HTTPS dengan rel aman, tanpa resource remote. Uji entity, malformed markup dan whitespace.
- [ ] Implementasikan read model minimum, gunakan fetch helper berlimit 2 MiB/timeout 10 detik/JSON/version existing, konstruksi path dari ID tervalidasi. Jangan ikuti full_read_path upstream.
- [ ] Cache hanya hasil valid dengan identitas dan key tanggal WITA satu jam. Kegagalan dilempar di dalam cache; fallback unavailable di luarnya. Uji same-key revalidation failure menjaga snapshot terakhir sesuai perilaku Next, dan dokumentasikan batas cold cache/deploy.
- [ ] GREEN test terarah, probe nyata metadata/hasil sanitasi tanpa menyimpan konten penuh ke repository.

## Task 2: Halaman daftar dan reader

**Files:** Modify `frontend/src/components/pages/SekolahSabatPage.jsx`; create `frontend/src/app/(public)/sekolah-sabat/[quarterId]/page.tsx`, `[quarterId]/[lessonId]/page.tsx`, `[quarterId]/[lessonId]/[dayId]/page.tsx` di direktori yang sama; create komponen reader bersama bila perlu dan `frontend/tests/p4-003-reader-page.test.mjs`; browser test di `frontend/tests/visual/`.

**Interfaces:** Katalog menambah tautan internal “Lihat pelajaran”, tetap menyediakan sumber resmi. Route quarter menampilkan daftar pelajaran tervalidasi; route lesson menampilkan daftar hari; route day menampilkan judul/tanggal/isi, navigasi hari sebelumnya/berikutnya dalam lesson dan tautan kembali. Semua loader setelah `await connection()`; invalid identifier/not-member menghasilkan notFound, gangguan sumber halaman unavailable dengan tautan kembali/sumber tetap.

- [ ] RED render daftar/harian/navigasi/atribusi/waktu/unavailable dan request boundary; tidak ada login/download/progres atau href tidak tepercaya.
- [ ] Implementasi gaya existing: lebar baca terbatas, teks nyaman, wrapping, fokus terlihat dan target sentuh minimal 44px. Tidak menambah redesign situs atau framework Markdown.
- [ ] GREEN test render/route dan browser deterministik dengan fixture sintetis untuk list → day → next/back, XSS, keyboard serta overflow 320/375/768/1440px; tanpa fixture route produksi atau ketergantungan upstream CI.

## Task 3: Bukti dan delivery

**Files:** Update kontrak integrasi, backlog, architecture dan record `docs/04-delivery/records/P4-003-2026-11-11.md`; checklist plan ini.

- [ ] Catat kontrak aktual, cakupan HTML yang didukung, sanitizer, batas cache/fallback, atribusi dan tidak adanya offline/RPC/progres; sinkronkan #52 tanpa menutup acceptance otomatis.
- [ ] Jalankan `npm run test:all`, browser/a11y relevan, probe Next produksi serta regresi gate privat; catat hasil aktual tanpa mengklaim lingkungan yang tidak diuji.
- [ ] Satu review independen seluruh branch; tangani temuan valid, commit/push, PR baru ke development, verifikasi CI pada SHA HEAD terbaru; tanpa merge.
