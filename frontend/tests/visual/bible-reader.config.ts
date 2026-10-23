import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'.', testMatch:'bible-reader.spec.ts', timeout:180_000, workers:1, retries:0,
  outputDir:'../../test-results/bible-reader', reporter:'list',
  use:{...devices['Desktop Chrome'],baseURL:'http://127.0.0.1:3412',actionTimeout:10_000,trace:'off',screenshot:'only-on-failure'},
  webServer:{command:'node tests/helpers/local-course-server.mjs',cwd:'../..',url:'http://127.0.0.1:3412/staff/login',reuseExistingServer:false,timeout:90_000}
});
