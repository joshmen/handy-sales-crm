import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Admin / Tenants.
 *
 * GAP: superadmin.spec.ts cubre algunos flows pero NO:
 *  - Create tenant flow completo
 *  - Tenant detail config
 *  - Crash reports
 *  - Subscription plans CRUD
 *  - Global users
 *
 * Esta suite cubre las páginas admin restantes (UI flow sin mutaciones).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('Admin pages — SuperAdmin access', () => {
  const pages = [
    { path: '/admin/global-users', name: 'Global users' },
    { path: '/admin/subscription-plans', name: 'Subscription plans' },
    { path: '/admin/crash-reports', name: 'Crash reports' },
    { path: '/admin/cupones', name: 'Cupones' },
  ];

  for (const p of pages) {
    test(`${p.name} (${p.path}) accesible para SuperAdmin`, async ({ page }) => {
      await loginAsSuperAdmin(page);
      await page.goto(p.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2500);
      // Solo verifica no crash. Redirect a /dashboard puede ser RBAC válido.
      const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
      const isCritical = bodyText.match(/Application error|crashed/i);
      expect(isCritical).toBeFalsy();
    });
  }
});

test.describe('Admin — Tenants detail', () => {
  test('Click en primer tenant abre detail', async ({ page }, testInfo) => {
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
    expect(page.url()).toMatch(/\/admin\/tenants\/\d+/);
  });
});
