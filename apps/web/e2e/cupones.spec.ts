import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * Cupones SuperAdmin tests.
 * URL: /admin/cupones
 * SA único: xjoshmenx@gmail.com. Tests serial para evitar conflictos de sesión.
 */
test.describe.configure({ mode: 'serial' });
test.describe('Cupones SuperAdmin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('should display cupones management page', async ({ page }) => {
    await page.goto('/admin/cupones');
    await expect(page).toHaveURL(/cupones/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /cupones/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should show create button', async ({ page }) => {
    await page.goto('/admin/cupones');
    const createBtn = page.getByRole('button', { name: /crear cupón|nuevo cupón|nuevo/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });
});
