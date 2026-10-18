# P3-001 Course/Lesson Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin/Editor dapat mengelola Course/Lesson berparagraf melalui portal staf, dengan lifecycle, batas akses publik, dan audit yang ditegakkan database.

**Architecture:** Tambahkan dua tabel relasional dan modul Course/Lesson khusus. Mutasi menggunakan client sesi staf dan RLS; logika berada di `.mjs`, wrapper `.ts` tipis, UI mengikuti komponen portal yang sudah ada. Halaman reader dan progres browser tetap P3-002.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind, Supabase Postgres/RLS, Node test runner, pgTAP, Playwright; tanpa dependency baru.

**Spec:** [P3-001 Course/Lesson design](../specs/2026-10-18-p3-001-course-lessons-design.md), disetujui pemilik pada 2026-10-18. Revisi Published langsung berlaku, sebagaimana keputusan lanjutan pemilik.

## Global Constraints

- Kerja di `feature/p3-001-course-lessons`, turunan `development`; integrasi melalui PR ke `development`.
- Isi lesson memakai teks berparagraf, maksimal 50.000 karakter. Tidak ada HTML/Markdown atau editor visual.
- Judul 1–200 karakter, slug 1–220 karakter, ringkasan maksimal 500 karakter, position integer positif unik per course.
- Draft/Published/Archived; lesson hanya publik bila lesson dan course induk Published.
- Admin/Editor aktif mengelola konten; hanya Admin menghapus permanen. Peran berasal dari database.
- Slug terkunci setelah publikasi pertama; ID, course_id lesson, metadata actor/waktu tidak dapat dipalsukan.
- Course kosong boleh Published; nomor urut boleh bercelah; tidak ada pengurutan massal.
- UI Bahasa Indonesia, target sentuh minimal 44px, keyboard/fokus jelas, tanpa overflow pada 320/375/768/1024/1440px.
- Tidak ada dependency baru, fakta lokal buatan, akun production, pembacaan private key age, atau pemasukan secret oleh agent.
- Backup/persiapan rilis ditunda pemilik. Semua DDL/test hanya lokal atau CI terisolasi; tidak ada SQL production, promote, atau merge main.
- Jangan commit `.claude/`, `.ai-context/`, environment, backup, PII, atau artefak hasil tes.
- Perintah manual PowerShell 5.1: tanpa `&&`, ternary, dan placeholder sudut.

## Review Focus

1. Simpan revisi Published mempertahankan status; UI menjelaskan dampak langsung dan tidak menghapus teks saat request gagal. Test: Task 2 dan 3.
2. Menarik course menyembunyikan lesson Published termasuk akses langsung ID; memulihkannya mengembalikan visibilitas sesuai status anak. Test: Task 1.
3. Posisi duplikat, slug duplikat, FK course salah, dan penghapusan induk berisi lesson menghasilkan kegagalan aman, tanpa UI sukses palsu. Test: Task 1–3.
4. Caller mencoba memalsukan actor/timestamp/ID/course_id atau mengubah slug setelah pernah Published: database mempertahankan invariant, penghapusan akun staf tetap dapat mengosongkan FK actor secara sah, dan audit tidak memuat body. Test: Task 1–2.
5. Input CRLF, paragraf kosong, Unicode di batas panjang, judul/slug panjang, request non-JSON, sesi kedaluwarsa, dan data yang dihapus staf lain: tidak bocor/overflow/merusak form. Test: Task 2–3.

## Peta file dan tanggung jawab

