# P2-204 Staff Auth, Session, dan Route Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan sign-in staf, acceptance undangan, reset password, refresh session berbasis cookie, logout, dan protected staff route tanpa public signup.

**Architecture:** Browser form memakai `createBrowserSupabaseClient`; callback, protected route, dan Route Handler memakai SSR client berbasis cookie. `frontend/src/proxy.ts` hanya memperbarui cookie dan melakukan optimistic redirect memakai `getClaims()`; validasi final Admin/Editor dilakukan server melalui `profiles` dan `staff_roles`.

**Tech Stack:** Next.js 16.3.4 App Router, React 19.2.8, TypeScript, `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.116.0, Node test runner, ESLint, Supabase local workflow.

**Spec:** `docs/superpowers/specs/2026-09-16-p2-204-auth-session-guards-design.md`

## Global Constraints

- Hanya role `admin` dan `editor`; tidak ada Member, public signup, OAuth, MFA, magic link, SMS, passkey, WhatsApp, CMS, Storage, atau Edge Function.
- Role authorization tetap berasal dari `public.staff_roles` dan `public.profiles.is_active`, bukan `user_metadata`, `app_metadata`, query parameter, atau state browser.
- Jangan gunakan `getSession()` sebagai bukti authorization server; proxy memakai `getClaims()`, server guard memakai `getUser()` lalu query role/profile.
- `SUPABASE_SECRET_KEY` hanya boleh digunakan oleh `frontend/src/lib/supabase/admin.ts` dan route invite server P2-203; tidak boleh masuk browser, proxy, response, log, fixture, atau URL.
- Redirect `next` harus path internal yang diawali `/`, bukan `//`, tidak memiliki hostname/protocol, dan fallback ke `/staff`.
- Rute publik Phase 1 dan metadata/desainnya tidak berubah.
- Semua Supabase package tetap pada versi terkunci yang sudah ada di `frontend/package.json`.
- Perubahan production code selalu diawali test yang terlihat gagal; setiap task berakhir dengan verifikasi dan commit kecil.

## File map

### Create

- `frontend/tests/p2-204-auth-contract.test.mjs` — contract/unit tests untuk helper, proxy, routes, pages, boundary secret, dan docs.
- `frontend/src/lib/auth/redirect.js` — normalisasi `next`, klasifikasi route Auth/staff, dan callback path bersama.
- `frontend/src/lib/supabase/proxy.ts` — factory SSR `NextRequest`/`NextResponse` untuk refresh session cookie memakai `getClaims()`.
- `frontend/src/proxy.ts` — network boundary Next.js 16 yang memanggil helper proxy dan redirect unauthenticated.
- `frontend/src/app/auth/callback/route.ts` — exchange code dan redirect aman.
- `frontend/src/app/auth/signout/route.ts` — logout POST berbasis cookie dan redirect ke login.
- `frontend/src/app/staff/login/page.tsx` — server wrapper login dengan `next` tervalidasi.
- `frontend/src/app/staff/login/LoginForm.tsx` — Client Component email/password.
- `frontend/src/app/staff/forgot-password/page.tsx` — server wrapper reset request.
- `frontend/src/app/staff/forgot-password/ForgotPasswordForm.tsx` — Client Component reset request generik.
- `frontend/src/app/staff/update-password/page.tsx` — server wrapper update password.
- `frontend/src/app/staff/update-password/UpdatePasswordForm.tsx` — Client Component set password.
- `frontend/src/app/staff/(protected)/layout.tsx` — server guard aktif untuk subtree protected.
- `frontend/src/app/staff/(protected)/page.tsx` — landing staff minimal dan logout form.

### Modify

