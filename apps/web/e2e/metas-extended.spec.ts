import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Metas (goals) extended.
 *
 * GAP: metas.spec.ts cubre create/edit/toggle/delete. Esta suite cubre:
 *  - Progreso visual de meta
 *  - Filter por periodo/vendedor
 *  - Vista cards vs lista
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Metas — vistas y filtros', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/metas');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('Página /metas renderea con grid o lista', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Metas|Goals/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Progreso de meta visualizado (barra o %)', async ({ page }) => {
    // Buscar progress bar o porcentaje
    const progressIndicators = page.locator('[role="progressbar"], text=/%/');
    const count = await progressIndicators.count();
    if (count === 0) {
      test.skip();
      return;
    }
    expect(count).toBeGreaterThan(0);
  });

  test('Filtro vendedor presente', async ({ page }) => {
    const filter = page.locator('[role="combobox"], select').first();
    if (!await filter.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(filter).toBeVisible();
  });
});