| File | Tanggung jawab |
| --- | --- |
| `supabase/migrations/20261018180000_p3_001_course_lessons.sql` | Dua tabel, constraint, grants, RLS, trigger metadata/audit |
| `supabase/tests/p3_001_course_lessons.test.sql` | Test perilaku database untuk semua persona |
| `frontend/src/types/courses.ts` | Kontrak Course, CourseLesson, CourseContent |
| `frontend/src/lib/courses/mutations.mjs` + `.ts` | Parser whitelist, mutasi, dan error P3 |
| `frontend/src/app/api/staff/courses/route.ts` | POST: sesi aktif, parser, dispatcher mutasi, response aman |
| `frontend/tests/helpers/load-typescript.mjs` | Pemetaan import opsional untuk menguji route nyata |
| `frontend/tests/p3-001-course-mutations.test.mjs` | Validasi dan mutasi `.mjs` |
| `frontend/tests/p3-001-course-route.test.mjs` | Handler nyata dengan boundary jaringan disimulasikan |
| `frontend/src/components/staff/CourseManager.tsx` | Daftar course, pemilihan induk, daftar lesson, status/hapus |
| `frontend/src/components/staff/CourseMutationDialog.tsx` | Form course/lesson dan perlindungan perubahan belum tersimpan |
| `frontend/src/components/staff/DeleteConfirmationDialog.tsx` | Komponen yang dipakai ulang: perbaiki ukuran sentuh/label bila dibutuhkan |
| `frontend/src/components/staff/StaffDashboard.tsx` | Tab Pelajari Alkitab dan props CourseManager |
| `frontend/src/app/staff/(protected)/page.tsx` | Load data staf memakai client sesi setelah requireActiveStaff |
| `frontend/tests/p3-001-course-ui.test.mjs` | Render komponen nyata: role, state, teks ter-escape |
| `frontend/tests/visual/staff-courses.spec.ts` | Skenario interaktif lokal dan viewport portal |
| `docs/03-architecture/DATA-MODEL-AND-RLS.md`, `docs/04-delivery/CONTENT-OPERATIONS.md`, `docs/04-delivery/ISSUE-BACKLOG.md` | Kontrak/operasi/status P3-001 |
| `docs/04-delivery/records/P3-001-2026-10-18.md` | Bukti verifikasi dan batas pekerjaan tanpa identitas privat |

### Task 1: Schema, RLS, metadata, dan audit Course/Lesson

**Files:** migration, pgTAP, tipe courses, dan bagian Course/Lesson pada dokumen model data.

**Interfaces:**
- Consumes: enum `public.content_status`, `private.is_editor_or_admin()`, `private.is_admin()`, tabel `public.audit_logs`, dan Auth user yang sudah ada.
- Produces: `public.courses` dan `public.course_lessons` persis seperti spec. `Course` memuat id/title/slug/summary/status/published_at/created_at/updated_at/created_by/updated_by; `CourseLesson` menambah course_id/body/position. `CourseContent = { courses: Course[]; lessons: CourseLesson[] }`.
- Trigger baru: `private.prepare_course_content()` untuk metadata/invariant, `private.record_course_content_audit()` untuk audit. Keduanya `RETURNS trigger`, search_path kosong; audit SECURITY DEFINER. Trigger metadata boleh SECURITY DEFINER hanya untuk memeriksa FK Auth yang sedang dihapus; executable grants kedua fungsi dicabut dari PUBLIC/anon/authenticated. Jangan mengubah trigger Phase 2.

- [ ] **Step 1: Tulis test pgTAP gagal dengan fixture sintetis dan rollback.** Gunakan persona anon, auth tanpa role, Editor aktif, Editor nonaktif, Admin. Assertion perilaku pokok:

```sql
-- Setelah fixture disiapkan sebagai postgres dan role anon dipilih:
select results_eq(
  $$ select id from public.course_lessons
     where id = '73000000-0000-4000-8000-000000000002' $$,
  array[]::uuid[],
  'Published lesson under Draft course is hidden by direct ID'
);
-- Ulangi dengan course Published, Draft, Archived, lalu Published kembali.
```

  Uji grants kolom actor anon ditolak; anon tidak bisa menulis; auth nonstaf/nonaktif tidak bisa membaca Draft atau memutasi; Editor CRUD non-delete; Admin delete; FK RESTRICT; audit tetap privat. Uji SQLSTATE constraint sebagai persona yang memang memiliki izin, agar RLS tidak menyamarkan kegagalan. Editor DELETE yang ditolak RLS dapat menghasilkan nol baris.
