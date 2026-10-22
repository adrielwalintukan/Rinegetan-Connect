import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadTypeScript } from "./helpers/load-typescript.mjs";
import { clientFor, course, lesson, id } from "./helpers/course-client.mjs";

const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
// Transpile the actual guard, replacing neither requireActiveStaff nor its role/profile decisions.
const guardUrl = dataUrl(ts.transpileModule(readFileSync(new URL("../src/lib/staff/server.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
const boundaryUrl = dataUrl('export async function createServerSupabaseClient() { const value = globalThis[Symbol.for("p3-course-client")]; if (value instanceof Error) throw value; return value; }');
const { POST } = await loadTypeScript("src/app/api/staff/courses/route.ts", {
  "@/lib/supabase/server": boundaryUrl,
  "@/lib/staff/server": guardUrl,
  "@/lib/courses/mutations": new URL("../src/lib/courses/mutations.mjs", import.meta.url).href,
});
const command = (extra = {}) => ({ entity: "courses", action: "save", data: course, ...extra });
async function request(value, result = { data: { id } }, auth = {}, raw = false) {
  const client = clientFor(result, auth);
  globalThis[Symbol.for("p3-course-client")] = client;
  const response = await POST(new Request("http://localhost/api/staff/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw ? value : JSON.stringify(value) }));
  return { response, body: await response.json(), client };
}

test("real POST rejects malformed JSON/commands before any mutation query", async () => {
  for (const [value, raw] of [["{", true], [[], false], [null, false], [command({ entity: "audit_logs" }), false], [command({ data: { ...course, status: "published" } }), false], [command({ id: "broken" }), false]]) {
    const { response, body, client } = await request(value, undefined, undefined, raw);
    assert.equal(response.status, 400); assert.equal(body.success, undefined); assert.deepEqual(client.calls, []);
  }
});
test("real staff guard rejects missing/expired sessions and inactive/nonstaff profiles", async () => {
  for (const [auth, status] of [[{ user: null }, 401], [{ error: { message: "PRIVATE_SENTINEL" } }, 401], [{ active: false }, 403], [{ role: null }, 403], [{ role: "guest" }, 403], [{ staffError: { message: "PRIVATE_SENTINEL" } }, 403]]) {
    const { response, body, client } = await request(command(), undefined, auth);
    assert.equal(response.status, status); assert.deepEqual(client.calls, []); assert.ok(!JSON.stringify(body).includes("PRIVATE_SENTINEL"));
  }
});
test("Editor delete is forbidden before mutation query", async () => {
  const { response, client } = await request({ entity: "course_lessons", action: "delete", id }, undefined, { role: "editor" });
  assert.equal(response.status, 403); assert.deepEqual(client.calls, []);
});
test("real POST returns saved Draft course/lesson rows", async () => {
  for (const [entity, data] of [["courses", course], ["course_lessons", lesson]]) {
    const row = { ...data, id, status: "draft" };
    const { response, body, client } = await request({ entity, action: "save", data }, { data: row }, { role: "editor" });
    assert.equal(response.status, 200); assert.deepEqual(body, { success: true, data: row });
    assert.deepEqual(client.calls[1], ["insert", { ...data, status: "draft" }]);
  }
});
test("real POST revisions retain Published status and return actual updated row", async () => {
  for (const entity of ["courses", "course_lessons"]) {
    const lessonUpdate = { ...lesson };
    delete lessonUpdate.course_id;
    const data = entity === "courses" ? course : lessonUpdate;
    const row = { ...data, id, status: "published" };
    const { response, body, client } = await request({ entity, action: "save", id, data }, { data: row });
    assert.equal(response.status, 200); assert.deepEqual(body.data, row); assert.deepEqual(client.calls[1], ["update", data]);
    assert.equal("status" in client.calls[1][1], false);
  }
});
test("real POST handles explicit lifecycle changes and Admin delete", async () => {
  for (const entity of ["courses", "course_lessons"]) {
    for (const status of ["draft", "published", "archived"]) {
      const row = { id, status };
      const result = await request({ entity, action: "status", id, status }, { data: row });
      assert.equal(result.response.status, 200); assert.deepEqual(result.body, { success: true, data: row });
      assert.deepEqual(result.client.calls[1], ["update", { status }]);
    }
    const deleted = await request({ entity, action: "delete", id }, { data: { id } });
    assert.equal(deleted.response.status, 200); assert.deepEqual(deleted.body, { success: true, data: { id } });
  }
});
test("real POST maps missing, conflicting and failed DB rows without private detail or logs", async (t) => {
  const logs = t.mock.method(console, "error", () => {});
  for (const [result, status] of [[{ data: null }, 404], [{ error: { code: "PGRST116" } }, 404], [{ error: { code: "23505" } }, 409], [{ error: { code: "23503" } }, 409], [{ error: { code: "23514" } }, 400], [{ error: { code: "42501" } }, 403], [{ error: { code: "XX000" } }, 500], [{ throws: new Error("PRIVATE_SENTINEL") }, 500]]) {
    const safeResult = { ...result, ...(result.error ? { error: { ...result.error, message: "PRIVATE_SENTINEL", details: "PRIVATE_SENTINEL" } } : {}) };
    const { response, body } = await request(command({ id }), safeResult);
    assert.equal(response.status, status); assert.equal(body.success, undefined); assert.ok(!JSON.stringify(body).includes("PRIVATE_SENTINEL"));
  }
  assert.ok(!JSON.stringify(logs.mock.calls).includes("PRIVATE_SENTINEL"));
});
test("unexpected session-client failure is a safe 500", async () => {
  globalThis[Symbol.for("p3-course-client")] = new Error("PRIVATE_SENTINEL");
  const response = await POST(new Request("http://localhost/api/staff/courses", { method: "POST", body: JSON.stringify(command()) }));
  assert.equal(response.status, 500); assert.ok(!(await response.text()).includes("PRIVATE_SENTINEL"));
});
test("route uses the session factory without admin client, audit writes or reader revalidation", () => {
  const source = readFileSync(new URL("../src/app/api/staff/courses/route.ts", import.meta.url), "utf8");
  assert.match(source, /createServerSupabaseClient/); assert.match(source, /requireActiveStaff/);
  assert.doesNotMatch(source, /createAdmin|service_role|audit_logs|revalidatePath|triggerPublicRevalidation/);
});
