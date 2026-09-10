# Supabase Foundation and Visual Baseline Implementation Plan

> **For the implementation agent:** Execute this plan task-by-task. Keep all work on `feature/supabase-foundation`; do not modify the remote Supabase database, Authentication configuration, Storage, or Row Level Security in this issue.

**Goal:** Formally close the Phase 1 visual/accessibility baseline (P2-104) and establish a safe, reproducible local Supabase workflow and runtime boundary (P2-201) for the Next.js frontend.

**Architecture:** Playwright provides a versioned baseline for the seven public routes, while fast Node contract tests protect project-boundary rules. The frontend owns browser/server Supabase factories and reads only public connection settings lazily. The repository root remains the owner of the Supabase CLI directory and migrations; the frontend invokes the CLI through a root-directed package script.

**Tech Stack:** Next.js 16.3.4, React 19.2.8, TypeScript 5, Playwright 1.63.0, Supabase CLI 2.117.0, `@supabase/supabase-js` 2.116.0, `@supabase/ssr` 0.12.7, Node.js 22.

**Approved specification:** `docs/superpowers/specs/2026-09-10-supabase-foundation-design.md`

## Global constraints

- Work directly in the existing checkout. Do not create a worktree.
- Preserve `main` as release-only and use `development` as the PR target. This feature branch was created from `development`.
- Install packages through the official npm registry explicitly; the machine-wide npm configuration currently points to a mirror that does not implement audit endpoints.
- Never place `SUPABASE_SERVICE_ROLE_KEY`, a personal access token, database password, or a populated `.env` file in source control, logs, tests, screenshots, or documentation.
- The approved remote project is `kjxkmmjumrpafdublrbk` (`https://kjxkmmjumrpafdublrbk.supabase.co`). P2-201 may link the CLI metadata and read migration status only. It must not run a schema push, migration apply, seed, storage command, or Auth setting command.
- Do not add visual browser testing to GitHub Actions in this issue. CI browser installation is P2-502.
- Record screenshot baselines only after intentional visual review. A changed screenshot is reviewed as a product/design change, not blindly updated.

---

## Task 1: Add a deterministic Phase 1 visual and accessibility baseline (P2-104)

**Files:**

- Modify: `.gitignore`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Modify: `frontend/src/components/layout/PageShell.jsx`
- Create: `frontend/playwright.config.ts`
- Create: `frontend/tests/visual/public-routes.spec.ts`
- Create: `frontend/tests/visual/public-routes.spec.ts-snapshots/home-desktop-chromium-win32.png`

**Step 1: Write the browser test before runner configuration.**

Create `frontend/tests/visual/public-routes.spec.ts` with explicit, named viewport data:

```ts
const publicRoutes = [
  "/",
  "/tentang-kami",
  "/kegiatan",
  "/pelayanan",
  "/media",
  "/sekolah-sabat",
  "/kontak",
];

const viewports = [
  { name: "mobile-320", width: 320, height: 720 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 960 },
];
```

For every route and viewport, navigate with `waitUntil: "domcontentloaded"`, wait until `main` is visible and `document.fonts.ready` resolves, then assert the document does not have horizontal overflow. Do not wait for `networkidle`: remote media can keep requests open after the route and layout are ready.

```ts
expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
```

Add keyboard checks on `/` at width 390: focus `[data-testid="skip-to-content"]`, press Enter, then confirm `#konten-utama` is active; open `[data-testid="mobile-menu-button"]`, assert `aria-expanded="true"` and `[data-testid="mobile-menu"]` visible, press Escape, then assert `aria-expanded="false"` and the menu absent. Use `page.emulateMedia({ reducedMotion: "reduce" })` in the applicable tests.

Add a home-page visual assertion only at 1440px. It must hide the caret and disable animations:

```ts
await expect(page).toHaveScreenshot("home-desktop.png", {
  animations: "disabled",
  caret: "hide",
  fullPage: false,
});
```

**Step 2: Confirm the test cannot run until the runner is installed.**

Run from `frontend`:

```powershell
npm run test:visual
```

Expected initial result: command is unavailable because the visual runner has not been installed/configured. This documents that the test protects real new infrastructure rather than merely duplicating an existing passing command.

**Step 3: Configure and install the pinned runner.**

In `frontend/package.json`, add the exact development dependency and scripts:

