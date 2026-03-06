import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

async function navigateToMetas(page: Page) {
  await page.goto('/metas');
  await expect(page).toHaveURL(/metas/, { timeout: 15000 });
  // Wait for search bar — always visible on all viewports (table is hidden sm:block)
  await page.waitForSelector('[data-tour="metas-search"]', { timeout: 10000 });
}

test.describe('Metas de Vendedor Page', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should load metas page with heading and table', async ({ page }) => {
    await navigateToMetas(page);
    await expect(page.getByRole('heading', { name: 'Metas de Vendedor', exact: true })).toBeVisible();
    // Table is desktop-only (hidden sm:block) — verify it's attached, not necessarily visible
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();
    await expect(page.locator('[data-tour="metas-add-btn"]')).toBeVisible();
  });

  test('should show filters and controls', async ({ page }) => {
    await navigateToMetas(page);
    await expect(page.locator('[data-tour="metas-search"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-tipo-filter"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-toggle-inactive"]')).toBeVisible();
  });

  test('should open create drawer when clicking Nueva meta', async ({ page }) => {
    await navigateToMetas(page);
    await page.locator('[data-tour="metas-add-btn"]').click();

    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(drawer.getByRole('heading', { name: 'Nueva meta' })).toBeVisible();
    await expect(page.locator('[data-tour="metas-drawer-vendedor"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-drawer-tipo"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-drawer-monto"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-drawer-fechas"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-drawer-actions"]')).toBeVisible();
    await expect(page.locator('[data-tour="metas-drawer-autorenovar"]')).toBeVisible();

    // Close with X button (scoped to drawer to avoid matching HelpPanel's Cerrar button)
    await drawer.locator('button[aria-label="Cerrar"]').click();
    await page.waitForTimeout(400);
    await expect(drawer).not.toBeVisible();
  });

  test('should create a new meta', async ({ page }) => {
    await navigateToMetas(page);

    await page.locator('[data-tour="metas-add-btn"]').click();
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Select vendedor — first non-placeholder option
    const vendedorSelect = page.locator('[data-tour="metas-drawer-vendedor"] select');
    const options = vendedorSelect.locator('option');
    const optionCount = await options.count();

    if (optionCount <= 1) {
      // No vendedores seeded — close and skip
      await drawer.locator('button[aria-label="Cerrar"]').click();
      return;
    }

    const firstVendedorValue = await options.nth(1).getAttribute('value');
    await vendedorSelect.selectOption(firstVendedorValue!);

    // Set tipo to 'pedidos'
    await page.locator('[data-tour="metas-drawer-tipo"] select').selectOption('pedidos');

    // Fill monto
    const montoInput = page.locator('[data-tour="metas-drawer-monto"] input');
    await montoInput.fill('50');

    // Fechas — fill both date inputs
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1))
      .toISOString().slice(0, 10);
    const fechaInputs = page.locator('[data-tour="metas-drawer-fechas"] input[type="date"]');
    await fechaInputs.nth(0).fill(today);
    await fechaInputs.nth(1).fill(nextMonth);

    // Check auto-renovar
    const autoRenovarCheckbox = page.locator('[data-tour="metas-drawer-autorenovar"] input[type="checkbox"]');
    await autoRenovarCheckbox.check();

    // Submit
    const submitBtn = page.locator('[data-tour="metas-drawer-actions"] button[type="submit"]');
    await submitBtn.click();

    // Wait for API + re-render
    await page.waitForTimeout(2500);

    // Drawer should close on success
    await expect(drawer).not.toBeVisible({ timeout: 5000 });

    // Table is still in DOM (attached)
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();
  });

  test('should filter metas by tipo', async ({ page }) => {
    await navigateToMetas(page);

    const tipoFilter = page.locator('[data-tour="metas-tipo-filter"]');

    await tipoFilter.selectOption('ventas');
    await page.waitForTimeout(400);
    await expect(tipoFilter).toHaveValue('ventas');

    await tipoFilter.selectOption('pedidos');
    await page.waitForTimeout(400);
    await expect(tipoFilter).toHaveValue('pedidos');

    await tipoFilter.selectOption('visitas');
    await page.waitForTimeout(400);
    await expect(tipoFilter).toHaveValue('visitas');

    // Reset
    await tipoFilter.selectOption('');
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();
  });

  test('should filter metas by search term', async ({ page }) => {
    await navigateToMetas(page);

    const searchInput = page.locator('[data-tour="metas-search"] input');
    await searchInput.fill('vendor');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();

    await searchInput.fill('Ventas');
    await page.waitForTimeout(500);
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();

    await searchInput.clear();
    await page.waitForTimeout(300);
  });

  test('should toggle show-inactive via InactiveToggle', async ({ page }) => {
    await navigateToMetas(page);

    const toggleBtn = page.locator('[data-tour="metas-toggle-inactive"] button');
    await expect(toggleBtn).toBeVisible();

    // Toggle on
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();

    // Toggle back off
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();
  });

  test('should edit an existing meta if any exist', async ({ page }) => {
    await navigateToMetas(page);

    // Show inactive to see all metas
    const toggleBtn = page.locator('[data-tour="metas-toggle-inactive"] button');
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Works on both desktop (button[title="Editar"]) and mobile (button with text Editar)
    const editBtn = page.locator('button[title="Editar"], button:has-text("Editar")').first();
    if ((await editBtn.count()) === 0) return;

    await editBtn.first().click();
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(drawer.getByText('Editar meta')).toBeVisible();

    // Change monto
    const montoInput = page.locator('[data-tour="metas-drawer-monto"] input');
    await montoInput.fill('99');

    const saveBtn = page.locator('[data-tour="metas-drawer-actions"] button[type="submit"]');
    await saveBtn.click();
    await page.waitForTimeout(2500);

    await expect(drawer).not.toBeVisible({ timeout: 5000 });
  });

  test('should toggle activo for a meta if any exist', async ({ page }) => {
    await navigateToMetas(page);

    // Show inactive to see all
    const toggleBtn = page.locator('[data-tour="metas-toggle-inactive"] button');
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Find any ActiveToggle (label wrapping a checkbox) on the page
    const activeToggleLabel = page.locator('label').filter({
      has: page.locator('input[type="checkbox"]'),
    }).first();

    if ((await activeToggleLabel.count()) === 0) return;

    const checkbox = activeToggleLabel.locator('input[type="checkbox"]');
    const wasChecked = await checkbox.isChecked();

    await activeToggleLabel.click();
    await page.waitForTimeout(1500);

    const nowChecked = await checkbox.isChecked();
    expect(nowChecked).toBe(!wasChecked);

    // Restore
    await activeToggleLabel.click();
    await page.waitForTimeout(1500);
  });

  test('should delete a meta if any exist', async ({ page }) => {
    await navigateToMetas(page);

    // Show inactive
    const toggleBtn = page.locator('[data-tour="metas-toggle-inactive"] button');
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Works on both desktop (title attr) and mobile (text)
    const deleteBtn = page.locator('button[title="Eliminar"], button:has-text("Eliminar")').last();
    if ((await deleteBtn.count()) === 0) return;

    await deleteBtn.click();

    // Confirm dialog
    const confirmBtn = page.getByRole('button', { name: /^Eliminar$/ });
    await expect(confirmBtn).toBeVisible({ timeout: 3000 });
    await confirmBtn.click();
    await page.waitForTimeout(1500);

    // Table still in DOM
    await expect(page.locator('[data-tour="metas-table"]')).toBeAttached();
  });
});
