// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * By default the tests run against the local files, served by a small static server.
 * To test the published site instead:  BASE_URL=https://vijayarag123.github.io/safar-seats/ npx playwright test
 * Specs open pages with page.goto('./') so both cases work.
 */
const LIVE_URL = process.env.BASE_URL;
const PORT = 4173;
const baseURL = LIVE_URL || `http://127.0.0.1:${PORT}/`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    // Fixed timezone so dates, times and the sample data behave the same on every machine.
    timezoneId: 'Asia/Kolkata',
    trace: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Serve the repo folder for the tests (skipped when BASE_URL points at the live site).
  webServer: LIVE_URL
    ? undefined
    : {
        command: `npx http-server . -p ${PORT} -a 127.0.0.1 -c-1 -s`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
      },
});
