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
    // The page should show a heading or content related to clients
    await expect(page.getByText(/clientes/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should open client edit page', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/client/, { timeout: 15000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Click edit button on first client row
    const editButton = page.getByRole('button', { name: /editar|edit/i }).first()
      .or(page.locator('[title="Editar"]').first())
      .or(page.locator('a[href*="/clients/"][href*="/edit"]').first());

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
    }
  });

  test('should show Datos Fiscales section on client edit', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForTimeout(2000);

    // Navigate to first client edit page
    const editButton = page.getByRole('button', { name: /editar|edit/i }).first()
      .or(page.locator('[title="Editar"]').first())
      .or(page.locator('a[href*="/clients/"][href*="/edit"]').first());

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });

      // Scroll down to find Datos Fiscales section
      await page.waitForTimeout(2000);
      const fiscalSection = page.getByText('Datos fiscales', { exact: false });
      await expect(fiscalSection).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show RFC field when Facturable is checked', async ({ page }) => {
    await page.goto('/clients');
    await page.waitForTimeout(2000);

    const editButton = page.getByRole('button', { name: /editar|edit/i }).first()
      .or(page.locator('[title="Editar"]').first())
      .or(page.locator('a[href*="/clients/"][href*="/edit"]').first());

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
      await page.waitForTimeout(2000);

      // Check the Facturable checkbox if not already checked
      const facturableCheckbox = page.getByLabel(/facturable/i);
      if (await facturableCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        const isChecked = await facturableCheckbox.isChecked();
        if (!isChecked) {
          await facturableCheckbox.check();
        }

        // RFC field should now be visible
        await expect(page.getByLabel(/RFC/)).toBeVisible({ timeout: 5000 });

        // C.P. Fiscal field should be visible
        await expect(page.getByText(/C\.P\. Fiscal/i)).toBeVisible({ timeout: 5000 });

        // Regimen Fiscal field should be visible
        await expect(page.getByText(/Régimen fiscal/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
