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
