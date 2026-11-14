// frontend/tests/p3-005-prayer-visit.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { parsePrayerRequest, submitPrayerRequest, PRAYER_CONSENT_VERSION } from "../src/lib/forms/prayer-request.mjs";
import { parseVisit, submitVisit, makassarToday, VISIT_CONSENT_VERSION } from "../src/lib/forms/visit.mjs";

export const prayerInput = () => ({ name: "", contact: "", request: "Mohon doa untuk kesehatan keluarga", wantsContact: false, consent: true, website: "", turnstileToken: "tok" });
export const visitInput = () => ({ name: "Tamu", contact: "tamu@example.invalid", visitDate: "", partySize: "", message: "", consent: true, website: "", turnstileToken: "tok" });
const NOW = new Date("2026-11-07T15:30:00Z"); // 23:30 WITA on 7 November
const deps = (over = {}) => { const calls = []; return { calls, ipHash: "a".repeat(32), turnstileSecret: "s", now: NOW,
  verifyTurnstile: async () => true, checkRate: async (key, h, limit) => { calls.push(`rate:${key}:${limit}`); return true; },
  insertRow: async (row) => { calls.push(["insert", row]); }, ...over }; };

test("anonymous prayer is stored without name or contact", async () => {
  const d = deps();
  const res = await submitPrayerRequest(prayerInput(), d);
  assert.equal(res.status, 201);
  assert.deepEqual(d.calls, ["rate:prayer_attempt:20", "rate:prayer:5", ["insert", { name: "", contact: "", request: "Mohon doa untuk kesehatan keluarga", wants_contact: false, consent_version: PRAYER_CONSENT_VERSION }]]);
  assert.ok(!JSON.stringify(res.body).includes("kesehatan"));
});
for (const [label, patch, field] of [
  ["consent missing", { consent: false }, "consent"],
  ["empty request", { request: "  " }, "request"],
  ["request over 2000", { request: "😀".repeat(2001) }, "request"],
  ["bad contact", { contact: "besok saja" }, "contact"],
  ["wantsContact without contact", { wantsContact: true }, "contact"],
  ["name over 100", { name: "a".repeat(101) }, "name"],
]) test(`prayer rejects ${label}`, async () => {
  const d = deps();
  const res = await submitPrayerRequest({ ...prayerInput(), ...patch }, d);
  assert.equal(res.status, 400); assert.equal(res.body.field, field); assert.equal(d.calls.length, 0);
});
test("prayer accepts 2000 code points and contact with wantsContact", () => {
  const parsed = parsePrayerRequest({ ...prayerInput(), request: "😀".repeat(2000), contact: "a@b.co", wantsContact: true });
  assert.equal(parsed.wantsContact, true);
  assert.throws(() => parsePrayerRequest({ ...prayerInput(), wantsContact: "yes" }), { status: 400 });
  assert.throws(() => parsePrayerRequest({ ...prayerInput(), extra: 1 }), { status: 400 });
});
test("prayer honeypot stores nothing", async () => {
  const d = deps();
  assert.equal((await submitPrayerRequest({ ...prayerInput(), website: "spam" }, d)).status, 200);
  assert.equal(d.calls.length, 0);
});

test("makassarToday uses WITA, not UTC", () => assert.equal(makassarToday(NOW), "2026-11-07"));
test("visit stores date and party size with visit rate keys", async () => {
  const d = deps();
  const res = await submitVisit({ ...visitInput(), visitDate: "2026-11-07", partySize: 4, message: "Bersama keluarga" }, d);
  assert.equal(res.status, 201);
  assert.deepEqual(d.calls, ["rate:visit_attempt:20", "rate:visit:5", ["insert", { name: "Tamu", contact: "tamu@example.invalid", visit_date: "2026-11-07", party_size: 4, message: "Bersama keluarga", consent_version: VISIT_CONSENT_VERSION }]]);
});
test("visit without optional fields stores nulls", () => {
  const parsed = parseVisit(visitInput(), NOW);
  assert.equal(parsed.visitDate, null); assert.equal(parsed.partySize, null);
});
for (const [label, patch, field] of [
  ["missing name", { name: "" }, "name"],
  ["missing contact", { contact: "" }, "contact"],
  ["past date", { visitDate: "2026-11-06" }, "visitDate"],
  ["impossible date", { visitDate: "2026-02-30" }, "visitDate"],
  ["wrong date format", { visitDate: "07/11/2026" }, "visitDate"],
  ["party size 0", { partySize: 0 }, "partySize"],
  ["party size 21", { partySize: 21 }, "partySize"],
  ["fractional party size", { partySize: 2.5 }, "partySize"],
  ["party size as text", { partySize: "3" }, "partySize"],
  ["message over 1000", { message: "a".repeat(1001) }, "message"],
  ["consent missing", { consent: false }, "consent"],
]) test(`visit rejects ${label}`, async () => {
  const d = deps();
  const res = await submitVisit({ ...visitInput(), ...patch }, d);
  assert.equal(res.status, 400); assert.equal(res.body.field, field); assert.equal(d.calls.length, 0);
});
