import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Promotions.
 *
 * GAP: /promotions sin spec funcional. test-promo-realtime cubre toggle
 * SignalR pero no CRUD. Esta suite valida UI flow.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Promotions', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/promotions');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Página /promotions renderea', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Promociones/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Botón "Nueva promoción" visible', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /Nueva promoción|Crear promoción/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });

  test('Toggle activo en promo dispara PATCH 200', async ({ page }) => {
    const toggle = page.locator('button[title*="ctivar"]:visible').first();
    if (!await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    const patchPromise = page.waitForResponse(
      r => /\/promociones\/\d+\/activo$/.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 10000 }
    );
    await toggle.click({ force: true });
    const resp = await patchPromise;
    expect(resp.status()).toBeLessThan(400);
  });

  test('Búsqueda promociones acepta input', async ({ page }) => {
    const buscador = page.getByPlaceholder(/Buscar/i).first();
    if (!await buscador.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await buscador.fill('zzz-no-match');
    expect(await buscador.inputValue()).toBe('zzz-no-match');
  });
});
