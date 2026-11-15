// P5-001 acceptance 3, checked against a real origin: when a new worker replaces the active one,
// the visitor must be told and must be able to apply the update with exactly one reload.
//
// A release changes the worker URL because the build id travels in the query string, so registering
// the same scope under a different `?v=` reproduces what a deploy does to an already-open page.
// Usage: node tests/helpers/check-update-banner.mjs [origin]
import { chromium } from "@playwright/test";

const origin = process.argv[2] || "https://www.gmahkrinegetan.web.id";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// Count real document loads. `framenavigated` also fires for a same-document Next.js router update,
// which would report two hits for a single reload.
let loads = 0;
page.on("load", () => {
  loads += 1;
});

const controlled = () =>
  page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, { timeout: 30_000 });

await page.goto(`${origin}/`, { waitUntil: "load" });
await controlled();
// Reload so the page was served by the worker: a returning visitor, not a first visit.
await page.reload({ waitUntil: "load" });
await controlled();

const staged = await page.evaluate(async () => {
  const registration = await navigator.serviceWorker.getRegistration();
  const active = registration.active.scriptURL;
  const nextUrl = new URL(active);
  nextUrl.searchParams.set("v", "nextbuild0001");
  await navigator.serviceWorker.register(`${nextUrl.pathname}${nextUrl.search}`, {
    scope: "/",
    updateViaCache: "none",
  });
  return { from: active, to: `${nextUrl.pathname}${nextUrl.search}` };
});
console.log("staged replacement:", JSON.stringify(staged));

const banner = page.getByTestId("sw-update-banner");
let bannerShown = false;
try {
  await banner.waitFor({ state: "visible", timeout: 45_000 });
  bannerShown = true;
} catch {
  bannerShown = false;
}
console.log("banner visible:", bannerShown);
console.log("banner text:", bannerShown ? JSON.stringify(await banner.innerText()) : "n/a");

const loadsBeforeClick = loads;
let reloads = 0;
if (bannerShown) {
  await banner.getByRole("button", { name: "Muat ulang" }).click();
  // Wait for the reload to land, then give a stray second one time to happen.
  try {
    await page.waitForFunction(() => document.readyState === "complete", undefined, { timeout: 30_000 });
  } catch {
    // the load count below is the real assertion
  }
  await page.waitForTimeout(5_000);
  reloads = loads - loadsBeforeClick;
}

const controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
console.log("document loads after click:", reloads);
console.log("controller after apply:", controller);

const pass = bannerShown && reloads === 1 && Boolean(controller?.includes("nextbuild0001"));
console.log(pass ? "UPDATE BANNER: pass" : "UPDATE BANNER: fail");

await browser.close();
process.exit(pass ? 0 : 1);
