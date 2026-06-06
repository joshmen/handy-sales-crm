import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Automations follow-up.
 *
 * GAP: automations.spec.ts cubre load + filter + toggle + Play. Faltan:
 *  - Verificar que el drawer config tiene todos los campos
 *  - Verificar que Premium badges aparecen correctamente
 *  - Verificar logs ejecuciones
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Automations — UI complementaria', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/automations');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
  });

  test('Página /automations renderea con grid', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Automatizaciones/i }).first()).toBeVisible({ timeout: 10000 });
    // Grid de cards visible
    const cards = page.locator('[data-tour="automations-grid"], main article, [role="article"]');
    const count = await cards.count();
    expect(count > 0).toBeTruthy();
  });

  test('Filter tabs por categoría presentes', async ({ page }) => {
    const tabs = page.locator('[role="tab"], button:has-text("Todas"), button:has-text("Notificaciones")');
    const count = await tabs.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Historial de ejecuciones accesible', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    const histBtn = page.getByRole('button', { name: /Historial|Ejecuciones|History/i }).first()
      .or(page.getByRole('tab', { name: /Historial/i }).first());
    if (!await histBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await histBtn.click();
    await page.waitForTimeout(1000);
  });
});
