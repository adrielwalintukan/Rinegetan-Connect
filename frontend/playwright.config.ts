import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
    testDir: "./tests/visual",
    testMatch: "**/*.spec.ts",
    timeout: 30_000,
    expect: {
        timeout: 10_000,
    },
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
    use: {
        baseURL: "http://127.0.0.1:3412",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],
    webServer: {
        command: "npm run build && npm run start -- --port 3412",
        url: "http://127.0.0.1:3412",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
