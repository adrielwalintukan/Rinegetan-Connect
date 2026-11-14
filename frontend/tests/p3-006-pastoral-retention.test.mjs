// frontend/tests/p3-006-pastoral-retention.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadExpiredPastoralCounts, purgeExpiredPastoralData, recordPastoralAccess } from "../src/lib/forms/pastoral-admin.mjs";

const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
const counts = { study_interest_leads: 1, prayer_requests: 2, visitor_submissions: 3 };
function rpcClient(result) {
  const calls = [];
  return { calls, rpc(name, args) { calls.push([name, args]); return typeof result === "function" ? result() : Promise.resolve(result); } };
}

test("recordPastoralAccess sends counts only and reports failure", async () => {
  const ok = rpcClient({ data: null, error: null });
  assert.equal(await recordPastoralAccess(ok, counts), true);
  assert.deepEqual(ok.calls, [["record_pastoral_access", { p_study_interest: 1, p_prayer: 2, p_visit: 3 }]]);
  assert.equal(await recordPastoralAccess(rpcClient({ data: null, error: { code: "42501" } }), counts), false);
  assert.equal(await recordPastoralAccess(rpcClient(() => Promise.reject(new Error("network"))), counts), false);
});

test("loadExpiredPastoralCounts returns the single count row or a safe error", async () => {
  assert.deepEqual(await loadExpiredPastoralCounts(rpcClient({ data: [counts], error: null })), { data: counts, error: false });
  assert.deepEqual(await loadExpiredPastoralCounts(rpcClient({ data: null, error: { code: "42501" } })), { data: null, error: true });
  assert.deepEqual(await loadExpiredPastoralCounts(rpcClient({ data: [], error: null })), { data: null, error: true });
});

test("purgeExpiredPastoralData is Admin-only and maps database errors", async () => {
  const editor = rpcClient({ data: [counts], error: null });
  await assert.rejects(purgeExpiredPastoralData(editor, "editor"), { status: 403 });
  assert.deepEqual(editor.calls, []);
  const admin = rpcClient({ data: [counts], error: null });
  assert.deepEqual(await purgeExpiredPastoralData(admin, "admin"), counts);
  assert.deepEqual(admin.calls, [["purge_expired_pastoral_data", undefined]]);
  await assert.rejects(purgeExpiredPastoralData(rpcClient({ data: null, error: { code: "42501", message: "pastoral_admin_only" } }), "admin"),
    (error) => error.status === 403 && !error.message.includes("pastoral_admin_only"));
  await assert.rejects(purgeExpiredPastoralData(rpcClient({ data: null, error: { code: "XX000" } }), "admin"), { status: 500 });
});

test("purge route requires JSON and an active staff session before the Admin-only purge", () => {
  const route = read("app/api/staff/pastoral-retention/route.ts");
  assert.match(route, /export async function POST/);
  assert.ok(route.indexOf("application/json") < route.indexOf("requireActiveStaff(client)"), "content type is checked first");
  assert.match(route, /purgeExpiredPastoralData\(client, staff\.role\)/);
  assert.match(route, /staffAccessResponse\(error\)/);
  assert.doesNotMatch(route, /request\.json\(\)/);
});

test("retention panel posts to the purge route behind the existing confirmation dialog", () => {
  const panel = read("components/staff/PastoralManagers.tsx");
  for (const text of ["Retensi data pastoral", "Hapus data kedaluwarsa", "/api/staff/pastoral-retention", "DeleteConfirmationDialog",
    "tidak dapat diperpanjang", "Akses data pastoral", "role=\"alert\"", "role=\"status\"", "min-h-11"]) assert.ok(panel.includes(text), text);
  assert.match(panel, /disabled=\{!!error \|\| total === 0 \|\| deleting\}/);
  const dashboard = read("components/staff/StaffDashboard.tsx");
  assert.match(dashboard, /activeTab === "audit" \? \(\s*role === "admin" \? <>\s*<PastoralRetentionPanel/);
});
