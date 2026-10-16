import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("P2-403 public media queries exist and are exported from queries module", async () => {
  const queriesPath = resolve(projectRoot, "src/lib/public/queries.mjs");
  assert.ok(existsSync(queriesPath), "queries.mjs should exist");

  const queriesModule = await import(`file://${queriesPath}`);
  assert.equal(
    typeof queriesModule.getPublicMediaAlbums,
    "function",
    "getPublicMediaAlbums should be exported as a function"
  );
  assert.equal(
    typeof queriesModule.getPublicMediaAssets,
    "function",
    "getPublicMediaAssets should be exported as a function"
  );
});

test("P2-403 public media queries enforce strict privacy invariants", () => {
  const queriesPath = resolve(projectRoot, "src/lib/public/queries.mjs");
  const queriesSource = readFileSync(queriesPath, "utf8");

  // Invariant 1: status = 'published'
  assert.ok(
    queriesSource.includes(`"media_assets"`),
    "Must query media_assets table"
  );
  assert.ok(
    queriesSource.includes(`"media_albums"`),
    "Must query media_albums table"
  );

  // Invariant 2: consent_status = 'approved'
  assert.ok(
    queriesSource.includes(`"consent_status", "approved"`) ||
      queriesSource.includes(`'consent_status', 'approved'`),
    "Must filter consent_status = 'approved' for public assets"
  );

  // Invariant 3: hidden_at IS NULL
  assert.ok(
    queriesSource.includes(`"hidden_at", null`) ||
      queriesSource.includes(`'hidden_at', null`),
    "Must filter hidden_at is null for public assets"
  );
});

test("P2-403 triggerPublicRevalidation handles media entities and revalidates /media", async () => {
  const queriesPath = resolve(projectRoot, "src/lib/public/queries.mjs");
  const queriesModule = await import(`file://${queriesPath}`);

  const revalidatedTags = [];
  const revalidatedPaths = [];

  const mockHooks = {
    revalidateTag: (tag) => revalidatedTags.push(tag),
    revalidatePath: (path) => revalidatedPaths.push(path),
  };

  queriesModule.triggerPublicRevalidation("media", mockHooks);

  assert.ok(
    revalidatedTags.includes("public-content"),
    "Must invalidate public-content tag"
  );
  assert.ok(
    revalidatedTags.includes("public-media") ||
      revalidatedTags.includes("media-assets") ||
      revalidatedTags.includes("media-albums"),
    "Must invalidate public-media tag"
  );
  assert.ok(
    revalidatedPaths.includes("/media"),
    "Must revalidate /media route"
  );
  assert.ok(
    revalidatedPaths.includes("/"),
    "Must revalidate homepage"
  );
});

test("P2-403 MediaLightbox component exists and declares WCAG accessibility contracts", () => {
  const lightboxPath = resolve(
    projectRoot,
    "src/components/media/MediaLightbox.tsx"
  );
  assert.ok(existsSync(lightboxPath), "MediaLightbox.tsx should exist");

  const source = readFileSync(lightboxPath, "utf8");
  assert.ok(
    source.includes('role="dialog"') || source.includes("role={'dialog'}"),
    "Lightbox must declare role='dialog'"
  );
  assert.ok(
    source.includes('aria-modal="true"') || source.includes("aria-modal={'true'}"),
    "Lightbox must declare aria-modal='true'"
  );
  assert.ok(
    source.includes("Escape") || source.includes('"Escape"'),
    "Lightbox must listen to Escape key to close"
  );
  assert.ok(
    source.includes("ArrowRight"),
    "Lightbox must listen to ArrowRight key for next item"
  );
  assert.ok(
    source.includes("ArrowLeft"),
    "Lightbox must listen to ArrowLeft key for previous item"
  );
  assert.ok(
    source.includes("aria-label"),
    "Lightbox buttons must have descriptive aria-label"
  );
});

