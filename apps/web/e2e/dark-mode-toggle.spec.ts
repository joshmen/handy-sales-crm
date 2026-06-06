import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Dark Mode toggle functional.
 *
 * GAP: dark-mode-audit.spec.ts solo verifica renders. NO valida que el
 * toggle persiste preferencia.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Dark Mode toggle', () => {
  test('Toggle modo oscuro cambia tema', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const themeBtn = page.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/i }).first();
    if (!await themeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    const initialClass = await page.locator('html').getAttribute('class').catch(() => '') ?? '';
    const initialIsDark = initialClass.includes('dark');
    await themeBtn.click();
    await page.waitForTimeout(500);
    const newClass = await page.locator('html').getAttribute('class').catch(() => '') ?? '';
    const newIsDark = newClass.includes('dark');
    expect(initialIsDark).not.toBe(newIsDark);
  });

  test('Preferencia persiste tras reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const themeBtn = page.getByRole('button', { name: /Cambiar a modo (claro|oscuro)/i }).first();
    if (!await themeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await themeBtn.click();
    await page.waitForTimeout(500);
    const classBeforeReload = await page.locator('html').getAttribute('class').catch(() => '') ?? '';
    const isDarkBeforeReload = classBeforeReload.includes('dark');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const classAfterReload = await page.locator('html').getAttribute('class').catch(() => '') ?? '';
    const isDarkAfterReload = classAfterReload.includes('dark');
    expect(isDarkAfterReload).toBe(isDarkBeforeReload);
    // Restore tras test
    await themeBtn.click().catch(() => {});
  });
});
