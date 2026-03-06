import { test as setup, expect } from '@playwright/test';

/**
 * Playwright Auth Setup — runs ONCE before all test projects.
 *
 * Authenticates as admin and saves the browser storage state (cookies + localStorage)
 * so that all test workers share the same authenticated session WITHOUT re-logging in.
 *
 * This eliminates intra-project session conflicts caused by single-session enforcement:
 * - No repeated logins = no session_version bumps = no 401 SESSION_REPLACED errors
 * - All workers reuse the same JWT from the saved state
 *
 * Runs twice: once for Desktop Chrome (admin@jeyma.com) and once for Mobile Chrome
 * (e2e-mobile-admin@jeyma.com), saving separate state files.
 */

setup('authenticate as admin', async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name.includes('mobile');
  const email = isMobile ? 'e2e-mobile-admin@jeyma.com' : 'xjoshmenx@gmail.com';
  const statePath = isMobile ? 'e2e/.auth/admin-mobile.json' : 'e2e/.auth/admin-desktop.json';

  await page.goto('/login');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill('test123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click({ force: true });

  // Handle session conflict (409) — click "Cerrar sesión anterior" if it appears
  const replaceBtn = page.getByRole('button', { name: /Cerrar sesión anterior/i });
  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 15000 }),
      replaceBtn.waitFor({ state: 'visible', timeout: 15000 }),
    ]);
  } catch { /* continue */ }

  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });

  // Save authenticated state for all workers in this project
  await page.context().storageState({ path: statePath });
});
