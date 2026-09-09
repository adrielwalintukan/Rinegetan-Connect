# Phase 2 CMS & Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the completed Phase 1 site into a Next.js App Router and Supabase application with secure Admin/Editor CMS, schedules, and consent-aware photo galleries while preserving public identity and URLs.

**Architecture:** Next.js renders public content server-side and serves protected staff routes. Supabase Postgres is the source of truth; Auth supplies staff identity, RLS/grants enforce data access, and Storage stores scoped media derivatives. Server-only handlers coordinate privileged work, validation, revalidation, and ZIP download generation.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase JS/SSR, Supabase CLI migrations and pgTAP RLS tests, Zod, Vitest, Playwright, Testing Library, axe-core, and image processing selected after a no-cost compatibility check.

## Global Constraints

- Preserve the seven public Phase 1 URLs and the Adventist Creation Grid visual language.
- Use Asia/Makassar for all user-visible schedules; persist absolute timestamps as UTC.
- Do not implement Member accounts, public sign-up, OAuth, pastoral forms, Bible courses, Adventech, PWA, push, or WhatsApp in this phase.
- Never put a service-role key in client code. No real secret or personal data may appear in source control or tests.
- Each exposed table requires RLS, grants, explicit policies, and positive/negative tests in the same change.
- Public media requires Published state, approved consent, not-hidden state, and explicit download eligibility for downloads.
- Do not activate any offline Sekolah Sabat flow without the future licence gate.

## Task 1: Inventory Phase 1 and scaffold the Next.js application

**Files:**

- Create: package.json
- Create: tsconfig.json
- Create: next.config.ts
- Create: app/layout.tsx
- Create: app/page.tsx
- Create: app/globals.css
- Create: components/identity/AdventistSymbol.tsx
- Create: components/layout/CreationGrid.tsx
- Create: components/layout/GlobalNav.tsx
- Create: components/layout/GlobalFooter.tsx
- Create: tests/public-routes.spec.ts
- Reference: original Phase 1 source at C:\Users\Acer\Documents\Adriel Walintukan - Document\Project\Rinegetan-Connect\frontend

**Step 1: Write the failing route contract test**

Test the seven canonical routes: /, /tentang-kami, /kegiatan, /media, /pelayanan, /sekolah-sabat, and /kontak. Assert 200 status, main landmark, heading, and absence of horizontal document overflow at a mobile viewport.

**Step 2: Run the test to verify it fails**

Run:

~~~text
npm run test:e2e -- tests/public-routes.spec.ts
~~~

Expected: failure because no Next application/routing exists.

**Step 3: Implement the smallest scaffold**

Create the TypeScript Next application, centralize CSS tokens from Phase 1, copy only the official unmodified Adventist symbol asset, and implement layout components. Port public pages with static source data temporarily so URLs and design remain stable.

**Step 4: Run the test to verify it passes**

Run:

~~~text
npm run lint
npm run typecheck
npm run test:e2e -- tests/public-routes.spec.ts
~~~

Expected: all seven routes render successfully at mobile and desktop test viewports.

**Step 5: Commit**

~~~text
git add package.json tsconfig.json next.config.ts app components tests
git commit -m "refactor: scaffold Next.js Phase 1 public site"
~~~

## Task 2: Establish testable Supabase clients, runtime config, and staff route guard

**Files:**

- Create: lib/env.ts
- Create: lib/supabase/browser.ts
- Create: lib/supabase/server.ts
- Create: lib/auth/require-staff.ts
- Create: app/auth/sign-in/page.tsx
- Create: app/(staff)/admin/layout.tsx
- Create: tests/lib/env.test.ts
- Create: tests/lib/require-staff.test.ts
- Modify: .gitignore
- Create: .env.example

**Step 1: Write failing unit tests**

Test that missing required public Supabase configuration fails with a safe message; test that a missing session redirects to sign-in and a session without an active role is forbidden.

**Step 2: Run the tests**