```json
"test:visual": "playwright test",
"test:visual:update": "playwright test --update-snapshots",
"test:visual:install": "playwright install chromium"
```

Pin `@playwright/test` to `1.63.0` without a range. Install with:

```powershell
npm install --save-dev --save-exact @playwright/test@1.63.0 --registry=https://registry.npmjs.org
```

Create `frontend/playwright.config.ts`. Run Chromium only, resolve tests under `./tests/visual`, use `http://127.0.0.1:3412`, build then start the production server with `npm run build && npm run start -- --port 3412`, reuse a developer-started server only outside CI, set a 30-second test timeout, and retain traces/screenshots only on failure. This avoids unstable development-HMR behavior during interaction tests. Keep screenshot names independent of the developer's machine by configuring one Chromium project named `chromium`.

**Step 4: Install the local Chromium test browser and generate the reviewed baseline.**

Run:

```powershell
npm run test:visual:install
npm run test:visual:update
```

Inspect the generated `home-desktop` image at its full resolution. Verify the header, visible hero content, colors, readable Indonesian text, and no broken media are intentional. Commit the one approved image under `frontend/tests/visual/public-routes.spec.ts-snapshots/`; do not generate snapshots for every route or viewport.

**Step 5: Verify the red-to-green outcome.**

Run:

```powershell
npm run test:visual
```

Expected: 35 viewport overflow cases, keyboard/navigation checks, and the desktop home screenshot all pass. Treat unexpected layout behavior as a defect; adjust product styles only after reproducing it in the test.

Make `#konten-utama` programmatically focusable with `tabIndex={-1}` so the skip link transfers keyboard focus as well as scrolling to the content. Ignore only generated `frontend/test-results/`, `frontend/playwright-report/`, and `frontend/blob-report/`; retain the reviewed Playwright snapshot in source control.

**Step 6: Commit the baseline.**

```powershell
git add .gitignore frontend/package.json frontend/package-lock.json frontend/playwright.config.ts frontend/src/components/layout/PageShell.jsx frontend/tests/visual
git commit -m "test: add public visual baseline"
```

---

## Task 2: Define the Supabase environment and boundary contract with a fast test (P2-201)

**Files:**

- Create: `frontend/tests/supabase-foundation.test.mjs`

**Step 1: Create source-level contract tests before implementation.**

In a new Node test file, resolve the frontend and repository root with `import.meta.url`. Add separate `node:test` cases that assert:

1. `frontend/package.json` lists `@supabase/supabase-js` as exactly `2.116.0`, `@supabase/ssr` as exactly `0.12.7`, and dev dependency `supabase` as exactly `2.117.0`.
2. `frontend/.env.example` exists and contains only blank assignments for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; it must not contain `SERVICE_ROLE`, `DATABASE_URL`, a non-empty value, or the remote project URL/ref.
3. `.gitignore` ignores `supabase/.temp/` and allows the tracked `.env.example` file.
4. `supabase/config.toml` exists, proving the repository was initialized locally.
5. `frontend/src/lib/supabase/environment.ts`, `browser.ts`, and `server.ts` exist. The browser factory imports `createBrowserClient`; the server factory imports `createServerClient` and `next/headers`; no file contains `SERVICE_ROLE`.

Use exact package JSON parsing for versions and narrow regular expressions for source contracts. Do not import Supabase code in this test, because a unit test must not require environment values or contact a network service.

**Step 2: Add this file to the existing test command and run it.**

The existing glob `node --test tests/*.test.mjs` includes the new root-level test automatically. Run:

```powershell
npm run test:routes
```

Expected initial result: failures naming the missing package versions, environment example, CLI configuration, and client modules. Record the failure in the implementation notes; do not weaken the assertions.

---

## Task 3: Establish the local CLI and environment contract

**Files:**

- Modify: `.gitignore`
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`
- Create: `frontend/.env.example`
- Create or modify: `supabase/config.toml`
- Modify: `supabase/README.md`
- Modify: `README.md`

**Step 1: Protect generated metadata and permit the public example.**

Append narrowly scoped ignore rules after the existing environment rules:

```gitignore
# Versioned public environment contract
!.env.example

