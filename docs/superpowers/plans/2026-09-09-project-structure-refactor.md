# Phase 2 Project-Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote a route-compatible Next.js App Router application to the root `frontend/` directory, preserve the Phase 1 public experience, and establish the repository boundaries required for Phase 2 without deleting the legacy application or activating Supabase data access.

**Architecture:** The existing React/CRACO application remains intact in `archive/phase-1-web/` after its public routes have been characterized and reproduced by a new Next.js application. The Next root layout provides static metadata and the public layout provides the retained PageShell; client-only behavior is confined to small client components. A version-controlled `supabase/` directory is introduced only as a local migration/test boundary—there is no remote schema change, secret, or live query in this refactor.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript for routes/configuration, transitional JavaScript presentation components, Tailwind CSS 3, Framer Motion, Lenis, Lucide React, Node's built-in test runner, and the Supabase CLI directory convention (no CLI command in this PR).

**Spec:** `docs/superpowers/specs/2026-09-09-rinegetan-connect-design.md` and `docs/03-architecture/REPOSITORY-STRUCTURE.md`

## Global Constraints

- Work directly in the user-approved checkout; do not create a Git worktree.
- Preserve the seven public URLs exactly: `/`, `/tentang-kami`, `/kegiatan`, `/media`, `/pelayanan`, `/sekolah-sabat`, and `/kontak`.
- Preserve the unmodified Adventist symbol, Creation Grid, visual tokens, `data-testid` values, static fallback data, and reduced-motion behavior from Phase 1.
- Keep public content static in this change. Do not add Supabase clients, keys, Auth, Server Actions, migrations, RLS, Storage, forms, courses, PWA, notifications, or WhatsApp.
- `frontend-next/` is an untracked temporary scaffold; it may not be committed under that path. The release application must finish at root `frontend/`.
- Do not delete the legacy React application. Move it to `archive/phase-1-web/` only after the new application passes the route contract and production build.
- Do not move `backend/` in this change. It remains for compatibility until a later Supabase foundation PR has passed migrations, RLS tests, and review.
- Do not commit `.env*`, `node_modules`, `.next`, `build`, output artifacts, credentials, congregation data, or generated visual baselines.
- Commit each completed task on `refactor/phase-2-project-structure`; do not open the feature PR until the agreed Phase 2 integration point.

## Target File Structure

```text
frontend/                                  # promoted Next.js production app
  package.json
  package-lock.json
  next.config.ts
  postcss.config.js
  tailwind.config.ts
  scripts/assert-public-route-contract.mjs
  tests/public-route-contract.test.mjs
  src/
    app/
      layout.tsx
      (public)/
        layout.tsx
        page.tsx
        tentang-kami/page.tsx
        kegiatan/page.tsx
        media/page.tsx
        pelayanan/page.tsx
        sekolah-sabat/page.tsx
        kontak/page.tsx
    components/identity|layout|motion|sections/ # retained Phase 1 presentation
    components/runtime/PublicClientRuntime.tsx
    data/content.js
    lib/utils.js
supabase/
  README.md
  migrations/.gitkeep
  tests/.gitkeep
  functions/.gitkeep
archive/
  README.md
  phase-1-web/                             # former React/CRACO frontend
backend/                                   # retained temporarily; not product runtime
```

---

### Task 1: Characterize the public route contract and make the temporary Next scaffold reproducible

**Files:**

- Create: `frontend-next/tests/public-route-contract.test.mjs`
- Create: `frontend-next/scripts/assert-public-route-contract.mjs`
- Modify: `frontend-next/package.json`
- Create: `frontend-next/package-lock.json`
- Modify: `frontend-next/tsconfig.json`
- Modify: `frontend-next/next.config.ts`
- Create: `frontend-next/tailwind.config.ts`
- Modify: `frontend-next/postcss.config.mjs`
- Modify: `frontend-next/src/app/layout.tsx`
- Modify: `frontend-next/src/app/globals.css`
- Delete: `frontend-next/src/app/page.tsx`

**Interfaces:**

- Consumes: the route list in `docs/03-architecture/PHASE-1-INVENTORY.md`.
- Produces: `npm run test:routes`, which requires a built `.next/server/app-paths-manifest.json` and verifies all seven canonical routes.
- Produces: `src/app/layout.tsx`, the metadata/root document boundary for every route.

