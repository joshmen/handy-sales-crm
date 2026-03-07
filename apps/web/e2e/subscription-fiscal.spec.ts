import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Subscription & Fiscal ID', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('settings page shows Identificador Fiscal label', async ({ page }) => {
    // Navigate to settings with perfil-empresa tab (default for admin)
    await page.goto('/settings?tab=perfil-empresa');
    await expect(page).toHaveURL(/settings/, { timeout: 15000 });

    // Wait for the Perfil tab content to load
    await page.waitForTimeout(3000);

    // Should show "Identificador Fiscal" label text
    await expect(page.getByText('Identificador Fiscal', { exact: true })).toBeVisible({ timeout: 10000 });

    // Should show Tipo de Identificador selector
    await expect(page.getByText('Tipo de Identificador')).toBeVisible({ timeout: 5000 });
  });

  test('registration page shows Identificador Fiscal label', async ({ page }) => {
    // Registration page is public - navigate directly
    await page.goto('/register');
    await expect(page).toHaveURL(/register/, { timeout: 15000 });

    // Should show "Identificador Fiscal" label
    await expect(page.getByText('Identificador Fiscal')).toBeVisible({ timeout: 10000 });
  });
});
