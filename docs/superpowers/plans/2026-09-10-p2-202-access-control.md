# P2-202 Access Control Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan migration Supabase yang dapat diulang untuk profil staf, role Admin/Editor, audit log teredaksi, explicit grants, dan RLS yang dibuktikan melalui pgTAP.

**Architecture:** Tiga tabel `public` menjadi model data yang tunduk pada RLS, sedangkan helper otorisasi tinggal di schema `private` yang tidak diekspos Data API. Migration dibuat append-only lewat Supabase CLI, diuji pada stack lokal yang bersih, lalu diterapkan sekali ke project remote yang sudah ditautkan setelah verifikasi keamanan lulus.

**Tech Stack:** Supabase CLI 2.117.0, PostgreSQL 17, pgTAP, Next.js 16.3.4, Node.js 22.

**Spec:** `docs/superpowers/specs/2026-09-10-p2-202-access-control-design.md`

## Global constraints

- Kerjakan langsung pada checkout project dan branch `feature/p2-202-access-control`; jangan membuat worktree.
- Branch dibuat dari `development`; seluruh commit P2-202 masuk melalui pull request ke `development`.
- Hanya `admin` dan `editor` yang valid. Tidak boleh membuat role Member, public signup, OAuth, Auth UI, atau user metadata role pada issue ini.
- Jangan membuat tabel konten, jadwal, media, Storage bucket/policy, form pastoral, Edge Function, atau service-role client.
- Jangan commit key, password database, token CLI, `.env.local`, data nyata, atau test user remote.
- Jangan menjalankan pgTAP terhadap `--linked`; semua test database memakai `--local` agar project remote tidak menerima fixture.
- Jangan mengubah migration setelah migration tersebut diterapkan ke remote. Selama belum di-push, penyempurnaan terjadi pada satu migration P2-202 yang sama.
- Grants dan RLS harus berada pada migration yang sama. Setiap policy menyebut `TO authenticated`; tidak memakai `auth.role()` atau `user_metadata`.
- `private` tidak masuk daftar `api.schemas`. Helper `SECURITY DEFINER` tanpa parameter harus memakai `set search_path = ''`, nama schema lengkap, serta revoke dari `PUBLIC`.
- Perintah remote mutating satu-satunya adalah `db push --linked --skip-vault` pada Task 5, setelah seluruh test lokal dan dry run lulus.

---

## File structure

| File | Tanggung jawab |
| --- | --- |
| `supabase/migrations/<timestamp>_p2_202_access_control.sql` | Schema, constraints, index, trigger, grants, helper privat, RLS, dan policy P2-202. |
| `supabase/tests/p2_202_access_control.test.sql` | pgTAP test schema dan allow/deny RLS tanpa menyentuh project remote. |
| `supabase/README.md` | Command reset/test/advisor P2-202 serta batas remote deployment. |
| `docs/superpowers/specs/2026-09-10-p2-202-access-control-design.md` | Kontrak arsitektur yang sudah disetujui; jangan mengubah kecuali implementasi membuktikan koreksi desain diperlukan. |

## Interfaces

Migration ini menghasilkan interface database berikut untuk phase selanjutnya:

```sql
public.staff_role = enum ('admin', 'editor')
public.profiles(id uuid, display_name text, is_active boolean, created_at timestamptz, updated_at timestamptz)
public.staff_roles(user_id uuid, role public.staff_role, created_at timestamptz, updated_at timestamptz)
public.audit_logs(id uuid, actor_id uuid, action text, entity_type text, entity_id uuid, request_id uuid, changes jsonb, occurred_at timestamptz)
private.is_admin() returns boolean
private.is_editor_or_admin() returns boolean
```

P2-203 akan memakai tabel tersebut untuk prosedur bootstrap/lifecycle staf. P2-301 dan seterusnya memakai `private.is_editor_or_admin()` pada policy konten. Tidak ada client TypeScript yang boleh membaca atau menulis tabel ini pada P2-202.

### Task 1: Create a red pgTAP schema contract

**Files:**

- Create: `supabase/tests/p2_202_access_control.test.sql`
- Verify: `supabase/migrations/` masih hanya berisi `.gitkeep`

**Interfaces:**