- `frontend/src/lib/staff/server.ts` — tambah `requireActiveStaff` dan error `not_staff`; pertahankan `requireActiveAdmin`.
- `frontend/src/app/api/staff/invite-editor/route.ts` — kirim `redirectTo` callback internal saat Auth invite.
- `frontend/tests/p2-203-staff-contract.test.mjs` — assert invite route mempertahankan callback redirect tanpa secret.
- `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md` — pindahkan acceptance Auth UI dari P2-203 ke heading P2-204 baru.
- `supabase/README.md` — catat URL callback/allow-list dan ownership P2-204.

---

### Task 1: Redirect contract dan failing tests

**Files:**
- Create: `frontend/tests/p2-204-auth-contract.test.mjs`
- Create: `frontend/src/lib/auth/redirect.js`

**Interfaces:**
- Produces `safeNextPath(candidate, fallback = "/staff") -> string`.
- Produces `isPublicAuthPath(pathname) -> boolean`.
- Produces `isProtectedStaffPath(pathname) -> boolean`.
- Produces `AUTH_CALLBACK_PATH = "/auth/callback"` and `PASSWORD_UPDATE_PATH = "/staff/update-password"`.

- [ ] **Step 1: Write the failing tests**

Tambahkan test Node berikut ke `frontend/tests/p2-204-auth-contract.test.mjs`:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const repositoryRoot = resolve(frontendRoot, "..");
const require = createRequire(import.meta.url);
const redirectPath = resolve(frontendRoot, "src", "lib", "auth", "redirect.js");
const readText = (path) => readFileSync(path, "utf8");

test("P2-204 safeNextPath accepts internal path and rejects open redirects", () => {
  const { safeNextPath } = require(redirectPath);
  assert.equal(safeNextPath("/staff/settings"), "/staff/settings");
  assert.equal(safeNextPath("//evil.example"), "/staff");
  assert.equal(safeNextPath("https://evil.example"), "/staff");
  assert.equal(safeNextPath("javascript:alert(1)"), "/staff");
  assert.equal(safeNextPath(""), "/staff");
});

test("P2-204 route classifier leaves Auth pages public and protects staff pages", () => {
  const { isPublicAuthPath, isProtectedStaffPath } = require(redirectPath);
  for (const path of ["/staff/login", "/staff/forgot-password", "/auth/callback"]) {
    assert.equal(isPublicAuthPath(path), true, path);
  }
  assert.equal(isProtectedStaffPath("/staff"), true);
  assert.equal(isProtectedStaffPath("/staff/admin"), true);
  assert.equal(isProtectedStaffPath("/"), false);
});

test("P2-204 redirect helper is not an admin-secret boundary", () => {
  assert.ok(existsSync(redirectPath));
  const source = readText(redirectPath);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|createSupabaseAdminClient/);
});

test("P2-204 local Auth keeps public signup disabled", () => {
  const config = readText(resolve(repositoryRoot, "supabase", "config.toml"));
  assert.match(config, /^enable_signup\s*=\s*false\s*$/m);
});
```

- [ ] **Step 2: Run test untuk memastikan RED**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: FAIL karena `frontend/src/lib/auth/redirect.js` belum ada dan `require()` gagal menemukan module.

- [ ] **Step 3: Implementasi minimal helper**

Buat `redirect.js` dengan kontrak berikut:

```js
const AUTH_CALLBACK_PATH = "/auth/callback";
const PASSWORD_UPDATE_PATH = "/staff/update-password";

