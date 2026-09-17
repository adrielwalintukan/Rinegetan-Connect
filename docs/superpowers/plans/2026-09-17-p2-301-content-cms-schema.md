# P2-301 CMS Content Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan migration Supabase yang dapat diulang untuk skema CMS konten publik (`departments`, `announcements`, `events`), status enum (`draft`, `published`, `archived`), explicit grants, audit logging otomatis, dan Row Level Security (RLS) yang dibuktikan melalui pgTAP test serta TypeScript contract.

**Architecture:** Tiga tabel konten publik (`departments`, `announcements`, `events`) tunduk pada RLS deny-by-default. Publik anonim hanya diizinkan membaca (`SELECT`) record dengan status `published`. Staf `editor` dapat membuat draft, memperbarui, dan mengarsipkan (soft-archive) tetapi dilarang melakukan `DELETE` permanen. Staf `admin` memiliki hak penuh termasuk penghapusan permanen. Setiap mutasi konten dicatat otomatis ke tabel `public.audit_logs`.

**Tech Stack:** Supabase CLI 2.117.0, PostgreSQL 17, pgTAP, Next.js 16.3.4, Node.js 22.

**Spec:** `docs/superpowers/specs/2026-09-17-p2-301-content-cms-schema-design.md`

## Global Constraints

- Kerjakan langsung pada checkout project dan branch `feature/p2-301-content-cms-schema`; jangan membuat worktree tambahan.
- Branch dibuat dari `development`; seluruh commit P2-301 masuk melalui pull request ke `development`.
- Gunakan tipe enum `public.content_status` (`draft`, `published`, `archived`).
- Constraint validasi slug harus seragam: `CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')`.
- Kolom `cover_asset_id` pada `events` adalah `UUID NULL` tanpa foreign key constraint di P2-301 (foreign key ditambahkan saat tabel `media_assets` dibuat di P2-401).
- Timezone default untuk `events` adalah `'Asia/Makassar'` (WITA).
- RLS policy harus mengevaluasi otorisasi dengan efisien menggunakan `(SELECT private.is_admin())` dan `(SELECT private.is_editor_or_admin())`.
- Mutasi data konten harus mencatat jejak audit ke tabel `public.audit_logs` yang telah ada dari P2-202.
- Jangan commit secret key, password database, token CLI, atau kredensial remote.
- Seluruh verifikasi lokal (`npm run test:routes`, `npm run lint`, `npm run build`) harus lulus hijau tanpa regresi.

---

## File Structure

| File | Tanggung Jawab |
| --- | --- |
| `supabase/tests/p2_301_content_schema.test.sql` | pgTAP tests untuk verifikasi skema, constraint, dan allow/deny RLS bagi anon, Editor, dan Admin. |
| `supabase/migrations/20260917165000_p2_301_content_cms_schema.sql` | Migration SQL DDL untuk enum, tabel, constraint, index, trigger audit, grants, dan RLS policy. |
| `frontend/src/types/content.ts` | TypeScript types untuk model data CMS (`Department`, `Announcement`, `Event`, `ContentStatus`). |
| `frontend/tests/p2-301-content-contract.test.mjs` | Contract tests untuk memastikan struktur tipe, ekspor modul, dan isolasi keamanan public client. |
| `docs/superpowers/plans/2026-09-17-p2-301-content-cms-schema.md` | Rencana implementasi teknis dan checklist pelacakan langkah demi langkah. |

---

## Interfaces

Migration ini menghasilkan interface database berikut untuk phase dan fitur selanjutnya:

```sql
public.content_status = enum ('draft', 'published', 'archived')

public.departments(
  id uuid primary key,
  name text not null,
  slug text not null unique,
  description text null,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null
)

public.announcements(
  id uuid primary key,
  title text not null,
  slug text not null unique,
  summary text not null,
  body text not null,
  department_id uuid null references public.departments(id) on delete set null,
  status public.content_status not null default 'draft',
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null
)

public.events(
  id uuid primary key,
  title text not null,
  slug text not null unique,
  summary text not null,
  body text null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  timezone text not null default 'Asia/Makassar',
  venue text not null default 'GMAHK Rinegetan',
  department_id uuid null references public.departments(id) on delete set null,
  cover_asset_id uuid null,
  status public.content_status not null default 'draft',
  published_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid null,
  updated_by uuid null
)
```

---

### Task 1: Create a Red pgTAP Test Contract for P2-301

**Files:**
- Create: `supabase/tests/p2_301_content_schema.test.sql`

**Interfaces:**
- Consumes: Helper otorisasi privat P2-202 (`private.is_admin()`, `private.is_editor_or_admin()`) dan role database `admin`/`editor`.
- Produces: Test suite lengkap yang memvalidasi keberadaan enum, tabel, kolom, constraint, indeks, serta pembuktian RLS allow/deny.

- [x] **Step 1: Write pgTAP tests for schema, types, columns, and constraints**

