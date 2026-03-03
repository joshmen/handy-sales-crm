import { test, Page, expect } from '@playwright/test';
import path from 'path';

/**
 * Shared auth helpers for E2E tests.
 *
 * THREE levels of user isolation to prevent session_version conflicts:
 *
 * 1. PROJECT-level: Desktop Chrome vs Mobile Chrome use different admin users
 *    (storageState set once by auth.setup.ts, shared by all workers via fast-path)
 *
 * 2. FILE-level: Each test file that logins as SA or Vendedor gets its OWN
 *    dedicated user, so parallel workers never bump the same session_version.
 *
 * 3. LOGIN-TEST: Tests that explicitly test the login flow use a separate
 *    "loginAdmin" user to avoid invalidating the storageState admin session.
 *
 * Password: test123 for all. See 06_e2e_parallel_users.sql for seed data.
 */

const TEST_PASSWORD = 'test123';

const API_BASE = 'http://localhost:1050';

// ── File → dedicated SuperAdmin user mapping ──
// Each key is the spec file basename (without .spec.ts).
const SA_SLOT: Record<string, number> = {
  'superadmin': 1,
  'announcement-displaymode': 2,
  'security-announcements': 3,
  'subscription-tenant': 4,
  'impersonation-sidebar': 5,
};

// ── File → dedicated Vendedor user mapping ──
const VEND_SLOT: Record<string, number> = {
  'rbac': 1,
  'perfil-empresa': 2,
};

/**
 * Returns test emails isolated by project AND file.
 *
 * - `admin`: storageState admin (used by fast-path loginAsAdmin, never re-login)
 * - `loginAdmin`: separate admin for tests that explicitly test the login flow
 * - `superAdmin`: per-file SA user (avoids parallel session conflicts)
 * - `vendedor`: per-file vendedor user (avoids parallel session conflicts)
 */
export function getTestEmails() {
  let isMobile = false;
  let fileName = '';
  try {
    isMobile = test.info().project.name === 'Mobile Chrome';
    fileName = path.basename(test.info().file).replace('.spec.ts', '');
  } catch {
    // Outside test context — default to desktop, no file mapping
  }

  const saSlot = SA_SLOT[fileName];
  const vendSlot = VEND_SLOT[fileName];

  let superAdmin: string;
  if (saSlot) {
    superAdmin = isMobile
      ? `e2e-mob-sa-${saSlot}@handysales.com`
      : `e2e-sa-${saSlot}@handysales.com`;
  } else {
    superAdmin = isMobile
      ? 'e2e-mobile-sa@handysales.com'
      : 'superadmin@handysales.com';
  }

  let vendedor: string;
  if (vendSlot) {
    vendedor = isMobile
      ? `e2e-mob-vend-${vendSlot}@jeyma.com`
      : `e2e-vend-${vendSlot}@jeyma.com`;
  } else {
    vendedor = isMobile
      ? 'e2e-mobile-vendedor@jeyma.com'
      : 'vendedor1@jeyma.com';
  }

  return {
    admin: isMobile ? 'e2e-mobile-admin@jeyma.com' : 'admin@jeyma.com',
    loginAdmin: isMobile ? 'e2e-mob-login-admin@jeyma.com' : 'e2e-login-admin@jeyma.com',
    vendedor,
    superAdmin,
    password: TEST_PASSWORD,
    apiBase: API_BASE,
  };
}

async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill(password);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click({ force: true });

  const replaceBtn = page.getByRole('button', { name: /Cerrar sesión anterior/i });
  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 10000 }),
      replaceBtn.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  } catch {
    // Neither happened
  }

  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }
}

/**
 * Login as Admin via storageState fast-path (no form fill if cookies exist).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const cookies = await page.context().cookies();
  const hasSession = cookies.some(
    (c) => c.name.includes('session-token') || c.name.includes('next-auth'),
  );

  if (hasSession) {
    await page.goto('/dashboard');
    try {
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
      return;
    } catch {
      // Session cookie was stale — clear and fall through to full login
      await page.context().clearCookies();
    }
  }

  const { admin } = getTestEmails();
  await fillLoginForm(page, admin, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

/**
 * Login as Vendedor (per-file dedicated user). Clears admin storageState first.
 */
export async function loginAsVendedor(page: Page): Promise<void> {
  await page.context().clearCookies();
  const { vendedor } = getTestEmails();
  await fillLoginForm(page, vendedor, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

/**
 * Login as SuperAdmin (per-file dedicated user). Clears admin storageState first.
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  await page.context().clearCookies();
  const { superAdmin } = getTestEmails();
  await fillLoginForm(page, superAdmin, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}
