// frontend/tests/p3-005-pastoral-admin.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PASTORAL_TABLES, loadPastoralRows, parsePastoralStatus, updatePastoralStatus } from "../src/lib/forms/pastoral-admin.mjs";

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

test("status values are per table", () => {
  assert.equal(parsePastoralStatus({ status: "prayed" }, "prayer_requests"), "prayed");
  assert.equal(parsePastoralStatus({ status: "contacted" }, "visitor_submissions"), "contacted");
  assert.throws(() => parsePastoralStatus({ status: "contacted" }, "prayer_requests"), { status: 400 });
  assert.throws(() => parsePastoralStatus({ status: "prayed" }, "visitor_submissions"), { status: 400 });
  for (const bad of [{ status: "new", extra: 1 }, null, [], "new"]) assert.throws(() => parsePastoralStatus(bad, "prayer_requests"), { status: 400 });
});
test("loadPastoralRows returns the 50 newest with only listed columns", async () => {
  for (const table of ["prayer_requests", "visitor_submissions"]) {
    const client = clientFor({ data: [{ id }] });
    assert.deepEqual(await loadPastoralRows(client, table), { data: [{ id }], error: false });
    assert.deepEqual(client.calls, [["from", table], ["select", PASTORAL_TABLES[table].columns], ["order", "created_at", { ascending: false }], ["limit", 50]]);
  }
  assert.deepEqual(await loadPastoralRows(clientFor({ data: null, error: { code: "42501" } }), "prayer_requests"), { data: null, error: true });
});
test("updatePastoralStatus is Admin-only and validates input", async () => {
  await assert.rejects(updatePastoralStatus(clientFor(), "prayer_requests", id, "closed", "editor"), { status: 403 });
  await assert.rejects(updatePastoralStatus(clientFor(), "prayer_requests", "nope", "closed", "admin"), { status: 400 });
  await assert.rejects(updatePastoralStatus(clientFor({ data: null }), "prayer_requests", id, "closed", "admin"), { status: 404 });
  await assert.rejects(updatePastoralStatus(clientFor({ error: { code: "XX000", message: "raw db" } }), "visitor_submissions", id, "closed", "admin"),
    (error) => error.status === 500 && !error.message.includes("raw db"));
  const client = clientFor({ data: { id, status: "closed" } });
  assert.deepEqual(await updatePastoralStatus(client, "visitor_submissions", id, "closed", "admin"), { id, status: "closed" });
  assert.deepEqual(client.calls.slice(0, 3), [["from", "visitor_submissions"], ["update", { status: "closed" }], ["eq", "id", id]]);
});
test("status routes require JSON and authenticate before reading the body", () => {
  for (const [path, table] of [["app/api/staff/prayer-requests/[id]/route.ts", "prayer_requests"], ["app/api/staff/visits/[id]/route.ts", "visitor_submissions"]]) {
    const route = read(path);
    assert.match(route, /export async function PATCH/);
    assert.match(route, /application\/json/);
    assert.ok(route.indexOf("requireActiveStaff(client)") < route.indexOf("request.json()"), path);
    assert.match(route, /staffAccessResponse/);
    assert.ok(route.includes(`"${table}"`), path);
  }
});
