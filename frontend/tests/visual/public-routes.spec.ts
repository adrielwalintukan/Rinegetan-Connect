import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

const sabbathFixtures = [false, true].map((available) => execFileSync(process.execPath,
    ["--input-type=module", "-e", `import { renderSabbathFixture } from './tests/helpers/sabbath-page-fixture.mjs'; console.log(renderSabbathFixture(${available}));`],
    { encoding: "utf8" }));

const publicRoutes = [
    "/",
    "/tentang-kami",
    "/kegiatan",
    "/pelayanan",
    "/media",
    "/sekolah-sabat",
    "/kontak",
];

const viewports = [
    { name: "mobile-320", width: 320, height: 720 },
    { name: "mobile-375", width: 375, height: 812 },
    { name: "mobile-390", width: 390, height: 844 },
    { name: "tablet-768", width: 768, height: 1024 },
    { name: "desktop-1440", width: 1440, height: 960 },
];

const openPublicRoute = async (page: Page, route: string) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
};

for (const viewport of viewports) {
    for (const route of publicRoutes) {
        test(`${route} has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.emulateMedia({ reducedMotion: "reduce" });
            await openPublicRoute(page, route);

            expect(
                await page.evaluate(() => document.documentElement.scrollWidth)
            ).toBeLessThanOrEqual(viewport.width);
        });
    }
}

test("mobile navigation opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPublicRoute(page, "/");

    const menuButton = page.getByTestId("mobile-menu-button");
    await menuButton.click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("mobile-menu")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
});

for (const width of [320, 375, 768, 1024, 1440]) {
    for (const available of [false, true]) test(`Sabbath catalog ${available ? "available long text" : "unavailable"} and local classes remain readable at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: "reduce" });
        const sourceRequests: string[] = [];
        page.on("request", (request) => {
            if (new URL(request.url()).hostname === "sabbath-school.adventech.io") sourceRequests.push(request.url());
        });
        await openPublicRoute(page, "/sekolah-sabat");
        // Real production CSS + actual server-rendered component; no production fixture route or upstream dependency.
        const css = await page.locator('link[rel="stylesheet"]').evaluateAll((links) => links.map((link) => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}">`).join(""));
        expect(css).not.toBe("");
        // A fresh intercepted document avoids inheriting the app document's nonce-based CSP.
        await page.route("**/sabbath-browser-fixture", (route) => route.fulfill({ contentType: "text/html",
            body: `<html lang="id"><head>${css}</head><body>${sabbathFixtures[Number(available)]}</body></html>` }));
        await page.goto("http://127.0.0.1:3412/sabbath-browser-fixture", { waitUntil: "load" });
        await page.evaluate(async () => {
            await Promise.all(Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map((link) => {
                if ((link as HTMLLinkElement).sheet) return Promise.resolve();
                return new Promise<void>((resolve, reject) => { link.addEventListener("load", () => resolve(), { once: true }); link.addEventListener("error", () => reject(new Error("Fixture stylesheet failed")), { once: true }); });
            }));
            await document.fonts.ready;
            document.querySelectorAll('[style*="opacity:0"]').forEach((el) => (el as HTMLElement).style.opacity = "1");
        });
        const materials = page.getByRole("region", { name: "Materi Sekolah Sabat" });
        if (available) {
            await expect(materials.getByRole("heading", { name: "Dewasa" })).toBeVisible();
            await expect(materials.getByRole("link", { name: "Buka materi di Adventech" })).toHaveAttribute("href", "https://sabbath-school.adventech.io/in/2026-04");
            await expect(materials.getByText("Atribusi sintetis", { exact: false })).toBeVisible();
        } else {
            await expect(materials.getByRole("heading", { name: "Materi belum tersedia" })).toBeVisible();
            await expect(materials.locator("a")).toHaveCount(0);
        }
        await expect(materials.locator("button, img, [role=tab]")).toHaveCount(0);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        for (let i = 0; i < 4; i++) {
            const card = page.getByTestId(`ss-class-${i}`);
            await expect(card).toBeVisible();
            await expect(card).toContainText("08.45 WITA");
        }
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
        expect(sourceRequests).toEqual([]);
    });
}

test("skip link transfers focus to the primary content", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openPublicRoute(page, "/");

    const skipLink = page.getByTestId("skip-to-content");
    await skipLink.focus();
    await skipLink.press("Enter");

    await expect(page).toHaveURL(/#konten-utama$/);
    await expect(page.locator("#konten-utama")).toBeFocused();
});

test("home desktop visual baseline", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openPublicRoute(page, "/");

    await expect(page).toHaveScreenshot("home-desktop.png", {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
    });
});
