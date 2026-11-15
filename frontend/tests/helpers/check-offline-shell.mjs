// Live proof for P5-001 acceptance: the offline shell works on the deployed site and the cache
// contains only public shell entries. Run against the real origin, not a local server.
// Usage: node tests/helpers/check-offline-shell.mjs [origin]
import { chromium } from "@playwright/test";

const origin = process.argv[2] || "https://www.gmahkrinegetan.web.id";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const controlled = () =>
  page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, { timeout: 30_000 });

await page.goto(`${origin}/`, { waitUntil: "load" });
await controlled();
// Second load is served with the worker already in control, which is the returning-visitor state.
await page.reload({ waitUntil: "load" });
await controlled();

const cache = await page.evaluate(async () => {
  const names = await caches.keys();
  const entries = [];
  for (const name of names) {
    const store = await caches.open(name);
    for (const request of await store.keys()) entries.push(new URL(request.url).pathname);
  }
  return { names, entries: entries.sort() };
});

console.log("cache names:", JSON.stringify(cache.names));
console.log("cached entries:", JSON.stringify(cache.entries));

const forbidden = ["/staff", "/api", "/auth", "/sekolah-sabat", "/pelajari-alkitab"];
const leaked = cache.entries.filter((path) =>
  forbidden.some((prefix) => path === prefix || path.startsWith(`${prefix}/`)),
);
console.log("forbidden entries in cache:", JSON.stringify(leaked));

// Offline: a precached public page must still render.
await context.setOffline(true);
let offlineOk = false;
try {
  await page.goto(`${origin}/kontak`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  offlineOk = await page.locator("main").isVisible();
  console.log("offline /kontak served:", offlineOk);
  console.log("offline /kontak showed fallback:", await page.getByText("Anda sedang offline").count());
} catch (error) {
  console.log("offline /kontak FAILED:", error.message);
} finally {
  await context.setOffline(false);
}

// A staff page must never come back from the cache while offline.
await context.setOffline(true);
let staffFromCache = false;
try {
  const response = await page.goto(`${origin}/staff`, { waitUntil: "domcontentloaded", timeout: 20_000 });
  staffFromCache = Boolean(response && response.fromServiceWorker() && response.status() < 400);
} catch {
  // A network error is the correct outcome: nothing was cached for /staff.
  staffFromCache = false;
} finally {
  await context.setOffline(false);
}
console.log("staff page served from cache offline:", staffFromCache);

const pass = leaked.length === 0 && offlineOk && !staffFromCache && cache.names.length === 1;
console.log(pass ? "OFFLINE SHELL: pass" : "OFFLINE SHELL: fail");

await browser.close();
process.exit(pass ? 0 : 1);
