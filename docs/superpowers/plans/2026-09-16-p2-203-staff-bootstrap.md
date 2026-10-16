# P2-203 Staff Bootstrap dan Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun bootstrap Admin pertama dan lifecycle Admin/Editor yang aman, ter-audit, dan tidak membuka public signup.

**Architecture:** Supabase Postgres menyediakan RPC `SECURITY DEFINER` yang memvalidasi `auth.uid()` dan role Admin aktif sebelum setiap mutasi staf. Next.js Route Handlers memakai client SSR untuk memverifikasi caller dan client admin server-only—dengan `SUPABASE_SECRET_KEY`—hanya untuk Auth invitation dan kompensasi jika provisioning database gagal.

**Tech Stack:** Next.js 16 App Router, TypeScript/JavaScript boundary, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.116.0, Supabase CLI 2.117.0, PostgreSQL/pgTAP, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-16-p2-203-staff-bootstrap-design.md`

## Global Constraints

- Hanya ada role `admin` dan `editor`; tidak ada role Member atau public signup.
- Role authorization tetap berasal dari `public.staff_roles` dan `public.profiles.is_active`, bukan `user_metadata`, `app_metadata`, atau klaim buatan browser.
- Setiap RPC write memakai `SECURITY DEFINER`, `SET search_path = ''`, nama schema lengkap, advisory lock bila memeriksa kondisi one-time/target, dan explicit `REVOKE PUBLIC`.
- `SUPABASE_SECRET_KEY` hanya boleh digunakan pada module server/admin; tidak boleh memakai prefix `NEXT_PUBLIC_` dan tidak boleh masuk response, audit, fixture, bundle browser, atau dokumentasi dengan nilai terisi.
- P2-203 tidak membuat halaman login, reset password UI, session-refresh proxy, route guard UI penuh, Storage, CMS content, Edge Function, atau WhatsApp notification.
- Perubahan schema dibuat melalui migration yang dibuat dengan `supabase migration new p2_203_staff_bootstrap`; migration lama tidak diubah.
- Test harus ditulis dan dibuat gagal sebelum production code ditulis; semua fixture Auth bersifat lokal/sintetis.
- Semua command Supabase dijalankan dari root repository melalui script `npm run supabase --prefix frontend --`.

## File Map

- Create: migration timestamped yang dicetak oleh `supabase migration new p2_203_staff_bootstrap` — RPC, grants, dan revoke.
- Create: `supabase/tests/p2_203_staff_bootstrap.test.sql` — pgTAP fixture dan allow/deny contract.
- Modify: `supabase/config.toml` — local Auth signup disabled.
- Modify: `frontend/.env.example` — public values plus blank server-only variable names.
- Create: `frontend/src/lib/supabase/admin.ts` — server-only Auth Admin client factory.
- Create: `frontend/src/lib/staff/validation.js` — input parser yang dapat diuji Node.
- Create: `frontend/src/lib/staff/server.ts` — caller verification dan lifecycle service functions.
- Create: `frontend/src/app/api/staff/invite-editor/route.ts` — invite + provision + compensation endpoint.
- Create: `frontend/src/app/api/staff/deactivate/route.ts` — deactivation endpoint.
- Create: `frontend/tests/p2-203-staff-contract.test.mjs` — boundary, config, route, dan validation contract.
- Modify: `frontend/tests/supabase-foundation.test.mjs` — environment contract P2-203.
- Modify: `frontend/tests/supabase-boundary.test.mjs` — staff workflow documentation contract.
- Modify: `supabase/README.md` — P2-203 local/remote runbook.
- Modify: `docs/03-architecture/DATA-MODEL-AND-RLS.md` — RPC lifecycle contract dan secret boundary.

---

### Task 1: Lock the Auth and server-secret boundary

**Files:**
- Modify: `frontend/tests/supabase-foundation.test.mjs`
- Create: `frontend/tests/p2-203-staff-contract.test.mjs`
- Modify: `supabase/config.toml`
- Modify: `frontend/.env.example`
- Create: `frontend/src/lib/supabase/admin.ts`
- Test: `frontend/tests/p2-203-staff-contract.test.mjs`

**Interfaces:**
- Produces `createSupabaseAdminClient(): SupabaseClient` for server-only route code.
- Produces environment contract `SUPABASE_URL=` and `SUPABASE_SECRET_KEY=` as blank names in `.env.example`.
- Keeps existing public variables `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=` unchanged and blank.

- [ ] **Step 1: Write the failing boundary tests.** Add assertions that local `auth.enable_signup` and `auth.email.enable_signup` are `false`, `.env.example` has exactly the four approved blank variables in this order, the admin module references only `SUPABASE_URL`/`SUPABASE_SECRET_KEY`, and browser modules do not import the admin module or mention the secret variable.

- [ ] **Step 2: Run the contract test to verify it fails.**

Run from `frontend`:

```powershell
node --test tests/p2-203-staff-contract.test.mjs
```

Expected: FAIL because the new admin module, variables, and disabled Auth settings do not exist.

- [ ] **Step 3: Implement the minimal Auth and admin client boundary.** Set both local signup switches to `false`; add the two blank server variable names; create `admin.ts` with this contract:

```ts
import { createClient } from "@supabase/supabase-js";

