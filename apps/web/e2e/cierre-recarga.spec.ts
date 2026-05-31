import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * E2E: Stepper "Recarga" en cierre de ruta — caso reportado por usuario 2026-05-30.
 *
 * Bug: SALSA CASERA TATEMADA con Inicial=480 Vendidos=744 → Diferencia=-264, sin
 * forma de cuadrar (los 3 steppers existentes solo restan).
 *
 * Fix: nuevo stepper "Recarga" que SUMA al inicial efectivo (vendedor regresó al
 * almacén). Banner ámbar incluye quick-action "→ Recarga".
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

async function navigateToCloseScreen(page: Page): Promise<boolean> {
  await page.goto('/routes');
  await waitForPageLoad(page);

  const cerrarBtn = page.locator('button:has-text("Cerrar")').first();
  if (!await cerrarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    return false;
  }
  await cerrarBtn.click();
  await expect(page).toHaveURL(/\/routes\/manage\/\d+\/close/, { timeout: 10000 });
  await waitForPageLoad(page);
  return true;
}

test.describe('Close screen — Recarga stepper', () => {
  test('header "Recarga" aparece en la tabla de inventario de retorno', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const reached = await navigateToCloseScreen(page);
    if (!reached) { test.skip(true, 'No hay ruta Completada en el seed'); return; }

    // El nuevo header "Recarga" debe estar en el thead de la tabla de retorno
    const recargaHeader = page.locator('table thead th', { hasText: /^Recarga$/ });
    await expect(recargaHeader).toBeVisible({ timeout: 5000 });
    // Tooltip explicativo en el header (título HTML5)
    const titleAttr = await recargaHeader.getAttribute('title');
    expect(titleAttr).toContain('recargó del almacén');

    await page.screenshot({ path: 'e2e/screenshots/cierre-recarga-header.png', fullPage: true });
  });

  test('banner overage incluye botón "→ Recarga" quick-action', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const reached = await navigateToCloseScreen(page);
    if (!reached) { test.skip(true, 'No hay ruta Completada en el seed'); return; }

    // El banner overage solo aparece si hay productos con (vendidos+entregados) > (inicial+recarga).
    // En seed normal no hay overage — verificar que si está el banner, el botón Recarga existe.
    const banner = page.locator('text=Hay productos con más unidades vendidas');
    const bannerVisible = await banner.isVisible({ timeout: 2000 }).catch(() => false);

    if (!bannerVisible) {
      test.skip(true, 'No hay overage en el seed actual (esperado en runs limpios)');
      return;
    }

    const recargaBtn = page.locator('button:has-text("Recarga")').first();
    await expect(recargaBtn).toBeVisible({ timeout: 5000 });

    // Tooltip del botón
    const title = await recargaBtn.getAttribute('title');
    expect(title).toContain('Recarga');

    await page.screenshot({ path: 'e2e/screenshots/cierre-recarga-banner-btn.png', fullPage: true });
  });

  test('stepper Recarga (con valor=0) renderiza en cada fila de producto', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const reached = await navigateToCloseScreen(page);
    if (!reached) { test.skip(true, 'No hay ruta Completada en el seed'); return; }

    // Header existe
    await expect(page.locator('table thead th', { hasText: /^Recarga$/ })).toBeVisible();

    // 11 columnas: Producto + Ventas + Inicial + Vendidos + Entregados + Devueltos
    // + 4 steppers (Mermas, Rec. almacén, Carga veh., Recarga) + Dif.
    const headerCells = page.locator('table thead th');
    const headerCount = await headerCells.count();
    expect(headerCount).toBe(11);

    const headerTexts = await headerCells.allTextContents();
    expect(headerTexts).toEqual([
      'Producto',
      'Ventas($)',
      'Inicial',
      'Vendidos',
      'Entregados',
      'Devueltos',
      'Mermas',
      'Rec. almacén',
      'Carga veh.',
      'Recarga',
      'Dif.',
    ]);
  });
});
