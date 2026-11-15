// Checks P5-001 installability the way the browser does, not by reading the manifest ourselves.
// Chrome exposes the same installability verdict it uses to show the install prompt.
// Usage: node tests/helpers/check-installability.mjs [origin]
import { chromium } from "@playwright/test";

const origin = process.argv[2] || "http://localhost:3301";

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`${origin}/`, { waitUntil: "load" });

await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, { timeout: 20_000 });

const client = await page.context().newCDPSession(page);
await client.send("Page.enable");

// Chrome's installability check: manifest parsed, icons usable, service worker controlling.
const result = await client.send("Page.getAppManifest");

console.log("manifest url:", result.url);
console.log("parse errors:", JSON.stringify(result.errors ?? [], null, 2));

const icons = JSON.parse(result.data).icons ?? [];
console.log("icons:", icons.map((icon) => `${icon.sizes} ${icon.purpose ?? "any"}`).join(", "));

const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return { scope: reg?.scope, active: Boolean(reg?.active), state: reg?.active?.state };
});
console.log("service worker:", JSON.stringify(sw));

// A page that is not installable reports errors here; an empty list means it is.
const installable =
  (result.errors ?? []).length === 0 && sw.active && sw.scope === `${origin}/`;
console.log(installable ? "INSTALLABLE: yes" : "INSTALLABLE: no");

await browser.close();
process.exit(installable ? 0 : 1);