- [ ] **Step 2: Jalankan baseline pgTAP P3 pada Supabase lokal sebelum migration baru.** Dari root: `frontend/node_modules/.bin/supabase.cmd --workdir . test db --local supabase/tests/p3_001_course_lessons.test.sql`. Expected: FAIL karena tabel belum ada. Start lokal hanya project ini jika perlu; tangkap output startup dan tampilkan status/diagnostik teredaksi saja, karena output CLI dapat memuat kredensial lokal.
- [ ] **Step 3: Implementasikan migration dan tipe.** Gunakan CHECK panjang/trim/body Published, uniqueness slug dan position sesuai scope, FK RESTRICT, RLS SELECT dengan pemeriksaan induk, INSERT/UPDATE Editor aktif dan DELETE Admin aktif. Anon mendapat SELECT kolom publik eksplisit, bukan seluruh tabel. authenticated mendapat grant yang diperlukan dengan policy aktif.

  `prepare_course_content()` mengisi actor/waktu dari sesi/database, mempertahankan created_by/created_at dan published_at pertama pada UPDATE, menolak perubahan ID/course_id/slug terkunci. INSERT Published langsung melalui Data API tetap harus memenuhi constraint dan mendapatkan metadata database. FK actor menggunakan ON DELETE SET NULL mengikuti lifecycle staf saat ini. Penjagaan metadata tidak boleh membatalkan pengosongan FK saat Auth user terkait benar-benar dihapus; pengecualian ini hanya berlaku jika referensi lama sudah tidak ada, bukan berdasarkan nilai kiriman caller. `record_course_content_audit()` menghasilkan action `content.created/updated/status_changed/deleted`, entity_type nama tabel, delta status/course_id/position tanpa body. Penghapusan mencatat alasan standar Admin sebagaimana UI saat ini; jangan mengandalkan `set_audit_reason` melalui RPC terpisah yang berbeda transaksi.
- [ ] **Step 4: Tambahkan assertion spoofing, perubahan posisi, slug terkunci, dan revisi Published.** UPDATE langsung dengan created_by/updated_by/timestamp palsu tidak mengubah atribusi; Published pertama menentukan published_at dan publikasi ulang tidak mengubahnya. Judul/isi Published dapat disunting dengan status tetap Published; whitespace-only body tidak dapat Published. Audit mendapat actor sesi dan posisi lama/baru, tidak memiliki key body atau salinan isinya. Hapus Auth user fixture yang menjadi pembuat sebagai postgres: konten tetap ada, FK actor menjadi NULL, dan operasi tidak gagal karena trigger metadata. Ini merupakan regresi lifecycle staf, bukan izin menghapus akun production.
- [ ] **Step 5: Terapkan hanya lokal dan jalankan seluruh pgTAP.** `frontend/node_modules/.bin/supabase.cmd --workdir . migration up --local`, lalu `frontend/node_modules/.bin/supabase.cmd --workdir . test db --local`. Expected: seluruh suite PASS. Uji rebuild dari database kosong melalui job database CI yang sudah ada; jangan reset volume lokal dengan data yang belum dikenali. Jika RAM terbatas, hentikan hanya container Supabase project ini sebelum quality gate frontend.
- [ ] **Step 6: Commit migration, tipe, test, dan model data yang terkait.** Pesan: `feat(courses): add course lesson schema and access controls`.

### Task 2: Mutasi server dan Route Handler yang diuji nyata

**Files:** modul mutations, route, helper loader, test mutations/route.

**Interfaces:**
- `parseCourseMutation(value: unknown): CourseMutation` pada `.mjs`, tipe JSDoc dan ekspor tipe di wrapper `.ts`.
- `CourseMutation`: `{ entity: 'courses' | 'course_lessons', action: 'save' | 'status' | 'delete', id?: string, data?: CourseForm | LessonForm, status?: ContentStatus }`. Untuk create lesson, data.course_id wajib; save update tidak mengubah parent/status. CourseForm = title/slug/summary. LessonForm = title/slug/summary/body/position dan course_id hanya saat create. Create selalu Draft.
- `executeCourseMutation(client: SupabaseClient, mutation: CourseMutation, role: 'admin'|'editor'): Promise<Course | CourseLesson | { id: string }>` mengembalikan row yang benar-benar termutasi, atau melempar error aman. Tidak membuat audit dari frontend.
- `POST(request: Request): Promise<Response>` memakai `createServerSupabaseClient()`, `requireActiveStaff(client)`, parser, dispatcher. Sukses `{success:true,data}`. 400 input salah, 401 belum login, 403 bukan staf aktif/Editor delete, 404 row hilang, 409 konflik slug/position/relasi, 500 kegagalan lain dengan pesan aman.
- `loadTypeScript(relativePath, imports = {})`: parameter pemetaan specifier ke URL modul opsional; perilaku pemanggil lama tetap sama.