- Consumes: Supabase local stack dan schema kosong dari P2-201.
- Produces: Test kontrak untuk type, tabel, column, constraint, dan index yang Task 2 wajib penuhi.

- [ ] **Step 1: Start the local stack and confirm it is local**

Run from repository root:

```powershell
npm run supabase --prefix frontend -- start
npm run supabase --prefix frontend -- status
```

Expected: CLI melaporkan endpoint `127.0.0.1` lokal. Bila runtime Docker-compatible belum aktif, berhenti di sini dan minta pemilik menyalakan Docker Desktop; jangan mengganti test menjadi `--linked` dan jangan membuat fixture di project remote.

- [ ] **Step 2: Generate the database test file with the CLI**

Run:

```powershell
npm run supabase --prefix frontend -- test new p2_202_access_control.test
```

Expected: CLI membuat `supabase/tests/p2_202_access_control.test.sql`. Pertahankan wrapper `begin;`, `select plan(...)`, `select * from finish();`, dan `rollback;` supaya setiap test dibersihkan otomatis.

- [ ] **Step 3: Write the initial failing structural assertions**

Replace template dengan test yang hanya memakai catalog query aman ketika object belum ada. Mulai dengan jumlah assertion yang benar, lalu tambah assertion ketika scope bertambah. Bentuk kontrak awal:

```sql
begin;

select plan(12);

select ok(to_regtype('public.staff_role') is not null, 'staff_role exists');
select results_eq(
  $$
    select enumlabel::text
    from pg_enum
    where enumtypid = to_regtype('public.staff_role')
    order by enumsortorder
  $$,
  array['admin', 'editor']::text[],
  'staff_role permits only admin and editor'
);
select ok(to_regclass('public.profiles') is not null, 'profiles exists');
select ok(to_regclass('public.staff_roles') is not null, 'staff_roles exists');
select ok(to_regclass('public.audit_logs') is not null, 'audit_logs exists');
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name = 'is_active'
), 'profiles has is_active');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.staff_roles')
    and contype = 'p'
), 'staff_roles has a primary key');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.staff_roles')
    and contype = 'f'
), 'staff_roles has a profile foreign key');
select ok(exists (
  select 1 from pg_constraint
  where conrelid = to_regclass('public.audit_logs')
    and contype = 'c'
), 'audit_logs has check constraints');
select ok(to_regclass('public.audit_logs_actor_occurred_at_idx') is not null, 'audit actor index exists');
select ok(to_regclass('public.audit_logs_entity_occurred_at_idx') is not null, 'audit entity index exists');
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'audit_logs' and column_name = 'changes' and data_type = 'jsonb'
), 'audit changes is jsonb');

select * from finish();
rollback;
```

- [ ] **Step 4: Prove the structural contract is red**

Run:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local supabase/tests/p2_202_access_control.test.sql
```

Expected: FAIL only because `staff_role`, the three tables, constraints, and indexes do not exist. Record the test output in the PR notes; do not weaken the assertions.

- [ ] **Step 5: Commit the red contract**

```powershell
git add supabase/tests/p2_202_access_control.test.sql
git commit -m "test: define staff access schema contract"
```

### Task 2: Create the minimal versioned staff-access schema

**Files:**

- Create: `supabase/migrations/<timestamp>_p2_202_access_control.sql`
- Modify: `supabase/tests/p2_202_access_control.test.sql` only to correct the exact assertion count if necessary

**Interfaces:**

- Consumes: Task 1 structural contract.
- Produces: Type/tables/constraints/indexes. No remote deployment and no RLS policy yet.

- [ ] **Step 1: Generate the migration filename with Supabase CLI**

Run exactly once:

```powershell
npm run supabase --prefix frontend -- migration new p2_202_access_control
```

Expected: one timestamped SQL file appears under `supabase/migrations/`. Use that filename; never invent or rename its timestamp.

- [ ] **Step 2: Implement only the schema portion required by the red test**

Put this logical order into the generated migration. Keep table and column names exact:

```sql
create type public.staff_role as enum ('admin', 'editor');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(display_name) between 1 and 120)
    check (display_name = btrim(display_name)),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  request_id uuid,
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  occurred_at timestamptz not null default now()
);

