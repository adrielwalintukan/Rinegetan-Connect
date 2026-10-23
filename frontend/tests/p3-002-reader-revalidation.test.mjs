import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { loadTypeScript } from "./helpers/load-typescript.mjs";
import { clientFor, course, lesson, id } from "./helpers/course-client.mjs";

const dataUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const guardUrl = dataUrl(ts.transpileModule(readFileSync(new URL("../src/lib/staff/server.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText);
// Only the session/network and Next cache boundaries are synthetic; guard, dispatcher and invalidator stay real.
const boundaryUrl = dataUrl('export async function createServerSupabaseClient() { const state = globalThis[Symbol.for("p3-reader-route")]; if (state.client instanceof Error) throw state.client; return state.client; }');
const cacheUrl = dataUrl(`
  function record(...call) { const state = globalThis[Symbol.for("p3-reader-route")]; state.events.push(call); if (state.failAt === state.events.length - 1) throw new Error("PRIVATE_SENTINEL"); }
  export function revalidateTag(...args) { record("tag", ...args); }
  export function revalidatePath(...args) { record("path", ...args); }
`);
const { POST } = await loadTypeScript("src/app/api/staff/courses/route.ts", {
  "@/lib/supabase/server": boundaryUrl,
  "@/lib/staff/server": guardUrl,
  "@/lib/courses/mutations": new URL("../src/lib/courses/mutations.mjs", import.meta.url).href,
  "@/lib/courses/revalidation": new URL("../src/lib/courses/revalidation.mjs", import.meta.url).href,
  "next/cache": cacheUrl,
});
const warning = "Perubahan tersimpan, tetapi penyegaran tampilan publik belum berhasil. Silakan periksa kembali beberapa saat lagi.";
const expectedInvalidation = [
  ["tag", "public-courses", { expire: 0 }],
  ["path", "/pelajari-alkitab"],
  ["path", "/pelajari-alkitab/[courseSlug]", "page"],
  ["path", "/pelajari-alkitab/[courseSlug]/[lessonSlug]", "page"],
];
const save = { entity: "courses", action: "save", data: course };
const mutationCalls = client => client.calls.filter(([operation]) => ["insert", "update", "delete"].includes(operation));
async function request(command, { result = { data: { id } }, auth = {}, failAt, raw = false, clientFailure = false } = {}) {
  const client = clientFor(result, auth);
  const events = [];
  const from = client.from.bind(client);
  client.from = table => {
    const chain = from(table);
    if (table === "courses" || table === "course_lessons") {
      const single = chain.single.bind(chain);
      chain.single = async () => {
        const row = await single();
        if (row.data && !row.error) events.push(["committed"]);
        return row;
      };
    }
    return chain;
  };
  globalThis[Symbol.for("p3-reader-route")] = { client: clientFailure ? new Error("PRIVATE_SENTINEL") : client, events, failAt };
  const response = await POST(new Request("http://localhost/api/staff/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw ? command : JSON.stringify(command) }));
  return { response, body: await response.json(), client, events };
}

test("real POST expires reader tag and all three literal paths only after committed save/status/delete for both entities", async () => {
  for (const [entity, data] of [["courses", course], ["course_lessons", lesson]]) {
    const revision = { ...data }; delete revision.course_id;
    const commands = [
      { entity, action: "save", data },
      { entity, action: "save", id, data: revision },
      ...["draft", "published", "archived"].map(status => ({ entity, action: "status", id, status })),
      { entity, action: "delete", id },
    ];
    for (const command of commands) {
      const row = { id, ...(command.action === "delete" ? {} : { ...command.data, status: command.status || "published" }) };
      const { response, body, client, events } = await request(command, { result: { data: row } });
      assert.equal(response.status, 200);
      assert.deepEqual(body, { success: true, data: row });
      assert.deepEqual(events, [["committed"], ...expectedInvalidation]);
      assert.equal(mutationCalls(client).length, 1);
    }
  }
});

test("invalid JSON and commands never invalidate reader data", async () => {
  for (const [command, raw] of [["{", true], [null, false], [{ ...save, entity: "audit_logs" }, false]]) {
    const { response, client, events } = await request(command, { raw });
    assert.equal(response.status, 400); assert.deepEqual(client.calls, []); assert.deepEqual(events, []);
  }
});

test("real staff guard and Editor delete rejection never invalidate reader data", async () => {
  for (const [auth, command, status] of [
    [{ user: null }, save, 401], [{ error: { message: "PRIVATE_SENTINEL" } }, save, 401],
    [{ active: false }, save, 403], [{ role: null }, save, 403], [{ role: "guest" }, save, 403],
    [{ staffError: { message: "PRIVATE_SENTINEL" } }, save, 403],
    [{ role: "editor" }, { entity: "course_lessons", action: "delete", id }, 403],
  ]) {
    const { response, client, events } = await request(command, { auth });
    assert.equal(response.status, status); assert.deepEqual(client.calls, []); assert.deepEqual(events, []);
  }
});

test("missing/conflicting/failed database rows preserve failure responses without invalidation", async () => {
  for (const [result, status] of [
    [{ data: null }, 404], [{ error: { code: "PGRST116" } }, 404],
    [{ error: { code: "23505" } }, 409], [{ error: { code: "23503" } }, 409],
    [{ error: { code: "23514" } }, 400], [{ error: { code: "42501" } }, 403],
    [{ error: { code: "XX000", message: "PRIVATE_SENTINEL" } }, 500], [{ throws: new Error("PRIVATE_SENTINEL") }, 500],
  ]) {
    const { response, body, events } = await request(save, { result });
    assert.equal(response.status, status); assert.equal(body.success, undefined);
    assert.ok(!JSON.stringify(body).includes("PRIVATE_SENTINEL")); assert.deepEqual(events, []);
  }
});

test("unexpected session failure never invalidates reader data", async () => {
  const { response, body, events } = await request(save, { clientFailure: true });
  assert.equal(response.status, 500); assert.ok(!JSON.stringify(body).includes("PRIVATE_SENTINEL")); assert.deepEqual(events, []);
});

test("each cache hook failure after commit returns exact safe warning and data without retry or raw error logs", async t => {
  const errors = t.mock.method(console, "error", () => {});
  const warnings = t.mock.method(console, "warn", () => {});
  for (const entity of ["courses", "course_lessons"]) {
    for (const command of [
      { entity, action: "save", data: entity === "courses" ? course : lesson },
      { entity, action: "status", id, status: "archived" },
      { entity, action: "delete", id },
    ]) {
      for (let failAt = 1; failAt <= expectedInvalidation.length; failAt++) {
        const row = { id };
        const { response, body, client, events } = await request(command, { result: { data: row }, failAt });
        assert.equal(response.status, 200);
        assert.deepEqual(body, { success: true, data: row, warning });
        assert.equal(mutationCalls(client).length, 1);
        assert.deepEqual(events, [["committed"], ...expectedInvalidation.slice(0, failAt)]);
        assert.ok(!JSON.stringify(body).includes("PRIVATE_SENTINEL"));
      }
    }
  }
  assert.deepEqual(errors.mock.calls, []); assert.deepEqual(warnings.mock.calls, []);
});
