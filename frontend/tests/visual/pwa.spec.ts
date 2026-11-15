import { expect, test } from "@playwright/test";

// P5-001. These tests exercise the real worker through a real browser; asserting on the source
// only proves the policy exists, not that the browser obeys it.

const swReady = async (page: import("@playwright/test").Page) => {
  await page.waitForFunction(
    () => navigator.serviceWorker?.controller !== null,
    undefined,
    { timeout: 20_000 },
  );
};

test("the service worker installs and takes control of the public page", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await swReady(page);

  const registration = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { scope: reg?.scope ?? null, script: reg?.active?.scriptURL ?? null };
  });

  expect(registration.scope).toBe("http://127.0.0.1:3412/");
  // The build id travels in the query string, so every build gets its own cache namespace.
  expect(registration.script).toContain("/sw.js?v=");
});

test("the manifest is served and is installable-shaped", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.status()).toBe(200);

  const manifest = await response.json();
  expect(manifest.name).toBe("GMAHK Rinegetan");
  expect(manifest.start_url).toBe("/");
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );

  // Every icon the manifest promises must actually be served, or install fails at runtime.
  for (const icon of manifest.icons) {
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.status(), `${icon.src} must be reachable`).toBe(200);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }
});

test("the worker script is served with no-cache so a release is never pinned", async ({ request }) => {
  const response = await request.get("/sw.js");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-cache");
});

test("a public page is served from cache when the network fails", async ({ page, context }) => {
  await page.goto("/kontak", { waitUntil: "load" });
  await swReady(page);

  // Give the worker a chance to store the navigation response.
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  await context.setOffline(true);
  try {
    await page.goto("/kontak", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    // The cached copy is the real page, not the offline fallback.
    await expect(page.getByText("Anda sedang offline")).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }
});

test("a shell page with no cached copy falls back to the offline page", async ({ page, context }) => {
  await page.goto("/kontak", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  // Drop only /kontak, so the worker must reach for the offline page instead of a stale copy.
  const removed = await page.evaluate(async () => {
    const names = await caches.keys();
    let count = 0;
    for (const name of names) {
      const cache = await caches.open(name);
      if (await cache.delete("/kontak")) count += 1;
    }
    return count;
  });
  expect(removed).toBeGreaterThan(0);

  await context.setOffline(true);
  try {
    await page.goto("/kontak", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Anda sedang offline" })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test("visiting the staff area never puts a staff page in the cache", async ({ page }) => {
  // The worker must already be active from a public page; that is the only situation in which a
  // staff navigation could be intercepted at all.
  await page.goto("/kontak", { waitUntil: "load" });
  await swReady(page);

  // /staff redirects to the login screen when unauthenticated; both are outside the shell.
  await page.goto("/staff", { waitUntil: "domcontentloaded" });
  await page.goto("/staff/login", { waitUntil: "domcontentloaded" });

  const entries = await page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) paths.push(new URL(request.url).pathname);
    }
    return paths;
  });

  const staffEntries = entries.filter(
    (path) => path.startsWith("/staff") || path.startsWith("/auth") || path.startsWith("/api"),
  );
  expect(staffEntries).toEqual([]);
});

test("the cache holds only public shell entries", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  const keys = await page.evaluate(async () => {
    const names = await caches.keys();
    const entries: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) entries.push(new URL(request.url).pathname);
    }
    return { names, entries };
  });

  expect(keys.names.length).toBe(1);
  expect(keys.names[0]).toMatch(/^rinegetan-shell-/);

  const forbidden = keys.entries.filter((path) =>
    ["/staff", "/api", "/auth", "/sekolah-sabat", "/pelajari-alkitab"].some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    ),
  );
  expect(forbidden).toEqual([]);
});

test("activation deletes the cache left by an older build", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);

  // Leave behind a cache from a previous release, the way a real upgrade would find one.
  await page.evaluate(async () => {
    const stale = await caches.open("rinegetan-shell-000000000000");
    await stale.put("/stale", new Response("old shell"));
  });

  // Unregistering and reloading runs a fresh install + activate, which is the only moment the
  // cleanup code can run, so this exercises the real handler instead of deleting by hand.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.unregister();
  });
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  const names = await page.evaluate(async () => caches.keys());
  expect(names).not.toContain("rinegetan-shell-000000000000");
  expect(names.length).toBe(1);
  expect(names[0]).toMatch(/^rinegetan-shell-/);
});

test("RESET_CACHE clears every cache so a corrupt shell can be recovered", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);

  const before = await page.evaluate(async () => caches.keys());
  expect(before.length).toBeGreaterThan(0);

  await page.evaluate(() => {
    navigator.serviceWorker.controller?.postMessage({ type: "RESET_CACHE" });
  });

  // The handler runs in the worker, so the assertion waits for it rather than reading immediately.
  await expect
    .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 10_000 })
    .toBe(0);
});

test("the update banner stays hidden while the running shell is current", async ({ page }) => {
  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  // A banner on every visit would train visitors to ignore it, so it only appears on a real update.
  await expect(page.getByTestId("sw-update-banner")).toHaveCount(0);
});

test("a replaced worker shows the banner and the button applies it with one reload", async ({ page }) => {
  // Count real document loads, not `framenavigated`: Next.js fires that event again for a
  // same-document router update, so it reports two hits per single reload.
  let loads = 0;
  page.on("load", () => {
    loads += 1;
  });

  await page.goto("/", { waitUntil: "load" });
  await swReady(page);
  // Reload so the page was served by the worker: a returning visitor, not a first visit.
  await page.reload({ waitUntil: "load" });
  await swReady(page);

  // A release changes the worker URL because the build id travels in the query string. Registering
  // the same scope under a different id is exactly what a deploy does to an already-open page: the
  // browser installs the new worker and parks it in the waiting slot behind the running one.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const nextUrl = new URL(registration!.active!.scriptURL);
    nextUrl.searchParams.set("v", "nextbuild0001");
    await navigator.serviceWorker.register(`${nextUrl.pathname}${nextUrl.search}`, {
      scope: "/",
      updateViaCache: "none",
    });
  });

  const banner = page.getByTestId("sw-update-banner");
  // `updatefound` fires while the new worker is still installing. The banner must wait for the
  // worker to reach `installed`, so this assertion fails if nothing listens for `statechange`.
  await expect(banner).toBeVisible({ timeout: 30_000 });
  await expect(banner).toContainText("Versi baru situs ini sudah tersedia");

  // Applying the update is the visitor's decision, so nothing reloads before the click.
  const loadsBeforeClick = loads;

  await banner.getByRole("button", { name: "Muat ulang" }).click();

  // Exactly one reload. `SKIP_WAITING` must reach the *waiting* worker; sent to the active one it
  // would do nothing, no `controllerchange` would follow, and the button would appear dead.
  await expect.poll(() => loads, { timeout: 30_000 }).toBe(loadsBeforeClick + 1);
  await page.waitForTimeout(3_000);
  expect(loads).toBe(loadsBeforeClick + 1);

  // The new worker is the one serving the page after the reload.
  const controller = await page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? null);
  expect(controller).toContain("nextbuild0001");
});
