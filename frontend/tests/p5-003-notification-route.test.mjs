// frontend/tests/p5-003-notification-route.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScript } from "./helpers/load-typescript.mjs";

const dataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const lib = (path) => new URL(`../src/lib/notifications/${path}.mjs`, import.meta.url).href;

const modules = {
  "@/lib/supabase/admin": dataUrl('export const createSupabaseAdminClient = () => globalThis[Symbol.for("p5-003-admin")]();'),
  "@/lib/notifications/preferences": lib("preferences"),
  "@/lib/notifications/subscription": lib("subscription"),
  "@/lib/forms/public-form": new URL("../src/lib/forms/public-form.mjs", import.meta.url).href,
};

const subscribe = await loadTypeScript("src/app/api/notifikasi/langganan/route.ts", modules);
const stop = await loadTypeScript("src/app/api/notifikasi/berhenti/route.ts", modules);

const SUBSCRIPTION = {
  endpoint: "https://push.example.invalid/send/device-1",
  keys: { p256dh: "public-key-value", auth: "auth-secret-value" },
};

function adminFor({ insertError = null, updateError = null, rpcError = null, recipients = [], rateLimit = true } = {}) {
  const calls = [];
  return {
    calls,
    async rpc(name, args) {
      calls.push(["rpc", name, args]);
      if (name === "check_form_rate") return { data: rateLimit, error: rpcError };
      return { data: rpcError ? null : true, error: rpcError };
    },
    from(table) {
      return {
        async insert(row) {
          calls.push(["insert", table, row]);
          return { error: insertError };
        },
        update(row) {
          calls.push(["update", table, row]);
          return {
            async eq(column, value) {
              calls.push(["update-eq", column, value]);
              return { error: updateError };
            },
          };
        },
        select() {
          calls.push(["select", table]);
          return {
            async eq(column, value) {
              calls.push(["select-eq", column, value]);
              return { data: recipients, error: rpcError };
            },
          };
        },
      };
    },
  };
}

function setup(admin = adminFor()) {
  globalThis[Symbol.for("p5-003-admin")] = () => admin;
  process.env.SUPABASE_SECRET_KEY = "server-key";
  return admin;
}

const post = (route, body) => route.POST(new Request("http://127.0.0.1/api/notifikasi/x", {
  method: "POST",
  headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
  body: typeof body === "string" ? body : JSON.stringify(body),
}));

test("subscribing stores the device subscription with the chosen categories", async () => {
  const admin = setup();
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["pengumuman", "ibadah"] });
  assert.equal(res.status, 201);
  const insert = admin.calls.find((call) => call[0] === "insert");
  assert.equal(insert[1], "notification_subscriptions");
  assert.equal(insert[2].endpoint, SUBSCRIPTION.endpoint);
  assert.deepEqual(insert[2].categories, ["pengumuman", "ibadah"]);
  assert.equal(insert[2].p256dh, "public-key-value");
  assert.equal(insert[2].auth, "auth-secret-value");
});

test("the response never echoes the push secrets", async () => {
  setup();
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["ibadah"] });
  const text = await res.text();
  assert.ok(!text.includes("auth-secret-value"), "auth secret must not be returned");
  assert.ok(!text.includes("public-key-value"), "p256dh must not be returned");
});

test("subscribing with no category is refused, because stop-all is not a subscription", async () => {
  const admin = setup();
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: [] });
  assert.equal(res.status, 400);
  assert.equal(admin.calls.length, 0, "nothing is written when no category is chosen");
});

test("an unknown category is refused before it reaches the database", async () => {
  const admin = setup();
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["promosi"] });
  assert.equal(res.status, 400);
  assert.equal(admin.calls.length, 0);
});

