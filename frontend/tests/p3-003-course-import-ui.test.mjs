import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("import panel exposes upload, preview and Admin-only decisions", () => {
  const panel = read("components/staff/CourseImportPanel.tsx");
  for (const text of ["Impor JSON", "Lihat preview", "Setujui", "Tolak", "Diunggah dan disetujui oleh orang yang sama", "/api/staff/course-imports"]) assert.ok(panel.includes(text), text);
  assert.match(panel, /role === "admin" && item\.status === "pending"/);
  assert.ok(!panel.includes("dangerouslySetInnerHTML"));
});
test("dialogs reuse the shared modal and keep 44px targets", () => {
  const dialogs = read("components/staff/CourseImportDialogs.tsx");
  assert.match(dialogs, /from "@\/components\/ui\/modal"/);
  assert.match(dialogs, /MAX_IMPORT_BYTES/);
  assert.match(dialogs, /min-h-11/);
  assert.match(dialogs, /Alasan penolakan/);
});
test("staff page loads import metadata, never payloads, for the course tab", () => {
  const page = read("app/staff/(protected)/page.tsx");
  assert.match(page, /loadCourseImports\(client\)/);
  assert.match(read("components/staff/CourseManager.tsx"), /<CourseImportPanel/);
  assert.ok(!read("lib/courses/import-actions.mjs").match(/IMPORT_LIST_COLUMNS = "[^"]*payload/));
});