~~~text
npm run test:unit -- tests/lib/env.test.ts tests/lib/require-staff.test.ts
~~~

Expected: failure because configuration and authorization helpers do not exist.

**Step 3: Implement the smallest boundary**

Use separate server/browser Supabase clients. Validate environment at startup. The browser reads only URL and publishable key. The staff guard obtains the server user and role from the database; it must not accept role claims from raw client data or user metadata.

**Step 4: Run the tests**

~~~text
npm run test:unit -- tests/lib/env.test.ts tests/lib/require-staff.test.ts
npm run typecheck
~~~

Expected: tests pass and .env.example contains names only, no values/secrets.

**Step 5: Commit**

~~~text
git add lib app .env.example .gitignore tests
git commit -m "feat: add Supabase client and staff guard boundaries"
~~~

## Task 3: Create base database schema, roles, grants, and RLS tests

**Files:**

- Create: supabase/config.toml
- Create: supabase/migrations/202609090001_base_schema.sql
- Create: supabase/migrations/202609090002_staff_roles_and_rls.sql
- Create: supabase/seed.sql
- Create: supabase/tests/profiles_and_roles_rls.test.sql
- Create: supabase/tests/public_content_rls.test.sql
- Create: docs/03-architecture/DATA-MODEL-AND-RLS.md

**Step 1: Write failing pgTAP tests**

Create fixtures for anonymous user, Editor, and Admin. Assert anonymous users have no profile/role access; Editors cannot administer roles; Admin can read/maintain necessary staff data; public content is not yet writable by any browser role.

**Step 2: Run the database tests**

~~~text
supabase start
supabase db reset
supabase test db
~~~

Expected: tests fail before migrations/policies are created.

**Step 3: Implement migrations**

Create profiles, staff_roles, audit_logs, shared enum/check constraints, timestamp trigger, role helper functions, limited grants, and RLS. The bootstrap procedure must be a one-time Admin-controlled transaction documented in a SQL comment and runbook; do not make every new auth user an Admin.

**Step 4: Run database validation**

~~~text
supabase db reset
supabase test db
supabase db lint
~~~

Expected: allow and deny assertions pass, lint has no unresolved critical issue.

**Step 5: Commit**

~~~text
git add supabase docs/03-architecture/DATA-MODEL-AND-RLS.md
git commit -m "feat: add staff roles and tested RLS foundation"
~~~

## Task 4: Model and secure public CMS content

**Files:**

- Create: supabase/migrations/202609090003_public_content.sql
- Create: supabase/tests/announcements_events_departments_rls.test.sql
- Create: lib/content/types.ts
- Create: lib/content/validation.ts
- Create: lib/content/public-queries.ts
- Create: tests/lib/content-validation.test.ts
- Create: tests/lib/public-queries.test.ts

**Step 1: Write failing tests**

Test status validation, unique slug behavior, public visibility query rules, and RLS: anon only sees Published rows; Editor may CRUD public-content types; Admin may perform all staff operations including eventual permanent deletion path.

**Step 2: Run tests**

~~~text
npm run test:unit -- tests/lib/content-validation.test.ts tests/lib/public-queries.test.ts
supabase db reset
supabase test db
~~~

Expected: tests fail because tables, policies, types, and queries are missing.

**Step 3: Implement content schema and typed query boundary**

Add announcements, events, departments, lifecycle fields, foreign keys, check constraints, indexes, grants, and policies. Build Zod schemas that reject invalid published payloads. Public query functions must always include Published predicate and select only public columns.

**Step 4: Run verification**

~~~text
npm run test:unit -- tests/lib/content-validation.test.ts tests/lib/public-queries.test.ts
supabase db reset
supabase test db
~~~

Expected: unit and database tests pass.

**Step 5: Commit**

~~~text
git add supabase lib tests
git commit -m "feat: add secure public CMS content model"
~~~

## Task 5: Implement schedules and WITA exception handling

**Files:**