const safeNextPath = (candidate, fallback = "/staff") => {
  if (typeof candidate !== "string" || !candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//") || candidate.includes("\\")) return fallback;
  try {
    const url = new URL(candidate, "https://rinegetan.invalid");
    return url.origin === "https://rinegetan.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
};

const isPublicAuthPath = (pathname) =>
  pathname === "/staff/login" ||
  pathname === "/staff/forgot-password" ||
  pathname === PASSWORD_UPDATE_PATH ||
  pathname === AUTH_CALLBACK_PATH;

const isProtectedStaffPath = (pathname) =>
  pathname === "/staff" || pathname.startsWith("/staff/");

module.exports = {
  AUTH_CALLBACK_PATH,
  PASSWORD_UPDATE_PATH,
  isProtectedStaffPath,
  isPublicAuthPath,
  safeNextPath,
};
```

- [ ] **Step 4: Run test untuk GREEN**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: PASS untuk seluruh assertion Task 1.

- [ ] **Step 5: Commit**

```powershell
git add frontend/tests/p2-204-auth-contract.test.mjs frontend/src/lib/auth/redirect.js
git commit -m "test: define p2-204 auth redirect contract"
```

### Task 2: SSR proxy session refresh dan route redirect

**Files:**
- Create: `frontend/src/lib/supabase/proxy.ts`
- Create: `frontend/src/proxy.ts`
- Modify: `frontend/tests/p2-204-auth-contract.test.mjs`

**Interfaces:**
- Produces `updateSupabaseSession(request: NextRequest): Promise<{ response: NextResponse; claims: Record<string, unknown> | null }>`.
- `proxy(request: NextRequest): Promise<NextResponse>` refreshes cookies, redirects protected unauthenticated requests, and returns response cookies on redirects.

- [ ] **Step 1: Extend failing contract tests**

Tambahkan assertion berikut:

```js
test("P2-204 proxy owns SSR cookie refresh and optimistic staff redirect", () => {
  const proxyPath = resolve(frontendRoot, "src", "proxy.ts");
  const helperPath = resolve(frontendRoot, "src", "lib", "supabase", "proxy.ts");
  assert.ok(existsSync(proxyPath));
  assert.ok(existsSync(helperPath));
  const source = `${readText(proxyPath)}\n${readText(helperPath)}`;
  assert.match(source, /createServerClient/);
  assert.match(source, /getClaims\(\)/);
  assert.match(source, /NextResponse\.redirect/);
  assert.match(source, /request\.cookies/);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY|createSupabaseAdminClient|getSession\(\)/);
});

test("P2-204 proxy matcher excludes static assets and API", () => {
  const source = readText(resolve(frontendRoot, "src", "proxy.ts"));
  assert.match(source, /matcher/);
  assert.match(source, /_next/);
  assert.match(source, /api/);
});
```

- [ ] **Step 2: Run test untuk memastikan RED**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: FAIL karena helper dan `src/proxy.ts` belum tersedia.

- [ ] **Step 3: Implementasi SSR helper**

Buat `frontend/src/lib/supabase/proxy.ts` memakai `createServerClient` dan `getSupabasePublicEnvironment()`; setiap `setAll` harus menyalin cookie ke `request.cookies` lalu ke `response.cookies`. Setelah membuat client, panggil `await supabase.auth.getClaims()` dan kembalikan `claims ?? null` bersama response. Jangan impor `server.ts` karena helper ini berjalan pada request boundary.

- [ ] **Step 4: Implementasi Next proxy**

Buat `frontend/src/proxy.ts` dengan alur konkret:

```ts
export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSupabaseSession(request);
  const pathname = request.nextUrl.pathname;
  if (!isProtectedStaffPath(pathname) || isPublicAuthPath(pathname) || claims) {
    return response;
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/staff/login";
  loginUrl.search = `?next=${encodeURIComponent(`${pathname}${request.nextUrl.search}`)}`;
  const redirect = NextResponse.redirect(loginUrl);
  response.cookies.getAll().forEach(({ name, value, ...options }) => {
    redirect.cookies.set(name, value, options);
  });
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

Gunakan import `NextRequest`, `NextResponse`, helper route classifier, dan `updateSupabaseSession`. Matcher tidak boleh mengintersep Route Handler API P2-203.

- [ ] **Step 5: Run test dan lint**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs` lalu `npm run lint --prefix frontend`.

Expected: PASS; lint tidak menghasilkan error baru.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/lib/supabase/proxy.ts frontend/src/proxy.ts frontend/tests/p2-204-auth-contract.test.mjs
git commit -m "feat: add supabase session proxy for staff routes"
```

### Task 3: Server staff guard, protected landing, dan logout

**Files:**
- Modify: `frontend/src/lib/staff/server.ts`
- Create: `frontend/src/app/staff/(protected)/layout.tsx`
- Create: `frontend/src/app/staff/(protected)/page.tsx`
- Create: `frontend/src/app/auth/signout/route.ts`
- Modify: `frontend/tests/p2-204-auth-contract.test.mjs`

**Interfaces:**
- Produces `requireActiveStaff(client): Promise<{ user: User; role: "admin" | "editor" }>`.
- `StaffAccessError.code` includes `not_authenticated`, `not_staff`, and existing `not_admin`.

- [ ] **Step 1: Extend failing tests**

Tambahkan static contract:

```js
test("P2-204 staff server guard verifies Auth user plus active database role", () => {
  const source = readText(resolve(frontendRoot, "src", "lib", "staff", "server.ts"));
  assert.match(source, /requireActiveStaff/);
  assert.match(source, /auth\.getUser\(\)/);
  assert.match(source, /role.*admin.*editor|admin.*editor.*role/s);
  assert.match(source, /is_active/);
});

test("P2-204 protected landing and logout are server boundaries", () => {
  const layout = readText(resolve(frontendRoot, "src", "app", "staff", "(protected)", "layout.tsx"));
  const signout = readText(resolve(frontendRoot, "src", "app", "auth", "signout", "route.ts"));
  assert.match(layout, /requireActiveStaff/);
  assert.match(layout, /redirect/);
  assert.match(signout, /export\s+async\s+function\s+POST/);
  assert.match(signout, /auth\.signOut\(\)/);
  assert.doesNotMatch(`${layout}${signout}`, /SUPABASE_SECRET_KEY|createSupabaseAdminClient/);
});
```

- [ ] **Step 2: Run test untuk memastikan RED**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: FAIL karena `requireActiveStaff`, protected layout, dan logout route belum ada.

- [ ] **Step 3: Implementasi helper guard**

Refactor `staff/server.ts` dengan helper internal yang mengambil `auth.getUser()`, membaca `staff_roles.role` dan `profiles.is_active`, serta hanya mengembalikan user aktif dengan role `admin|editor`. `requireActiveAdmin` tetap memanggil helper lalu menolak role `editor` dengan `not_admin`; error database tidak dibocorkan ke caller.

- [ ] **Step 4: Implementasi protected route dan logout**

Protected layout memanggil `createServerSupabaseClient()` dan `requireActiveStaff()`. Untuk `not_authenticated`, redirect ke `/staff/login?next=/staff`; untuk `not_staff`, redirect ke `/staff/login?error=unauthorized`. Landing page menampilkan label role dari hasil guard dan form:

```tsx
<form action="/auth/signout" method="post">
  <button type="submit">Keluar</button>
</form>
```

Route logout memanggil `client.auth.signOut()` lalu `redirect("/staff/login")`; jika signOut gagal tetap redirect tanpa menampilkan detail error.

- [ ] **Step 5: Run test, lint, dan build**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`, `npm run lint --prefix frontend`, dan `npm run build --prefix frontend`.

Expected: PASS; build mengenali `/staff`, `/auth/signout`.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/lib/staff/server.ts frontend/src/app/staff frontend/src/app/auth/signout frontend/tests/p2-204-auth-contract.test.mjs
git commit -m "feat: protect staff routes and add logout"
```

### Task 4: Auth callback dan invite redirect

**Files:**
- Create: `frontend/src/app/auth/callback/route.ts`
- Modify: `frontend/src/app/api/staff/invite-editor/route.ts`
- Modify: `frontend/tests/p2-203-staff-contract.test.mjs`
- Modify: `frontend/tests/p2-204-auth-contract.test.mjs`

**Interfaces:**
- `GET /auth/callback?code=<code>&next=<path>` exchanges code and redirects to `safeNextPath(next, "/staff/update-password")`.
- Invite route calls `inviteUserByEmail(email, { redirectTo: <trusted callback URL> })`.

- [ ] **Step 1: Extend failing tests**

Tambahkan assertion:

```js
test("P2-204 callback exchanges code and never trusts an external next URL", () => {
  const path = resolve(frontendRoot, "src", "app", "auth", "callback", "route.ts");
  assert.ok(existsSync(path));
  const source = readText(path);
  assert.match(source, /export\s+async\s+function\s+GET/);
  assert.match(source, /exchangeCodeForSession/);
  assert.match(source, /safeNextPath/);
  assert.doesNotMatch(source, /console\.(log|error).*code|searchParams\.get\("code"\).*Response/);
});

test("P2-204 invitation route supplies callback redirect without secret exposure", () => {
  const source = readText(resolve(frontendRoot, "src", "app", "api", "staff", "invite-editor", "route.ts"));
  assert.match(source, /redirectTo/);
  assert.match(source, /auth\.callback|auth\/callback/);
  assert.match(source, /update-password/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_SUPABASE_SECRET_KEY/);
});
```

- [ ] **Step 2: Run test untuk memastikan RED**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: FAIL karena callback route belum ada dan invite route belum memiliki `redirectTo`.

- [ ] **Step 3: Implementasi callback**

Route callback memakai `createServerSupabaseClient()`, mengambil `code` dan `next` dari `new URL(request.url).searchParams`, menolak request tanpa code dengan redirect aman ke `/staff/login?error=callback`, memanggil `exchangeCodeForSession(code)`, dan redirect sukses ke `safeNextPath(next, "/staff/update-password")`. Tidak ada code/token di response body atau log.

- [ ] **Step 4: Perbarui invite route**

Sebelum `inviteUserByEmail`, buat URL callback dari `new URL("/auth/callback", request.url)`, set `next=/staff/update-password`, lalu panggil:

```ts
adminClient.auth.admin.inviteUserByEmail(payload.email, {
  redirectTo: callbackUrl.toString(),
});
```

Jangan menerima origin dari JSON payload. Pertahankan kompensasi `deleteUser` P2-203.

- [ ] **Step 5: Run tests**

Run: `npm run test:routes --prefix frontend -- p2-203-staff-contract.test.mjs p2-204-auth-contract.test.mjs` dan `npm run lint --prefix frontend`.

Expected: PASS; invite route tetap server-only.

- [ ] **Step 6: Commit**

```powershell
git add frontend/src/app/auth/callback frontend/src/app/api/staff/invite-editor/route.ts frontend/tests/p2-203-staff-contract.test.mjs frontend/tests/p2-204-auth-contract.test.mjs
git commit -m "feat: complete staff auth callback and invite acceptance"
```

### Task 5: Sign-in, forgot password, dan update password UI

**Files:**
- Create: `frontend/src/app/staff/login/page.tsx`
- Create: `frontend/src/app/staff/login/LoginForm.tsx`
- Create: `frontend/src/app/staff/forgot-password/page.tsx`
- Create: `frontend/src/app/staff/forgot-password/ForgotPasswordForm.tsx`
- Create: `frontend/src/app/staff/update-password/page.tsx`
- Create: `frontend/src/app/staff/update-password/UpdatePasswordForm.tsx`
- Modify: `frontend/tests/p2-204-auth-contract.test.mjs`

**Interfaces:**
- `LoginForm({ nextPath, initialError })` calls `signInWithPassword({ email, password })` and navigates only to `safeNextPath(nextPath)`.
- `ForgotPasswordForm({ redirectTo })` calls `resetPasswordForEmail(email, { redirectTo })` and always renders generic success copy.
- `UpdatePasswordForm()` calls `updateUser({ password })` only when password/confirmation match and minimum length is 8.

- [ ] **Step 1: Extend failing tests**

Tambahkan static assertions untuk file pages/forms:

```js
test("P2-204 auth pages use browser client and keep errors generic", () => {
  const files = [
    "src/app/staff/login/LoginForm.tsx",
    "src/app/staff/forgot-password/ForgotPasswordForm.tsx",
    "src/app/staff/update-password/UpdatePasswordForm.tsx",
  ];
  const source = files.map((file) => readText(resolve(frontendRoot, file))).join("\n");
  assert.match(source, /createBrowserSupabaseClient/);
  assert.match(source, /signInWithPassword/);
  assert.match(source, /resetPasswordForEmail/);
  assert.match(source, /updateUser/);
  assert.doesNotMatch(source, /createSupabaseAdminClient|SUPABASE_SECRET_KEY/);
  assert.match(source, /tidak dapat|periksa kembali|terkirim|password/i);
});

test("P2-204 Auth pages exist and invitation/reset update route is public to proxy", () => {
  for (const path of [
    "src/app/staff/login/page.tsx",
    "src/app/staff/forgot-password/page.tsx",
    "src/app/staff/update-password/page.tsx",
  ]) assert.ok(existsSync(resolve(frontendRoot, path)), path);
  const redirectSource = readText(resolve(frontendRoot, "src", "lib", "auth", "redirect.js"));
  assert.match(redirectSource, /update-password/);
});
```

- [ ] **Step 2: Run test untuk memastikan RED**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: FAIL karena halaman/form Auth belum ada.

- [ ] **Step 3: Implementasi LoginForm dan page wrapper**

`LoginForm.tsx` harus memakai `"use client"`, controlled email/password input, `isSubmitting`, error generik, dan `createBrowserSupabaseClient().auth.signInWithPassword`. Saat sukses gunakan `window.location.assign(safeNextPath(nextPath))`; saat gagal jangan tampilkan `error.message` mentah. Page server membaca `searchParams`, menjalankan `safeNextPath`, lalu meneruskan props.

- [ ] **Step 4: Implementasi ForgotPasswordForm**

Form memakai `resetPasswordForEmail` dengan `redirectTo` callback `/auth/callback?next=/staff/update-password`. Setelah submit, selalu tampilkan copy generik bahwa instruksi akan dikirim bila alamat terdaftar. Jangan membedakan `user not found`.

- [ ] **Step 5: Implementasi UpdatePasswordForm**

Form memvalidasi password minimal 8 karakter dan confirmation sama sebelum memanggil `updateUser({ password })`. Setelah sukses `window.location.assign("/staff")`; error UI generik. Page ini tidak memanggil admin client dan tetap dapat dibuka saat recovery/invite session.

- [ ] **Step 6: Run test, lint, build**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`, `npm run lint --prefix frontend`, dan `npm run build --prefix frontend`.

Expected: PASS; build menghasilkan `/staff/login`, `/staff/forgot-password`, `/staff/update-password`, dan `/auth/callback`.

- [ ] **Step 7: Commit**

```powershell
git add frontend/src/app/staff frontend/tests/p2-204-auth-contract.test.mjs
git commit -m "feat: add staff sign-in and password recovery screens"
```

### Task 6: Konsistensi backlog dan runbook

**Files:**
- Modify: `docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md`
- Modify: `supabase/README.md`
- Modify: `frontend/tests/p2-204-auth-contract.test.mjs`

- [ ] **Step 1: Write failing documentation assertions**

Tambahkan test:

```js
test("P2-204 documentation separates lifecycle from Auth UI/session work", () => {
  const backlog = readText(resolve(repositoryRoot, "docs", "04-delivery", "PHASE-2-ISSUE-BACKLOG.md"));
  assert.match(backlog, /### P2-204/);
  assert.match(backlog, /sign-in.*invitation acceptance.*reset password.*session refresh.*route guard/s);
  const p203 = backlog.match(/### P2-203[\s\S]*?(?=### P2-204)/)?.[0] ?? "";
  assert.doesNotMatch(p203, /sign-in\/reset berfungsi/);
});
```

- [ ] **Step 2: Run test untuk memastikan RED**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`

Expected: FAIL karena heading P2-204 belum ada pada backlog.

- [ ] **Step 3: Perbaiki backlog**

Ubah P2-203 acceptance menjadi bootstrap/provision/deactivate/audit tanpa sign-in/reset. Tambahkan setelahnya:

```markdown
### P2-204 — Staff sign-in, invitation acceptance, reset password, session refresh, dan route guard

- **Label:** feature, frontend, auth, security, priority:critical
- **Sprint:** 2
- **Status:** ready
- **Dependencies:** P2-203
- **Acceptance criteria:** Admin/Editor dapat sign-in; link undangan dan reset password dapat diselesaikan; session cookie direfresh; `/staff/*` terlindungi server-side; tidak ada public signup atau open redirect.
```

- [ ] **Step 4: Perbarui Supabase runbook**

Tambahkan ke `supabase/README.md` bahwa hosted Auth URL Configuration harus mengizinkan `/auth/callback`, invite/reset memakai `/auth/callback?next=/staff/update-password`, dan P2-204 tidak menjalankan `db push` atau mengubah migration.

- [ ] **Step 5: Run test dan commit**

Run: `npm run test:routes --prefix frontend -- p2-204-auth-contract.test.mjs`.

Expected: PASS.

```powershell
git add docs/04-delivery/PHASE-2-ISSUE-BACKLOG.md supabase/README.md frontend/tests/p2-204-auth-contract.test.mjs
git commit -m "docs: separate p2-204 auth delivery scope"
```

### Task 7: Final verification dan review checkpoint

**Files:**
- Modify only if verification menemukan mismatch; jangan melakukan refactor tidak terkait.

- [ ] **Step 1: Run full frontend contract/lint/build suite**

```powershell
npm run test:routes --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Expected: seluruh contract test PASS, ESLint exit code 0, dan production build exit code 0.

- [ ] **Step 2: Inspect secret and route boundaries**

```powershell
rg -n "SUPABASE_SECRET_KEY|SERVICE_ROLE|createSupabaseAdminClient" frontend/src frontend/tests docs supabase
git diff --check
git status --short
```

Expected: populated secret tidak ditemukan; admin client hanya muncul pada module/route P2-203; `git diff --check` bersih; perubahan hanya scope P2-204.

- [ ] **Step 3: Review route inventory**

```powershell
rg -n "staff/login|forgot-password|update-password|auth/callback|auth/signout|proxy" frontend/src docs supabase
```

Pastikan rute publik Phase 1 tetap utuh dan tidak ada `getSession()` pada proxy/guard.

- [ ] **Step 4: Commit verification-only changes if any**

```powershell
git add frontend docs supabase
git commit -m "test: verify p2-204 auth boundaries"
```

Jalankan commit ini hanya jika Task 7 memang menghasilkan perubahan perbaikan kecil; jika tidak, biarkan working tree bersih tanpa commit kosong.

## Self-review checklist

- [ ] Setiap acceptance criteria spec punya task dan assertion.
- [ ] Test setiap boundary ditulis dan terlihat gagal sebelum production code.
- [ ] Tidak ada task memakai `getSession()` untuk authorization.
- [ ] Proxy tidak membaca secret atau query database role.
- [ ] Protected layout/Route Handler memeriksa Auth user plus role/profile database.
- [ ] Invite route mempertahankan compensation P2-203 dan menambahkan callback URL internal.
- [ ] `next` tidak dapat menjadi external/protocol-relative redirect.
- [ ] Public signup tetap disabled di local config dan tidak ada UI signup.
- [ ] Tidak ada perubahan migration/database schema untuk P2-204.
- [ ] Dokumentasi backlog/runtimes menyebutkan P2-203/P2-204 secara konsisten.
