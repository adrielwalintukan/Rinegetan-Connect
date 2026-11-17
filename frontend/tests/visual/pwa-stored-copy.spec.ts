import { expect, test } from "@playwright/test";

// P5-002. These tests exercise the stored-copy notice in a real browser against a real worker.
// Asserting on the wording in a unit test proves the strings; only this proves the notice appears
// when the page really came out of the cache and stays away when it did not.

const swReady = async (page: import("@playwright/test").Page) => {
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, undefined, {
    timeout: 20_000,
  });
};

// Rewrites the stored stamp for the current page, so an old copy can be staged without waiting a
// day. The worker is the only writer, so this goes through the cache it owns.
const backdateStoredCopy = async (page: import("@playwright/test").Page, hoursAgo: number) => {
  await page.evaluate(async (hours) => {
    const names = await caches.keys();
    const stamp = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (new URL(request.url).pathname !== "/") continue;
        const response = await cache.match(request);
        if (!response) continue;
        const headers = new Headers(response.headers);
        headers.set("X-Rinegetan-Cached-At", stamp);
        await cache.put(
          request,
          new Response(await response.blob(), { status: response.status, headers }),
        );
      }
    }
  }, hoursAgo);
};

test("a fresh page shows no stored-copy notice", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  // Reload so the page was served by the worker, which stamps the stored copy as it fetches.
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  // A notice on every visit would train people to ignore it. The copy was fetched seconds ago.
  await expect(page.getByTestId("stored-copy-notice")).toHaveCount(0);
});

test("a copy from a few hours ago is announced as saved, with its age", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  await backdateStoredCopy(page, 3);

  // Cut the network so the next load can only come from the cache.
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await context.setOffline(false);

  const notice = page.getByTestId("stored-copy-notice");
  await expect(notice).toBeVisible({ timeout: 15_000 });
  await expect(notice).toContainText("Salinan tersimpan");
  await expect(notice).toContainText("jam lalu");
  await expect(notice.getByRole("button", { name: "Perbarui" })).toBeVisible();
  // Recovery is only offered once the copy is actually old; before that it would be a scary button
  // with no reason to exist.
  await expect(notice.getByRole("button", { name: "Pulihkan" })).toHaveCount(0);
});

test("the offline fallback stays readable instead of becoming an error", async ({ page, context }) => {
  // Regression guard for a real defect: the offline page was cached without the chunks it imports,
  // so hydrating it offline threw ChunkLoadError and the app's error boundary replaced it with
  // "Halaman belum dapat ditampilkan". Waiting past hydration is the point: the fallback is served
  // immediately either way, and only the aftermath tells you which page the visitor really got.
  await page.goto("/kontak", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  await page.evaluate(async () => {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      await cache.delete("/kontak");
    }
  });

  await context.setOffline(true);
  try {
    await page.goto("/kontak", { waitUntil: "load" });
    await expect(page.getByRole("heading", { name: "Anda sedang offline" })).toBeVisible();

    // Give the page long enough to hydrate and fail if its scripts are missing.
    await page.waitForTimeout(3_000);
    await expect(page.getByRole("heading", { name: "Anda sedang offline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Halaman belum dapat ditampilkan" })).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});

test("a copy older than a day is announced as old and offers recovery", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  await backdateStoredCopy(page, 30);

  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await context.setOffline(false);

  const notice = page.getByTestId("stored-copy-notice");
  await expect(notice).toBeVisible({ timeout: 15_000 });
  await expect(notice).toContainText("Salinan lama");
  await expect(notice.getByRole("button", { name: "Pulihkan" })).toBeVisible();
});

test("Pulihkan clears the stored copy so the page comes back fresh", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  await backdateStoredCopy(page, 30);
  await context.setOffline(true);
  await page.reload({ waitUntil: "load" });
  await context.setOffline(false);

  const notice = page.getByTestId("stored-copy-notice");
  await expect(notice).toBeVisible({ timeout: 15_000 });

  await notice.getByRole("button", { name: "Pulihkan" }).click();

  // The reset empties every cache and the reload then rebuilds a fresh one, so counting caches
  // afterwards proves nothing: it goes back to one either way. What changes for the visitor is
  // that the page is no longer an old stored copy, so the notice must be gone.
  await expect(notice).toHaveCount(0, { timeout: 20_000 });
  await expect(page.locator("main")).toBeVisible();
});