export const createSupabaseAdminClient = () => {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Supabase admin environment belum dikonfigurasi.");
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
};
```

Update the existing foundation test expected lines to include the two blank server-only variables and keep its populated-secret assertions.

- [ ] **Step 4: Run the contract tests to verify they pass.**

```powershell
npm run test:routes
```

Expected: all existing route/foundation tests and P2-203 boundary tests pass.

- [ ] **Step 5: Commit the boundary.**

```powershell
git add supabase/config.toml frontend/.env.example frontend/src/lib/supabase/admin.ts frontend/tests/supabase-foundation.test.mjs frontend/tests/p2-203-staff-contract.test.mjs
git commit -m "feat: lock staff auth server boundary"
```

### Task 2: Add database lifecycle RPCs with deny-by-default grants

**Files:**
- Create: the timestamped migration printed by `npm run supabase --prefix frontend -- migration new p2_203_staff_bootstrap`; do not rename it.
- Create: `supabase/tests/p2_203_staff_bootstrap.test.sql`

**Interfaces:**
- `public.bootstrap_first_admin(p_display_name text) returns uuid` creates the current Auth user as the first Admin exactly once.
- `public.provision_invited_editor(p_target_user_id uuid, p_display_name text) returns uuid` creates an Editor profile/role for an existing Auth user when called by an active Admin.
- `public.deactivate_staff(p_target_user_id uuid, p_reason text) returns void` deactivates an active Editor when called by an active Admin.

- [ ] **Step 1: Create the migration through the CLI.**

```powershell
npm run supabase --prefix frontend -- migration new p2_203_staff_bootstrap
```

Record the exact timestamped path printed by the CLI and use that path in all subsequent `git add` commands.

- [ ] **Step 2: Write pgTAP fixtures and failing assertions.** Create local synthetic Auth users for first Admin, existing Admin, Editor, inactive Editor, no-role user, and invite target. Add assertions for:

```sql
select throws_ok(
  $$ select public.bootstrap_first_admin('Admin Pertama') $$,
  'P0001', 'already_bootstrapped', 'second bootstrap is rejected'
);
select throws_ok(
  $$ select public.provision_invited_editor('66666666-6666-6666-6666-666666666666', 'Editor') $$,
  'P0001', 'not_admin', 'editor cannot provision staff'
);
select lives_ok(
  $$ select public.deactivate_staff('22222222-2222-2222-2222-222222222222', 'Rotasi tugas') $$,
  'admin can deactivate an editor'
);
```

Also assert the three procedures exist, use `SECURITY DEFINER`, have `PUBLIC` execute revoked, have `authenticated` execute granted, and write redacted audit actions.

- [ ] **Step 3: Run the new pgTAP file to verify it fails.**

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_203_staff_bootstrap.test.sql
```

Expected: FAIL because the lifecycle procedures do not yet exist.

- [ ] **Step 4: Implement the minimal migration.** Add the three functions with `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''`, explicit `auth.uid()` checks, input trim/length checks, fully qualified table names, and these transaction rules:

```sql
perform pg_catalog.pg_advisory_xact_lock(20320301);
```

`bootstrap_first_admin` must reject a non-authenticated caller or any existing staff role, then insert profile, Admin role, and `staff.bootstrapped` audit in one transaction. `provision_invited_editor` must require `private.is_admin()`, verify `auth.users` contains the target, reject the caller as target, reject an existing profile/role, then insert profile, Editor role, and `staff.invited` audit. `deactivate_staff` must require `private.is_admin()`, reject self, require an Editor role and active profile, update `is_active = false`, and insert `staff.deactivated` with only a trimmed bounded reason in `changes`.

