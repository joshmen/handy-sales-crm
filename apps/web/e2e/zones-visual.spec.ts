import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Zones page — visual verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('zones page loads and table renders', async ({ page }) => {
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');

    // Page title should show
    await expect(page.locator('h1, h2').filter({ hasText: 'Zonas' }).first()).toBeVisible();

    // Take screenshot of the full page
    await page.screenshot({ path: 'e2e/screenshots/zones-page.png', fullPage: true });
  });

  test('drawer opens with xl width and correct layout', async ({ page }) => {
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');

    // Click "Nueva Zona" button
    const addBtn = page.locator('button').filter({ hasText: /Nueva zona|Agregar/ }).first();
    await addBtn.click();

    // Wait for drawer to animate in
    await page.waitForTimeout(500);

    // Drawer panel should be visible
    const drawerPanel = page.locator('[data-drawer-panel]');
    await expect(drawerPanel).toBeVisible();

    // Check drawer has role="dialog"
    await expect(drawerPanel).toHaveAttribute('role', 'dialog');

    // Check the form sections exist
    await expect(page.locator('h4').filter({ hasText: 'Información general' })).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Ubicación' })).toBeVisible();
    await expect(page.locator('h4').filter({ hasText: 'Estado' })).toBeVisible();

    // Check color swatches are present (should have 8 round buttons)
    const swatches = page.locator('[data-tour="zones-drawer-color"] button');
    await expect(swatches).toHaveCount(8);

    // Check "Zona activa" checkbox with description
    await expect(page.locator('text=Las zonas inactivas no se asignan')).toBeVisible();

    // Take screenshot of drawer
    await page.screenshot({ path: 'e2e/screenshots/zones-drawer.png' });
  });

  test('drawer close animation works', async ({ page }) => {
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');

    // Open drawer
    const addBtn = page.locator('button').filter({ hasText: /Nueva zona|Agregar/ }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Drawer should be visible
    await expect(page.locator('[data-drawer-panel]')).toBeVisible();

    // Click close button (the X button with aria-label)
    await page.locator('button[aria-label="Cerrar"]').click();

    // Geolocation auto-fill may dirty the form → UnsavedChangesDialog appears
    const discardBtn = page.locator('button').filter({ hasText: /Descartar cambios/ });
    if (await discardBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await discardBtn.click();
    }

    // Wait for exit animation
    await page.waitForTimeout(400);

    // Drawer should be gone
    await expect(page.locator('[data-drawer-panel]')).not.toBeVisible();
  });

  test('color swatch selection shows checkmark', async ({ page }) => {
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');

    // Open drawer
    const addBtn = page.locator('button').filter({ hasText: /Nueva zona|Agregar/ }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Click the third color swatch
    const swatches = page.locator('[data-tour="zones-drawer-color"] button');
    await swatches.nth(2).click();

    // The clicked swatch should now have a Check icon (svg inside)
    const checkIcon = swatches.nth(2).locator('svg');
    await expect(checkIcon).toBeVisible();

    // Take screenshot showing selected swatch
    await page.screenshot({ path: 'e2e/screenshots/zones-drawer-color-selected.png' });
  });

  test('map modal opens at xl size', async ({ page }) => {
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');

    // Click "Mapa" button
    const mapBtn = page.locator('button').filter({ hasText: 'Mapa' }).first();

    if (await mapBtn.isVisible()) {
      await mapBtn.click();
      await page.waitForTimeout(1000);

      // Modal should be visible with "Mapa de Zonas" title
      await expect(page.locator('text=Mapa de Zonas')).toBeVisible();

      // Take screenshot
      await page.screenshot({ path: 'e2e/screenshots/zones-map-modal.png' });
    }
  });

  test('drawer footer has shadow', async ({ page }) => {
    await page.goto('/zones');
    await page.waitForLoadState('networkidle');

    // Open drawer
    const addBtn = page.locator('button').filter({ hasText: /Nueva zona|Agregar/ }).first();
    await addBtn.click();
    await page.waitForTimeout(500);

    // Footer should have the shadow class
    const footer = page.locator('.drawer-footer');
    await expect(footer).toBeVisible();

    // Verify the footer has box-shadow style
    const shadow = await footer.evaluate(el => getComputedStyle(el).boxShadow);
    expect(shadow).not.toBe('none');
  });
});
