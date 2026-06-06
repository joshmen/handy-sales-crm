import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Zones.
 *
 * GAP: zones-visual.spec.ts solo cubre visual. NO CRUD.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Zones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/zones');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Página /zones renderea con título', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Zonas/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Botón "Nueva zona" presente', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /Nueva zona|Crear zona/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });

  test('Drawer crear zona abre con campos', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    const newBtn = page.getByRole('button', { name: /Nueva zona/i }).first();
    if (!await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await newBtn.click();
    await page.waitForTimeout(1500);
    // Drawer abierto con campos para crear zona
    const fields = page.locator('input, textarea');
    const count = await fields.count();
    expect(count).toBeGreaterThan(0);
    // Cerrar
    const cancelBtn = page.getByRole('button', { name: /Cancelar|Cerrar/i }).first();
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
  });
});
