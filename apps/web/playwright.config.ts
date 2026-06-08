import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 2,
  // Audit code-quality (2026-06-05): user pidio aumentar workers al doble
  // tras cerrar ventanas de navegador (CPU libre). 4 workers en local.
  workers: process.env.CI ? 1 : 4,
  // Audit (2026-06-05): 90s para tests que hagan login + navegacion + map init.
  timeout: 90000,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:1083',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Audit: timeouts especificos por accion. Antes solo timeout global.
    actionTimeout: 30000,
    navigationTimeout: 60000,
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
    // Audit code-quality (2026-06-05): mantener npm run dev (production
    // requeria NEXTAUTH_SECRET en env, fuera de scope). Workers reducidos
    // a 2 en lugar de 3 + timeouts mayores compensan el dev compile.
    command: 'npm run dev',
    url: 'http://localhost:1083',
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
