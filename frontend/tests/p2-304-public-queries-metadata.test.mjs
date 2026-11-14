import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));

test("P2-304 public queries module exists and exports required functions", async () => {
  const queriesPath = resolve(projectRoot, "src/lib/public/queries.mjs");
  assert.ok(existsSync(queriesPath), "queries.mjs should exist");

  const queriesModule = await import(`file://${queriesPath}`);
  assert.equal(typeof queriesModule.getPublishedAnnouncements, "function");
  assert.equal(typeof queriesModule.getPublishedEvents, "function");
  assert.equal(typeof queriesModule.getPublishedSchedules, "function");
  assert.equal(typeof queriesModule.getPublishedDepartments, "function");
  assert.equal(typeof queriesModule.triggerPublicRevalidation, "function");
});

test("P2-304 public queries strictly filter status published and do not depend on request cookies", () => {
  const queriesPath = resolve(projectRoot, "src/lib/public/queries.mjs");
  const queriesSource = readFileSync(queriesPath, "utf8");

  // Verify that queries do not import next/headers cookies() to prevent dynamic bailouts
  assert.ok(
    !queriesSource.includes("next/headers"),
    "Public queries must not import next/headers to maintain static/ISR cacheability"
  );
  assert.ok(
    !queriesSource.includes("cookies()"),
    "Public queries must not call cookies()"
  );

  // Verify published status filtering
  const publishedCount = (queriesSource.match(/\.eq\(["']status["'],\s*["']published["']\)/g) || []).length;
  assert.ok(
    publishedCount >= 4,
    `Expected at least 4 published status filters, found ${publishedCount}`
  );
});

test("P2-304 triggerPublicRevalidation invokes correct cache tags and route paths", async () => {
  const queriesPath = resolve(projectRoot, "src/lib/public/queries.mjs");
  const queriesModule = await import(`file://${queriesPath}`);

  const revalidatedTags = [];
  const revalidatedPaths = [];

  const mockHooks = {
    revalidateTag: (tag) => revalidatedTags.push(tag),
    revalidatePath: (path) => revalidatedPaths.push(path),
  };

  queriesModule.triggerPublicRevalidation("events", mockHooks);

  assert.ok(revalidatedTags.includes("public-content"), "Must invalidate public-content tag");
  assert.ok(revalidatedTags.includes("public-events"), "Must invalidate public-events tag");
  assert.ok(revalidatedPaths.includes("/"), "Must revalidate homepage");
  assert.ok(revalidatedPaths.includes("/kegiatan"), "Must revalidate /kegiatan");
});

test("P2-304 staff content mutation API routes invoke public revalidation", () => {
  const statusRoutePath = resolve(projectRoot, "src/app/api/staff/content/status/route.ts");
  const saveRoutePath = resolve(projectRoot, "src/app/api/staff/content/save/route.ts");
  const deleteRoutePath = resolve(projectRoot, "src/app/api/staff/content/delete/route.ts");

  const statusSource = readFileSync(statusRoutePath, "utf8");
  const saveSource = readFileSync(saveRoutePath, "utf8");
  const deleteSource = readFileSync(deleteRoutePath, "utf8");

  assert.ok(
    statusSource.includes("triggerPublicRevalidation") || statusSource.includes("revalidateTag"),
    "status route must trigger public revalidation"
  );
  assert.ok(
    saveSource.includes("triggerPublicRevalidation") || saveSource.includes("revalidateTag"),
    "save route must trigger public revalidation"
  );
  assert.ok(
    deleteSource.includes("triggerPublicRevalidation") || deleteSource.includes("revalidateTag"),
    "delete route must trigger public revalidation"
  );
});

test("P2-304 EmptyState component exists and declares visual properties", () => {
  const emptyStatePath = resolve(projectRoot, "src/components/ui/EmptyState.tsx");
  assert.ok(existsSync(emptyStatePath), "EmptyState.tsx should exist");

  const emptyStateSource = readFileSync(emptyStatePath, "utf8");
  assert.ok(emptyStateSource.includes("card-surface"), "Must use Design System card-surface");
  assert.ok(emptyStateSource.includes("actionHref"), "Must support actionHref button");
  assert.ok(emptyStateSource.includes("testId"), "Must support testId");
});

test("P2-304 all 7 public routes declare SEO metadata", () => {
  const publicRoutes = [
    "src/app/(public)/page.tsx",
    "src/app/(public)/tentang-kami/page.tsx",
    "src/app/(public)/kegiatan/page.tsx",
    "src/app/(public)/media/page.tsx",
    "src/app/(public)/pelayanan/page.tsx",
    "src/app/(public)/sekolah-sabat/page.tsx",
    "src/app/(public)/kontak/page.tsx",
  ];

  for (const relPath of publicRoutes) {
    const fullPath = resolve(projectRoot, relPath);
    assert.ok(existsSync(fullPath), `${relPath} should exist`);
    const source = readFileSync(fullPath, "utf8");

    assert.ok(
      source.includes("export const metadata: Metadata =") || source.includes("export const metadata ="),
      `${relPath} must export metadata`
    );
    assert.ok(source.includes("title:"), `${relPath} must define title in metadata`);
    assert.ok(source.includes("description:"), `${relPath} must define description in metadata`);
  }
});

test("P2-304 root layout declares metadataBase, title template, and OpenGraph", () => {
  const rootLayoutPath = resolve(projectRoot, "src/app/layout.tsx");
  const rootLayoutSource = readFileSync(rootLayoutPath, "utf8");

  assert.ok(rootLayoutSource.includes("metadataBase:"), "Root layout must declare metadataBase");
  assert.ok(rootLayoutSource.includes("template:"), "Root layout must declare title template");
  assert.ok(rootLayoutSource.includes("openGraph:"), "Root layout must declare openGraph");
  assert.ok(rootLayoutSource.includes("id_ID"), "Root layout openGraph must specify id_ID locale");
});

test("P2-304 homepage title is descriptive and absolute so the site template does not prepend it", () => {
  const homeSource = readFileSync(resolve(projectRoot, "src/app/(public)/page.tsx"), "utf8");

  assert.match(
    homeSource,
    /title:\s*\{\s*absolute:\s*"[^"]*Gereja Advent[^"]*"/,
    "Homepage must override the root template with a descriptive absolute title"
  );
  assert.ok(!homeSource.includes('title: "Beranda"'), "Homepage must not use the generic Beranda title");
});

test("P2-304 site ships a favicon and Church structured data built from verified content", () => {
  const iconPath = resolve(projectRoot, "src/app/icon.svg");
  assert.ok(existsSync(iconPath), "src/app/icon.svg must provide the browser tab icon");

  const iconSource = readFileSync(iconPath, "utf8");
  assert.ok(iconSource.includes('viewBox="0 0 512 512"'), "Icon must declare a 512 square viewBox");
  assert.ok(iconSource.includes("<path"), "Icon must draw the church symbol, not an empty tile");

  const rootLayoutSource = readFileSync(resolve(projectRoot, "src/app/layout.tsx"), "utf8");
  assert.ok(rootLayoutSource.includes('type="application/ld+json"'), "Root layout must emit JSON-LD");
  assert.ok(rootLayoutSource.includes('"@type": "Church"'), "JSON-LD must describe a Church");
  assert.ok(rootLayoutSource.includes("openingHoursSpecification"), "JSON-LD must publish service times");
  assert.ok(rootLayoutSource.includes("CHURCH.mapsQuery"), "JSON-LD coordinates must come from CHURCH.mapsQuery");
  // Contact details stay unpublished until the church confirms them (see content.js).
  assert.ok(!rootLayoutSource.includes("telephone:"), "JSON-LD must not invent a phone number");
  assert.ok(!rootLayoutSource.includes("streetAddress: \"Jl"), "JSON-LD must not invent a street address");
});
