# P2-302: Jadwal WITA dan Exception Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengimplementasikan skema database PostgreSQL untuk master jadwal mingguan (`schedules`), pengecualian tanggal spesifik (`schedule_exceptions`), RLS deny-by-default, audit mutation triggers, dan engine resolusi kejadian jadwal berbasis zona waktu WITA (`Asia/Makassar`) beserta pengujian komprehensif.

**Architecture:** Model relasional PostgreSQL master-exception dengan tabel `schedules` untuk pola mingguan (hari 0-6) dan `schedule_exceptions` untuk pembatalan (`cancelled`), perubahan jam/tempat (`override`), dan jadwal insidental (`added`). Resolusi kejadian dilakukan oleh modul deterministik di frontend/shared (`schedule-wita.ts`) yang mengekspansi jadwal ke rentang tanggal konkret sesuai zona waktu `Asia/Makassar` (WITA, UTC+8).

**Tech Stack:** PostgreSQL (Supabase pgTAP tests, migrations, RLS), Next.js App Router, TypeScript, Node.js test runner.

**Spec:** [docs/superpowers/specs/2026-09-17-p2-302-wita-schedules-exceptions-design.md](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/superpowers/specs/2026-09-17-p2-302-wita-schedules-exceptions-design.md)

## Global Constraints

- Waktu publik dan penanggalan wajib konsisten dalam konteks `Asia/Makassar` (WITA, UTC+8).
- Seluruh tabel exposed menerapkan RLS deny-by-default (`ENABLE` & `FORCE ROW LEVEL SECURITY`).
- Anonim hanya dapat membaca data yang berstatus `published`.
- Editor dan Admin dapat membaca seluruh status (`draft`, `published`, `archived`) serta melakukan `INSERT`/`UPDATE`.
- Hanya Admin yang diizinkan melakukan `DELETE` permanen.
- Setiap mutasi menghasilkan riwayat terredaksi pada `public.audit_logs`.
- Tidak ada penulisan rahasia (API key/service role) pada kode frontend, bundle browser, atau tes.

---

### Task 1: Database Migration & RLS Security Contracts for Schedules and Exceptions

**Files:**
- Create: `supabase/tests/p2_302_schedules_schema.test.sql`
- Create: `supabase/migrations/20260917183000_p2_302_wita_schedules_and_exceptions.sql`

**Interfaces:**
- Consumes: `public.content_status`, `public.departments`, `public.is_editor_or_admin()`, `public.is_admin()`, `public.audit_mutation_trigger()`
- Produces: `public.schedules`, `public.schedule_exceptions`, RLS policies, audit triggers, foreign keys, and validation constraints.

- [x] **Step 1: Write the failing pgTAP test contract**

Buat file test contract `supabase/tests/p2_302_schedules_schema.test.sql` yang memverifikasi:
1. Keberadaan tabel `public.schedules` dan `public.schedule_exceptions`.
2. Kolom-kolom kunci, tipe data, dan default values.
3. Constraint integritas data:
   - `chk_schedules_day_of_week`: `BETWEEN 0 AND 6`.
   - `chk_schedules_timezone`: `= 'Asia/Makassar'`.
   - `chk_schedules_slug`: regex format.
   - `chk_schedules_time_order`: `end_time > start_time`.
   - `chk_schedule_exceptions_action`: `cancelled`, `override`, `added`.
   - Integritas exception rules (`cancelled` butuh `schedule_id`, `override` butuh perubahan, `added` butuh judul & jam mulai).
4. RLS deny-by-default & behavior:
   - Anon dapat SELECT published, ditolak SELECT draft/archived.
   - Anon ditolak INSERT/UPDATE/DELETE.
   - Editor dapat INSERT/UPDATE draft & published, ditolak DELETE permanen.
   - Admin dapat DELETE permanen.
5. Audit log terisi saat terjadi INSERT/UPDATE/DELETE.

- [x] **Step 2: Run test contract and observe it fail**

Verifikasi bahwa test contract mendeteksi ketiadaan tabel `public.schedules` dan `public.schedule_exceptions`.

- [x] **Step 3: Implement database migration**

Buat migration `supabase/migrations/20260917183000_p2_302_wita_schedules_and_exceptions.sql` berisi:
1. `CREATE TABLE public.schedules (...)` beserta check constraints dan indexes.
2. `CREATE TABLE public.schedule_exceptions (...)` beserta check constraints dan indexes.
3. RLS enablement & force:
   - `ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE public.schedules FORCE ROW LEVEL SECURITY;`
   - `ALTER TABLE public.schedule_exceptions ENABLE ROW LEVEL SECURITY;`
   - `ALTER TABLE public.schedule_exceptions FORCE ROW LEVEL SECURITY;`
4. Grants explicit:
   - `REVOKE ALL ON public.schedules, public.schedule_exceptions FROM PUBLIC, anon, authenticated;`
   - `GRANT SELECT ON public.schedules, public.schedule_exceptions TO anon, authenticated;`
   - `GRANT INSERT, UPDATE, DELETE ON public.schedules, public.schedule_exceptions TO authenticated;`
5. RLS Policies:
   - SELECT untuk anon (published saja) & Editor/Admin (semua status).
   - INSERT/UPDATE untuk Editor/Admin.
   - DELETE untuk Admin saja.
6. Triggers:
   - Trigger `set_updated_at` pada kedua tabel.
   - Trigger audit log `audit_mutation_trigger()` pada kedua tabel.