- [ ] **Step 1: Write the failing route contract test**

Create `tests/public-route-contract.test.mjs` before creating any public route files. The test invokes the assertion script against the build manifest and expects these exact paths:

```js
const expectedRoutes = [
  "/",
  "/tentang-kami",
  "/kegiatan",
  "/media",
  "/pelayanan",
  "/sekolah-sabat",
  "/kontak",
];
```

The assertion script must parse `.next/server/app-paths-manifest.json`, normalize the root page to `/`, report every missing route in one error, and reject a missing manifest with `Jalankan next build sebelum test:routes.`. It must not start a development server or hit the network.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:routes`

Expected: FAIL because the default scaffold has not produced a build manifest and does not implement the seven public routes.

- [ ] **Step 3: Replace only the scaffold configuration**

Keep the current Next.js 16 / React 19 versions, then add the presentation dependencies actually used by Phase 1: `framer-motion`, `lenis`, `lucide-react`, `clsx`, and `tailwind-merge`. Replace Tailwind 4-only configuration with Tailwind CSS 3.4, PostCSS, Autoprefixer, and a typed configuration that carries the original navy/Sabbath tokens, font stacks, content glob `./src/**/*.{js,jsx,ts,tsx}`, and `tailwindcss-animate` plugin.

Add these scripts without a preinstall/postinstall workaround:

```json
{
  "build": "next build",
  "lint": "eslint",
  "test:routes": "node --test tests/public-route-contract.test.mjs"
}
```

Replace default metadata and Geist imports with Indonesian metadata and the documented font fallback stack. The root layout must be a server component and must expose `<html lang="id">`.

Copy the Phase 1 CSS tokens and utility/component classes into `src/app/globals.css`; preserve the visible focus ring and `prefers-reduced-motion` override. Do not copy CRACO, Emergent visual-edit, health-check, React Router, or React Scripts configuration.

- [ ] **Step 4: Install from the declared lockfile and prove the configuration compiles**

Run: `npm install`

Run: `npm run lint`

Expected: the application has a lockfile and lint reports no configuration-loading failure. The route test remains red until Task 3 creates the pages.

- [ ] **Step 5: Commit the reproducible scaffold**

```bash
git add frontend-next/package.json frontend-next/package-lock.json frontend-next/tsconfig.json frontend-next/next.config.ts frontend-next/tailwind.config.ts frontend-next/postcss.config.mjs frontend-next/tests frontend-next/scripts frontend-next/src/app
git commit -m "refactor: prepare Next.js public route contract"
```

### Task 2: Port Phase 1 presentation and isolate browser behavior

**Files:**

- Create: `frontend-next/src/data/content.js`
- Create: `frontend-next/src/lib/utils.js`
- Create: `frontend-next/src/components/identity/AdventistSymbol.jsx`
- Create: `frontend-next/src/components/identity/EntityLockup.jsx`
- Create: `frontend-next/src/components/identity/extraIcons.jsx`
- Create: `frontend-next/src/components/layout/CreationGrid.jsx`
- Create: `frontend-next/src/components/layout/PageShell.jsx`
- Create: `frontend-next/src/components/layout/GlobalNav.jsx`
- Create: `frontend-next/src/components/layout/GlobalFooter.jsx`
- Create: `frontend-next/src/components/motion/KineticLines.jsx`
- Create: `frontend-next/src/components/motion/Reveal.jsx`
- Create: `frontend-next/src/components/runtime/PublicClientRuntime.tsx`
- Create: `frontend-next/src/components/sections/` with the nine Phase 1 section components.
- Create: `frontend-next/public/adventist-symbol.svg`

**Interfaces:**

- Consumes: `data/content.js` exports `CHURCH`, `NAV_LINKS`, `SABBATH`, `IMAGES`, `EVENT_CATEGORIES`, `EVENTS`, `DEPARTMENTS`, `MEDIA_ITEMS`, `MINISTRY_CARDS`, `MARQUEE_ITEMS`, and `SABBATH_SCHOOL_CLASSES`.
- Produces: `<PageShell>{children}</PageShell>` with a skip link, header, main landmark `id="konten-utama"`, and footer.
- Produces: `<PublicClientRuntime />`, which owns Lenis and Sonner only; no server module imports it.

- [ ] **Step 1: Write the failing legacy-runtime isolation test**

Extend `tests/public-route-contract.test.mjs` to read `package.json` and all files under `src/`. Add assertions that the new app has no `react-router-dom`, `react-scripts`, `@craco/craco`, `BrowserRouter`, `Routes`, or `NavLink` imports. The assertion must fail before the adapted components are present.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:routes`

