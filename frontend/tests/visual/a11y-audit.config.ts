import { defineConfig, devices } from "@playwright/test";

// Audits a running deployment (production by default) instead of a local build, so real content is checked.
// AUDIT_START_SERVER=1 (CI) starts the already-built app against local Supabase instead.
const startServer = Boolean(process.env.AUDIT_START_SERVER);
const localURL = "http://127.0.0.1:3412";

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
        baseURL: process.env.AUDIT_BASE_URL ?? (startServer ? localURL : "https://rinegetan-connect.vercel.app"),
        trace: "off",
        screenshot: "only-on-failure",
    },
    webServer: startServer
        ? {
              command: "node tests/helpers/local-course-server.mjs",
              cwd: "../..",
              url: `${localURL}/staff/login`,
              reuseExistingServer: false,
              timeout: 90_000,
          }
        : undefined,
});
