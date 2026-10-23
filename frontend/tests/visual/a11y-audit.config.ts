import { defineConfig, devices } from "@playwright/test";

// Audits a running deployment (production by default) instead of a local build, so real content is checked.
export default defineConfig({
    testDir: ".",
    testMatch: "a11y-audit.spec.ts",
    timeout: 60_000,
    workers: 2,
    retries: 0,
    outputDir: "../../test-results/a11y-audit",
    reporter: "list",
    use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.AUDIT_BASE_URL ?? "https://rinegetan-connect.vercel.app",
        trace: "off",
        screenshot: "only-on-failure",
    },
});