- [ ] **Step 1: Tulis failing tests untuk parser dan dispatcher.** Assertions: null/array/nonobject/UUID buruk/entity arbitrary/action asing ditolak; create hanya mengirim field izin + Draft; status hanya melalui action status; save Published tidak memasukkan perubahan status; field actor/waktu/ID tidak pernah terkirim. CRLF body menjadi LF, paragraf dipertahankan, whitespace tepi dipangkas; batas panjang memakai karakter Unicode, konsisten dengan char_length database. String '2', NaN, pecahan, nol, dan negatif bukan position valid. Payload status/delete tidak menerima field save yang terselip.
- [ ] **Step 2: Jalankan `node --test tests/p3-001-course-mutations.test.mjs` dari frontend.** Expected: FAIL karena modul belum tersedia.
- [ ] **Step 3: Implementasikan parser/mutasi dengan dua target tabel yang tetap.** Update/delete wajib UUID dan `.select().single()` agar row hilang atau RLS gagal tidak dianggap sukses. Save tidak menerima metadata; update lesson tidak menerima course_id. Editor delete ditolak sebelum query. Konversi konflik 23505/23503 menjadi pesan P3 yang jelas tanpa menyalin message DB; jangan mengubah error CMS umum untuk konflik posisi.
- [ ] **Step 4: Tulis test handler TS nyata.** Extend loader secara kompatibel, transpile `staff/server.ts` nyata untuk dependency guard, mock hanya createServerSupabaseClient dan boundary cache bila ada. Panggil `POST(new Request(...))`; uji seluruh status di Interfaces, JSON rusak/array, auth expired/inaktif/tanpa role, Editor delete, DB error berisi sentinel privat, row hilang, revisi Published, dan keberhasilan save/status/delete. Assert request buruk tidak mencapai query mutasi, error tidak mengandung sentinel, dan route tidak memakai admin client.
- [ ] **Step 5: Jalankan tests baru dan regresi.** Dari frontend: `node --test tests/p3-001-course-mutations.test.mjs tests/p3-001-course-route.test.mjs`, lalu `npm run typecheck` dan `npm test`. Expected: seluruhnya PASS, termasuk pemanggil loader lama dan scan keamanan semua route. Route baru tidak mengklaim revalidasi reader yang belum tersedia; UI menyegarkan portal setelah mutasi sukses.
- [ ] **Step 6: Commit file yang terkait.** Pesan: `feat(courses): add validated staff course mutations`.

### Task 3: Portal staf, alur revisi, dan bukti akhir

**Files:** CourseManager, CourseMutationDialog, StaffDashboard/page, test UI/visual, komponen hapus bersama bila perlu, operasi konten/backlog/record.

**Interfaces:**
- `CourseManager({ courses: Course[], lessons: CourseLesson[], role: 'admin'|'editor', onNotification: (type:'success'|'error', message:string)=>void })` menggunakan props server terbaru, selectedCourseId/filter/search/dialog sebagai state UI. Mutasi memakai endpoint Task 2; sukses menutup dialog dan `router.refresh()`, gagal mempertahankan form serta menampilkan pesan.
- `CourseMutationDialog({ kind:'course'|'lesson', courseId?:string, initialData?:Course|CourseLesson, isOpen:boolean, isSaving:boolean, onClose:()=>void, onSave:(data:CourseForm|LessonForm)=>Promise<void> })`. State form di-reset dengan key item, bukan pada setiap render; slug setelah published_at dikunci; initial Published menampilkan peringatan perubahan langsung berlaku.
- StaffDashboard menambah `TabType='courses'`, props `initialCourses`/`initialCourseLessons`, tab **Pelajari Alkitab**, dan render CourseManager. Page protected memuat kedua tabel melalui client sesi setelah guard. Jangan memasukkan tab baru ke dialog/mutasi CMS umum.

- [ ] **Step 1: Tulis failing tests render/integrasi tab.** Gunakan transpile TSX + React server render sebagaimana pola verifikasi lokal, komponen nyata dan fixture sintetis. Assert tab Admin/Editor tersedia, tombol hapus hanya Admin, peringatan induk belum Published, label/edit state, escaping teks `<script>`, state kosong dan judul panjang. Test tidak menyalin logika komponen ke implementasi tiruan.
- [ ] **Step 2: Jalankan `node --test tests/p3-001-course-ui.test.mjs` dari frontend.** Expected: FAIL karena komponen/integrasi belum ada.
- [ ] **Step 3: Implementasikan UI dengan komponen Modal/SelectDropdown/ContentStatusBadge dan filter yang sudah ada.** Course list → pilih course → lesson list berurutan; tambah/edit, Draft/Published/Archived, pemulihan, hapus Admin dengan DeleteConfirmationDialog. Tampilkan konflik nomor urut dan jelaskan nomor boleh bercelah. Saat course bukan Published, beri peringatan bahwa lesson tidak terbaca publik; aksi publikasi course menjelaskan lesson Published akan ikut terlihat. Dialog yang dirty meminta konfirmasi sebelum dibuang, tetap terbuka saat gagal, dan tidak dapat submit ganda. Isi teks tidak dirender sebagai HTML.

  Ukuran sentuh baru minimal 44px termasuk kontrol hapus yang dipakai ulang; bila komponen bersama perlu diperbaiki, tambah regresi browser untuk ukuran sentuh/fokus/tombol konfirmasi sebelum mengubahnya. Pertahankan gaya bottom sheet di mobile serta konteks induk lesson.