- Create: supabase/migrations/202609090004_schedules.sql
- Create: supabase/tests/schedules_rls.test.sql
- Create: lib/time/asia-makassar.ts
- Create: lib/schedules/resolve-schedule.ts
- Create: tests/lib/resolve-schedule.test.ts
- Create: app/(public)/kegiatan/page.tsx
- Create: app/(staff)/admin/schedules/page.tsx

**Step 1: Write failing tests**

Cover weekly schedule display, one date override, one cancellation, cross-midnight invalid data, and output expressed correctly in Asia/Makassar.

**Step 2: Run tests**

~~~text
npm run test:unit -- tests/lib/resolve-schedule.test.ts
supabase db reset
supabase test db
~~~

Expected: failures because recurrence resolver and tables do not exist.

**Step 3: Implement**

Create schedules/schedule_exceptions schema with indexes and RLS. Use a timezone library with IANA support; avoid browser locale assumptions. Create a shared resolver used by staff preview and public presentation.

**Step 4: Run verification**

~~~text
npm run test:unit -- tests/lib/resolve-schedule.test.ts
supabase db reset
supabase test db
npm run test:e2e -- tests/public-routes.spec.ts
~~~

Expected: exception behavior is deterministic and public route remains functional.

**Step 5: Commit**

~~~text
git add supabase lib app tests
git commit -m "feat: add WITA schedules and date exceptions"
~~~

## Task 6: Add consent-aware media schema and Storage policy

**Files:**

- Create: supabase/migrations/202609090005_media_and_storage.sql
- Create: supabase/tests/media_assets_rls.test.sql
- Create: supabase/tests/storage_media_policy.test.sql
- Create: lib/media/types.ts
- Create: lib/media/eligibility.ts
- Create: tests/lib/media-eligibility.test.ts
- Modify: docs/03-architecture/SECURITY-PRIVACY.md

**Step 1: Write failing tests**

Assert that a public read fails for draft, revoked, hidden, or pending-consent asset; approved Published asset reads; Editor cannot bypass staff scope; and download eligibility additionally needs public_download_enabled.

**Step 2: Run tests**

~~~text
npm run test:unit -- tests/lib/media-eligibility.test.ts
supabase db reset
supabase test db
~~~

Expected: failures before media tables and policies exist.

**Step 3: Implement schema and Storage boundary**

Create media_albums, media_assets, album_assets, consent fields, processing status, category checks, indexes, and RLS. Use private/original-free pilot storage conventions. Storage object path and metadata must be controlled together; do not rely on a filename as authorization.

**Step 4: Run verification**

~~~text
npm run test:unit -- tests/lib/media-eligibility.test.ts
supabase db reset
supabase test db
~~~

Expected: all disallowed asset states are denied.

**Step 5: Commit**

~~~text
git add supabase lib tests docs/03-architecture/SECURITY-PRIVACY.md
git commit -m "feat: secure consent-aware gallery media"
~~~

## Task 7: Build staff CMS screens and audited mutations

**Files:**

- Create: app/(staff)/admin/page.tsx
- Create: app/(staff)/admin/announcements/page.tsx
- Create: app/(staff)/admin/events/page.tsx
- Create: app/(staff)/admin/departments/page.tsx
- Create: app/(staff)/admin/media/page.tsx
- Create: app/(staff)/admin/staff/page.tsx
- Create: app/(staff)/admin/audit/page.tsx
- Create: features/content/actions.ts
- Create: features/media/actions.ts
- Create: lib/audit/write-audit.ts
- Create: tests/features/content-actions.test.ts
- Create: tests/features/media-actions.test.ts
- Create: tests/e2e/staff-cms.spec.ts

**Step 1: Write failing tests**

Test Editor publish/archive, validation errors, Admin-only staff screen, and audit record emitted for mutating operations. Test permanent delete is absent for Editor.

**Step 2: Run tests**

