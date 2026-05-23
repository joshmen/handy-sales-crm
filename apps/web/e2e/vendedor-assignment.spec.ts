import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Vendedor Assignment + Bulk Transfer', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('client create form shows Vendedor field', async ({ page }) => {
    await page.goto('/clients/new');
    await expect(page).toHaveURL(/clients\/new/, { timeout: 15000 });

    // The "Vendedor asignado" label should be visible in the form
    await expect(page.getByText(/Vendedor asignado/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('client edit form shows Vendedor field', async ({ page }) => {
    // Find any client id to edit. Navigate to clients list and click first row.
    await page.goto('/clients');
    await expect(page).toHaveURL(/\/clients/, { timeout: 15000 });

    // Wait for table to load
    await page.waitForTimeout(2000);

    // Find first edit link/button
    const editLink = page.locator('a[href*="/clients/"][href$="/edit"]').first();
    const hasEdit = await editLink.count() > 0;
    if (!hasEdit) {
      // No clients in seed → skip assertion but mark pass
      test.skip(true, 'No clientes in seed to edit');
      return;
    }
    await editLink.click();
    await expect(page).toHaveURL(/\/clients\/\d+\/edit/, { timeout: 15000 });
    await expect(page.getByText(/Vendedor asignado/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('transferir-cartera page loads with FROM and TO selectors', async ({ page }) => {
    await page.goto('/team/transferir-cartera');
    await expect(page).toHaveURL(/transferir-cartera/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: /Transferir cartera/i })).toBeVisible({ timeout: 10000 });

    // Use locator instead of getByText (label has nested span with asterisk)
    const container = page.getByTestId('transferir-cartera-page');
    await expect(container.locator('label').filter({ hasText: /Vendedor origen/i }).first()).toBeVisible();
    await expect(container.locator('label').filter({ hasText: /Vendedor destino/i }).first()).toBeVisible();
    await expect(page.getByTestId('submit-transfer-btn')).toBeVisible();
    await expect(page.getByTestId('submit-transfer-btn')).toBeDisabled();
  });

  test('sidebar entry under Equipo navigates to transferir-cartera', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    const equipoButton = page.locator('aside button, aside a').filter({ hasText: /^Equipo$/ }).first();
    await expect(equipoButton).toBeVisible({ timeout: 10000 });
    await equipoButton.click();

    const sidebarLink = page.locator('a[href="/team/transferir-cartera"]').first();
    await expect(sidebarLink).toBeVisible({ timeout: 5000 });
    await sidebarLink.click();

    await expect(page).toHaveURL(/transferir-cartera/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Transferir cartera/i })).toBeVisible({ timeout: 10000 });
  });

  test('submit button enables when FROM and TO are different vendedores', async ({ page }) => {
    await page.goto('/team/transferir-cartera');
    await expect(page.getByRole('heading', { name: /Transferir cartera/i })).toBeVisible({ timeout: 10000 });

    // FROM selector — open and pick first option
    const fromCombobox = page.getByRole('combobox').first();
    await fromCombobox.click();
    await page.waitForTimeout(500);
    const firstOption = page.getByRole('option').first();
    const hasOptions = await firstOption.count() > 0;
    if (!hasOptions) {
      test.skip(true, 'No vendedores in seed');
      return;
    }
    await firstOption.click();
    await page.waitForTimeout(500);

    // TO selector — pick next available
    const toCombobox = page.getByRole('combobox').nth(1);
    await toCombobox.click();
    await page.waitForTimeout(500);
    const toOption = page.getByRole('option').first();
    const hasToOptions = await toOption.count() > 0;
    if (!hasToOptions) {
      test.skip(true, 'Need at least 2 vendedores to test');
      return;
    }
    await toOption.click();

    // Now submit button should be enabled
    await expect(page.getByTestId('submit-transfer-btn')).toBeEnabled({ timeout: 5000 });
  });
});