- [ ] **Step 4: Tambahkan dan jalankan Playwright lokal untuk alur nyata.** `frontend/tests/visual/staff-courses.spec.ts` memakai fixture terisolasi nonproduksi, menolak target selain localhost/127.0.0.1. Autentikasi test lokal mengikuti mekanisme fixture/JWT lokal yang sudah didokumentasikan project, tanpa password nyata, nilai secret masuk chat/log, atau akun production. Fixture dibuat/direset hanya pada DB test yang kepemilikannya telah dipastikan; tidak mereset DB lain.

  Uji Admin dan Editor: buat course Draft, buat lesson, edit body, atur position, Published, edit Published tetap Published, archive/pulihkan induk, refresh, konflik posisi, hilangnya record, kegagalan request tidak mengosongkan form, pembatalan perubahan dirty, keyboard/fokus modal, dan batas tombol hapus menurut role. Cek 320/375/768/1024/1440 tanpa overflow; teks panjang/paragraf dan target sentuh 44px. Screenshot berada di artefak test yang diabaikan Git. Bila fixture autentikasi lokal belum tersedia, laporkan test yang belum dijalankan; jangan mengganti target ke production atau menyebut SSR sebagai bukti interaksi browser.
- [ ] **Step 5: Jalankan quality gate lengkap.** Dari frontend `npm run test:all`; dari root seluruh pgTAP lokal seperti Task 1. Jalankan Playwright spesifik dengan konfigurasi lokal yang telah diverifikasi. Expected: typecheck/lint/build/Node/pgTAP dan browser lulus; build dapat memakai environment lokal yang sudah ada, tanpa membaca/menyalin nilainya ke konteks. Validasi fresh database di CI sebelum PR dinyatakan siap merge.
- [ ] **Step 6: Perbarui operasi konten, status backlog, dan record bukti.** Catat published edits langsung berlaku, Draft untuk menyembunyikan revisi, slug terkunci, parent visibility, urutan dan penghapusan RESTRICT. Record memuat jumlah test aktual, hasil responsive/browser, batas yang belum diuji, dan migration belum diterapkan production; tanpa project ref/email/URL privat. P3-002 dan issue lain tetap backlog. Tidak memperbarui status P3-001 menjadi selesai sebelum bukti wajib tersedia.
- [ ] **Step 7: Review keseluruhan diff dan commit.** `git diff --check`; pastikan tidak ada file rahasia/ignored atau perubahan runtime lama. Pesan: `feat(courses): add responsive staff course lesson editor`. Ikuti metode eksekusi yang dipilih pemilik untuk review akhir. PR menuju development setelah quality gate, tanpa promote/merge main.

## Self-review rencana

- Scope spec terpetakan ke tiga task; format berparagraf dan edit Published langsung berlaku dipertahankan.
- Tidak ada refactor CMS generik, import, reader, progres, form pastoral, dependency, atau operasi production yang terselip.
- Nama tabel/action/props konsisten; CourseForm update tidak membawa status/metadata/course_id.
- Lima Review Focus masing-masing memiliki test pada task pemilik.
- Tidak mengandalkan RPC alasan lintas transaksi, audit buatan klien, pemeriksaan role UI saja, atau mock guard auth yang selalu sukses.

## Review dan metode eksekusi

**Status:** Menunggu pemilik meninjau rencana dan memilih metode, sebelum implementasi.

**Rekomendasi: Native.** Tiga task bergantung erat pada satu kontrak tabel/payload/UI; satu implementer mengurangi biaya pergantian konteks, lalu reviewer terpisah memeriksa seluruh branch. Alternatif Subagent-driven menyediakan review per task dengan biaya konteks lebih besar.
