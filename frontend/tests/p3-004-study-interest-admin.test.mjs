import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { STUDY_INTEREST_COLUMNS, loadStudyInterestLeads, parseLeadStatus, updateLeadStatus } from "../src/lib/forms/study-interest-admin.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");
function clientFor(result = {}) {
  const calls = [];
  const chain = {
    select(c) { calls.push(["select", c]); return this; }, order(k, o) { calls.push(["order", k, o]); return this; },
    eq(k, v) { calls.push(["eq", k, v]); return this; }, update(v) { calls.push(["update", v]); return this; },
    async limit(n) { calls.push(["limit", n]); return { data: [], error: null, ...result }; },
    async maybeSingle() { calls.push(["maybeSingle"]); return { data: null, error: null, ...result }; },
  };
  return { calls, from(table) { calls.push(["from", table]); return chain; } };
}

test("parseLeadStatus accepts only { status } with a known value", () => {
  assert.equal(parseLeadStatus({ status: "contacted" }), "contacted");
  for (const bad of [{ status: "done" }, { status: "new", extra: 1 }, null, [], "new"]) assert.throws(() => parseLeadStatus(bad), { status: 400 });
});
test("loadStudyInterestLeads returns the 50 newest without extra columns", async () => {
  const client = clientFor({ data: [{ id }] });
  assert.deepEqual(await loadStudyInterestLeads(client), { data: [{ id }], error: false });
  assert.deepEqual(client.calls, [["from", "study_interest_leads"], ["select", STUDY_INTEREST_COLUMNS], ["order", "created_at", { ascending: false }], ["limit", 50]]);
  assert.deepEqual(await loadStudyInterestLeads(clientFor({ data: null, error: { code: "42501" } })), { data: null, error: true });
});
test("updateLeadStatus is Admin-only, validates the id and reports a missing row", async () => {
  await assert.rejects(updateLeadStatus(clientFor(), id, "closed", "editor"), { status: 403 });
  await assert.rejects(updateLeadStatus(clientFor(), "nope", "closed", "admin"), { status: 400 });
  await assert.rejects(updateLeadStatus(clientFor({ data: null }), id, "closed", "admin"), { status: 404 });
  const client = clientFor({ data: { id, status: "closed" } });
  assert.deepEqual(await updateLeadStatus(client, id, "closed", "admin"), { id, status: "closed" });
  assert.deepEqual(client.calls.slice(0, 3), [["from", "study_interest_leads"], ["update", { status: "closed" }], ["eq", "id", id]]);
});
test("database errors become public messages, never raw text", async () => {
  await assert.rejects(updateLeadStatus(clientFor({ error: { code: "XX000", message: "raw db" } }), id, "closed", "admin"),
    (error) => error.status === 500 && !error.message.includes("raw db"));
});
test("tab is Admin-only and the page loads leads only for Admin", () => {
  const dashboard = read("components/staff/StaffDashboard.tsx");
  assert.match(dashboard, /role === "admin" \? \[[\s\S]*id: "interest" as TabType, label: "Minat belajar"/);
  assert.match(dashboard, /tabId === "interest"/);
  const page = read("app/staff/(protected)/page.tsx");
  assert.match(page, /staff\.role === "admin" \? await loadStudyInterestLeads\(client\)/);
  assert.match(page, /rawTab === "interest"/);
});
test("manager renders lead text safely with status control and age", () => {
  const manager = read("components/staff/StudyInterestManager.tsx");
  for (const text of ["Belum ada minat belajar.", "Sudah dihubungi", "Selesai", "/api/staff/study-interest/", "role=\"alert\"", "whitespace-pre-line", "min-h-11", "hari"]) assert.ok(manager.includes(text), text);
  assert.ok(!manager.includes("dangerouslySetInnerHTML"));
});
test("status route requires JSON and an active Admin", () => {
  const route = read("app/api/staff/study-interest/[id]/route.ts");
  assert.match(route, /export async function PATCH/);
  assert.match(route, /application\/json/);
  assert.match(route, /requireActiveStaff/);
  assert.match(route, /staffAccessResponse/);
});
