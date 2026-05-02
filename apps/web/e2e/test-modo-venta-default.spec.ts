import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.setTimeout(90_000);

/**
 * Smoke /settings tab Apariencia → ModoVentaDefaultSection
 * Verifica que las 3 opciones aparecen + guardar persiste.
 */
test.describe('Settings — Modo de venta default', () => {
  test('3 opciones visibles + guardar persiste tras reload', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const tabApariencia = page.getByRole('tab', { name: /apariencia/i });
    if (await tabApariencia.count() > 0) {
      await tabApariencia.click();
      await page.waitForTimeout(800);
    }

    const titulo = page.getByText(/modo de venta default/i).first();
    await expect(titulo).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: 'test-results/modo-venta-default-initial.png', fullPage: false });

    // Verifica que las 3 opciones existen
    await expect(page.getByText(/^Preventa$/i).first()).toBeVisible();
    await expect(page.getByText(/^Venta directa$/i).first()).toBeVisible();
    await expect(page.getByText(/preguntar al vendedor/i).first()).toBeVisible();

    // Click "Preventa"
    await page.getByText(/^Preventa$/i).first().click();
    await page.waitForTimeout(300);

    // Capturar PATCH del save
    const patchPromise = page.waitForResponse(
      r => /\/api\/company\/settings/.test(r.url()) && (r.request().method() === 'PUT' || r.request().method() === 'PATCH'),
      { timeout: 8000 }
    ).catch(() => null);

    // Click "Guardar" del modo venta (puede haber varios botones Guardar en la página)
    const guardarBtns = page.getByRole('button', { name: /^Guardar$/i });
    const count = await guardarBtns.count();
    // Tomar el último (debería ser el de modo venta porque es la última sección)
    if (count > 0) {
      await guardarBtns.nth(count - 1).click();
    }

    const resp = await patchPromise;
    if (resp) {
      console.log(`Save status: ${resp.status()}`);
      expect(resp.status()).toBeLessThan(400);
    }

    await page.waitForTimeout(1500);

    // Reload
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await tabApariencia.click().catch(() => {});
    await page.waitForTimeout(800);

    // Verifica que la opción Preventa está marcada (aria-pressed)
    const preventaBtn = page.locator('button[aria-pressed="true"]').filter({ hasText: /Preventa/ }).first();
    await expect(preventaBtn).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-results/modo-venta-default-saved.png', fullPage: false });

    // Restaurar a "Preguntar" para no afectar otros tests
    await page.getByText(/preguntar al vendedor/i).first().click();
    await page.waitForTimeout(300);
    const guardarBtns2 = page.getByRole('button', { name: /^Guardar$/i });
    const count2 = await guardarBtns2.count();
    if (count2 > 0) {
      await guardarBtns2.nth(count2 - 1).click();
      await page.waitForTimeout(1500);
    }
  });
});
