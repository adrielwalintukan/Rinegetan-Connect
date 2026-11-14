# PR #89 CI and Review Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox syntax.

**Goal:** Perbaiki kegagalan browser PR #89 dan temuan review yang tervalidasi, hanya dalam scope P3-005 (#48).
**Architecture:** Pertahankan form, helper keamanan P3-004/P3-005, schema/RLS dan gate rilis; perbaiki constraint layout pada elemen penyebab dan paralelkan pembacaan pastoral yang independen bila terbukti.
**Tech Stack:** Next.js/React/Tailwind, Node tests, Playwright Chromium; dependency tetap.
**Spec:** docs/superpowers/specs/2026-11-02-p3-005-prayer-visit-design.md; review GitHub 5737134606; CI 41445330500 pada 0fb187f89efa528d015ecba5de7fae727f9ccf29.

## Global Constraints

- Gunakan worktree PR #89 yang sudah ada pada branch feature/p3-005-prayer-visit. Checkout utama punya perubahan video/Remotion milik pemilik; tidak disentuh.
- Tidak menambah fitur P3-006, mengubah schema/migration/RLS, provider, copy/versi consent, rate limit, atau algoritma proxy P3-004 tanpa bukti yang relevan dan otorisasi scope.
- Tidak membaca/mengetik secret/password/private age key, membuat akun production, menulis DB production, backup, promote, atau merge. Test memakai fixture sintetis/loopback dan tidak mencetak key startup/status.
- Form tetap dapat dipakai pada 320/375/768/1024/1440px; keyboard/fokus/44px/reduced motion dan identitas resmi dipertahankan. Jangan menyembunyikan overflow dokumen sebagai pengganti memperbaiki penyebab.
- Baseline worktree bersih, head sama dengan PR. Jangan npm ci terhadap junction node_modules yang menunjuk checkout utama; isolasikan dependency secara aman terlebih dahulu bila diperlukan.
- Push hanya branch PR dengan --no-follow-tags setelah local gates/review; tidak mengubah branch utama. Commit konvensional tanpa atribusi AI, diakhiri Refs #48.
- User sudah meminta langsung perbaikan CI/review; kegagalan baseline yang sedang diperbaiki bukan alasan meminta konfirmasi ulang.

## Review Focus

1. Overflow 25px pada Kontak320; validasi elemen penyebab dengan pengukuran nyata sebelum memilih patch.
2. Kedua form sebelum/sesudah submit, error/long text, widget Turnstile flexible dan native date/number pada lima viewport.
3. Assertion staff-courses504 masih berada di Kontak sebelum login; jangan mengasumsikan nav staf penyebab. Uji tab pastoral Admin/Editor sesuai scope untuk memastikan.
4. Query pastoral Admin berjalan paralel tanpa dijalankan untuk Editor/nonstaf atau mengubah safe errors/hasil.
5. Production gates, copy draft dan boundary trusted ingress tetap terpisah dari keberhasilan CI.

### Task 1: Validasi temuan dan perbaikan kecil P3-005 dengan regresi

**Files:**
- Inspect/fix only if implicated: frontend/src/components/pages/KontakPage.jsx, frontend/src/components/forms/PrayerRequestForm.tsx, VisitForm.tsx, useTurnstile.ts.
- For verified concurrency note: frontend/src/app/staff/(protected)/page.tsx and meaningful actual-page test in frontend/tests/staff-audit-regression.test.mjs or a narrow p3-005 test.
- Regression: frontend/tests/visual/staff-courses.spec.ts and/or a11y-audit.spec.ts, using existing configurations/helpers.
- Evidence: docs/04-delivery/records/P3-005-2026-11-02.md. Plan/checklists are controller-owned.
- No changes to Remotion, ad hoc capture scripts, dependency manifest/lock, CI thresholds, database migration or existing P3-004 tests to hide regressions.

**Interfaces:** Consume existing real forms, local-course-fixture/startLocalApp, anonymous request and active Admin guard. No public API/schema changes.

- [x] Step 1: Diagnose and reproduce baseline. Read spec/record/current code/callers. Capture exact failing assertions in a real local production build; inspect element bounds/scroll dimensions. Correct test-harness errors before claiming RED. Safely isolate dependency install if junction prevents build; never modify its target.
- [x] Step 2: Add focused regressions before product edits. Cover Kontak initial/loaded widget plus success/error/long text at all five widths, and explicit pastoral tab mobile/role behavior as appropriate. For concurrency, test real page with deferred database boundary: independent pastoral queries start without serial waiting and Editor starts zero private queries.
- [x] Step 3: Apply smallest complete fixes to measured constraints and verified query sequencing. Keep consent/rate/auth behavior and error handling. Do not add global overflow hiding, retries/skips or relax assertions.
- [x] Step 4: Run covering tests, typecheck, lint, production build and full Node suite. Re-run CI browser suites affected (a11y Kontak and full staff-courses) and relevant other browser suites when shared layout changed. Capture five-width evidence and inspect320/1440 screenshots. Existing DB CI568 passed on baseline; no DB rerun needed if no database change, latest-head CI must still run it.
- [x] Step 5: Append record with actual commands/results, failed-before/passed-after, validation table for all review notes, changed-file inventory and limits. Stop only runtime started by this task, preserve data, fixtures scoped to own IDs.
- [x] Step 6: Commit exact changed paths, self-review, report. Separate task review and final scoped PR-fix review before push; root monitors latest-head CI and updates PR evidence. No merge or production operations.

## Penyesuaian setelah reproduksi

Widget flexible memiliki minimum300px; pengukuran form di320px hanya230px. Gunakan ukuran compact resmi untuk kedua widget P3-005, dengan constraint grid/input/pembungkusan teks lokal. Widget menjadi lebih tinggi pada desktop; verifikasi token dan submit tetap sama. Tambahkan klarifikasi perilaku aktual pada bagian UI spesifikasi P3-005 serta record, tanpa mengubah keputusan data, keamanan atau gate production.

## Status verifikasi

Implementasi dan review tugas selesai pada 2026-11-02: Node408/408, staf22/22 (termasuk regresi lima viewport), audit Kontak3/3, build/typecheck/lint lulus. Timeout lokal awal dan pengulangan terkontrol yang berhasil tetap dicatat pada record P3-005. Review akhir perbaikan dan checks commit terakhir pada PR #89 tetap gerbang sebelum merge; tidak ada persetujuan production dari hasil ini.
