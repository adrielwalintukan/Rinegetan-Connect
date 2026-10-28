import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

test("form shows purpose, 24-month retention and an unchecked consent box", () => {
  const form = read("components/learning/StudyInterestForm.tsx");
  for (const text of ["Admin gereja", "24 bulan", "tidak dibagikan", "Saya setuju data ini disimpan", "/api/minat-belajar"]) assert.ok(form.includes(text), text);
  assert.ok(!/defaultChecked|checked=\{true\}/.test(form), "consent must not be pre-checked");
  assert.ok(!form.includes("dangerouslySetInnerHTML"));
});
test("honeypot is hidden from people and assistive tech", () => {
  const form = read("components/learning/StudyInterestForm.tsx");
  assert.match(form, /aria-hidden="true"/);
  assert.match(form, /name="website"[^>]*tabIndex=\{-1\}|tabIndex=\{-1\}[^>]*name="website"/s);
  assert.match(form, /autoComplete="off"/);
});
test("Turnstile is rendered explicitly and the form degrades without a site key", () => {
  const form = read("components/learning/StudyInterestForm.tsx");
  assert.ok(form.includes("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"));
  assert.match(form, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.ok(form.includes("Formulir belum tersedia"));
  assert.match(form, /turnstile\??\.reset/);
});
test("errors and success are announced and targets are 44px", () => {
  const form = read("components/learning/StudyInterestForm.tsx");
  for (const pattern of [/role="alert"/, /role="status"/, /aria-invalid/, /aria-describedby/, /min-h-11/, /clientErrorMessage/]) assert.match(form, pattern);
});
test("catalogue hosts the CTA section and lessons link to it", () => {
  const catalogue = read("app/(public)/pelajari-alkitab/page.tsx");
  assert.match(catalogue, /id="ingin-belajar"/);
  assert.match(catalogue, /<StudyInterestForm/);
  assert.ok(catalogue.includes("Ingin belajar bersama?"));
  assert.ok(read("app/(public)/pelajari-alkitab/[courseSlug]/[lessonSlug]/page.tsx").includes('href="/pelajari-alkitab#ingin-belajar"'));
});