create index audit_logs_actor_occurred_at_idx
  on public.audit_logs (actor_id, occurred_at desc);
create index audit_logs_entity_occurred_at_idx
  on public.audit_logs (entity_type, entity_id, occurred_at desc);
```

Do not create Auth triggers, seed staff, grant client writes, or use a `service_role` key.

- [ ] **Step 3: Reset locally and prove the structural contract turns green**

Run:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local supabase/tests/p2_202_access_control.test.sql
```

Expected: all 12 assertions pass. The migration is still local and may be refined in the next task because it has not been pushed remotely.

- [ ] **Step 4: Commit the schema**

```powershell
git add supabase/migrations supabase/tests/p2_202_access_control.test.sql
git commit -m "feat: add staff access schema"
```

### Task 3: Add red allow-and-deny RLS tests

**Files:**

- Modify: `supabase/tests/p2_202_access_control.test.sql`

**Interfaces:**

- Consumes: schema from Task 2.
- Produces: Executable security behavior contract for Task 4.

- [ ] **Step 1: Append security and RLS assertions before adding any policy**

Change `select plan(12);` to `select plan(45);` before appending the 33 security assertions below. Use these fixed local fixture IDs only inside the rolled-back test transaction:

```sql
-- Fixtures inserted as local postgres only; they are never remote users.
-- admin:    11111111-1111-1111-1111-111111111111
-- editor:   22222222-2222-2222-2222-222222222222
-- inactive: 33333333-3333-3333-3333-333333333333
-- no-role:  44444444-4444-4444-4444-444444444444

set local role postgres;
set local session_replication_role = replica;
insert into public.profiles (id, display_name, is_active, updated_at) values
  ('11111111-1111-1111-1111-111111111111', 'Admin Test', true, '2000-01-01 00:00:00+00'),
  ('22222222-2222-2222-2222-222222222222', 'Editor Test', true, '2000-01-01 00:00:00+00'),
  ('33333333-3333-3333-3333-333333333333', 'Inactive Test', false, '2000-01-01 00:00:00+00');
insert into public.staff_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin'),
  ('22222222-2222-2222-2222-222222222222', 'editor'),
  ('33333333-3333-3333-3333-333333333333', 'editor');
insert into public.audit_logs (actor_id, action, entity_type, entity_id, changes) values
  ('11111111-1111-1111-1111-111111111111', 'staff.created', 'staff_role', '22222222-2222-2222-2222-222222222222', '{}'::jsonb);
set local session_replication_role = origin;
```

The temporary `replica` setting bypasses the foreign-key trigger only while creating local fixture rows that have synthetic JWT IDs. Restore `origin` before any authorization assertion. Do not use this technique in migrations, application code, or a linked/remote test.

Add checks for:

```sql
select ok(not has_table_privilege('anon', 'public.profiles', 'select'), 'anon has no profiles select grant');
select ok(not has_table_privilege('anon', 'public.staff_roles', 'select'), 'anon has no staff_roles select grant');
select ok(not has_table_privilege('anon', 'public.audit_logs', 'select'), 'anon has no audit_logs select grant');
select ok(not has_table_privilege('authenticated', 'public.profiles', 'insert, update, delete'), 'authenticated cannot mutate profiles');
select ok(not has_table_privilege('authenticated', 'public.staff_roles', 'insert, update, delete'), 'authenticated cannot mutate staff_roles');
select ok(not has_table_privilege('authenticated', 'public.audit_logs', 'insert, update, delete'), 'authenticated cannot mutate audit_logs');
select ok(not has_function_privilege('public', 'private.is_admin()', 'execute'), 'PUBLIC cannot execute is_admin');
select ok(has_function_privilege('authenticated', 'private.is_admin()', 'execute'), 'authenticated may evaluate policy helper');
```

Then, under `set local role authenticated`, set `request.jwt.claim.sub` using `set_config(..., true)` and assert these result sets:

| Claim subject | `profiles` | `staff_roles` | `audit_logs` |
| --- | --- | --- | --- |
| Admin ID | 3 rows | 3 rows | 1 row |
| Editor ID | only editor ID | only editor role | 0 rows |
| Inactive ID | 0 rows | 0 rows | 0 rows |
| No-role ID | 0 rows | 0 rows | 0 rows |

