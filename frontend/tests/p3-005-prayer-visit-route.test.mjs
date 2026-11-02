// frontend/tests/p3-005-prayer-visit-route.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";
import { prayerInput, visitInput } from "./p3-005-prayer-visit.test.mjs";

const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const lib = (name) => new URL(`../src/lib/forms/${name}.mjs`, import.meta.url).href;
const modules = {
  "@/lib/supabase/admin": dataUrl('export const createSupabaseAdminClient = () => globalThis[Symbol.for("p3-005-admin")]();'),
  "@/lib/forms/public-form-route": lib("public-form-route"),
  "@/lib/forms/prayer-request": lib("prayer-request"),
  "@/lib/forms/visit": lib("visit"),
};
const prayer = await loadTypeScript("src/app/api/doa/route.ts", modules);
const visit = await loadTypeScript("src/app/api/kunjungan/route.ts", modules);

function adminFor({ rate = true, insertError = null } = {}) {
  const calls = [];
  return { calls,
    async rpc(name, args) { calls.push(["rpc", name, args]); return { data: rate, error: null }; },
    from(table) { return { async insert(row) { calls.push(["insert", table, row]); return { error: insertError }; } }; } };
}
function setup({ admin = adminFor(), secret = "turnstile-secret", serverKey = "server-key", turnstile = true } = {}) {
  globalThis[Symbol.for("p3-005-admin")] = () => admin;
  process.env.SUPABASE_SECRET_KEY = serverKey;
  if (secret === null) delete process.env.TURNSTILE_SECRET_KEY; else process.env.TURNSTILE_SECRET_KEY = secret;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: turnstile }));
  return admin;
}
const post = (route, body, type = "application/json") => route.POST(new Request("http://127.0.0.1/api/x", {
  method: "POST", headers: { "content-type": type, "x-forwarded-for": "203.0.113.9" }, body: typeof body === "string" ? body : JSON.stringify(body),
}));

test("prayer route inserts into prayer_requests without echoing the request", async () => {
  const admin = setup();
  const res = await post(prayer, prayerInput());
  assert.equal(res.status, 201);
  assert.ok(!(await res.text()).includes("kesehatan"));
  assert.deepEqual(admin.calls.filter((c) => c[0] === "rpc").map((c) => [c[2].p_form, c[2].p_limit, c[2].p_window]), [["prayer_attempt", 20, "1 hour"], ["prayer", 5, "1 hour"]]);
  assert.deepEqual(admin.calls.filter((c) => c[0] === "insert").map((c) => c[1]), ["prayer_requests"]);
});
test("visit route inserts into visitor_submissions", async () => {
  const admin = setup();
  assert.equal((await post(visit, visitInput())).status, 201);
  assert.deepEqual(admin.calls.filter((c) => c[0] === "insert").map((c) => c[1]), ["visitor_submissions"]);
});
test("routes enforce JSON, size, secrets, Turnstile, rate and generic errors", async () => {
  for (const route of [prayer, visit]) {
    setup();
    assert.equal((await post(route, "{}", "text/plain")).status, 415);
    assert.equal((await post(route, "x".repeat(9000))).status, 413);
    const noKey = setup({ serverKey: "" });
    assert.equal((await post(route, prayerInput())).status, 503); assert.equal(noKey.calls.length, 0);
    setup({ secret: null });
    assert.equal((await post(route, route === prayer ? prayerInput() : visitInput())).status, 503);
    setup({ turnstile: false });
    assert.equal((await post(route, route === prayer ? prayerInput() : visitInput())).status, 400);
    setup({ admin: adminFor({ rate: false }) });
    assert.equal((await post(route, route === prayer ? prayerInput() : visitInput())).status, 429);
    setup({ admin: adminFor({ insertError: { code: "XX000", message: "secret db detail" } }) });
    const res = await post(route, route === prayer ? prayerInput() : visitInput());
    assert.equal(res.status, 500); assert.ok(!(await res.text()).includes("secret db detail"));
  }
});
