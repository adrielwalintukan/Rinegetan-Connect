import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadTypeScript } from "./helpers/load-typescript.mjs";
import { validImport } from "./p3-003-course-import-parser.test.mjs";

const id = "00000000-0000-4000-8000-000000000001";
const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const guardUrl = dataUrl(ts.transpileModule(readFileSync(new URL("../src/lib/staff/server.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
const boundaryUrl = dataUrl('export async function createServerSupabaseClient() { return globalThis[Symbol.for("p3-import-client")]; }');
const modules = {
  "@/lib/supabase/server": boundaryUrl,
  "@/lib/staff/server": guardUrl,
  "@/lib/courses/imports": new URL("../src/lib/courses/imports.mjs", import.meta.url).href,
  "@/lib/courses/import-actions": new URL("../src/lib/courses/import-actions.mjs", import.meta.url).href,
  "@/lib/api/errors": new URL("../src/lib/api/errors.mjs", import.meta.url).href,
};
const upload = await loadTypeScript("src/app/api/staff/course-imports/route.ts", modules);
const item = await loadTypeScript("src/app/api/staff/course-imports/[id]/route.ts", modules);

// Only the Supabase network boundary is replaced.
function clientFor(result = {}, auth = {}) {
  const calls = [];
  const chain = {
    insert(v) { calls.push(["insert", v]); return this; }, update(v) { calls.push(["update", v]); return this; },
    eq(k, v) { calls.push(["eq", k, v]); return this; }, select(c) { calls.push(["select", c]); return this; },
    order(k, o) { calls.push(["order", k, o]); return this; }, limit(n) { calls.push(["limit", n]); return this; },
    async single() { calls.push(["single"]); return { data: null, error: null, ...result }; },
  };
  return {
    calls,
    auth: { async getUser() { return { data: { user: auth.user === null ? null : { id } }, error: null }; } },
    async rpc(name, args) { calls.push(["rpc", name, args]); return { data: null, error: null, ...result }; },
    from(table) {
      if (table === "staff_roles" || table === "profiles") return { select() { return this; }, eq() { return this; }, async maybeSingle() {
        return { data: table === "staff_roles" ? { role: "role" in auth ? auth.role : "admin" } : { is_active: auth.active ?? true }, error: null };
      } };
      calls.push(["from", table]); return chain;
    },
  };
}
async function call(handler, { body, raw = false, result, auth, params } = {}) {
  const client = clientFor(result, auth);
  globalThis[Symbol.for("p3-import-client")] = client;
  const init = body === undefined ? { method: "GET" } : { method: "POST", body: raw ? body : JSON.stringify(body) };
  const response = await handler(new Request("http://localhost/api/staff/course-imports", init), params ? { params: Promise.resolve(params) } : undefined);
  return { response, json: await response.json(), client };
}

test("upload rejects invalid or oversized files before any query", async () => {
  for (const [body, status] of [["{", 400], [JSON.stringify({ ...validImport(), language: "en" }), 400], ["x".repeat(2 * 1024 * 1024 + 1), 413]]) {
    const { response, client } = await call(upload.POST, { body, raw: true });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []);
  }
});
test("upload requires an active staff session", async () => {
  for (const [auth, status] of [[{ user: null }, 401], [{ active: false }, 403], [{ role: null }, 403]]) {
    const { response, client } = await call(upload.POST, { body: JSON.stringify(validImport()), raw: true, auth });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []);
  }
});
test("Editor upload inserts only documented columns as pending staging", async () => {
  const row = { id, status: "pending" };
  const { response, json, client } = await call(upload.POST, { body: JSON.stringify(validImport()), raw: true, auth: { role: "editor" }, result: { data: row } });
  assert.equal(response.status, 200); assert.deepEqual(json, { success: true, data: row });
  const [, insert] = client.calls.find(([name]) => name === "insert");
  assert.deepEqual(Object.keys(insert).sort(), ["course_slug", "course_title", "lesson_count", "license_name", "license_notes", "license_url", "payload", "rights_holder", "source_name", "source_url"]);
  assert.equal(insert.lesson_count, 2); assert.equal(insert.payload.lessons[0].body, "Paragraf satu.\n\nParagraf dua.");
});
test("slug conflict maps to 409 without leaking database text", async () => {
  const { response, json } = await call(upload.POST, { body: JSON.stringify(validImport()), raw: true, result: { error: { code: "23505", message: "PRIVATE_SENTINEL" } } });
  assert.equal(response.status, 409); assert.ok(!JSON.stringify(json).includes("PRIVATE_SENTINEL"));
});
test("decisions are Admin-only and validated before any query", async () => {
  for (const [body, auth, status] of [[{ action: "approve" }, { role: "editor" }, 403], [{ action: "reject", note: "x" }, { role: "editor" }, 403], [{ action: "reject", note: " " }, {}, 400], [{ action: "publish" }, {}, 400]]) {
    const { response, client } = await call(item.POST, { body, auth, params: { id } });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []);
  }
  const bad = await call(item.POST, { body: { action: "approve" }, params: { id: "broken" } });
  assert.equal(bad.response.status, 400); assert.deepEqual(bad.client.calls, []);
});
test("Admin approve calls the approval function; reject updates only pending rows", async () => {
  const approved = await call(item.POST, { body: { action: "approve" }, params: { id }, result: { data: "course-id" } });
  assert.equal(approved.response.status, 200); assert.deepEqual(approved.client.calls, [["rpc", "approve_course_import", { p_import_id: id }]]);
  assert.deepEqual(approved.json.data, { id, course_id: "course-id" });
  const rejected = await call(item.POST, { body: { action: "reject", note: "  Izin belum jelas  " }, params: { id }, result: { data: { id } } });
  assert.equal(rejected.response.status, 200);
  assert.deepEqual(rejected.client.calls.slice(0, 4), [["from", "course_imports"], ["update", { status: "rejected", review_note: "Izin belum jelas" }], ["eq", "id", id], ["eq", "status", "pending"]]);
});
test("GET preview returns payload for active staff only", async () => {
  const payload = validImport();
  const ok = await call(item.GET, { params: { id }, auth: { role: "editor" }, result: { data: { payload } } });
  assert.equal(ok.response.status, 200); assert.deepEqual(ok.json.data, payload);
  const denied = await call(item.GET, { params: { id }, auth: { user: null } });
  assert.equal(denied.response.status, 401); assert.deepEqual(denied.client.calls, []);
});
test("generic database errors map to 400 on approve without leaking text", async () => {
  for (const code of ["22P02", "23502", "22003", "23514"]) {
    const { response, json } = await call(item.POST, { body: { action: "approve" }, params: { id }, result: { error: { code, message: "PRIVATE_SENTINEL" } } });
    assert.equal(response.status, 400); assert.ok(!JSON.stringify(json).includes("PRIVATE_SENTINEL"));
  }
});