Tulis test file `supabase/tests/p2_301_content_schema.test.sql` yang memeriksa:
1. Enum `public.content_status` memiliki nilai `draft`, `published`, `archived`.
2. Tabel `departments`, `announcements`, dan `events` ada di schema `public`.
3. Kolom wajib NOT NULL, default value, dan tipe data sesuai spesifikasi.
4. Constraint validasi: slug regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` dan `ends_at >= starts_at`.
5. RLS aktif pada ketiga tabel.
6. Uji hak akses `anon`:
   - Bisa membaca baris berstatus `published`.
   - Ditolak saat membaca baris berstatus `draft` atau `archived`.
   - Ditolak saat mencoba INSERT, UPDATE, atau DELETE.
7. Uji hak akses `editor`:
   - Bisa membaca semua status (`draft`, `published`, `archived`).
   - Bisa INSERT dan UPDATE.
   - Ditolak saat mencoba DELETE.
8. Uji hak akses `admin`:
   - Bisa DELETE baris konten.
9. Uji audit trail:
   - Mutasi konten memicu pencatatan ke `public.audit_logs`.

- [x] **Step 2: Commit the test contract**

```bash
git add supabase/tests/p2_301_content_schema.test.sql
git commit -m "test(db): add red pgTAP contract for P2-301 content CMS schema"
```

---

### Task 2: Implement Migration SQL for Content CMS Schema

**Files:**
- Create: `supabase/migrations/20260917165000_p2_301_content_cms_schema.sql`

**Interfaces:**
- Consumes: `public.audit_logs`, `private.is_admin()`, `private.is_editor_or_admin()`.
- Produces: Enum `content_status`, tabel `departments`, `announcements`, `events`, explicit grants, trigger audit, dan RLS policies.

- [x] **Step 1: Write the migration DDL**

Isi file migration dengan DDL lengkap:
1. `CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'archived');`
2. `CREATE TABLE public.departments (...)` beserta constraint name dan slug.
3. `CREATE TABLE public.announcements (...)` beserta foreign key ke departments dan constraint slug.
4. `CREATE TABLE public.events (...)` beserta check constraint `ends_at >= starts_at`, timezone default, dan foreign key.
5. Index untuk query performa (`status`, `published_at`, `starts_at`, `slug`, `department_id`).
6. Trigger function untuk audit log `private.record_content_mutation_audit()` yang mencatat ke `public.audit_logs`.
7. Triggers `BEFORE UPDATE` untuk memperbarui `updated_at = now()`.
8. Triggers `AFTER INSERT OR UPDATE OR DELETE` untuk audit log.
9. `REVOKE ALL` dari `PUBLIC`, `anon`, `authenticated`.
10. `GRANT SELECT` ke `anon` dan `authenticated`.
11. `GRANT INSERT, UPDATE, DELETE` ke `authenticated`.
12. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` untuk ketiga tabel.
13. RLS policies untuk SELECT, INSERT, UPDATE, DELETE sesuai matriks otorisasi.

- [x] **Step 2: Commit the migration**

```bash
git add supabase/migrations/20260917165000_p2_301_content_cms_schema.sql
git commit -m "feat(db): implement P2-301 content CMS schema, RLS, and audit trigger"
```

---

### Task 3: Create TypeScript Data Models and Contract Tests

**Files:**
- Create: `frontend/src/types/content.ts`
- Create: `frontend/tests/p2-301-content-contract.test.mjs`

**Interfaces:**
- Consumes: Interface database P2-301.
- Produces: TypeScript types untuk frontend/backend Next.js dan unit contract tests.

- [x] **Step 1: Define TypeScript types**

Buat file `frontend/src/types/content.ts`:
```typescript
export type ContentStatus = "draft" | "published" | "archived";

export interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  department_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  timezone: string;
  venue: string;
  department_id: string | null;
  cover_asset_id: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}
```

- [x] **Step 2: Write contract test**

Buat file `frontend/tests/p2-301-content-contract.test.mjs` untuk menguji:
1. Migration file P2-301 ada dan berisi deklarasi tabel, enum, grant, serta RLS yang tepat.
2. Tidak ada kebocoran rahasia atau bypass policy pada skema konten.
3. Tipe data TypeScript `content.ts` dapat diimpor tanpa kesalahan.

- [x] **Step 3: Run route & contract tests**

Run: `npm run test:routes`
Expected: Seluruh test (termasuk test baru) lulus (PASS).

- [x] **Step 4: Commit frontend types & tests**

```bash
git add frontend/src/types/content.ts frontend/tests/p2-301-content-contract.test.mjs
git commit -m "feat(frontend): add TypeScript content models and contract verification for P2-301"
```

---

### Task 4: Full Quality Gate & Sprint Plan Update

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Modify: `docs/04-delivery/SPRINT-PLAN.md`

- [x] **Step 1: Run comprehensive local verification**

Jalankan serangkaian quality gate:
```powershell
npm run test:routes
npm run lint
npm run build
```
Pastikan seluruh 17 rute App Router ter-generate bersih dan 0 lint error.

- [x] **Step 2: Update documentation status**

Tandai `P2-301` sebagai `selesai` pada `PHASE-2-ISSUE-BACKLOG.md` dan siapkan `P2-302` sebagai `ready`.

- [x] **Step 3: Commit documentation update**

```bash
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md docs/04-delivery/SPRINT-PLAN.md
git commit -m "docs: mark P2-301 completed and update sprint backlog"
```