Grant only `EXECUTE` on the exact signatures to `authenticated`; revoke execute from `PUBLIC` and `anon`. Do not grant table DML. Use `raise exception using errcode = 'P0001', message = 'validation_error'` or one of these stable machine-readable messages: `not_authenticated`, `already_bootstrapped`, `not_admin`, `target_not_found`, `target_already_staff`, `target_not_editor`, `cannot_deactivate_self`, and `validation_error`.

- [ ] **Step 5: Run pgTAP and advisors to verify the migration.**

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_203_staff_bootstrap.test.sql
npm run supabase --prefix frontend -- db advisors --local --type security --level warn
npm run supabase --prefix frontend -- db advisors --local --type performance --level warn
```

Expected: all P2-202 and P2-203 pgTAP assertions pass and both advisor commands report no issues.

- [ ] **Step 6: Commit the migration and tests.**

```powershell
git add supabase/migrations supabase/tests/p2_203_staff_bootstrap.test.sql
git commit -m "feat: add staff lifecycle database procedures"
```

### Task 3: Implement tested request validation and caller authorization

**Files:**
- Create: `frontend/src/lib/staff/validation.js`
- Create: `frontend/src/lib/staff/server.ts`
- Modify: `frontend/tests/p2-203-staff-contract.test.mjs`
- Test: `frontend/tests/p2-203-staff-contract.test.mjs`

**Interfaces:**
- `parseInviteEditorPayload(value)` returns `{ email: string, displayName: string }` or throws `validation_error`.
- `parseDeactivatePayload(value)` returns `{ userId: string, reason: string }` or throws `validation_error`.
- `requireActiveAdmin(client)` returns the verified `User` or throws an internal `not_authenticated`/`not_admin` error.

- [ ] **Step 1: Write failing Node tests for real validation behavior.** Import `frontend/src/lib/staff/validation.js` and assert that valid payloads are trimmed, malformed JSON-shaped values, empty values, invalid UUIDs, invalid email formats, and overlong fields throw an error with `code === 'validation_error'`.

- [ ] **Step 2: Run the validation tests to verify they fail.**

```powershell
node --test tests/p2-203-staff-contract.test.mjs
```

Expected: FAIL because the validation module does not exist.

- [ ] **Step 3: Implement the minimal validation module.** Use plain JavaScript so the Node test runner can import the same production parser. Enforce email length 3–254 with a conservative single `@` format, display name 1–120 characters, UUID v4-compatible textual shape, and reason 1–240 characters after trimming. Never include raw email or reason in thrown public messages.

- [ ] **Step 4: Run the validation tests to verify they pass.**

```powershell
node --test tests/p2-203-staff-contract.test.mjs
```

Expected: all validation assertions pass.

- [ ] **Step 5: Implement `requireActiveAdmin`.** Query the signed-in user with `client.auth.getUser()`, then read that user’s `staff_roles.role` and `profiles.is_active` through the caller-scoped SSR client. Return only when role is `admin` and active is `true`; otherwise throw an internal error that route handlers map to `401`/`403` without revealing target information.

- [ ] **Step 6: Commit the validation and authorization service.**

```powershell
git add frontend/src/lib/staff/validation.js frontend/src/lib/staff/server.ts frontend/tests/p2-203-staff-contract.test.mjs
git commit -m "feat: add staff lifecycle request guards"
```

### Task 4: Add invite and deactivation Route Handlers

**Files:**
- Create: `frontend/src/app/api/staff/invite-editor/route.ts`
- Create: `frontend/src/app/api/staff/deactivate/route.ts`
- Modify: `frontend/tests/p2-203-staff-contract.test.mjs`
- Test: `frontend/tests/p2-203-staff-contract.test.mjs`

**Interfaces:**
- `POST /api/staff/invite-editor` returns `201 { userId }`, `400` validation, `401/403` auth, `409` known conflict, or `502` safe upstream failure.
- `POST /api/staff/deactivate` returns `204`, `400`, `401/403`, `404` target not eligible, or `502` safe RPC failure.

- [ ] **Step 1: Write failing static route contract tests.** Assert both route files export `POST`, call `getUser`/`requireActiveAdmin`, call the expected RPC names, never import the browser client, never expose `SUPABASE_SECRET_KEY` in a response, and use `createSupabaseAdminClient` only in the invite route.

- [ ] **Step 2: Run the route contract tests to verify they fail.**

```powershell
node --test tests/p2-203-staff-contract.test.mjs
```

Expected: FAIL because both route files do not exist.

- [ ] **Step 3: Implement the invite route.** Parse `request.json()` with `parseInviteEditorPayload`, verify Admin, call `createSupabaseAdminClient().auth.admin.inviteUserByEmail(email)` without user metadata, call the caller-scoped client RPC with `p_target_user_id` and `p_display_name`, and on RPC failure call `auth.admin.deleteUser(userId)` before returning a generic `502`. Do not include the email in logs or response bodies.

- [ ] **Step 4: Implement the deactivation route.** Parse JSON with `parseDeactivatePayload`, verify Admin, call `client.rpc('deactivate_staff', { p_target_user_id: userId, p_reason: reason })`, map stable RPC messages to safe status codes, and return `new Response(null, { status: 204 })` on success.

- [ ] **Step 5: Run contract tests and TypeScript build.**

```powershell
npm run test:routes
npm run lint
npm run build
```

Expected: route contracts, lint, and production build pass with no server secret imported by public modules.

- [ ] **Step 6: Commit the Route Handlers.**

```powershell
git add frontend/src/app/api/staff frontend/src/lib/staff frontend/tests/p2-203-staff-contract.test.mjs
git commit -m "feat: add staff invitation and deactivation routes"
```

### Task 5: Document operations and architecture contract

**Files:**
- Modify: `supabase/README.md`
- Modify: `docs/03-architecture/DATA-MODEL-AND-RLS.md`
- Modify: `frontend/tests/supabase-boundary.test.mjs`

**Interfaces:**
- Runbook documents the exact local migration/test/advisor commands and hosted Auth manual setting.
- Architecture docs record RPC names, actor checks, compensation behavior, and secret boundary.

- [ ] **Step 1: Write failing documentation contract assertions.** Assert `supabase/README.md` mentions all three RPC names, `SUPABASE_SECRET_KEY`, local/hosted signup distinction, compensation delete, and the two route paths.

- [ ] **Step 2: Run the documentation test to verify it fails.**

```powershell
node --test tests/supabase-boundary.test.mjs
```

Expected: FAIL because the P2-203 runbook text is absent.

- [ ] **Step 3: Update the runbook and model docs.** Add bootstrap order, local commands, remote dry-run command, hosted Auth dashboard setting, environment names without values, safe retry behavior, and explicit statement that P2-204 owns UI sign-in/reset/route guards.

- [ ] **Step 4: Run documentation and diff checks.**

```powershell
npm run test:routes
git diff --check
```

Expected: all route/documentation contract tests pass and diff check is clean.

- [ ] **Step 5: Commit documentation.**

```powershell
git add supabase/README.md docs/03-architecture/DATA-MODEL-AND-RLS.md frontend/tests/supabase-boundary.test.mjs
git commit -m "docs: add p2-203 staff lifecycle runbook"
```

### Task 6: Full verification and handoff evidence

**Files:**
- Modify only if verification exposes a defect; otherwise no source changes.

- [ ] **Step 1: Reset and test the complete local database.**

```powershell
npm run supabase --prefix frontend -- db reset --local --no-seed
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_202_access_control.test.sql
npm run supabase --prefix frontend -- test db --local ../supabase/tests/p2_203_staff_bootstrap.test.sql
```

Expected: P2-202 and P2-203 pgTAP suites pass with zero failures.

- [ ] **Step 2: Run application quality gates.**

```powershell
npm run test:routes
npm run lint
npm run build
```

Expected: all route tests, ESLint, and Next.js production build pass.

- [ ] **Step 3: Run security scans.** Scan tracked text for populated secret-like values, inspect `git diff --stat`, and confirm `git status --short` contains only intended files. Run local Security and Performance Advisors again after the final migration.

- [ ] **Step 4: Verify migration state without applying remote changes.**

```powershell
npm run supabase --prefix frontend -- migration list --linked
npm run supabase --prefix frontend -- db push --linked --dry-run --skip-vault
```

Expected: dry-run lists exactly the new P2-203 migration and does not apply it. Remote push remains a separate reviewed operation.

- [ ] **Step 5: Commit any final verification-only documentation and record evidence.** If no files changed, do not create an empty commit. Report test counts, advisor results, migration dry-run output, and the next PR target (`development`).

## Self-review checklist

- [ ] Every spec scope item maps to Tasks 1–6.
- [ ] No task changes P2-204 UI/session scope.
- [ ] RPC names and parameter names are identical in migration, route calls, tests, and docs.
- [ ] Secret variable names are identical in `.env.example`, admin client, tests, and runbook.
- [ ] No production code is written before its test is observed failing.
- [ ] Migration is created by Supabase CLI rather than an invented filename.
