import { Page, expect } from '@playwright/test';

/**
 * Shared auth helpers for E2E tests.
 *
 * Uses UI-based login (fills the form) instead of the flaky API-based
 * CSRF pattern. All credentials match the seed data defined in CLAUDE.md.
 *
 * Available test users (password: test123 for all):
 *   admin@jeyma.com        — Admin, tenant Jeyma (id=3)
 *   vendedor1@jeyma.com    — Vendedor, tenant Jeyma (id=3)
 *   superadmin@handysales.com — SuperAdmin (platform-level)
 */

async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  // Dismiss any Next.js error overlay or modal that may block the form
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  // Use .first() to handle React Strict Mode double-mount edge case
  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill(password);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click({ force: true });

  // After clicking login, wait for EITHER:
  // 1. Redirect to /dashboard (success) — most common path
  // 2. Session conflict "Cerrar sesión anterior" button (409 response)
  const replaceBtn = page.getByRole('button', { name: /Cerrar sesión anterior/i });
  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 10000 }),
      replaceBtn.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  } catch {
    // Neither happened — login may have failed or another UI step appeared
  }

  // If session conflict button appeared, click it to force-login
  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }
}

/**
 * Login as Admin (admin@jeyma.com / test123) and wait for the dashboard.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  await fillLoginForm(page, 'admin@jeyma.com', 'test123');
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

/**
 * Login as Vendedor (vendedor1@jeyma.com / test123) and wait for the dashboard.
 */
export async function loginAsVendedor(page: Page): Promise<void> {
  await fillLoginForm(page, 'vendedor1@jeyma.com', 'test123');
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

/**
 * Login as SuperAdmin (superadmin@handysales.com / test123).
 *
 * SuperAdmin is redirected from /dashboard → /admin/system-dashboard, so we
 * only assert that the URL contains "dashboard" (either variant).
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await fillLoginForm(page, 'superadmin@handysales.com', 'test123');
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}
