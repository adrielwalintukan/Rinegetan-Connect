import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { getMediaPublicUrl } from "../src/lib/media/url.mjs";
import { SUPPORTED_ENTITIES } from "../src/lib/staff/content-mutations.mjs";
import { UserFacingError, publicErrorMessage } from "../src/lib/api/errors.mjs";

const frontendRoot = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(resolve(frontendRoot, path), "utf8");

const listFiles = (dir) =>
  readdirSync(resolve(frontendRoot, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? listFiles(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  );

test("media URLs go through the RLS-aware proxy because the bucket is private", () => {
  assert.equal(
    getMediaPublicUrl("derivatives/2026/10/abc.jpg"),
    "/api/media/file/derivatives/2026/10/abc.jpg",
  );
  assert.ok(!getMediaPublicUrl("derivatives/x.jpg").includes("/object/public/"));

  const placeholder = getMediaPublicUrl(null);
  assert.ok(existsSync(resolve(frontendRoot, "public", placeholder.slice(1))), `missing ${placeholder}`);
});

test("media file proxy uses the session client and rejects path traversal", () => {
  const route = read("src/app/api/media/file/[...path]/route.ts");
  assert.match(route, /createServerSupabaseClient/);
  assert.match(route, /startsWith\("derivatives\/"\)/);
  assert.match(route, /"\.\."/);
  assert.doesNotMatch(route, /SECRET_KEY|service_role/i);
});

test("media assets can be published, hidden and deleted through the CMS routes", () => {
  assert.ok(SUPPORTED_ENTITIES.includes("media_assets"));
});

test("upload stores the chosen consent with a consent record and returns data the dialog reads", () => {
  const route = read("src/app/api/staff/media/upload/route.ts");
  assert.match(route, /formData\.get\("consent_status"\)/);
  // Chosen consent is applied only after its consent_records evidence is written.
  assert.match(route, /from\("consent_records"\)\.insert/);
  assert.match(route, /consent_status: consentStatus/);
  assert.ok(
    route.indexOf('from("consent_records")') < route.indexOf("consent_recorded_at: new Date()"),
    "consent must be recorded before the asset is marked",
  );
  assert.doesNotMatch(route, /from\("audit_logs"\)/, "authenticated cannot insert audit_logs; the DB trigger audits");

  const dialog = read("src/components/staff/MediaUploadDialog.tsx");
  assert.doesNotMatch(dialog, /json\.asset/);
  assert.match(dialog, /json\.data/);
});

test("media mutations are audited by a database trigger", () => {
  const migrations = listFiles("../supabase/migrations").filter((f) => f.endsWith(".sql"));
  const sql = migrations.map((f) => read(f)).join("\n");
  assert.match(sql, /create trigger media_assets_audit_mutation\s+after insert or update or delete on public\.media_assets/i);
});

test("publicErrorMessage never leaks database text", () => {
  const pgCheck = { code: "23514", message: 'new row for relation "announcements" violates check constraint "announcements_body_check"' };
  const friendly = publicErrorMessage(pgCheck);
  assert.doesNotMatch(friendly, /relation|constraint|announcements/);
  assert.match(friendly, /lengkap|valid/i);

  assert.match(publicErrorMessage({ code: "23505", message: "duplicate key" }), /sudah (ada|dipakai)/i);
  assert.match(publicErrorMessage({ code: "42501", message: "rls" }), /izin/i);
  assert.equal(publicErrorMessage(new UserFacingError("Alasan penghapusan minimal 5 karakter")), "Alasan penghapusan minimal 5 karakter");
  assert.doesNotMatch(publicErrorMessage(new TypeError("Cannot read properties of undefined")), /Cannot read/);
});

test("staff API routes do not forward raw error messages", () => {
  const routes = listFiles("src/app/api").filter((f) => f.endsWith("route.ts"));
  for (const file of routes) {
    const source = read(file);
    assert.doesNotMatch(source, /(?:error|Error|err|Err)\.message\s*[},]/, `${file} returns a raw error message`);
    assert.doesNotMatch(source, /\+\s*\w+(?:Error|Err)\.message/, `${file} concatenates a raw error message`);
  }
});

test("app has an error boundary instead of the browser crash page", () => {
  const boundary = read("src/app/error.tsx");
  assert.match(boundary, /"use client"/);
  assert.match(boundary, /reset/);
});

test("all modal overlays share one defined backdrop", () => {
  const sources = listFiles("src/components").filter((f) => /\.(tsx|jsx)$/.test(f));
  for (const file of sources) {
    assert.doesNotMatch(read(file), /navy-950/, `${file} uses undefined color navy-950`);
  }
  for (const file of [
    "src/components/staff/ContentMutationDialog.tsx",
    "src/components/staff/DeleteConfirmationDialog.tsx",
    "src/components/staff/MediaManager.tsx",
    "src/components/staff/MediaUploadDialog.tsx",
    "src/components/staff/SectionMediaManager.tsx",
  ]) {
    assert.match(read(file), /MODAL_BACKDROP/, `${file} must use the shared backdrop`);
  }
});

test("content dialog marks required fields before submitting", () => {
  const dialog = read("src/components/staff/ContentMutationDialog.tsx");
  assert.match(dialog, /required/);
});
