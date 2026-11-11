import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const fixtures = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", "import {renderReaderFixtures} from './tests/helpers/sabbath-reader-fixture.mjs';console.log(JSON.stringify(renderReaderFixtures()));"], { encoding: "utf8" }));

for (const width of [320, 375, 768, 1440]) test(`anonymous reader navigation, safe HTML and accessibility at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/sekolah-sabat", { waitUntil: "domcontentloaded" });
  const css = await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.map(link => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}">`).join(""));
  expect(css).not.toBe("");
  const remote: string[] = [];
  page.on("request", request => { if (/evil.invalid|sabbath-school.adventech.io/.test(request.url())) remote.push(request.url()); });
  await page.route("**/*", async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().isNavigationRequest() && fixtures[path]) {
      await route.fulfill({ contentType: "text/html", body: `<!doctype html><html lang="id"><head><title>Reader fixture</title>${css}</head><body>${fixtures[path]}</body></html>` });
    } else await route.continue();
  });
  await page.goto("/sekolah-sabat/2026-04", { waitUntil: "load" });
  await expect(page.getByText("Pelajaran 1", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Pelajaran sintetis", exact: true }).click();
  await expect(page.getByText(/Sabtu, 7 November 2026/)).toBeVisible();
  await page.getByRole("link", { name: "Hari pertama", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari pertama", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  await expect(page.locator("article script, article img, article iframe, article svg")).toHaveCount(0);
  await expect(page.locator("article table")).toHaveCount(1);
  expect(await page.evaluate(() => (window as unknown as { readerXss?: boolean }).readerXss)).toBeUndefined();
  // Fixtures are static HTML without the client bundle, so assert the server contract that makes
  // the popup reachable; the click/keyboard behaviour is covered by the live check in the record.
  const verse = page.getByRole("button", { name: "Mat. 7: 5", exact: true });
  await expect(verse).toHaveAttribute("data-verse", "Matt75");
  await expect(page.getByRole("button", { name: "Mrk 1: 1", exact: true })).toHaveCount(0);
  await expect(page.getByText("Mrk 1: 1", { exact: false })).toBeVisible();
  const dialog = page.locator("dialog");
  await expect(dialog).toHaveCount(1);
  await expect(dialog).not.toHaveAttribute("open", /.*/);
  // Lenis hijacks page wheel events; without this the popup never scrolls and the page behind moves.
  await expect(dialog).toHaveAttribute("data-lenis-prevent", "true");
  // The note panel is client-only, so the static fixture only carries its collapsed shell.
  // Live panel behaviour is covered by tests/visual/sabbath-notes.spec.ts against a hydrated page.
  await expect(page.getByRole("button", { name: /Catatan saya/ })).toHaveAttribute("aria-expanded", "false");
  expect(remote).toEqual([]);
  await page.addScriptTag({ content: axeSource });
  const audit = await page.evaluate(async () => {
    // @ts-expect-error axe is injected into this test document.
    return window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
  });
  expect(audit.violations).toEqual([]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Kembali ke daftar hari", exact: true })).toBeFocused();
  await page.getByRole("link", { name: "Hari berikutnya", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hari kedua", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Hari berikutnya", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Hari sebelumnya", exact: true }).click();
  await page.getByRole("link", { name: "Kembali ke daftar hari", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pelajaran sintetis", exact: true })).toBeVisible();
  await page.goto("/reader-unavailable", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: "Materi belum tersedia" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka materi di Adventech" })).toHaveAttribute("href", "https://sabbath-school.adventech.io/in");
});
