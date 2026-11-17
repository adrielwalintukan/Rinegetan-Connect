// frontend/tests/p5-003-notification-subscription.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const frontendRoot = resolve(import.meta.dirname, "..");
const modulePath = resolve(frontendRoot, "src", "lib", "notifications", "subscription.mjs");

const load = async () => import(pathToFileURL(modulePath).href);

const VALID = {
  endpoint: "https://push.example.invalid/send/device-1",
  keys: { p256dh: "public-key-value", auth: "auth-secret-value" },
  categories: ["pengumuman", "ibadah"],
};

test("a well-formed device subscription becomes a database row", async () => {
  const { parseSubscription } = await load();
  const row = parseSubscription(VALID, "2026-11-17");
  assert.equal(row.endpoint, VALID.endpoint);
  assert.equal(row.p256dh, "public-key-value");
  assert.equal(row.auth, "auth-secret-value");
  assert.deepEqual(row.categories, ["pengumuman", "ibadah"]);
  assert.equal(row.consent_version, "2026-11-17");
});

test("the row carries no personal contact field", async () => {
  const { parseSubscription } = await load();
  const row = parseSubscription(VALID, "2026-11-17");
  assert.deepEqual(Object.keys(row).sort(), [
    "auth",
    "categories",
    "consent_version",
    "endpoint",
    "p256dh",
  ]);
});

test("categories are kept in the fixed church order, not the order sent", async () => {
  const { parseSubscription } = await load();
  const row = parseSubscription(
    { ...VALID, categories: ["sekolah-sabat", "pengumuman"] },
    "2026-11-17",
  );
  assert.deepEqual(row.categories, ["pengumuman", "sekolah-sabat"]);
});

test("duplicate categories collapse instead of failing", async () => {
  const { parseSubscription } = await load();
  const row = parseSubscription({ ...VALID, categories: ["ibadah", "ibadah"] }, "2026-11-17");
  assert.deepEqual(row.categories, ["ibadah"]);
});

test("an unknown category is rejected", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  assert.throws(() => parseSubscription({ ...VALID, categories: ["promosi"] }, "v"), SubscriptionError);
});

test("no category at all is rejected, because stop-all is not a subscription", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  for (const categories of [[], undefined, "pengumuman", null]) {
    assert.throws(
      () => parseSubscription({ ...VALID, categories }, "v"),
      SubscriptionError,
      `expected rejection for ${JSON.stringify(categories)}`,
    );
  }
});

test("the endpoint must be https and plausible", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  for (const endpoint of [
    undefined,
    "",
    "   ",
    "http://push.example.invalid/x",
    "https://",
    "javascript:alert(1)",
    `https://example.invalid/${"a".repeat(2048)}`,
    42,
  ]) {
    assert.throws(
      () => parseSubscription({ ...VALID, endpoint }, "v"),
      SubscriptionError,
      `expected rejection for ${JSON.stringify(endpoint)}`,
    );
  }
});

test("both push keys are required", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  for (const keys of [undefined, null, {}, { p256dh: "k" }, { auth: "a" }, { p256dh: "", auth: "a" }]) {
    assert.throws(
      () => parseSubscription({ ...VALID, keys }, "v"),
      SubscriptionError,
      `expected rejection for ${JSON.stringify(keys)}`,
    );
  }
});

test("a body with extra keys is refused rather than silently trimmed", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  for (const extra of [{ email: "a@example.invalid" }, { phone: "0812" }, { name: "Ani" }]) {
    assert.throws(
      () => parseSubscription({ ...VALID, ...extra }, "v"),
      SubscriptionError,
      `expected rejection for extra key ${Object.keys(extra)[0]}`,
    );
  }
});

test("junk input is rejected without throwing a raw TypeError", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  for (const junk of [null, undefined, 42, "text", [], true]) {
    assert.throws(() => parseSubscription(junk, "v"), SubscriptionError);
  }
});

test("stopping requires the same endpoint rules", async () => {
  const { parseStopRequest, SubscriptionError } = await load();
  assert.equal(parseStopRequest({ endpoint: VALID.endpoint }), VALID.endpoint);
  for (const body of [null, {}, { endpoint: "http://x.invalid" }, { endpoint: "" }, { endpoint: VALID.endpoint, extra: 1 }]) {
    assert.throws(() => parseStopRequest(body), SubscriptionError);
  }
});

test("the error message is written in Indonesian for the jemaat", async () => {
  const { parseSubscription, SubscriptionError } = await load();
  try {
    parseSubscription({ ...VALID, categories: [] }, "v");
    assert.fail("expected a rejection");
  } catch (error) {
    assert.ok(error instanceof SubscriptionError);
    assert.match(error.message, /kategori/i);
  }
});

test("the module stores no email or phone field", () => {
  const source = readFileSync(modulePath, "utf8");
  assert.doesNotMatch(source, /insert\s*\(.*email/i);
  assert.doesNotMatch(source, /p_endpoint_email/i);
});