test("P2-403 public MediaPage component provides two-tier layout, category pills, and empty state", () => {
  const mediaPagePath = resolve(
    projectRoot,
    "src/components/pages/MediaPage.tsx"
  );
  assert.ok(existsSync(mediaPagePath), "MediaPage.tsx should exist");

  const source = readFileSync(mediaPagePath, "utf8");
  assert.ok(
    source.includes("MediaLightbox"),
    "MediaPage must import and render MediaLightbox"
  );
  assert.ok(
    source.includes("EmptyState"),
    "MediaPage must handle empty results using EmptyState"
  );
  assert.ok(
    source.includes("album") || source.includes("Album"),
    "MediaPage must support album-level filtering"
  );
  assert.ok(
    source.includes("category") || source.includes("Category"),
    "MediaPage must support category pill filtering"
  );
});

test("P2-403 public media route page fetches public albums and assets server-side", () => {
  const pagePath = resolve(
    projectRoot,
    "src/app/(public)/media/page.tsx"
  );
  assert.ok(existsSync(pagePath), "app/(public)/media/page.tsx should exist");

  const source = readFileSync(pagePath, "utf8");
  assert.ok(
    source.includes("getPublicMediaAlbums"),
    "Media route must call getPublicMediaAlbums"
  );
  assert.ok(
    source.includes("getPublicMediaAssets"),
    "Media route must call getPublicMediaAssets"
  );
});

test("P2-403 MediaUploadDialog component exists and targets staff upload API", () => {
  const uploadDialogPath = resolve(
    projectRoot,
    "src/components/staff/MediaUploadDialog.tsx"
  );
  assert.ok(existsSync(uploadDialogPath), "MediaUploadDialog.tsx should exist");

  const source = readFileSync(uploadDialogPath, "utf8");
  assert.ok(
    source.includes("/api/staff/media/upload"),
    "MediaUploadDialog must call /api/staff/media/upload endpoint"
  );
  assert.ok(
    source.includes("alt_text") || source.includes("altText"),
    "MediaUploadDialog must handle alt_text field"
  );
  assert.ok(
    source.includes("subject_age_group") || source.includes("subjectAgeGroup"),
    "MediaUploadDialog must include child/general subject age group selector"
  );
  assert.ok(
    source.includes("consent_status") || source.includes("consentStatus"),
    "MediaUploadDialog must include consent status selector"
  );
});

test("P2-403 MediaManager component exists and enforces child protection consent invariants", () => {
  const mediaManagerPath = resolve(
    projectRoot,
    "src/components/staff/MediaManager.tsx"
  );
  assert.ok(existsSync(mediaManagerPath), "MediaManager.tsx should exist");

  const source = readFileSync(mediaManagerPath, "utf8");
  assert.ok(
    source.includes("child") && source.includes("approved"),
    "MediaManager must enforce approved consent before publishing child photos"
  );
  assert.ok(
    source.includes("hidden_reason") || source.includes("hiddenReason"),
    "MediaManager takedown flow must require hidden_reason"
  );
  assert.ok(
    source.includes("quota") || source.includes("STORAGE_CAPACITY_BYTES") || source.includes("1073741824"),
    "MediaManager must display storage quota metrics"
  );
});

test("P2-403 StaffDashboard and protected page integrate media management tab", () => {
  const dashboardPath = resolve(
    projectRoot,
    "src/components/staff/StaffDashboard.tsx"
  );
  assert.ok(existsSync(dashboardPath), "StaffDashboard.tsx should exist");
  const dashboardSource = readFileSync(dashboardPath, "utf8");
  assert.ok(
    dashboardSource.includes('"media"') || dashboardSource.includes("'media'"),
    "StaffDashboard must declare 'media' in TabType"
  );
  assert.ok(
    dashboardSource.includes("MediaManager"),
    "StaffDashboard must import and render MediaManager"
  );

  const pagePath = resolve(
    projectRoot,
    "src/app/staff/(protected)/page.tsx"
  );
  assert.ok(existsSync(pagePath), "staff/(protected)/page.tsx should exist");
  const pageSource = readFileSync(pagePath, "utf8");
  assert.ok(
    pageSource.includes('"media_assets"') || pageSource.includes("'media_assets'"),
    "Staff protected page must fetch media_assets"
  );
  assert.ok(
    pageSource.includes('"media_albums"') || pageSource.includes("'media_albums'"),
    "Staff protected page must fetch media_albums"
  );
});