- [x] **Step 4: Verify migration syntax and SQL structure**

Review migration SQL syntax secara cermat, pastikan tidak ada sintaks PostgreSQL yang cacat atau konflik penamaan policy.

- [x] **Step 5: Commit Task 1**

```bash
git add supabase/tests/p2_302_schedules_schema.test.sql supabase/migrations/20260917183000_p2_302_wita_schedules_and_exceptions.sql
git commit -m "feat(db): implement P2-302 schedules and exceptions schema with RLS and audit triggers"
```

---

### Task 2: Frontend TypeScript Types and WITA Calculation Engine with Test Suite

**Files:**
- Create: `frontend/src/types/schedule.ts`
- Create: `frontend/src/lib/schedule-wita.ts`
- Create: `frontend/tests/p2-302-schedule-wita.test.mjs`

**Interfaces:**
- Consumes: Node.js test runner (`node:test`, `node:assert`)
- Produces:
  - Types: `DayOfWeek`, `Schedule`, `ScheduleException`, `ResolvedOccurrence`
  - Functions: `resolveWeeklyOccurrences(schedules, exceptions, startDate, endDate)`, `formatWitaTime(timeStr)`, `formatWitaDate(dateStr)`, `formatWitaRange(start, end)`, `getDayNameId(dayOfWeek)`

- [x] **Step 1: Write the failing frontend contract and unit test suite**

Buat `frontend/tests/p2-302-schedule-wita.test.mjs` yang memverifikasi:
1. Formatter WITA:
   - Format waktu `08:45:00` ➔ `08.45 WITA`.
   - Format rentang waktu `08:45:00` dan `10:15:00` ➔ `08.45 – 10.15 WITA`.
   - Format tanggal WITA `2026-09-19` ➔ `Sabtu, 19 September 2026`.
2. Resolusi ekspansi mingguan dasar:
   - Jadwal Sabat berulang setiap hari Sabtu dalam rentang 3 pekan (menghasilkan 3 kejadian pada tanggal yang tepat).
   - Jadwal Rabu berulang setiap hari Rabu.
3. Penanganan pembatalan (`action = 'cancelled'`):
   - Jika Sabat ke-2 dibatalkan (misal karena Perkemahan Daerah), kejadian pada tanggal tersebut ditandai `isCancelled: true` dengan alasan pembatalan.
4. Penanganan modifikasi (`action = 'override'`):
   - Jika jam Vesper Jumat dimajukan dari 18.30 ke 18.00 pada tanggal tertentu, kejadian memiliki jam baru dan `isOverridden: true`.
5. Penanganan penambahan (`action = 'added'`):
   - Jika ada Kebaktian Syukur insidental hari Selasa pada tanggal tertentu, kejadian muncul di hasil dengan `isAdded: true`.
6. Pengurutan kejadian:
   - Hasil akhir terurut rapi secara kronologis berdasarkan `date` dan `startTime`.

- [x] **Step 2: Run test suite and observe it fail**

Jalankan `node frontend/tests/p2-302-schedule-wita.test.mjs` dan pastikan gagal karena modul belum dibuat.

- [x] **Step 3: Implement TypeScript types and WITA resolution engine**

1. Buat `frontend/src/types/schedule.ts` yang mendefinisikan interface lengkap `Schedule`, `ScheduleException`, `ResolvedOccurrence`, dan tipe `DayOfWeek`.
2. Buat `frontend/src/lib/schedule-wita.ts` yang mengimplementasikan:
   - `WITA_TIMEZONE = 'Asia/Makassar'`
   - `DAY_NAMES_ID`
   - `formatWitaTime`
   - `formatWitaDate`
   - `formatWitaRange`
   - `resolveWeeklyOccurrences` yang melakukan ekspansi hari, pemfilteran jadwal aktif, resolusi exception (cancelled, override, added), dan pengurutan kronologis.

- [x] **Step 4: Run test suite and confirm it passes**

Jalankan `node frontend/tests/p2-302-schedule-wita.test.mjs` dan pastikan seluruh test assertions lulus 100%.

- [x] **Step 5: Commit Task 2**

```bash
git add frontend/src/types/schedule.ts frontend/src/lib/schedule-wita.ts frontend/tests/p2-302-schedule-wita.test.mjs
git commit -m "feat(frontend): implement P2-302 WITA schedule resolution engine and types"
```

---

### Task 3: Quality Gate Verification, Documentation Sync, and PR Preparation

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md` (P2-302 -> selesai, P2-303 -> ready)
- Modify: `docs/04-delivery/SPRINT-PLAN.md` (P2-302 status)

- [x] **Step 1: Run comprehensive quality gate verification**

Jalankan seluruh suite verifikasi frontend:
1. `npm --prefix frontend run test:routes`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend run build`

- [x] **Step 2: Update documentation status**

Perbarui status issue:
- `P2-302`: ubah status menjadi `selesai`.
- `P2-303`: ubah status menjadi `ready`.

- [x] **Step 3: Commit documentation updates**

```bash
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md docs/04-delivery/SPRINT-PLAN.md docs/superpowers/plans/2026-09-17-p2-302-wita-schedules-exceptions.md
git commit -m "docs: mark P2-302 completed and update sprint backlog"
```

- [ ] **Step 4: Push branch to origin and create Pull Request**

Push branch `feature/p2-302-wita-schedules-exceptions` ke origin dan buat PR via GitHub CLI dengan target `development`.