# Supabase CLI's local generated metadata (project linkage and cached CLI information)
supabase/.temp/
.supabase/
```

Do not add a broad `supabase/` ignore, because migrations, `config.toml`, tests, functions, and documentation are source-controlled project assets.

**Step 2: Add pinned Supabase packages and the root-aware CLI script.**

Add exact runtime dependencies:

```json
"@supabase/ssr": "0.12.7",
"@supabase/supabase-js": "2.116.0"
```

Add exact dev dependency `"supabase": "2.117.0"` and this package script:

```json
"supabase": "supabase --workdir .."
```

Install with the official registry:

```powershell
npm install @supabase/supabase-js@2.116.0 @supabase/ssr@0.12.7 --save-exact --registry=https://registry.npmjs.org
npm install --save-dev --save-exact supabase@2.117.0 --registry=https://registry.npmjs.org
```

Verify the repository-root context from `frontend` without contacting the remote project:

```powershell
npm run supabase -- --help
```

If `--workdir` behavior differs from the installed CLI's help output, stop and adjust the script only after inspecting `npm exec -- supabase --help`; do not guess an alternative syntax.

**Step 3: Initialize only local, versioned Supabase configuration.**

Run from repository root:

```powershell
npm run supabase --prefix frontend -- init
```

If the CLI reports that `supabase/config.toml` already exists, inspect it and keep a single standard configuration. Do not overwrite a meaningful pre-existing setting. The generated file must stay free of local passwords and cloud secrets.

**Step 4: Add the public, non-secret environment template.**

Create `frontend/.env.example` with exactly:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Developers copy it to `frontend/.env.local` and fill values obtained from Supabase's Connect/API settings. The template intentionally has no project reference or URL so test fixtures and public repository copies cannot be mistaken for a live connection.

**Step 5: Document the local workflow and its remote boundary.**

Update `supabase/README.md` and the root README with:

- prerequisite Node 22 and dependencies installed in `frontend`;
- `Copy-Item .env.example .env.local` when executed inside `frontend`;
- `npm run supabase --prefix frontend -- status` for local Docker status;
- `npm run supabase --prefix frontend -- migration list --linked` as the read-only remote migration inspection;
- a clear prohibition against committing `.env.local`, `.temp`, access tokens, service-role keys, or database passwords;
- an explicit statement that schema migration/RLS work begins only in P2-202.

Do not print authentication material in any example.

**Step 6: Re-run the fast contract test.**

Run:

```powershell
npm run test:routes
```

Expected: package/config/environment portions now pass; the client-module assertions remain failing until Task 4.

**Step 7: Commit the CLI/environment layer.**

```powershell
git add .gitignore frontend/package.json frontend/package-lock.json frontend/.env.example supabase/config.toml supabase/README.md README.md frontend/tests/supabase-foundation.test.mjs
git commit -m "chore: configure Supabase local workflow"
```

---

## Task 4: Implement lazy browser and server Supabase factories

**Files:**

- Create: `frontend/src/lib/supabase/environment.ts`
- Create: `frontend/src/lib/supabase/browser.ts`
- Create: `frontend/src/lib/supabase/server.ts`
- Modify: `frontend/tests/supabase-foundation.test.mjs` only if the contract needs an exact export name adjustment after implementation

**Step 1: Implement the environment accessor with no module-load failure.**

Create `environment.ts` with a named function such as `getSupabasePublicEnvironment()`. Read `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` inside the function, not at the file's top level. If either is absent, throw an actionable development error that lists only the missing public variable names. Never echo a supplied key or URL in the error.

This keeps unrelated build/test routes available before a developer configures a local project connection.

**Step 2: Implement the browser client.**

Create `browser.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnvironment } from "./environment";

