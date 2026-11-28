// frontend/tests/p5-003-notification-wiring.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const frontendRoot = resolve(import.meta.dirname, "..");
const read = (rel) => readFileSync(resolve(frontendRoot, rel), "utf8");

test("the preference centre is reachable as a public page", () => {
  const page = "src/app/(public)/notifikasi/page.tsx";
  assert.ok(existsSync(resolve(frontendRoot, page)), `${page} must exist`);
  const source = read(page);
  assert.match(source, /export default/);
  assert.match(source, /canonical:\s*"\/notifikasi"/, "the page needs its own canonical");
  assert.match(source, /<NotificationCentre/, "the page must render the centre");
});

test("the footer links to the preference centre so jemaat can find it", () => {
  const footer = read("src/components/layout/GlobalFooter.jsx");
  assert.match(footer, /href="\/notifikasi"/, "the footer must link to /notifikasi");
  assert.match(footer, /data-testid="footer-link-notifikasi"/);
});

test("the preference centre stays out of the sitemap because it is a utility page", () => {
  const sitemap = read("src/app/sitemap.ts");
  // A noindex page in the sitemap would be a contradiction Search Console reports as an error.
  assert.doesNotMatch(sitemap, /"\/notifikasi"/, "the noindex preference centre must not be listed");
  const page = read("src/app/(public)/notifikasi/page.tsx");
  assert.match(page, /index:\s*false/, "the utility page must be noindex");
});

test("the public route contract script accepts the new page", () => {
  const script = read("scripts/assert-public-route-contract.mjs");
  assert.match(script, /"\/notifikasi"/);
});

test("the public VAPID key is documented, and the private key never is", () => {
  const example = read(".env.example");
  assert.match(example, /^NEXT_PUBLIC_VAPID_PUBLIC_KEY=$/m, "the public VAPID key must be listed");
  // Examples are committed, so a private key there would be a leaked secret.
  assert.doesNotMatch(example, /VAPID_PRIVATE_KEY\s*=\s*\S/, "the private key must not be in the example");
});
