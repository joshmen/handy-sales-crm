import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

async function navigateToAutomations(page: Page) {
  await page.goto('/automations');
  await expect(page).toHaveURL(/automations/, { timeout: 15000 });
  await page.waitForSelector('[data-tour="automations-grid"]', { timeout: 10000 });
}

test.describe('Automations Page', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should load automations page with cards', async ({ page }) => {
    await navigateToAutomations(page);
    await expect(page.getByRole('heading', { name: 'Automatizaciones', exact: true })).toBeVisible();
    const cards = page.locator('[data-tour="automations-grid"] > div');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('should show category filter tabs and KPIs', async ({ page }) => {
    await navigateToAutomations(page);
    await expect(page.locator('[data-tour="automations-categories"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Todas' })).toBeVisible();
    await expect(page.locator('[data-tour="automations-kpis"]')).toBeVisible();
  });

  test('should toggle automation on and off', async ({ page }) => {
    await navigateToAutomations(page);

    // The Switch is label > input[type="checkbox"]. Find a non-locked toggle area.
    const toggleArea = page.locator('[data-tour="automations-toggle"]').first();
    await expect(toggleArea).toBeVisible({ timeout: 5000 });

    const checkbox = toggleArea.locator('input[type="checkbox"]');
    // If no checkbox found (card might be locked/premium), skip
    if (await checkbox.count() === 0) return;

    const wasChecked = await checkbox.isChecked();

    // Click the label (parent of checkbox)
    await toggleArea.locator('label').click();

    // If was active → confirm deactivation dialog
    if (wasChecked) {
      const confirmBtn = page.getByRole('button', { name: /Desactivar/i });
      if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }

    await page.waitForTimeout(2000);

    // Restore original state
    const nowChecked = await checkbox.isChecked();
    if (nowChecked !== wasChecked) {
      await toggleArea.locator('label').click();
      if (nowChecked) {
        const confirmBtn = page.getByRole('button', { name: /Desactivar/i });
        if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }
      await page.waitForTimeout(2000);
    }
  });

  test('should open config drawer and save', async ({ page }) => {
    await navigateToAutomations(page);

    const gearBtn = page.locator('button[title="Configurar"]').first();
    await expect(gearBtn).toBeVisible({ timeout: 5000 });
    await gearBtn.click();

    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 5000 });
    await expect(drawer.locator('label').first()).toBeVisible();

    const saveBtn = drawer.getByRole('button', { name: /Guardar/i });
    await expect(saveBtn).toBeVisible();
    await saveBtn.click();

    await page.waitForTimeout(2000);
  });

  test('should test automation via Play button', async ({ page }) => {
    await navigateToAutomations(page);

    const playBtn = page.locator('button[title="Probar ahora"]').first();
    await expect(playBtn).toBeVisible({ timeout: 5000 });
    await playBtn.click();

    // Wait for execution + toast
    await page.waitForTimeout(8000);
  });

  test('should test multiple automations via Play buttons', async ({ page }) => {
    await navigateToAutomations(page);

    const playButtons = page.locator('button[title="Probar ahora"]');
    const btnCount = await playButtons.count();
    expect(btnCount).toBeGreaterThanOrEqual(1);

    const testCount = Math.min(btnCount, 3);

    for (let i = 0; i < testCount; i++) {
      const btn = playButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      // Wait for each test to complete (spinner → result toast)
      await page.waitForTimeout(6000);
    }

    // Verify historial section exists
    const historialSection = page.locator('[data-tour="automations-historial"]');
    await historialSection.scrollIntoViewIfNeeded();
    await expect(historialSection).toBeVisible({ timeout: 5000 });
  });
});