export const createBrowserSupabaseClient = () => {
  const { url, publishableKey } = getSupabasePublicEnvironment();
  return createBrowserClient(url, publishableKey);
};
```

The factory may be called in Client Components only. Do not add a singleton that is created during module evaluation, and never import a server-only module here.

**Step 3: Implement the server client.**

Create `server.ts` with `createServerClient` from `@supabase/ssr`, `cookies` from `next/headers`, and the same environment accessor. Export `async createServerSupabaseClient()`. Read all request cookies and pass them to `createServerClient` via `getAll` / `setAll`. Wrap cookie writes in `try/catch` because Server Components cannot always write cookies; P2-204 will add the proxy responsible for session refresh/write handling.

Do not import this module from a Client Component, do not call `getSession()` to authorize a server action, and do not add a service-role client.

**Step 4: Verify the contract turns green.**

Run:

```powershell
npm run test:routes
npm run lint
npm run build
```

Expected: all Node tests including `supabase-foundation.test.mjs`, ESLint, and the Next.js production build pass without an `.env.local`. The build should not instantiate either factory.

**Step 5: Commit the runtime boundary.**

```powershell
git add frontend/src/lib/supabase frontend/tests/supabase-foundation.test.mjs
git commit -m "feat: add Supabase client boundary"
```

---

## Task 5: Link CLI metadata to the approved project and prove it is read-only

**Files:**

- Modify only generated and ignored local metadata below `supabase/.temp/`
- Modify: `supabase/README.md` only if command behavior needs a precise clarification

**Step 1: Authenticate safely if the CLI needs it.**

Run the local CLI's non-secret login flow:

```powershell
npm run supabase --prefix frontend -- login
```

If the CLI opens a browser, let the repository owner's existing Supabase account complete authentication there. If it asks for a personal access token in the terminal, pause and let the user enter it directly; do not request that token in chat or copy it into a file.

**Step 2: Link only the local CLI metadata.**

Run:

```powershell
npm run supabase --prefix frontend -- link --project-ref kjxkmmjumrpafdublrbk
```

If a database password is requested, do not ask for it in chat. Let the owner input it directly in the terminal. Confirm the created local metadata is beneath `supabase/.temp/` and remains ignored by Git.

**Step 3: Perform the one allowed remote read.**

Run:

```powershell
npm run supabase --prefix frontend -- migration list --linked
```

Expected: a read-only migration status. No migrations should be applied because P2-202 owns the first database schema. Stop immediately if a command proposes a destructive or mutating operation.

**Step 4: Prove no sensitive or generated files are staged.**

Run:

```powershell
git check-ignore -v supabase/.temp/cli-latest
git status --short
git diff --cached --check
git grep -n -I -E "SUPABASE_SERVICE_ROLE_KEY|service_role|eyJ[a-zA-Z0-9_-]{20,}" -- . ':!docs/superpowers/specs/2026-09-10-supabase-foundation-design.md'
```

Expected: the metadata path is ignored, the staged diff has no whitespace errors, and the secret scan has no output. If documentation was adjusted for observed CLI behavior, stage only that documentation change.

**Step 5: Commit the final documentation adjustment if one was necessary.**

```powershell
git add supabase/README.md
git commit -m "docs: document Supabase project linkage"
```

Skip this commit when the working tree has no tracked documentation change.

---

## Task 6: Full verification, PR preparation, and handoff

**Files:**

- Verify all tracked changes made in Tasks 1–5

**Step 1: Run the complete local verification suite.**

From `frontend` run:

```powershell
npm run lint
npm run build
npm run test:routes
npm run test:visual
```

From repository root run:

```powershell
git diff development...HEAD --check
git status --short --branch
```

Expected: all checks pass; only intentionally untracked and ignored `supabase/.temp/` metadata may exist; no uncommitted tracked changes remain.

**Step 2: Capture evidence for the issue closure.**

Record in the PR body:

- P2-104: Playwright 1.63.0, seven-route/viewport overflow matrix, keyboard menu/skip-link checks, and a reviewed home baseline.
- P2-201: CLI 2.117.0 initialized and locally linked, exact public env template, versioned migration directory, lazy browser/server factories, and read-only remote migration listing.
- Not included: remote schema, RLS, Storage, Auth configuration, service-role access, browser test CI, or a production deployment.

Use `Closes #5` and `Closes #6` only when both acceptance criteria have actually passed.

**Step 3: Push and open the feature PR to `development`.**

```powershell
git push -u origin feature/supabase-foundation
gh pr create --base development --head feature/supabase-foundation --title "feat: establish Supabase foundation" --body-file .github/PULL_REQUEST_TEMPLATE.md
```

Before the PR command, compose a complete temporary body with Summary, Changes, Verification commands/results, Scope exclusions, security notes, screenshots baseline note, and both issue links. If there is no PR template, pass that complete body directly with `--body` rather than creating a tracked file solely for PR text.

**Step 4: Verify the pushed PR.**

Run:

```powershell
gh pr view --json number,url,baseRefName,headRefName,statusCheckRollup
```

Confirm base is `development`, head is `feature/supabase-foundation`, all available CI checks are green, and the PR body accurately distinguishes P2-201's linkage/read-only work from future P2-202 schema work.
