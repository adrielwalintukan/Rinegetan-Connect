# Sprint Plan — Phase 2 CMS dan Fondasi Platform

## Cara memakai dokumen

Rencana ini memakai cadence usulan satu minggu per sprint fokus. Cadence adalah alat perencanaan, bukan janji tanggal; pekerjaan yang belum memenuhi exit criteria tetap dibawa ke sprint berikutnya. Setiap issue memiliki satu pemilik, satu branch, dan bukti verifikasi sebelum dinyatakan selesai.

Dokumentasi Phase 2 diajukan sekarang melalui PR `docs/phase-2-foundation` menuju `development`. Setelah dokumentasi disetujui dan digabung, refactor dimulai dari branch implementasi baru berbasis `development`. PR kode Phase 2 dibuat setelah seluruh exit criteria Phase 2 terpenuhi, sesuai keputusan saat ini.

## Sprint 0 — Bootstrap dan tata kelola

**Tujuan:** Menyimpan baseline lokal, dokumentasi, workflow Git, dan CI awal.

| Issue | Hasil |
| --- | --- |
| P2-000 | Commit baseline, remote milik organisasi, branch development, CI awal |
| P2-001 | Dokumentasi produk, arsitektur, keamanan, dan rencana implementasi |
| P2-002 | Sprint plan, issue backlog, dan template issue |
| P2-003 | Review dan PR dokumentasi menuju development |

**Exit criteria:** baseline ter-commit, build frontend serta syntax backend tervalidasi, branch dan remote terhubung, dan dokumentasi berada di repository.

## Sprint 1 — Next.js foundation dan kesetaraan Phase 1

**Tujuan:** Memulai refactor tanpa mengubah identitas, rute publik, atau pengalaman mobile Phase 1.

| Issue | Hasil |
| --- | --- |
| P2-101 | Inventaris rute, komponen, token, asset, dan data Phase 1 |
| P2-102 | Scaffold Next.js App Router + TypeScript + tooling test |
| P2-103 | Port layout, Design System, dan tujuh rute publik |
| P2-104 | Visual/accessibility regression baseline |

**Exit criteria:** tujuh rute tetap tersedia; mobile tidak overflow; build, typecheck, lint, dan test rute lulus.

## Sprint 2 — Supabase dan keamanan inti

**Tujuan:** Menyiapkan foundation database yang reproducible dan deny-by-default.

| Issue | Hasil |
| --- | --- |
| P2-201 | Konfigurasi Supabase CLI, environment contract, dan client server/browser |
| P2-202 | Migration profiles, staff_roles, audit_logs, grants, dan RLS |
| P2-203 | Test RLS Admin/Editor/anon dan procedure bootstrap Admin |
| P2-204 | Staff sign-in, invitation, reset password, dan route guard |

**Exit criteria:** tidak ada service-role key di klien; test RLS allow/deny lulus; Editor tidak dapat menjalankan fungsi Admin.

## Sprint 3 — CMS konten dan jadwal

**Tujuan:** Menggantikan data contoh untuk informasi gereja yang dikelola staf.

| Issue | Hasil |
| --- | --- |
| P2-301 | Schema announcement, event, department, lifecycle, slug, dan policy |
| P2-302 | Schedule mingguan dan exception tanggal dalam Asia/Makassar |
| P2-303 | Admin UI untuk draft, publish, archive, dan audit mutation |
| P2-304 | Query publik, cache/revalidation, empty states, dan metadata |

**Exit criteria:** Editor dapat menerbitkan konten; Draft/Archived tidak terlihat publik; jadwal WITA dan exception tervalidasi.

## Sprint 4 — Media, galeri, dan unduhan aman

**Tujuan:** Menyediakan galeri kegiatan yang menghormati consent dan kuota pilot.

| Issue | Hasil |
| --- | --- |
| P2-401 | Schema album/aset/consent dan Storage policy |
| P2-402 | Pipeline JPEG derivative, limit upload, dan pembersihan metadata |
| P2-403 | Admin media workflow serta public album/category/gallery |
| P2-404 | Unduhan foto, album, kategori dengan eligibility, limit, dan audit |

**Exit criteria:** aset tanpa consent/hidden tidak dapat muncul atau diunduh; hanya derivative publik; batas 1 GB diterapkan/terpantau.

## Sprint 5 — Hardening, operasi, dan kesiapan pilot

**Tujuan:** Membuktikan Phase 2 siap diuji oleh gereja sebelum rilis pilot.

| Issue | Hasil |
| --- | --- |
| P2-501 | Unit, integration, E2E, visual, accessibility, dan RLS coverage |
| P2-502 | CI diperluas untuk Next.js dan database test |
| P2-503 | Backup/restore drill, logging, deployment/rollback smoke test |
| P2-504 | Review Phase 2, PR kode menuju development, dan pilot checklist |

**Exit criteria:** semua verifikasi hijau, backup/restore drill tercatat, runbook teruji, dan review mengonfirmasi seluruh exit criteria Phase 2.

## Aturan sprint

1. Satu issue aktif pada satu waktu kecuali pekerjaan benar-benar independen.
2. Perubahan perilaku memakai test-first; test harus terbukti gagal sebelum implementasi minimal dibuat.
3. Scope baru masuk backlog, bukan disisipkan ke sprint aktif tanpa menilai risiko.
4. Issue selesai hanya jika acceptance criteria, test, dokumentasi, dan perubahan RLS (bila ada) selesai.
5. Bug keamanan/privasi menghentikan sprint dan diprioritaskan sebagai urgent fix.