Expected: FAIL with the missing build-manifest message; the test does not yet have route pages to compile.

- [ ] **Step 3: Copy presentation components with narrowly scoped App Router adaptations**

Copy static data, inline Adventist symbol, Creation Grid, PageShell, sections, and CSS class names from the archived Phase 1 source without changing content or `data-testid` strings.

Apply these precise adaptations:

```tsx
// Global navigation: client-only state and active pathname.
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const pathname = usePathname();
const active = pathname === link.href;
<Link href={link.href} aria-current={active ? "page" : undefined}>{link.label}</Link>
```

```tsx
// Browser-only smooth scrolling lives in one component.
"use client";
import { useEffect } from "react";
import Lenis from "lenis";

export function PublicClientRuntime() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    let frame = requestAnimationFrame(function tick(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(tick);
    });
    return () => { cancelAnimationFrame(frame); lenis.destroy(); };
  }, []);
  return null;
}
```

Use `next/link` in `EntityLockup`, `GlobalNav`, `GlobalFooter`, `EventsSection`, `MediaSection`, and `VisitCTA`. Mark only `GlobalNav`, `KineticLines`, `Reveal`, `Hero`, and the eventual interactive filter/form page components with `"use client"`; the PageShell and static sections remain server-compatible. Copy `adventist-symbol.svg` byte-for-byte to `public/`; do not modify its geometry.

- [ ] **Step 4: Run static checks before porting pages**

Run: `npm run lint`

Expected: PASS. A temporary missing-page build failure is acceptable at this point, but no React Router import remains in `frontend-next/src`.

- [ ] **Step 5: Commit the presentation boundary**

```bash
git add frontend-next/src/data frontend-next/src/lib frontend-next/src/components frontend-next/public/adventist-symbol.svg frontend-next/tests
git commit -m "refactor: port Phase 1 presentation to Next components"
```

### Task 3: Recreate every public page with App Router files

**Files:**

- Create: `frontend-next/src/app/(public)/layout.tsx`
- Create: `frontend-next/src/app/(public)/page.tsx`
- Create: `frontend-next/src/app/(public)/tentang-kami/page.tsx`
- Create: `frontend-next/src/app/(public)/kegiatan/page.tsx`
- Create: `frontend-next/src/app/(public)/media/page.tsx`
- Create: `frontend-next/src/app/(public)/pelayanan/page.tsx`
- Create: `frontend-next/src/app/(public)/sekolah-sabat/page.tsx`
- Create: `frontend-next/src/app/(public)/kontak/page.tsx`
- Create: `frontend-next/src/components/pages/HomePage.jsx`
- Create: `frontend-next/src/components/pages/TentangKamiPage.jsx`
- Create: `frontend-next/src/components/pages/KegiatanPage.jsx`
- Create: `frontend-next/src/components/pages/MediaPage.jsx`
- Create: `frontend-next/src/components/pages/PelayananPage.jsx`
- Create: `frontend-next/src/components/pages/SekolahSabatPage.jsx`
- Create: `frontend-next/src/components/pages/KontakPage.jsx`

**Interfaces:**

- Consumes: `<PageShell>` from Task 2 and static page components copied from Phase 1.
- Produces: an App Router page module for each Phase 1 public URL.
- Produces: the established anchors `#alkitab` and `#berkunjung` and the retained client-only mock contact submission.

- [ ] **Step 1: Make the contract test fail for missing route implementations**

Keep the expected route array from Task 1 and add a source-file mapping assertion:

```js
const sourceFiles = [
  "src/app/(public)/page.tsx",
  "src/app/(public)/tentang-kami/page.tsx",
  "src/app/(public)/kegiatan/page.tsx",
  "src/app/(public)/media/page.tsx",
  "src/app/(public)/pelayanan/page.tsx",
  "src/app/(public)/sekolah-sabat/page.tsx",
  "src/app/(public)/kontak/page.tsx",
];
```

