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
test("dialogs focus their panel while busy, send the File as-is, and preview aria is accurate", () => {
  const dialogs = read("components/staff/CourseImportDialogs.tsx");
  assert.match(dialogs, /useDialogFocus\(isOpen, busy\)/g);
  assert.equal(dialogs.match(/useDialogFocus\(isOpen, busy\)/g)?.length, 2);
  assert.match(dialogs, /if \(busy\) panel\.current\?\.focus\(\)/);
  assert.match(dialogs, /body: file\b/);
  assert.ok(!dialogs.includes("file.text()"));
  const panel = read("components/staff/CourseImportPanel.tsx");
  assert.match(panel, /aria-expanded=\{isShown\}/);
  assert.match(panel, /aria-controls=\{`course-import-preview-\$\{item\.id\}`\}/);
  assert.match(panel, /id=\{`course-import-preview-\$\{item\.id\}`\}/);
});
test("after a decision, focus moves to the import heading", () => {
  const panel = read("components/staff/CourseImportPanel.tsx");
  assert.match(panel, /id="course-import-heading" ref=\{heading\} tabIndex=\{-1\}/);
  assert.match(panel, /heading\.current\?\.focus\(\)/);
});
