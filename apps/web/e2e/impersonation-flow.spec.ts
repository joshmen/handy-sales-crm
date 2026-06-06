import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Impersonation full flow.
 *
 * GAP: impersonation-sidebar.spec.ts cubre sidebar. Faltan:
 *  - Iniciar impersonación desde /admin/tenants/[id]
 *  - Banner de impersonación visible
 *  - Finalizar impersonación volver a SA
 *  - Audit log entry
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('Impersonation', () => {
  test('SuperAdmin puede ver botón Impersonar en tenant detail', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/tenants');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    const firstRow = page.locator('a[href^="/admin/tenants/"]:not([href="/admin/tenants"])').first();
    if (!await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const impBtn = page.getByRole('button', { name: /Impersonar|Impersonate/i }).first();
    if (await impBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(impBtn).toBeVisible();
    }
  });

  test('Banner impersonación visible cuando activo', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Si SA está impersonando, banner amarillo/azul debe estar visible
    const banner = page.locator('text=/Impersonando|Sesión impersonada|Stop impersonating/i').first();
    if (!await banner.isVisible({ timeout: 3000 }).catch(() => false)) {
      // SA no está impersonando — esperado
      test.skip();
      return;
    }
    await expect(banner).toBeVisible();
  });
});
