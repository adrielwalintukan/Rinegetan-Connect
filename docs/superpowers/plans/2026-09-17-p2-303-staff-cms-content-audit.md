# P2-303: CMS Staf dan Audit Mutation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun antarmuka CMS staf di `/staff` dan modul mutasi server yang memungkinkan Editor melakukan draft/publish/archive pada pengumuman, kegiatan, dan jadwal, serta memberi wewenang eksklusif kepada Admin untuk melakukan penghapusan permanen dengan konfirmasi dan alasan terredaksi yang tercatat pada `public.audit_logs`.

**Architecture:** Dasbor interaktif terpadu berbasis tab di `/staff` dengan server boundary yang kokoh. Operasi mutasi dikontrol oleh modul server `content-mutations.ts` dan API routes `/api/staff/content/*` yang memvalidasi role pengguna (`requireActiveStaff` vs `requireActiveAdmin`). Komponen antarmuka modular ditempatkan di `frontend/src/components/staff/` mengikuti Design System gereja.

**Tech Stack:** Next.js App Router, TypeScript, Supabase SSR/Client, Tailwind CSS, Node.js native test runner.

**Spec:** [docs/superpowers/specs/2026-09-17-p2-303-staff-cms-content-audit-design.md](file:///c:/Users/Acer/Documents/Adriel%20Walintukan%20-%20Document/Project/Rinegetan-Connect/docs/superpowers/specs/2026-09-17-p2-303-staff-cms-content-audit-design.md)

## Global Constraints

- RLS PostgreSQL deny-by-default tetap menjadi pengaman data level terendah.
- Editor diizinkan melakukan operasi `draft`, `published`, `archived`, dan dilarang keras melakukan `DELETE` permanen.
- Admin adalah satu-satunya role yang dapat melakukan `DELETE` permanen, wajib menyertakan alasan (*reason*).
- Setiap mutasi menghasilkan riwayat pada `public.audit_logs` tanpa mengekspos token, kunci, atau data pribadi sensitif.
- Komponen baru harus ditempatkan di `frontend/src/components/staff/` agar reusable dan konsisten dengan Design System (`navy`, `sabbath`, `container-site`).

---

### Task 1: Server-Side Content Mutation Services and API Handlers with Test Contracts

**Files:**
- Create: `frontend/src/lib/staff/content-mutations.ts`
- Create: `frontend/src/app/api/staff/content/status/route.ts`
- Create: `frontend/src/app/api/staff/content/save/route.ts`
- Create: `frontend/src/app/api/staff/content/delete/route.ts`
- Test: `frontend/tests/p2-303-staff-cms-mutation.test.mjs`

**Interfaces:**
- Consumes: `requireActiveStaff`, `requireActiveAdmin`, `createServerSupabaseClient`, `StaffAccessError` dari `@/lib/staff/server`
- Produces:
  - `updateContentStatus(client, entityType, id, newStatus)`
  - `saveContentEntity(client, entityType, id | null, payload)`
  - `deleteContentPermanently(client, entityType, id, reason)`
  - API Routes: `/api/staff/content/status`, `/api/staff/content/save`, `/api/staff/content/delete`

- [ ] **Step 1: Write the failing mutation contract test suite**

Buat file `frontend/tests/p2-303-staff-cms-mutation.test.mjs` yang memverifikasi:
1. Validasi role pada operasi mutasi:
   - Editor dapat mengubah status menjadi `published` atau `archived`.
   - Editor ditolak ketika mencoba menghapus permanen (melempar error `not_admin` atau respon HTTP 403).
   - Admin diizinkan melakukan penghapusan permanen.
2. Validasi parameter masukan:
   - Menolak status di luar `draft`, `published`, `archived`.
   - Menolak penghapusan permanen tanpa alasan (*reason* kosong).
   - Menolak entitas yang tidak dikenali.
3. Rute API ada dan mengekspor fungsi `POST`.

- [ ] **Step 2: Run test suite and observe it fail**

Jalankan `node --test frontend/tests/p2-303-staff-cms-mutation.test.mjs` dan pastikan gagal karena modul belum dibuat.

- [ ] **Step 3: Implement content mutation server service and API handlers**

1. Buat `frontend/src/lib/staff/content-mutations.ts` yang mengimplementasikan fungsi mutasi dengan validasi status, tipe entitas yang didukung (`announcements`, `events`, `departments`, `schedules`), validasi admin untuk penghapusan permanen, dan pencatatan alasan audit.
2. Buat rute API:
   - `frontend/src/app/api/staff/content/status/route.ts`
   - `frontend/src/app/api/staff/content/save/route.ts`
   - `frontend/src/app/api/staff/content/delete/route.ts`

- [ ] **Step 4: Run test suite and confirm it passes**

Jalankan `node --test frontend/tests/p2-303-staff-cms-mutation.test.mjs` dan pastikan seluruh test assertions lulus.

- [ ] **Step 5: Commit Task 1**

```bash
git add frontend/src/lib/staff/content-mutations.ts frontend/src/app/api/staff/content/status/route.ts frontend/src/app/api/staff/content/save/route.ts frontend/src/app/api/staff/content/delete/route.ts frontend/tests/p2-303-staff-cms-mutation.test.mjs
git commit -m "feat(staff): implement server content mutation services and API routes with role validation"
```

---

### Task 2: Staff CMS UI Components and Modular Dashboard

**Files:**
- Create: `frontend/src/components/staff/ContentStatusBadge.tsx`
- Create: `frontend/src/components/staff/ContentFilterBar.tsx`
- Create: `frontend/src/components/staff/DeleteConfirmationDialog.tsx`
- Create: `frontend/src/components/staff/ContentMutationDialog.tsx`
- Create: `frontend/src/components/staff/AuditLogViewer.tsx`
- Create: `frontend/src/components/staff/ContentTable.tsx`
- Create: `frontend/src/components/staff/StaffDashboard.tsx`
- Modify: `frontend/src/app/staff/(protected)/page.tsx`

**Interfaces:**
- Consumes: `requireActiveStaff`, `createServerSupabaseClient`, `ContentStatus`, `Department`, `Announcement`, `EventItem`, `Schedule`
- Produces: Komponen UI dasbor CMS staf terpadu di `/staff`.

- [ ] **Step 1: Create reusable status badge and filter components**

1. `ContentStatusBadge.tsx`: Merender badge status `draft`, `published`, `archived` dengan gaya warna Design System yang konsisten.
2. `ContentFilterBar.tsx`: Menampilkan pill filter status (`Semua`, `Draft`, `Published`, `Archived`) dengan badge counter dan kotak pencarian teks.

- [ ] **Step 2: Create dialogs for content creation, editing, and Admin permanent deletion**

1. `DeleteConfirmationDialog.tsx`: Dialog konfirmasi bahaya khusus Admin dengan textarea alasan (*reason*) wajib.
2. `ContentMutationDialog.tsx`: Modal form untuk input pengumuman, kegiatan, jadwal, atau departemen baru.

- [ ] **Step 3: Create table listing, audit log viewer, and main dashboard component**

1. `ContentTable.tsx`: Tabel data dengan tombol aksi cepat (Terbitkan, Arsipkan, Draft, Edit, Hapus Permanen khusus Admin).
2. `AuditLogViewer.tsx`: Tabel riwayat audit mutasi dari `public.audit_logs`.
3. `StaffDashboard.tsx`: Wadah dasbor interaktif dengan navigasi tab dan state management lokal.

- [ ] **Step 4: Update StaffHomePage in `frontend/src/app/staff/(protected)/page.tsx`**

Integrasikan komponen `StaffDashboard` ke dalam server component `StaffHomePage`, memuat data awal dari Supabase secara aman.

- [ ] **Step 5: Commit Task 2**

```bash
git add frontend/src/components/staff/ frontend/src/app/staff/\(protected\)/page.tsx
git commit -m "feat(staff): build modular CMS staff dashboard UI with tabbed modules and action dialogs"
```

---

### Task 3: Quality Gate Verification, Documentation Sync, and PR Preparation

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md` (P2-303 -> selesai, P2-304 -> ready)
- Modify: `docs/04-delivery/SPRINT-PLAN.md`
- Modify: `docs/superpowers/plans/2026-09-17-p2-303-staff-cms-content-audit.md` (check off steps)

- [ ] **Step 1: Run comprehensive quality gate verification**

1. `npm --prefix frontend run test:routes`
2. `npm --prefix frontend run lint`
3. `npm --prefix frontend run build`

- [ ] **Step 2: Update documentation status**

Perbarui status issue:
- `P2-303`: ubah status menjadi `selesai`.
- `P2-304`: ubah status menjadi `ready`.

- [ ] **Step 3: Commit documentation updates**

```bash
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md docs/04-delivery/SPRINT-PLAN.md docs/superpowers/plans/2026-09-17-p2-303-staff-cms-content-audit.md
git commit -m "docs: mark P2-303 completed and update sprint backlog"
```

- [ ] **Step 4: Push branch to origin and create Pull Request**

Push branch `feature/p2-303-staff-cms-content-audit` ke origin dan buat PR via GitHub CLI dengan target `development`.
