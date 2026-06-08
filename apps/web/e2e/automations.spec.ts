import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

async function navigateToAutomations(page: Page) {
  await page.goto('/automations', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/automations/, { timeout: 15000 });
  // Audit (2026-06-05): networkidle antes del selector wait (data fetch async).
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForSelector('[data-tour="automations-grid"]', { timeout: 20000 });
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

  test.fixme('should toggle automation on and off', async ({ page }) => {
    // STATE_CONTAMINATION: depends on initial activation state of first template;
    // toggle triggers confirm modal + API roundtrip + reload that exceeds 2s waits.
    // TODO: replace waitForTimeout with explicit waits for spinner removal + API response.
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

    // If was active -> confirm deactivation dialog
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

  test.fixme('should open config drawer and save', async ({ page }) => {
    // STATE_CONTAMINATION: drawer save persists config on a shared template;
    // subsequent runs see mutated state. Also depends on template having configurable fields.
    // TODO: scope test to a known disposable template seeded per-run.
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

  test.fixme('should test automation via Play button', async ({ page }) => {
    // ENV_DEPENDENT: requires backend automation test endpoint + worker to execute template
    // (email/whatsapp/etc.) within 8s. Local env lacks PAC/SMTP/twilio sandbox configuration.
    // TODO: mock backend test endpoint or gate behind env flag.
    await navigateToAutomations(page);

    const playBtn = page.locator('button[title="Probar ahora"]').first();
    await expect(playBtn).toBeVisible({ timeout: 5000 });
    await playBtn.click();

    // Wait for execution + toast
    await page.waitForTimeout(8000);
  });

  test.fixme('should test multiple automations via Play buttons', async ({ page }) => {
    // ENV_DEPENDENT: same as single Play test — requires backend test endpoint + external
    // service sandboxes (email/whatsapp). 3x 6s waits + historial assertion times out.
    // TODO: mock backend test endpoint or gate behind env flag.
    await navigateToAutomations(page);

    const playButtons = page.locator('button[title="Probar ahora"]');
    const btnCount = await playButtons.count();
    expect(btnCount).toBeGreaterThanOrEqual(1);

    const testCount = Math.min(btnCount, 3);

    for (let i = 0; i < testCount; i++) {
      const btn = playButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      // Wait for each test to complete (spinner -> result toast)
      await page.waitForTimeout(6000);
    }

    // Verify historial section exists
    const historialSection = page.locator('[data-tour="automations-historial"]');
    await historialSection.scrollIntoViewIfNeeded();
    await expect(historialSection).toBeVisible({ timeout: 5000 });
  });

  test('should NOT show any Premium/Lock badges on automation cards', async ({ page }) => {
    await navigateToAutomations(page);

    // No Crown/Pro badges should exist
    const proBadges = page.locator('text=Pro').filter({ has: page.locator('svg') });
    await expect(proBadges).toHaveCount(0);

    // No "Mejorar plan" buttons should exist
    const lockButtons = page.getByRole('button', { name: /Mejorar plan/i });
    await expect(lockButtons).toHaveCount(0);
  });

  test('all automation cards should have toggle switches (no locked cards)', async ({ page }) => {
    await navigateToAutomations(page);

    const cards = page.locator('[data-tour="automations-grid"] > div');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThanOrEqual(5);

    // Each card's toggle area should have an input[type="checkbox"] (Switch), not a lock button
    const toggleAreas = page.locator('[data-tour="automations-toggle"]');
    const toggleCount = await toggleAreas.count();
    expect(toggleCount).toBe(cardCount);

    // Count switches - should match card count
    const switches = page.locator('[data-tour="automations-toggle"] input[type="checkbox"]');
    const switchCount = await switches.count();
    expect(switchCount).toBe(cardCount);
  });
});
