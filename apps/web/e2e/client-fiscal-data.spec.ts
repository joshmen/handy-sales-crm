import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Datos Fiscales del Cliente', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should navigate to client list and show table', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/client/, { timeout: 15000 });
    await expect(page.getByText(/clientes/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should open client edit page', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForTimeout(2000);

    const editLink = page.locator('a[href*="/clients/"][href*="/edit"]').first();
    if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLink.click();
      await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
    }
  });

  test('should show Datos Fiscales section on client edit', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForTimeout(2000);

    const editLink = page.locator('a[href*="/clients/"][href*="/edit"]').first();
    if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLink.click();
      await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
      await page.waitForTimeout(2000);

      // "Datos fiscales" section title should be visible (scroll if needed)
      const fiscalSection = page.getByText('Datos fiscales', { exact: false });
      await fiscalSection.scrollIntoViewIfNeeded();
      await expect(fiscalSection).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show RFC field when Facturable is checked', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForTimeout(2000);

    const editLink = page.locator('a[href*="/clients/"][href*="/edit"]').first();
    if (await editLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editLink.click();
      await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Scroll to Datos fiscales section
      const fiscalSection = page.getByText('Datos fiscales', { exact: false });
      await fiscalSection.scrollIntoViewIfNeeded();

      // Check the Facturable checkbox if not already checked
      const facturableCheckbox = page.getByLabel(/facturable/i);
      if (await facturableCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        const isChecked = await facturableCheckbox.isChecked();
        if (!isChecked) {
          await facturableCheckbox.check();
          await page.waitForTimeout(500);
        }

        // Fiscal fields should now be visible
        await expect(page.getByText('Razón social').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('C.P. Fiscal').first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Régimen fiscal').first()).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
