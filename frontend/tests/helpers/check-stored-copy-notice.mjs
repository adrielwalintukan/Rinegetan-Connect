// Live check for P5-002 on the production site: does a stored copy announce its age, and do the
// buttons do what they claim? Run against the real origin, not a local build.
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

const backdate = async (hours) => {
  await page.evaluate(async (h) => {
    const stamp = new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname !== "/") continue;
        const response = await cache.match(request);
        if (!response) continue;
        const headers = new Headers(response.headers);
        headers.set("X-Rinegetan-Cached-At", stamp);
        await cache.put(request, new Response(await response.blob(), { status: 200, headers }));
      }
    }
  }, hours);
};

// 1. Fresh visit: no notice.
await page.goto(`${origin}/`, { waitUntil: "load", timeout: 60_000 });
await swReady();
await page.reload({ waitUntil: "load", timeout: 60_000 });
await swReady();
const freshCount = await page.getByTestId("stored-copy-notice").count();
console.log("fresh visit notice count (expect 0):", freshCount);

// 2. Three-hour-old copy, offline: saved wording + Perbarui, no Pulihkan.
await backdate(3);
await context.setOffline(true);
await page.reload({ waitUntil: "load", timeout: 60_000 });
await context.setOffline(false);
const notice = page.getByTestId("stored-copy-notice");
await notice.waitFor({ state: "visible", timeout: 30_000 });
const savedText = (await notice.innerText()).replace(/\s+/g, " ").trim();
const savedPerbarui = await notice.getByRole("button", { name: "Perbarui" }).count();
const savedPulihkan = await notice.getByRole("button", { name: "Pulihkan" }).count();
console.log("saved notice:", JSON.stringify(savedText));
console.log("saved Perbarui count (expect 1):", savedPerbarui);
console.log("saved Pulihkan count (expect 0):", savedPulihkan);

// 3. Thirty-hour-old copy: stale wording + both buttons.
await backdate(30);
await context.setOffline(true);
await page.reload({ waitUntil: "load", timeout: 60_000 });
await context.setOffline(false);
await notice.waitFor({ state: "visible", timeout: 30_000 });
const staleText = (await notice.innerText()).replace(/\s+/g, " ").trim();
const stalePulihkan = await notice.getByRole("button", { name: "Pulihkan" }).count();
console.log("stale notice:", JSON.stringify(staleText));
console.log("stale Pulihkan count (expect 1):", stalePulihkan);

// 4. Pulihkan recovers: notice gone and the page still renders.
await notice.getByRole("button", { name: "Pulihkan" }).click();
await page.waitForTimeout(4000);
const afterReset = await page.getByTestId("stored-copy-notice").count();
const mainVisible = await page.locator("main").first().isVisible();
console.log("after Pulihkan notice count (expect 0):", afterReset);
console.log("after Pulihkan main visible (expect true):", mainVisible);

// 5. Perbarui on a saved copy reloads and clears the notice.
await backdate(3);
await context.setOffline(true);
await page.reload({ waitUntil: "load", timeout: 60_000 });
await context.setOffline(false);
await notice.waitFor({ state: "visible", timeout: 30_000 });
await notice.getByRole("button", { name: "Perbarui" }).click();
await page.waitForTimeout(5000);
console.log("after Perbarui notice count (expect 0):", await page.getByTestId("stored-copy-notice").count());

await browser.close();
