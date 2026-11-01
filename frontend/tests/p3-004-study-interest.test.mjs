import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { parseStudyInterest, submitStudyInterest, hashFormIp, readFormBody, verifyTurnstile, STUDY_INTEREST_CONSENT_VERSION } from "../src/lib/forms/study-interest.mjs";

export const validInput = () => ({ name: "Budi", contact: "+62 812-3456-7890", message: "Ingin belajar", consent: true, website: "", turnstileToken: "tok" });
const deps = (over = {}) => {
  const calls = [];
  return { calls, ipHash: "a".repeat(32), turnstileSecret: "secret",
    verifyTurnstile: async (...a) => { calls.push(["turnstile", ...a]); return true; },
    checkRate: async (form, hash, limit) => { calls.push(["rate", form, limit]); return true; },
    insertLead: async (row) => { calls.push(["insert", row]); }, ...over };
};

test("valid submission runs attempt rate, turnstile, submit rate, insert in order", async () => {
  const d = deps();
  const res = await submitStudyInterest(validInput(), d);
  assert.equal(res.status, 201);
  assert.deepEqual(d.calls.map((c) => c[0] === "rate" ? `rate:${c[1]}:${c[2]}` : c[0]), ["rate:study_interest_attempt:20", "turnstile", "rate:study_interest:5", "insert"]);
  assert.deepEqual(d.calls.at(-1)[1], { name: "Budi", contact: "+62 812-3456-7890", message: "Ingin belajar", consent_version: STUDY_INTEREST_CONSENT_VERSION });
});
test("honeypot returns generic success without side effects", async () => {
  const d = deps();
  const res = await submitStudyInterest({ ...validInput(), name: "", contact: "x", website: "http://spam" }, d);
  assert.equal(res.status, 200); assert.equal(d.calls.length, 0);
});
for (const [label, patch, field] of [
  ["consent missing", { consent: false }, "consent"],
  ["empty name", { name: "  " }, "name"],
  ["name over 100", { name: "a".repeat(101) }, "name"],
  ["contact free text", { contact: "besok saja" }, "contact"],
  ["phone with 7 digits", { contact: "123 4567" }, "contact"],
  ["message over 1000", { message: "😀".repeat(1001) }, "message"],
  ["NUL in message", { message: "a\0b" }, "message"],
]) test(`rejects ${label}`, async () => {
  const d = deps();
  const res = await submitStudyInterest({ ...validInput(), ...patch }, d);
  assert.equal(res.status, 400); assert.equal(res.body.field, field); assert.equal(d.calls.length, 0);
  assert.ok(!JSON.stringify(res.body).includes("besok saja"));
});
test("rejects unknown keys", () => assert.throws(() => parseStudyInterest({ ...validInput(), extra: 1 }), { status: 400 }));
test("accepts email and 1000 emoji message", () => {
  assert.equal(parseStudyInterest({ ...validInput(), contact: "a@b.co", message: "😀".repeat(1000) }).contact, "a@b.co");
});
test("missing turnstile secret fails closed with 503", async () => {
  const d = deps({ turnstileSecret: undefined });
  assert.equal((await submitStudyInterest(validInput(), d)).status, 503);
  assert.ok(!d.calls.some((c) => c[0] === "insert"));
});
test("turnstile failure is 400 and never inserts", async () => {
  const d = deps({ verifyTurnstile: async () => false });
  assert.equal((await submitStudyInterest(validInput(), d)).status, 400);
  assert.ok(!d.calls.some((c) => c[0] === "insert"));
});
test("attempt and submit rate limits return 429", async () => {
  assert.equal((await submitStudyInterest(validInput(), deps({ checkRate: async (f) => f !== "study_interest_attempt" }))).status, 429);
  const d = deps({ checkRate: async (f) => f !== "study_interest" });
  assert.equal((await submitStudyInterest(validInput(), d)).status, 429);
});
test("insert failure is a generic 500", async () => {
  const res = await submitStudyInterest(validInput(), deps({ insertLead: async () => { throw Object.assign(new Error("db text"), { code: "XX000" }); } }));
  assert.equal(res.status, 500); assert.ok(!JSON.stringify(res.body).includes("db text"));
});
test("hashFormIp is keyed HMAC, not plain sha256", () => {
  const h = hashFormIp("203.0.113.5", "k1");
  assert.match(h, /^[0-9a-f]{32}$/);
  assert.equal(h, hashFormIp("203.0.113.5", "k1"));
  assert.notEqual(h, hashFormIp("203.0.113.5", "k2"));
  assert.ok(!createHash("sha256").update("203.0.113.5").digest("hex").startsWith(h));
});
test("readFormBody enforces JSON content type, size and UTF-8", async () => {
  const req = (body, type = "application/json") => new Request("http://x", { method: "POST", headers: { "content-type": type }, body });
  await assert.rejects(readFormBody(req("{}", "text/plain")), { status: 415 });
  await assert.rejects(readFormBody(req("x".repeat(8193))), { status: 413 });
  await assert.rejects(readFormBody(req(new Uint8Array([0xff]))), { status: 400 });
  assert.deepEqual(await readFormBody(req('{"a":1}')), { a: 1 });
});
test("verifyTurnstile is true only for success === true and false on errors", async () => {
  assert.equal(await verifyTurnstile("t", "s", async () => new Response('{"success":true}')), true);
  assert.equal(await verifyTurnstile("t", "s", async () => new Response('{"success":false}')), false);
  assert.equal(await verifyTurnstile("t", "s", async () => { throw new Error("net"); }), false);
});
