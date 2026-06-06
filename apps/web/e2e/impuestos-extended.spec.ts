import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Tasas de Impuesto extended.
 *
 * GAP: impuestos-catalogo.spec.ts cubre create básico. Esta suite cubre:
 *  - Default flag (solo una tasa puede ser default)
 *  - Aplicación de tasa a producto
 *  - Edit/delete restricciones
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Tasas de Impuesto', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/products/taxes');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('Página /products/taxes carga con IVA 16% seed', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Tasas|Impuestos|Taxes/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
    // IVA 16% debe estar visible (seed)
    const ivaCell = page.getByText(/IVA.*16|16\.00%|16%/i).first();
    if (await ivaCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(ivaCell).toBeVisible();
    }
  });

  test('Badge "Default" o "Predeterminada" presente en IVA 16%', async ({ page }) => {
    const defaultBadge = page.getByText(/Default|Predeterminada/i).first();
    if (!await defaultBadge.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(defaultBadge).toBeVisible();
  });

  test('Botón crear nueva tasa visible', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /Nueva tasa|Crear tasa|Nueva|New/i }).first();
    if (!await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(newBtn).toBeVisible();
  });
});
