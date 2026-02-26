import { test, Page, expect } from '@playwright/test';

/**
 * Shared auth helpers for E2E tests.
 *
 * Uses UI-based login (fills the form) instead of the flaky API-based
 * CSRF pattern. All credentials match the seed data defined in CLAUDE.md.
 *
 * Each Playwright project gets DEDICATED users to avoid single-session
 * enforcement conflicts during parallel execution (fullyParallel: true).
 *
 * Desktop Chrome users:
 *   admin@jeyma.com              — Admin, tenant Jeyma (id=3)
 *   vendedor1@jeyma.com          — Vendedor, tenant Jeyma (id=3)
 *   superadmin@handysales.com    — SuperAdmin (platform-level)
 *
 * Mobile Chrome users:
 *   e2e-mobile-admin@jeyma.com   — Admin, tenant Jeyma (id=3)
 *   e2e-mobile-vendedor@jeyma.com — Vendedor, tenant Jeyma (id=3)
 *   e2e-mobile-sa@handysales.com — SuperAdmin (platform-level)
 *
 * Password: test123 for all.
 */

const TEST_PASSWORD = 'test123';

const API_BASE = 'http://localhost:1050';

/**
 * Returns project-specific test emails to avoid session conflicts
 * between Desktop Chrome and Mobile Chrome workers.
 *
 * Call from within a test, beforeEach, or afterEach — requires test context.
 */
export function getTestEmails() {
  let isMobile = false;
  try {
    isMobile = test.info().project.name === 'Mobile Chrome';
  } catch {
    // Outside test context — default to desktop
  }

  return {
    admin: isMobile ? 'e2e-mobile-admin@jeyma.com' : 'admin@jeyma.com',
    vendedor: isMobile ? 'e2e-mobile-vendedor@jeyma.com' : 'vendedor1@jeyma.com',
    superAdmin: isMobile ? 'e2e-mobile-sa@handysales.com' : 'superadmin@handysales.com',
    password: TEST_PASSWORD,
    apiBase: API_BASE,
  };
}

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
 * Login as Admin and wait for the dashboard.
 * Uses project-specific user to avoid parallel session conflicts.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const { admin } = getTestEmails();
  await fillLoginForm(page, admin, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

/**
 * Login as Vendedor and wait for the dashboard.
 * Uses project-specific user to avoid parallel session conflicts.
 */
export async function loginAsVendedor(page: Page): Promise<void> {
  const { vendedor } = getTestEmails();
  await fillLoginForm(page, vendedor, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

/**
 * Login as SuperAdmin and wait for the dashboard.
 * SuperAdmin is redirected from /dashboard → /admin/system-dashboard, so we
 * only assert that the URL contains "dashboard" (either variant).
 * Uses project-specific user to avoid parallel session conflicts.
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  const { superAdmin } = getTestEmails();
  await fillLoginForm(page, superAdmin, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}
