// frontend/tests/p3-005-pastoral-staff-ui.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("tabs are Admin-only and the page loads pastoral rows only for Admin", () => {
  const dashboard = read("components/staff/StaffDashboard.tsx");
  assert.match(dashboard, /role === "admin" \? \[[\s\S]*id: "prayer" as TabType, label: "Doa"[\s\S]*id: "visit" as TabType, label: "Kunjungan"/);
  assert.match(dashboard, /tabId === "prayer"/); assert.match(dashboard, /tabId === "visit"/);
  const page = read("app/staff/(protected)/page.tsx");
  assert.match(page, /staff\.role === "admin" \? await loadPastoralRows\(client, "prayer_requests"\)/);
  assert.match(page, /staff\.role === "admin" \? await loadPastoralRows\(client, "visitor_submissions"\)/);
  assert.match(page, /rawTab === "prayer"/); assert.match(page, /rawTab === "visit"/);
});
test("managers render rows safely with status control and age", () => {
  const manager = read("components/staff/PastoralManagers.tsx");
  for (const text of ["Belum ada permohonan doa.", "Belum ada data kunjungan.", "Sudah didoakan", "Sudah dihubungi", "Selesai", "Tanpa nama", "Tanpa kontak", "Ingin dihubungi",
    "/api/staff/prayer-requests/", "/api/staff/visits/", "role=\"alert\"", "whitespace-pre-line", "min-h-11", "Asia/Makassar"]) assert.ok(manager.includes(text), text);
  assert.ok(!manager.includes("dangerouslySetInnerHTML"));
});