test("a subscription without an https endpoint or keys is refused", async () => {
  for (const bad of [
    { keys: { p256dh: "k", auth: "a" }, categories: ["ibadah"] },
    { endpoint: "http://push.example.invalid/x", keys: { p256dh: "k", auth: "a" }, categories: ["ibadah"] },
    { endpoint: "https://push.example.invalid/x", categories: ["ibadah"] },
    { endpoint: "https://push.example.invalid/x", keys: { p256dh: "k" }, categories: ["ibadah"] },
    { endpoint: "https://push.example.invalid/x", keys: { p256dh: "k", auth: "a" } },
  ]) {
    const admin = setup();
    const res = await post(subscribe, bad);
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(bad)}`);
    assert.equal(admin.calls.length, 0);
  }
});

test("no subscription is stored when the server key is missing", async () => {
  const admin = setup();
  delete process.env.SUPABASE_SECRET_KEY;
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["ibadah"] });
  assert.equal(res.status, 503);
  assert.equal(admin.calls.length, 0);
});

test("a database error is reported generically without leaking details", async () => {
  setup(adminFor({ insertError: { code: "XX000", message: "duplicate key value violates unique constraint" } }));
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["ibadah"] });
  assert.equal(res.status, 500);
  assert.ok(!(await res.text()).includes("unique constraint"));
});

test("stop-all deletes the subscription instead of storing an empty one", async () => {
  const admin = setup();
  const res = await post(stop, { endpoint: SUBSCRIPTION.endpoint });
  assert.equal(res.status, 200);
  assert.ok(admin.calls.some((call) => call[0] === "rpc" && call[1] === "stop_notification_subscription"));
  assert.equal(
    admin.calls.some((call) => call[0] === "insert"),
    false,
    "stop-all must never insert a subscription row",
  );
});

test("stopping without an endpoint is refused", async () => {
  const admin = setup();
  assert.equal((await post(stop, {})).status, 400);
  assert.equal((await post(stop, { endpoint: "http://x.example" })).status, 400);
  assert.equal(admin.calls.length, 0);
});

test("the subscription route rejects a non-JSON body", async () => {
  const admin = setup();
  const res = await subscribe.POST(new Request("http://127.0.0.1/api/notifikasi/langganan", {
    method: "POST", headers: { "content-type": "text/plain" }, body: "hello",
  }));
  assert.equal(res.status, 415);
  assert.equal(admin.calls.length, 0);
});

test("a device that opts in again updates the same row instead of failing", async () => {
  const admin = setup(adminFor({ insertError: { code: "23505" } }));
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["pengumuman", "sekolah-sabat"] });
  assert.equal(res.status, 200, "a repeat opt-in from the same endpoint must succeed");
  const call = admin.calls.find((c) => c[0] === "rpc" && c[1] === "update_notification_categories");
  assert.ok(call, "the repeat opt-in must replace the categories through the function");
  assert.equal(call[2].p_endpoint, SUBSCRIPTION.endpoint);
  assert.deepEqual(call[2].p_categories, ["pengumuman", "sekolah-sabat"]);
});

test("a failed category update is reported generically", async () => {
  setup(adminFor({ insertError: { code: "23505" }, rpcError: { code: "XX000", message: "boom" } }));
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["ibadah"] });
  assert.equal(res.status, 500);
  assert.ok(!(await res.text()).includes("boom"));
});

test("too many attempts are refused before anything is written", async () => {
  const admin = setup(adminFor({ rateLimit: false }));
  const res = await post(subscribe, { ...SUBSCRIPTION, categories: ["ibadah"] });
  assert.equal(res.status, 429);
  assert.equal(admin.calls.some((c) => c[0] === "insert"), false, "no row is written when limited");
});

test("the rate limiter is asked before the subscription is stored", async () => {
  const admin = setup();
  await post(subscribe, { ...SUBSCRIPTION, categories: ["ibadah"] });
  const names = admin.calls.map((c) => (c[0] === "rpc" ? c[1] : c[0]));
  assert.ok(names.indexOf("check_form_rate") < names.indexOf("insert"), "limit is checked before insert");
});

test("stop-all is rate limited too", async () => {
  const admin = setup(adminFor({ rateLimit: false }));
  const res = await post(stop, { endpoint: SUBSCRIPTION.endpoint });
  assert.equal(res.status, 429);
  assert.equal(admin.calls.some((c) => c[1] === "stop_notification_subscription"), false);
});
