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
