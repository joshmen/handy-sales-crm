import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:1083',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // ── Setup: authenticate once per platform, save state ──
    {
      name: 'setup-desktop',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'setup-mobile',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Pixel 5'] },
    },
    // ── Tests: reuse saved auth state (no repeated logins) ──
    {
      name: 'Desktop Chrome',
      dependencies: ['setup-desktop'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin-desktop.json',
      },
      testIgnore: /auth\.setup\.ts/,
    },
    {
      name: 'Mobile Chrome',
      dependencies: ['setup-mobile'],
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/admin-mobile.json',
      },
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:1083',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
