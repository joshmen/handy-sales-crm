import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * Cupones SuperAdmin tests.
 *
 * SKIPPED: The /superadmin/cupones page does not exist yet.
 * These tests are scaffolded for when the cupones management feature is built.
 * Remove the .skip() once the page is implemented.
 */
test.describe.skip('Cupones SuperAdmin', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('should display cupones management page', async ({ page }) => {
    await page.goto('/superadmin/cupones');
    await expect(page).toHaveURL(/cupones/, { timeout: 15000 });
    // Verify table or list is visible
    await expect(page.getByRole('table').or(page.getByText(/cupones/i))).toBeVisible();
  });

  test('should create a new coupon', async ({ page }) => {
    await page.goto('/superadmin/cupones');

    // Click create button
    await page.getByRole('button', { name: /crear cupón|nuevo cupón/i }).click();

    // Fill form fields
    await page.getByLabel(/nombre/i).fill('Cupón Test E2E');

    // Select tipo
    const tipoSelect = page.getByLabel(/tipo/i);
    if (await tipoSelect.isVisible()) {
      await tipoSelect.selectOption('MesesGratis');
    }

    // Fill meses gratis
    const mesesField = page.getByLabel(/meses/i);
    if (await mesesField.isVisible()) {
      await mesesField.fill('3');
    }

    // Fill max usos
    const maxUsosField = page.getByLabel(/máximo|max.*usos/i);
    if (await maxUsosField.isVisible()) {
      await maxUsosField.fill('10');
    }

    // Submit
    await page.getByRole('button', { name: /guardar|crear|save/i }).click();

    // Verify new coupon appears
    await expect(page.getByText('Cupón Test E2E')).toBeVisible({ timeout: 10000 });
  });

  test('should copy coupon code to clipboard', async ({ page }) => {
    await page.goto('/superadmin/cupones');

    // Click copy button next to first coupon code
    const copyButton = page.getByRole('button', { name: /copiar|copy/i }).first();
    if (await copyButton.isVisible()) {
      await copyButton.click();
      // Verify toast notification
      await expect(page.getByText(/copiado|copied/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should deactivate a coupon', async ({ page }) => {
    await page.goto('/superadmin/cupones');

    // Find an active coupon and toggle it
    const toggleButton = page.getByRole('button', { name: /desactivar|deactivate/i }).first()
      .or(page.getByRole('switch').first());

    if (await toggleButton.isVisible()) {
      await toggleButton.click();

      // Confirm if needed
      const confirmBtn = page.getByRole('button', { name: /confirmar|confirm/i });
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Verify status changed
      await expect(page.getByText(/inactivo/i).first()).toBeVisible({ timeout: 10000 });
    }
  });
});
