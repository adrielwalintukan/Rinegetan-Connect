// frontend/tests/p3-005-prayer-visit-ui.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

for (const [file, endpoint, prefix] of [["PrayerRequestForm.tsx", "/api/doa", "prayer-"], ["VisitForm.tsx", "/api/kunjungan", "visit-"]]) {
  test(`${file} shows purpose, retention and an unchecked consent box`, () => {
    const form = read(`components/forms/${file}`);
    for (const text of ["Admin gereja", "paling lama 24 bulan", "tidak dibagikan", "Saya setuju data ini disimpan", endpoint, "Formulir belum tersedia"]) assert.ok(form.includes(text), text);
    assert.ok(!/defaultChecked|checked=\{true\}/.test(form), "consent must not be pre-checked");
    assert.ok(!form.includes("dangerouslySetInnerHTML"));
    assert.match(form, /aria-hidden="true"/);
    assert.match(form, /name="website"[^>]*tabIndex=\{-1\}|tabIndex=\{-1\}[^>]*name="website"/s);
    for (const pattern of [/role="alert"/, /role="status"/, /aria-invalid/, /aria-describedby/, /min-h-11/, /clientErrorMessage/, /useTurnstile/]) assert.match(form, pattern);
    assert.ok(form.includes(`\`${prefix}\${field}-error\``), "error ids are unique per form");
  });
}
test("prayer form keeps name and contact optional and gates wantsContact on contact", () => {
  const form = read("components/forms/PrayerRequestForm.tsx");
  assert.ok(form.includes("Nama (opsional)")); assert.ok(form.includes("(opsional)"));
  assert.match(form, /disabled=\{!values\.contact\.trim\(\)\}/);
});
test("turnstile hook renders explicitly and resets", () => {
  const hook = read("components/forms/useTurnstile.ts");
  assert.ok(hook.includes("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"));
  assert.match(hook, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(hook, /\.reset\(/);
});
test("contact page hosts both forms at stable anchors", () => {
  const page = read("components/pages/KontakPage.jsx");
  assert.match(page, /id="permohonan-doa"/);
  assert.match(page, /id="berkunjung"/);
  assert.match(page, /<PrayerRequestForm/);
  assert.match(page, /<VisitForm/);
  assert.ok(!page.includes("Formulir pesan daring sedang disiapkan"));
});
test("ministry cards link to the live forms", () => {
  const content = read("data/content.js");
  assert.ok(content.includes('href: "/kontak#permohonan-doa"'));
  assert.ok(content.includes('href: "/kontak#berkunjung"'));
  assert.ok(!read("components/sections/DigitalMinistrySection.jsx").includes("sedang disiapkan"));
});
