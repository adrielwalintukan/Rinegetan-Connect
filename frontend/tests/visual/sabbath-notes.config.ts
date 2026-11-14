import { defineConfig, devices } from "@playwright/test";

// Hydrated reader flows. The other Sabbath suite renders static fixtures, which cannot exercise a
// client-only panel, so this one runs the real page against a stubbed Adventech upstream.
export default defineConfig({
    testDir: ".",
    testMatch: "sabbath-notes.spec.ts",
    timeout: 120_000,
    workers: 1,
    retries: 0,
    outputDir: "../../test-results/sabbath-notes",
    reporter: "list",
    use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://127.0.0.1:3412",
        actionTimeout: 15_000,
        trace: "off",
        screenshot: "only-on-failure",
    },
    webServer: {
        command: "node tests/helpers/adventech-stub-server.mjs",
        cwd: "../..",
        url: "http://127.0.0.1:3412/sekolah-sabat",
        reuseExistingServer: false,
        timeout: 240_000,
    },
});
