import { expect, test } from "@playwright/test";

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

for (const viewport of viewports) {
    for (const route of publicRoutes) {
        test(`${route} has no horizontal overflow at ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.emulateMedia({ reducedMotion: "reduce" });
            await page.goto(route, { waitUntil: "networkidle" });

            await expect(page.locator("main")).toBeVisible();

            expect(
                await page.evaluate(() => document.documentElement.scrollWidth)
            ).toBeLessThanOrEqual(viewport.width);
        });
    }
}

test("mobile navigation opens and closes with Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    const menuButton = page.getByTestId("mobile-menu-button");
    await menuButton.click();

    await expect(menuButton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("mobile-menu")).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(menuButton).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("mobile-menu")).toHaveCount(0);
});

test("skip link transfers focus to the primary content", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "networkidle" });

    const skipLink = page.getByTestId("skip-to-content");
    await skipLink.focus();
    await skipLink.press("Enter");

    await expect(page).toHaveURL(/#konten-utama$/);
    await expect(page.locator("#konten-utama")).toBeFocused();
});

test("home desktop visual baseline", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page).toHaveScreenshot("home-desktop.png", {
        animations: "disabled",
        caret: "hide",
        fullPage: false,
    });
});