Also test both helper functions are unavailable to `PUBLIC` but executable by `authenticated`; `private.is_admin()` returns true only for the Admin fixture; `private.is_editor_or_admin()` returns true for active Admin/Editor only; `authenticated` has `USAGE` on `private` while `PUBLIC` does not; each table has `relrowsecurity = true`; and updating the fixture profile raises `updated_at` above the year-2000 value when executed as `postgres`.

- [ ] **Step 2: Prove the RLS contract is red for the right reason**

Run:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local supabase/tests/p2_202_access_control.test.sql
```

Expected: structural assertions pass, while function/RLS/grant/row-visibility assertions fail because no private helpers, RLS, triggers, grants, or policies exist. The test must not contact the linked project.

- [ ] **Step 3: Commit the red security contract**

```powershell
git add supabase/tests/p2_202_access_control.test.sql
git commit -m "test: define staff access RLS contract"
```

### Task 4: Secure the schema with private helpers, grants, and RLS

**Files:**

- Modify: `supabase/migrations/<timestamp>_p2_202_access_control.sql`
- Modify: `supabase/tests/p2_202_access_control.test.sql` only to keep the plan count equal to actual assertions

**Interfaces:**

- Consumes: Task 3 red security contract.
- Produces: Private role helper functions and read-only staff access enforcement.

- [ ] **Step 1: Add the timestamp trigger and authorization helpers**

Append these components to the unpushed migration. `set_updated_at` is an internal trigger function; it gets no direct client `EXECUTE` grant.

```sql
create schema if not exists private;
revoke all on schema private from public;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger staff_roles_set_updated_at
before update on public.staff_roles
for each row execute function private.set_updated_at();

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles as staff_role
    join public.profiles as profile on profile.id = staff_role.user_id
    where staff_role.user_id = (select auth.uid())
      and staff_role.role = 'admin'::public.staff_role
      and profile.is_active
  );
$$;

create function private.is_editor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_roles as staff_role
    join public.profiles as profile on profile.id = staff_role.user_id
    where staff_role.user_id = (select auth.uid())
      and staff_role.role in ('admin'::public.staff_role, 'editor'::public.staff_role)
      and profile.is_active
  );
$$;

revoke all on function private.set_updated_at() from public;
revoke all on function private.is_admin() from public;
revoke all on function private.is_editor_or_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_editor_or_admin() to authenticated;
```

- [ ] **Step 2: Apply deny-by-default grants and RLS policies**

Append the following policy shape. Use distinct names exactly as shown to keep catalog tests readable:

```sql
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

revoke all on table public.profiles, public.staff_roles, public.audit_logs from anon, authenticated;
grant select on table public.profiles, public.staff_roles, public.audit_logs to authenticated;

alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles
for select to authenticated
using (id = (select auth.uid()) and (select private.is_editor_or_admin()));
create policy profiles_select_admin on public.profiles
for select to authenticated
using ((select private.is_admin()));

create policy staff_roles_select_self on public.staff_roles
for select to authenticated
using (user_id = (select auth.uid()) and (select private.is_editor_or_admin()));
create policy staff_roles_select_admin on public.staff_roles
for select to authenticated
using ((select private.is_admin()));

create policy audit_logs_select_admin on public.audit_logs
for select to authenticated
using ((select private.is_admin()));
```

Do not create `FOR ALL` policies. Do not grant DML. P2-203 owns controlled staff lifecycle writes and P2-303 owns audit-producing content mutations.

- [ ] **Step 3: Reset and prove all pgTAP assertions turn green**

Run:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local supabase/tests/p2_202_access_control.test.sql
npm run supabase --prefix frontend -- db advisors --local --type security --level warn
npm run supabase --prefix frontend -- db advisors --local --type performance --level warn
```

Expected: pgTAP passes. Resolve every advisor item caused by P2-202 before continuing. Record unrelated platform baseline notices separately; do not suppress an RLS, mutable-search-path, exposed-function, or missing-index finding created by this migration.

- [ ] **Step 4: Commit the secure database foundation**

```powershell
git add supabase/migrations supabase/tests/p2_202_access_control.test.sql
git commit -m "feat: secure staff access with RLS"
```

### Task 5: Document and deploy the verified migration

