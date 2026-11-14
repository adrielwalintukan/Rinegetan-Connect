import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const routes = [
    "/",
    "/tentang-kami",
    "/kegiatan",
    "/pelayanan",
    "/media",
    "/sekolah-sabat",
    "/kontak",
    "/pelajari-alkitab",
    "/staff/login",
];

const viewports = [
    { name: "mobile-320", width: 320, height: 720 },
    { name: "desktop-1440", width: 1440, height: 960 },
];

const open = async (page: Page, route: string) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    // Scroll through once so every whileInView reveal finishes before colors are measured.
    await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
};

for (const viewport of viewports) {
    for (const route of routes) {
        test(`${route} meets WCAG 2.2 AA checks at ${viewport.name}`, async ({ page }) => {
            await page.setViewportSize(viewport);
            await open(page, route);
            await page.addScriptTag({ content: axeSource });

            const violations = await page.evaluate(async () => {
                // @ts-expect-error axe is injected above
                const result = await window.axe.run(document, {
                    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
                });
                return result.violations.map((v: { id: string; impact: string; nodes: { target: string[] }[] }) =>
                    `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`,
                );
            });
            expect(violations, violations.join("\n")).toEqual([]);

            const structure = await page.evaluate(() => ({
                main: document.querySelectorAll("main").length,
                h1: document.querySelectorAll("h1").length,
                imagesWithoutAlt: [...document.images].filter((img) => !img.hasAttribute("alt")).length,
                overflow: document.documentElement.scrollWidth - window.innerWidth,
            }));
            expect(structure).toEqual({ main: 1, h1: 1, imagesWithoutAlt: 0, overflow: 0 });
        });
    }
}

for (const route of routes) {
    test(`${route} shows a visible focus indicator on keyboard navigation`, async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 960 });
        await open(page, route);

        const invisible: string[] = [];
        for (let i = 0; i < 12; i++) {
            await page.keyboard.press("Tab");
            const result = await page.evaluate(() => {
                const el = document.activeElement as HTMLElement | null;
                // Focus inside a cross-origin map iframe is drawn by the embedded page, not by this site.
                if (!el || el === document.body || el.tagName === "IFRAME") return null;
                const style = getComputedStyle(el);
                const visible =
                    (style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== "none";
                return { visible, label: `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}"` };
            });
            if (result && !result.visible) invisible.push(result.label);
        }
        expect(invisible, `focus not visible on: ${invisible.join(", ")}`).toEqual([]);
    });
}

test("reduced motion shows content without fades, delays or parallax", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "load" });

    // Hero intro uses delays up to 1s and 1s fades; with reduced motion it must be final right after hydration.
    const hiddenOrMoving = () =>
        page.evaluate(() =>
            [...document.querySelectorAll<HTMLElement>("[style]")]
                .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
                .filter((el) => {
                    const style = getComputedStyle(el);
                    return Number(style.opacity) < 1 || (style.transform !== "none" && el.closest('[data-testid="hero"]'));
                })
                .map((el) => `${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 30)}"`),
        );
    await page.waitForTimeout(200);
    expect(await hiddenOrMoving()).toEqual([]);

    // A below-the-fold reveal appears fully as soon as it is scrolled into view.
    const reveal = page.locator('[data-testid="digital-ministry-section"] .min-w-0').first();
    await reveal.scrollIntoViewIfNeeded();
    await page.waitForTimeout(100);
    expect(await reveal.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");

    // Scroll-linked parallax stays still.
    expect(await page.getByTestId("hero-image-frame").locator("img").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
});

test("performance snapshot of public routes on mobile (recorded, no budget agreed yet)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const rows: Record<string, unknown>[] = [];
    for (const route of routes.filter((r) => r !== "/staff/login")) {
        await page.goto(route, { waitUntil: "load" });
        await page.waitForTimeout(1500);
        rows.push({
            route,
            ...(await page.evaluate(async () => {
                // LCP and layout-shift entries are only exposed through a buffered observer.
                const buffered = (type: string) =>
                    new Promise<PerformanceEntry[]>((resolve) => {
                        new PerformanceObserver((list, observer) => {
                            observer.disconnect();
                            resolve(list.getEntries());
                        }).observe({ type, buffered: true });
                        setTimeout(() => resolve([]), 500);
                    });
                const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
                const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
                const kb = (list: PerformanceResourceTiming[]) =>
                    Math.round(list.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024);
                const lcp = (await buffered("largest-contentful-paint")).at(-1);
                const cls = ((await buffered("layout-shift")) as (PerformanceEntry & { value: number; hadRecentInput: boolean })[])
                    .filter((e) => !e.hadRecentInput)
                    .reduce((sum, e) => sum + e.value, 0);
                return {
                    ttfbMs: Math.round(nav.responseStart - nav.requestStart),
                    lcpMs: lcp ? Math.round(lcp.startTime) : null,
                    cls: Number(cls.toFixed(3)),
                    jsKB: kb(resources.filter((r) => r.initiatorType === "script")),
                    imgKB: kb(resources.filter((r) => r.initiatorType === "img")),
                    totalKB: kb(resources) + Math.round((nav.transferSize || 0) / 1024),
                };
            })),
        });
    }
    console.log(JSON.stringify(rows));
});
