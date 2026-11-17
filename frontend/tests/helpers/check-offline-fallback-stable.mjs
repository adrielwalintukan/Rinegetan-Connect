// Live check: with the network cut, does an uncached page show the offline page and keep showing it
// after hydration? Before the fix it turned into "Halaman belum dapat ditampilkan".
import { chromium } from "@playwright/test";

const origin = process.argv[2] || "https://www.gmahkrinegetan.web.id";
const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

const swReady = async () => {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 30_000,
  });
};

await page.goto(`${origin}/kontak`, { waitUntil: "load", timeout: 60_000 });
await swReady();
await page.reload({ waitUntil: "load", timeout: 60_000 });
await swReady();

// Drop only /kontak so the worker must use the offline fallback.
await page.evaluate(async () => {
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    await cache.delete("/kontak");
  }
});

await context.setOffline(true);
await page.goto(`${origin}/kontak`, { waitUntil: "load", timeout: 60_000 });

const immediate = await page.getByRole("heading", { name: "Anda sedang offline" }).isVisible();
console.log("offline heading immediately (expect true):", immediate);

// Hydration is where the missing chunks used to throw.
await page.waitForTimeout(6000);
const later = await page.getByRole("heading", { name: "Anda sedang offline" }).isVisible();
const errorPage = await page.getByRole("heading", { name: "Halaman belum dapat ditampilkan" }).count();
console.log("offline heading after 6s (expect true):", later);
console.log("error boundary heading count (expect 0):", errorPage);

await context.setOffline(false);
await browser.close();