Each must exist and export a default component. Run `npm run test:routes` before adding them so it fails for the absent files.

- [ ] **Step 2: Port the page bodies without adding Phase 2 behavior**

Copy the seven legacy page bodies into `components/pages`. The route modules are thin typed wrappers, for example:

```tsx
import HomePage from "@/components/pages/HomePage";

export default function Page() {
  return <HomePage />;
}
```

The public route-group layout must retain the shell and client runtime:

```tsx
import { PageShell } from "@/components/layout/PageShell";
import { PublicClientRuntime } from "@/components/runtime/PublicClientRuntime";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <PageShell><PublicClientRuntime />{children}</PageShell>;
}
```

Mark `KegiatanPage`, `MediaPage`, and `KontakPage` as client components for their existing filters and mock form state. Preserve the mock confirmation; it must not submit to FastAPI, Supabase, or email.

- [ ] **Step 3: Verify the refactor contract and the production build**

Run: `npm run build`

Run: `npm run test:routes`

Run: `npm run lint`

Expected: the build writes the app-path manifest; the route test passes for all seven URLs; lint passes without React Router or CRACO imports.

- [ ] **Step 4: Perform manual responsive smoke tests**

Run: `npm run dev`

Verify `/`, `/tentang-kami`, `/kegiatan`, `/media`, `/pelayanan`, `/sekolah-sabat`, and `/kontak` at 320px, 375px, 768px, 1024px, and 1440px. Check the mobile menu, keyboard Escape close, skip link, active navigation state, `#alkitab`, `#berkunjung`, filters, mock contact confirmation, visible focus ring, and no horizontal overflow. Stop and correct any regression before promotion.

- [ ] **Step 5: Commit the route-compatible Next application**

```bash
git add frontend-next/src/app frontend-next/src/components/pages frontend-next/tests
git commit -m "refactor: preserve Phase 1 routes with Next App Router"
```

### Task 4: Add the local Supabase repository boundary without activating it

**Files:**

- Create: `supabase/README.md`
- Create: `supabase/migrations/.gitkeep`
- Create: `supabase/tests/.gitkeep`
- Create: `supabase/functions/.gitkeep`
- Modify: `README.md`

**Interfaces:**

- Consumes: the project-structure contract and existing Singapore Supabase project, without storing its URL, ref, or credentials in source.
- Produces: clear local locations for future migrations, database tests, and Edge Functions.

- [ ] **Step 1: Write a failing structure assertion**

Extend the built-in Node test with these required, version-controlled paths:

```js
const supabaseBoundary = [
  "../supabase/README.md",
  "../supabase/migrations/.gitkeep",
  "../supabase/tests/.gitkeep",
  "../supabase/functions/.gitkeep",
];
```

Run: `npm run test:routes`

Expected: FAIL because the Supabase boundary does not exist.

- [ ] **Step 2: Create the documented boundary**

`supabase/README.md` must state that migrations are append-only, database tests accompany policies, local CLI linking requires an authenticated developer session, and no `service_role`, database password, or Church data can be committed. It must explicitly state: this structural refactor creates no remote resource and applies no migration.

Update the root README with `frontend/` as the production application, `supabase/` as future database source control, `archive/phase-1-web/` as rollback reference after Task 5, and `backend/` as a temporary non-production legacy template.

- [ ] **Step 3: Run the structure assertion**

Run: `npm run test:routes`

Expected: PASS, including the Supabase directory checks, without requiring a Supabase CLI login or network connection.

- [ ] **Step 4: Commit the boundary**

```bash
git add supabase README.md frontend-next/tests
git commit -m "chore: add Supabase source-control boundary"
```

### Task 5: Promote Next.js to root frontend and archive the verified legacy application

**Files:**

- Move: `frontend/` → `archive/phase-1-web/`
- Move: `frontend-next/` → `frontend/`
- Create: `archive/README.md`
- Modify: `.github/workflows/ci.yml`
- Modify: `.gitignore`
- Modify: `docs/03-architecture/REPOSITORY-STRUCTURE.md`

**Interfaces:**

- Consumes: a passing Next production build and `npm run test:routes` from Tasks 3–4.
- Produces: root `frontend/package.json` with `next build` and a CI frontend job targeting the promoted app.
- Produces: `archive/phase-1-web/` as the exact legacy source fallback; `backend/` remains untouched.

