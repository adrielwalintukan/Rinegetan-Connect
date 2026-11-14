import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";
import { validInput } from "./p3-004-study-interest.test.mjs";

const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const modules = {
  "@/lib/supabase/admin": dataUrl('export const createSupabaseAdminClient = () => globalThis[Symbol.for("p3-004-admin")]();'),
  "@/lib/forms/study-interest": new URL("../src/lib/forms/study-interest.mjs", import.meta.url).href,
};
const route = await loadTypeScript("src/app/api/minat-belajar/route.ts", modules);

// Only the Supabase and Cloudflare network boundaries are replaced.
function adminFor({ rate = true, insertError = null } = {}) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) { calls.push(["rpc", name, args]); return { data: rate, error: null }; },
    from(table) { return { async insert(row) { calls.push(["insert", table, row]); return { error: insertError }; } }; },
  };
}
function setup({ admin = adminFor(), secret = "turnstile-secret", serverKey = "server-key", turnstile = true } = {}) {
  globalThis[Symbol.for("p3-004-admin")] = () => admin;
  process.env.SUPABASE_SECRET_KEY = serverKey;
  if (secret === null) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = secret;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: turnstile }));
  return admin;
}
const post = (body, type = "application/json") => route.POST(new Request("http://127.0.0.1/api/minat-belajar", {
  method: "POST", headers: { "content-type": type, "x-forwarded-for": "203.0.113.9, 10.0.0.1" }, body: typeof body === "string" ? body : JSON.stringify(body),
}));

test("valid submission inserts once and answers 201 without echoing the lead", async () => {
  const admin = setup();
  const res = await post(validInput());
  assert.equal(res.status, 201);
  const text = await res.text();
  for (const value of ["Budi", "812-3456", "Ingin belajar"]) assert.ok(!text.includes(value));
  const rpcs = admin.calls.filter((c) => c[0] === "rpc");
  assert.deepEqual(rpcs.map((c) => [c[2].p_form, c[2].p_limit, c[2].p_window]), [["study_interest_attempt", 20, "1 hour"], ["study_interest", 5, "1 hour"]]);
  assert.match(rpcs[0][2].p_ip_hash, /^[0-9a-f]{32}$/);
  assert.equal(admin.calls.filter((c) => c[0] === "insert").length, 1);
});
test("non-JSON content type is 415 and oversized body is 413", async () => {
  setup();
  assert.equal((await post("{}", "text/plain")).status, 415);
  assert.equal((await post({ ...validInput(), message: "a".repeat(9000) })).status, 413);
});
test("missing Turnstile secret fails closed with 503", async () => {
  const admin = setup({ secret: null });
  assert.equal((await post(validInput())).status, 503);
  assert.ok(!admin.calls.some((c) => c[0] === "insert"));
});
test("missing server key is 503 before any database call", async () => {
  const admin = setup({ serverKey: "" });
  assert.equal((await post(validInput())).status, 503);
  assert.equal(admin.calls.length, 0);
});
test("Turnstile rejection is 400 and rate limit is 429", async () => {
  setup({ turnstile: false });
  assert.equal((await post(validInput())).status, 400);
  setup({ admin: adminFor({ rate: false }) });
  assert.equal((await post(validInput())).status, 429);
});
test("database insert error is a generic 500", async () => {
  setup({ admin: adminFor({ insertError: { code: "XX000", message: "secret db detail" } }) });
  const res = await post(validInput());
  assert.equal(res.status, 500);
  assert.ok(!(await res.text()).includes("secret db detail"));
});
