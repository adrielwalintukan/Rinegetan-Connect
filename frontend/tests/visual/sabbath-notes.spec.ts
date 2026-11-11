import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const KEY = "rinegetan:sabbath-notes:v1";
const day05 = "/sekolah-sabat/2026-04/07/05";
const day06 = "/sekolah-sabat/2026-04/07/06";

const toggle = (page: Page) => page.getByRole("button", { name: /Catatan saya/ });
const box = (page: Page) => page.getByLabel(/Catatan untuk/);
const stored = (page: Page) => page.evaluate(k => localStorage.getItem(k), KEY);

// Hydration replaces the server markup, so wait for the client to own the panel before interacting.
async function open(page: Page, url = day05) {
  await page.goto(url, { waitUntil: "load" });
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await toggle(page).click();
  await expect(box(page)).toBeEnabled();
}

test("panel opens on the hydrated page and persists a note across reloads", async ({ page }) => {
  await open(page);

  // Collapsed on arrival: the textarea is not even mounted until the panel is opened.
  await expect(page.locator("#sabbath-note-panel")).toHaveCount(1);
  await expect(box(page)).toHaveValue("");
  await expect(toggle(page)).toContainText("Belum ada catatan");

  await box(page).fill("Renungan: kesiapan menuntut latihan.");
  await expect(toggle(page)).toContainText("Ada catatan");
  await expect
    .poll(async () => (await stored(page)) ?? "", { timeout: 5000 })
    .toContain("kesiapan menuntut latihan");

  // Reload proves it came from storage, not from React state.
  await page.reload({ waitUntil: "load" });
  await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  await expect(toggle(page)).toContainText("Ada catatan");
  await toggle(page).click();
  await expect(box(page)).toHaveValue("Renungan: kesiapan menuntut latihan.");

  // Each day owns its own note.
  await page.goto(day06, { waitUntil: "load" });
  await expect(toggle(page)).toContainText("Belum ada catatan");
  await toggle(page).click();
  await expect(box(page)).toHaveValue("");
});

test("a note survives a real full-document navigation that outruns the debounce", async ({ page }) => {
  await open(page);
  await box(page).focus();

  // Type and leave in the same task, so the 600 ms debounce cannot possibly have run. This is the
  // exact shape of a user typing and immediately clicking the plain <a> "Hari berikutnya".
  const left = await page.evaluate(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>("#sabbath-note")!;
    const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    setValue.call(textarea, "Diketik lalu langsung pindah hari.");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    (window as unknown as { noteMarker?: boolean }).noteMarker = true;
    document.querySelector<HTMLAnchorElement>('a[href$="/06"]')!.click();
    return true;
  });
  expect(left).toBe(true);

  await page.waitForURL(`**${day06}`);
  // The marker is gone, so the document really was torn down and rebuilt — not an SPA transition.
  expect(await page.evaluate(() => (window as unknown as { noteMarker?: boolean }).noteMarker)).toBeUndefined();

  await expect.poll(async () => (await stored(page)) ?? "", { timeout: 5000 }).toContain("langsung pindah hari");
  await page.goto(day05, { waitUntil: "load" });
  await toggle(page).click();
  await expect(box(page)).toHaveValue("Diketik lalu langsung pindah hari.");
});

test("deleting clears the stored entry rather than saving an empty string", async ({ page }) => {
  await open(page);
  await box(page).fill("Catatan sementara.");
  await expect.poll(async () => (await stored(page)) ?? "", { timeout: 5000 }).toContain("Catatan sementara.");

  await page.getByRole("button", { name: "Hapus catatan", exact: true }).click();
  await expect(box(page)).toHaveValue("");
  await expect(toggle(page)).toContainText("Belum ada catatan");
  await expect.poll(async () => {
    const raw = await stored(page);
    return raw === null ? "gone" : raw;
  }, { timeout: 5000 }).not.toContain("Catatan sementara.");

  await page.reload({ waitUntil: "load" });
  await expect(toggle(page)).toContainText("Belum ada catatan");
});

test("a browser that refuses storage says so instead of failing silently", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("synthetic storage unavailable"); } });
  });
  await page.goto(day05, { waitUntil: "load" });
  await toggle(page).click();
  await expect(box(page)).toBeEnabled();
  await box(page).fill("Tidak akan tersimpan.");

  await expect(page.getByRole("status")).toContainText("Penyimpanan browser tidak tersedia");
  // The text stays usable in-session even though it cannot be persisted.
  await expect(box(page)).toHaveValue("Tidak akan tersimpan.");
});

test("the open panel is accessible and does not overflow a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await open(page);
  await box(page).fill("Catatan untuk audit.");
  await page.keyboard.press("Tab");

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);

  await page.addScriptTag({ content: axeSource });
  const audit = await page.evaluate(async () => {
    // @ts-expect-error axe is injected into this document.
    return window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
  });
  expect(audit.violations).toEqual([]);
});