~~~text
npm run test:unit -- tests/features/content-actions.test.ts tests/features/media-actions.test.ts
npm run test:e2e -- tests/e2e/staff-cms.spec.ts
~~~

Expected: failures before route, action, and UI implementation.

**Step 3: Implement smallest vertical slices**

Implement one content type end-to-end, then reuse the form/table pattern. Server Actions or handlers validate input, check staff session, make the scoped mutation, write redacted audit record, and revalidate public paths. Staff list/invitation actions are Admin-only. Editors can directly publish public content.

**Step 4: Run verification**

~~~text
npm run test:unit -- tests/features/content-actions.test.ts tests/features/media-actions.test.ts
npm run test:e2e -- tests/e2e/staff-cms.spec.ts
~~~

Expected: Editor and Admin behavior matches the matrix, including audit.

**Step 5: Commit**

~~~text
git add app features lib tests
git commit -m "feat: add audited staff CMS workflows"
~~~

## Task 8: Implement image derivative pipeline and public gallery

**Files:**

- Create: app/api/media/upload/route.ts
- Create: app/(public)/media/page.tsx
- Create: components/gallery/AlbumGrid.tsx
- Create: components/gallery/MediaLightbox.tsx
- Create: components/gallery/DownloadButton.tsx
- Create: lib/media/process-image.ts
- Create: lib/media/strip-metadata.ts
- Create: tests/lib/process-image.test.ts
- Create: tests/e2e/public-gallery.spec.ts

**Step 1: Write failing tests**

Test rejection of unsupported/oversized files, production of bounded JPEG derivative, removal of metadata, and gallery display/download control for eligible versus ineligible assets. Include keyboard Escape/close behavior in lightbox test.

**Step 2: Run tests**

~~~text
npm run test:unit -- tests/lib/process-image.test.ts
npm run test:e2e -- tests/e2e/public-gallery.spec.ts
~~~

Expected: failures before pipeline and gallery exist.

**Step 3: Implement**

Choose an image processor that works in the target server runtime and does not introduce paid infrastructure. Enforce file/type/pixel limits before processing. Upload only the derivative. Build a public album-first gallery with categories, accessible lightbox, proper alt text, and a single-photo download only when eligibility is true.

**Step 4: Run verification**

~~~text
npm run test:unit -- tests/lib/process-image.test.ts
npm run test:e2e -- tests/e2e/public-gallery.spec.ts
~~~

Expected: public gallery cannot surface unapproved assets and output derivative has no EXIF.

**Step 5: Commit**

~~~text
git add app components lib tests
git commit -m "feat: add public consent-aware gallery"
~~~

## Task 9: Add bounded album/category ZIP downloads and hard-delete workflow

**Files:**

- Create: app/api/media/download-collection/route.ts
- Create: lib/media/build-download-manifest.ts
- Create: lib/media/zip-collection.ts
- Create: features/media/delete-actions.ts
- Create: tests/lib/build-download-manifest.test.ts
- Create: tests/e2e/gallery-downloads.spec.ts
- Modify: supabase/migrations/202609090005_media_and_storage.sql
- Modify: supabase/tests/media_assets_rls.test.sql

**Step 1: Write failing tests**

Cover album/category filtering, exclusion of newly hidden/revoked/non-downloadable assets, max file/byte limit, expired result, rate limit, Admin-only permanent delete, and audit creation.

**Step 2: Run tests**

~~~text
npm run test:unit -- tests/lib/build-download-manifest.test.ts
npm run test:e2e -- tests/e2e/gallery-downloads.spec.ts
supabase test db
~~~

Expected: failures before collection logic exists.

**Step 3: Implement**

Resolve eligibility in one server transaction/query immediately before archive generation. Never accept a caller-supplied storage path list. Generate a short-lived result or stream with safe failure when thresholds are exceeded. Permanent delete verifies Admin, relationship impact, storage deletion success/compensation, and audit record.

**Step 4: Run verification**