**Files:**

- Modify: `supabase/README.md`
- Verify: `supabase/migrations/<timestamp>_p2_202_access_control.sql`

**Interfaces:**

- Consumes: green local migration and pgTAP suite from Task 4.
- Produces: remote database schema matching local migration history.

- [ ] **Step 1: Document local testing and remote boundary**

Add a P2-202 section to `supabase/README.md` with these exact developer commands:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local supabase/tests/p2_202_access_control.test.sql
npm run supabase --prefix frontend -- db advisors --local --type security --level warn
npm run supabase --prefix frontend -- db push --linked --dry-run --skip-vault
```

State that only an authenticated owner can apply `db push --linked --skip-vault`, the command must be preceded by the dry run, and P2-202 does not create real user accounts or enable public signup.

- [ ] **Step 2: Verify the remote migration set before mutation**

Run:

```powershell
npm run supabase --prefix frontend -- migration list --linked
npm run supabase --prefix frontend -- db push --linked --dry-run --skip-vault
```

Expected: the dry run lists exactly the one timestamped P2-202 migration and no seed, Storage, Auth configuration, or Vault change. If it lists anything else, stop and inspect before applying it.

- [ ] **Step 3: Apply the single reviewed migration to the linked project**

Run:

```powershell
npm run supabase --prefix frontend -- db push --linked --skip-vault
```

Expected: migration history advances by exactly one row. If the CLI requests a database password, the repository owner enters it directly in their terminal; never request, copy, or log it in chat.

- [ ] **Step 4: Perform read-only remote verification**

Run:

```powershell
npm run supabase --prefix frontend -- migration list --linked
npm run supabase --prefix frontend -- db advisors --linked --type security --level warn
npm run supabase --prefix frontend -- db query --linked "select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('profiles', 'staff_roles', 'audit_logs') order by c.relname"
npm run supabase --prefix frontend -- db query --linked "select grantee, table_name, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name in ('profiles', 'staff_roles', 'audit_logs') and grantee in ('anon', 'authenticated') order by grantee, table_name, privilege_type"
```

Expected: all three tables report `relrowsecurity = true`; `anon` has no privilege rows; `authenticated` has only `SELECT` rows. The remote query must return no real data because P2-202 does not seed staff.

- [ ] **Step 5: Commit the runbook update**

```powershell
git add supabase/README.md
git commit -m "docs: add database access verification workflow"
```

### Task 6: Full verification and pull request

**Files:**

- Verify: all tracked P2-202 files

**Interfaces:**

- Consumes: completed Tasks 1–5.
- Produces: reviewable PR to `development` related to issue #8.

- [ ] **Step 1: Run every relevant check from a clean working tree**

Run:

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local supabase/tests/p2_202_access_control.test.sql
npm run supabase --prefix frontend -- db advisors --local --type security --level warn
Set-Location frontend
npm run lint
npm run build
npm run test:routes
npm run test:visual
Set-Location ..
git diff development...HEAD --check
git status --short --branch
git grep -n -I -E "SUPABASE_SERVICE_ROLE_KEY|service_role|eyJ[a-zA-Z0-9_-]{20,}" -- . ':!docs/superpowers/specs/2026-09-10-supabase-foundation-design.md'
```

Expected: all tests/builds pass, no whitespace errors, and secret scan produces no new result. Ignored `supabase/.temp/` is permitted; no tracked uncommitted change is permitted.

- [ ] **Step 2: Push branch and open a complete PR**

Push:

```powershell
git push -u origin feature/p2-202-access-control
```

Open a PR to `development` with title `feat: secure Supabase staff access foundation`. Its body must include Summary, scope, explicit non-scope, schema/RLS matrix, local and remote verification output, security-advisor findings, and migration rollout/rollback note.

Use `Related to #8`, not `Closes #8`: GitHub only auto-closes issue keywords on PRs targeting the default branch, while this project correctly targets `development`.

- [ ] **Step 3: Verify the PR metadata and CI**

Run:

```powershell
gh pr view --json number,url,baseRefName,headRefName,statusCheckRollup
```

Expected: head is `feature/p2-202-access-control`, base is `development`, and all currently configured CI checks pass. Issue #8 stays open until the owner merges and closes it manually.