- [ ] **Step 1: Capture the pre-promotion verification evidence**

Run from `frontend-next/`:

```bash
npm ci
npm run lint
npm run build
npm run test:routes
```

Expected: all commands pass. If any command fails, stop; do not move either directory.

- [ ] **Step 2: Move the directories with an explicit, reversible sequence**

First move tracked legacy files using Git:

```bash
git mv frontend archive/phase-1-web
```

Then move the verified temporary Next directory to its final root path. Confirm both resolved paths are within `C:\Users\Acer\Documents\Adriel Walintukan - Document\Project\Rinegetan-Connect` before the move. Do not use a wildcard, recursive deletion, `git reset`, or `git checkout --`.

- [ ] **Step 3: Update repository integration files**

Keep the CI workflow's frontend working directory at `frontend`; it now runs `npm ci` and `npm run build` against Next.js. Rename the job display name to `Next.js production build` so check output is unambiguous. Retain the legacy backend syntax job until the later Supabase foundation validation authorizes its archival.

Add these ignore patterns without unignoring current source:

```gitignore
**/.next/
**/build/
```

`archive/README.md` must identify `phase-1-web/` as a read-only rollback reference and explain that its CRACO build is no longer the CI/deployment target. Update the repository-structure document with a status note: Next has been promoted; FastAPI/Mongo archival remains gated on Supabase migrations and RLS validation.

- [ ] **Step 4: Verify the final repository layout**

Run from `frontend/`:

```bash
npm ci
npm run lint
npm run build
npm run test:routes
```

Run from the repository root:

```bash
python -m compileall -q backend
git diff --check origin/development...HEAD
git status --short
```

Expected: all verification commands pass. The only eligible changed paths are `frontend/`, `archive/phase-1-web/`, `archive/README.md`, `supabase/`, docs/README/configuration paths, and CI/ignore files. No `frontend-next/`, `node_modules`, build artifact, cache, or secret is staged.

- [ ] **Step 5: Commit the promoted structure**

```bash
git add .github/workflows/ci.yml .gitignore archive frontend supabase docs/03-architecture/REPOSITORY-STRUCTURE.md README.md
git commit -m "refactor: promote Next.js project structure"
```

### Task 6: Verify the branch exactly as CI will consume it

**Files:**

- Modify only if verification exposes a reproducible, scoped defect: files from Tasks 1–5.

**Interfaces:**

- Consumes: `origin/development` and the promoted `frontend/` project.
- Produces: a branch that has no merge conflict, no accidental runtime legacy dependency, and an auditable verification record.

- [ ] **Step 1: Re-run final commands from a clean dependency state**

Run:

```bash
git diff --check origin/development...HEAD
cd frontend && npm ci && npm run lint && npm run build && npm run test:routes
cd .. && python -m compileall -q backend
```

Expected: exit status 0 for every command.

- [ ] **Step 2: Inspect the exact outgoing change**

Run:

```bash
git diff --name-status origin/development...HEAD
git status --short
```

Confirm that `backend/server.py` is not moved, the `archive/phase-1-web/` files are renames rather than deletions, and no local `frontend-next/` directory remains.

- [ ] **Step 3: Push the feature branch only after local evidence passes**

Run:

```bash
git push --set-upstream origin refactor/phase-2-project-structure
```

Expected: GitHub starts the renamed Next.js CI job. Do not merge to `development` automatically; wait for its CI and user review.

---

## Plan Self-Review

- **Spec coverage:** Tasks 1–3 preserve the documented routes, design system, static fallback content, and browser boundaries. Task 4 creates the requested Supabase source-control boundary without prematurely creating database state. Task 5 meets the repository-structure promotion and archive safety rules. Task 6 validates the build/CI hand-off.
- **Deliberate exclusions:** CMS, database migrations/RLS, staff Auth, gallery, form delivery, PWA, and all deferred Phase 3–5 features remain out of scope. FastAPI/Mongo stays in place because its archive gate has not yet been met.
- **Ambiguity resolved:** JavaScript presentation components are intentionally transitional to preserve verified Phase 1 markup quickly; route modules, configuration, and all new integration contracts are TypeScript. A subsequent focused cleanup may convert presentation components after visual parity is locked.