~~~text
npm run test:unit -- tests/lib/build-download-manifest.test.ts
npm run test:e2e -- tests/e2e/gallery-downloads.spec.ts
supabase db reset
supabase test db
~~~

Expected: ZIP manifest contains only allowed assets and Editor is denied permanent delete.

**Step 5: Commit**

~~~text
git add app lib features supabase tests
git commit -m "feat: add bounded gallery collection downloads"
~~~

## Task 10: Migrate public pages from static data to CMS queries

**Files:**

- Modify: app/(public)/page.tsx
- Modify: app/(public)/kegiatan/page.tsx
- Modify: app/(public)/media/page.tsx
- Modify: app/(public)/pelayanan/page.tsx
- Modify: app/(public)/sekolah-sabat/page.tsx
- Create: tests/e2e/public-content-lifecycle.spec.ts
- Create: tests/e2e/visual-regression.spec.ts

**Step 1: Write failing E2E tests**

Seed a Draft and Published version of each public content type. Assert only Published appears in public cards/detail pages, and publish/archive causes expected revalidation. Capture visual baselines at the agreed five viewport widths.

**Step 2: Run tests**

~~~text
npm run test:e2e -- tests/e2e/public-content-lifecycle.spec.ts tests/e2e/visual-regression.spec.ts
~~~

Expected: tests fail while pages still read static-only data.

**Step 3: Implement**

Replace individual public sections with typed server query functions, retain sane empty states when no CMS content exists, and preserve Phase 1 copy/layout where content has not been migrated. Add route metadata and stable error/not-found handling.

**Step 4: Run verification**

~~~text
npm run test:e2e -- tests/e2e/public-content-lifecycle.spec.ts tests/e2e/visual-regression.spec.ts
npm run lint
npm run typecheck
npm run build
~~~

Expected: public visibility is correct and visual review reports only intentional differences.

**Step 5: Commit**

~~~text
git add app tests
git commit -m "refactor: serve public Phase 1 pages from CMS"
~~~

## Task 11: Prepare deployment, backup, and release verification

**Files:**

- Create: .github/workflows/ci.yml
- Create: docs/04-delivery/DEPLOYMENT-RUNBOOK.md
- Create: docs/04-delivery/BACKUP-RESTORE-RUNBOOK.md
- Modify: docs/04-delivery/ZERO-COST-PILOT-AND-DEPLOYMENT.md
- Modify: README.md

**Step 1: Write failing CI contract**

Configure CI to fail if typecheck, lint, unit tests, database tests, or production build fail. Add a documented dry-run checklist whose missing evidence blocks pilot release.

**Step 2: Verify expected initial failure**

Run the workflow-equivalent commands locally before all scripts exist:

~~~text
npm run lint
npm run typecheck
npm run test:unit
supabase test db
npm run build
~~~

Expected: any absent script/configuration is discovered and added deliberately.

**Step 3: Implement runbooks and CI**

Document environment separation, migration order, Vercel deploy/rollback, manual encrypted backup, restore drill, storage threshold response, and secret handling. Configure CI without secrets and ensure Supabase migrations/policy tests run in an isolated test database.

**Step 4: Run final verification**

~~~text
npm run lint
npm run typecheck
npm run test:unit
supabase db reset
supabase test db
npm run test:e2e
npm run build
~~~

Expected: all commands pass; a reviewer can reproduce the pilot release checklist from documentation.

**Step 5: Commit**

~~~text
git add .github docs README.md
git commit -m "docs: add Phase 2 deployment and recovery runbooks"
~~~

## Final Phase 2 review

Before marking Phase 2 complete:

1. Run every verification command from Task 11 and retain output in the delivery record.
2. Review RLS deny tests specifically for pastoral-placeholder tables as preparation for Phase 3.
3. Compare public pages against the Design System with a human reviewer.
4. Verify the Supabase project region is Singapore and the old Tokyo project has not been modified.
5. Confirm the media quota, consent process, backup owner, and release owner with the church.
6. Do not enable deferred features merely because supporting tables/components exist.
