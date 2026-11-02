// frontend/tests/p3-005-public-form.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { PublicFormError, formFields, formText, isContact, submitPublicForm } from "../src/lib/forms/public-form.mjs";
import { StudyInterestError } from "../src/lib/forms/study-interest.mjs";

const form = { key: "sample", success: "OK", parse: (input) => { const data = formFields(input, ["text", "website", "turnstileToken"]); return data ? { honeypot: false, text: formText(data.text, "text", "Teks", 5, true), turnstileToken: String(data.turnstileToken || "") } : { honeypot: true }; }, toRow: (p) => ({ text: p.text }) };
const deps = (over = {}) => { const calls = []; return { calls, ipHash: "a".repeat(32), turnstileSecret: "s",
  verifyTurnstile: async () => { calls.push("turnstile"); return true; },
  checkRate: async (key, hash, limit) => { calls.push(`rate:${key}:${limit}`); return true; },
  insertRow: async (row) => { calls.push(["insert", row]); }, ...over }; };

test("submitPublicForm keeps the P3-004 order with the form key", async () => {
  const d = deps();
  const res = await submitPublicForm({ text: "abc", turnstileToken: "t" }, form, d);
  assert.equal(res.status, 201);
  assert.deepEqual(res.body, { success: true, message: "OK" });
  assert.deepEqual(d.calls, ["rate:sample_attempt:20", "turnstile", "rate:sample:5", ["insert", { text: "abc" }]]);
});
test("honeypot short-circuits before any dependency", async () => {
  const d = deps();
  assert.equal((await submitPublicForm({ text: "", website: "x" }, form, d)).status, 200);
  assert.equal(d.calls.length, 0);
});
test("validation error returns field without side effects", async () => {
  const d = deps();
  const res = await submitPublicForm({ text: "abcdef", turnstileToken: "t" }, form, d);
  assert.equal(res.status, 400); assert.equal(res.body.field, "text"); assert.equal(d.calls.length, 0);
});
test("formFields rejects non-objects and unknown keys", () => {
  for (const bad of [null, [], "x", { other: 1 }]) assert.throws(() => formFields(bad, ["text"]), PublicFormError);
});
test("isContact accepts email and 8-15 digit phones only", () => {
  assert.ok(isContact("a@b.co")); assert.ok(isContact("+62 812-3456-7890"));
  for (const bad of ["besok", "123 4567", "1".repeat(16)]) assert.ok(!isContact(bad), bad);
});
test("StudyInterestError stays an alias for the shared error", () => assert.equal(StudyInterestError, PublicFormError));
