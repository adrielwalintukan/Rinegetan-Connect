# Issue Backlog — Phase 2 CMS dan Fondasi Platform

## Label standar

| Kelompok | Label |
| --- | --- |
| Jenis | feature, bug, chore, docs, security |
| Area | frontend, backend, database, auth, media, ci, accessibility |
| Prioritas | priority:critical, priority:high, priority:medium |
| Status | ready, in-progress, blocked, needs-review |

## Issue siap dikerjakan

### P2-000 — Bootstrap repository dan CI awal

- **Label:** chore, ci, docs, priority:high
- **Sprint:** 0
- **Status:** selesai pada branch bootstrap; menunggu integrasi Phase 2
- **Acceptance criteria:** remote milik organisasi; development tersedia; workflow CI mengecek build frontend dan syntax backend; dokumentasi berada di repository.

### P2-101 — Inventaris kontrak Phase 1

- **Label:** chore, frontend, docs, priority:high
- **Sprint:** 1
- **Status:** selesai
- **Dependencies:** P2-000
- **Acceptance criteria:** daftar rute, komponen, asset, data contoh, design token, test ID, dan perilaku responsive terdokumentasi; tidak ada rute publik yang terlewat dari kontrak refactor.

### P2-102 — Scaffold Next.js App Router dan TypeScript

- **Label:** feature, frontend, priority:critical
- **Sprint:** 1
- **Dependencies:** P2-101
- **Acceptance criteria:** aplikasi Next.js dapat build/typecheck/lint; struktur public/staff route tersedia; environment tidak memuat secret di client.

### P2-103 — Port desain dan rute publik Phase 1

- **Label:** feature, frontend, accessibility, priority:critical
- **Sprint:** 1
- **Dependencies:** P2-102
- **Acceptance criteria:** tujuh URL publik dan Creation Grid dipertahankan; symbol resmi tidak berubah; keyboard, focus, mobile layout, reduced-motion tervalidasi.

### P2-104 — Baseline visual dan aksesibilitas

- **Label:** chore, frontend, accessibility, priority:high
- **Sprint:** 1
- **Dependencies:** P2-103
- **Acceptance criteria:** screenshot/reference viewport 320, 375, 768, 1024, 1440 tersedia; test mendeteksi overflow, heading/focus, dan regresi rute utama.

### P2-201 — Supabase local workflow dan environment contract

- **Label:** feature, database, security, priority:critical
- **Sprint:** 2
- **Dependencies:** P2-102
- **Acceptance criteria:** CLI command ditemukan dari help; config/migration source-controlled; client browser/server terpisah; .env.example hanya memuat nama variabel.

### P2-202 — Profiles, roles, audit, grants, dan RLS

- **Label:** feature, database, auth, security, priority:critical
- **Sprint:** 2
- **Dependencies:** P2-201
- **Acceptance criteria:** hanya Admin/Editor; role bukan user metadata; policy/grant explicit; audit redacted; RLS tests membuktikan allow dan deny.

### P2-203 — Bootstrap Admin dan lifecycle staf

- **Label:** feature, auth, security, priority:critical
- **Sprint:** 2
- **Dependencies:** P2-202
- **Acceptance criteria:** prosedur Admin pertama aman; Admin dapat invite/deactivate Editor; sign-in/reset berfungsi; tidak ada public signup.

### P2-301 — Schema CMS konten publik

- **Label:** feature, database, frontend, priority:critical
- **Sprint:** 3
- **Dependencies:** P2-202
- **Acceptance criteria:** announcements, events, departments memakai Draft/Published/Archived; slug unik dan validasi ketat; public query hanya Published.

### P2-302 — Jadwal WITA dan exception

- **Label:** feature, database, frontend, priority:high
- **Sprint:** 3
- **Dependencies:** P2-301
- **Acceptance criteria:** recurrence mingguan, add/override/cancel per tanggal, dan tampilan Asia/Makassar diuji.

### P2-303 — CMS staf dan audit mutation

- **Label:** feature, frontend, auth, priority:critical
- **Sprint:** 3
- **Dependencies:** P2-203, P2-301
- **Acceptance criteria:** Editor dapat draft/publish/archive; Admin dapat permanent delete sesuai prosedur; setiap mutation menghasilkan audit redacted.

### P2-401 — Schema media, consent, dan Storage policy

- **Label:** feature, database, media, security, priority:critical
- **Sprint:** 4
- **Dependencies:** P2-202
- **Acceptance criteria:** album/aset/consent model ada; policy storage dan query menolak pending/revoked/hidden; asset child tanpa izin tidak dapat terbit.

### P2-402 — JPEG derivative dan upload guardrails

- **Label:** feature, media, security, priority:high
- **Sprint:** 4
- **Dependencies:** P2-401
- **Acceptance criteria:** type/size/pixel limit tervalidasi; derivative menghapus EXIF/geolocation; original tidak tersimpan pada pilot; kuota 1 GB terpantau.

### P2-403 — Galeri publik dan CMS media

- **Label:** feature, frontend, media, accessibility, priority:high
- **Sprint:** 4
- **Dependencies:** P2-303, P2-402
- **Acceptance criteria:** filter album/kategori, lightbox keyboard, alt text, publish flow, dan empty state tersedia.

### P2-404 — Unduhan media yang dibatasi

- **Label:** feature, media, security, priority:high
- **Sprint:** 4
- **Dependencies:** P2-403
- **Acceptance criteria:** single/album/category download hanya memasukkan aset eligible; URL/result berumur pendek; file/byte/rate limit dan audit diuji.

### P2-501 — Quality gate dan CI Phase 2

- **Label:** chore, ci, database, accessibility, priority:critical
- **Sprint:** 5
- **Dependencies:** seluruh issue sebelumnya
- **Acceptance criteria:** CI menjalankan build/typecheck/lint/unit/E2E/RLS test yang relevan; lint/format aman; security regression memiliki test.

### P2-502 — Deployment, backup, dan restore drill

- **Label:** chore, security, priority:high
- **Sprint:** 5
- **Dependencies:** P2-501
- **Acceptance criteria:** migration deploy/rollback runbook dijalankan; backup terenkripsi dibuat; restore nonproduksi dicatat; smoke test pilot lulus.

### P2-503 — Review dan PR Phase 2

- **Label:** chore, docs, priority:high
- **Sprint:** 5
- **Dependencies:** P2-502
- **Acceptance criteria:** semua exit criteria roadmap tervalidasi; PR feature/phase-2-cms-foundation ke development berisi ringkasan/test/risiko; CI hijau sebelum merge.

## Template mutu issue

Setiap issue GitHub harus memuat:

1. masalah/hasil yang diinginkan;
2. scope dan non-scope;
3. acceptance criteria yang dapat diuji;
4. dependensi dan risiko;
5. rencana test;
6. dokumentasi yang berubah;
7. checklist RLS/privasi bila data, Auth, Storage, atau server mutation terlibat.
