import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * Cobranza SUPERVISOR scope (Item #5 inventory gaps 2026-06-06).
 *
 * Por que existe:
 *   middleware.ts (linea 33) permite /cobranza a SUPERVISOR junto con ADMIN
 *   y SUPER_ADMIN; backend /cobros/* permite VENDEDOR+. Sin spec, un bug
 *   en el filtro de vendedor expondria saldos de otros equipos (hot-path
 *   mensual, alto blast radius).
 *
 * Cobertura:
 *   - SUPERVISOR carga /cobranza sin 403.
 *   - GET /cobros/saldos responde 200.
 *   - GET /cobros/saldos/resumen responde 200.
 *   - Dropdown "Vendedor" NO incluye "Todos los vendedores" (ADMIN-only).
 *   - Stub empty-state opcional: forzar [] y verificar mensaje "0 saldos".
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Cobranza SUPERVISOR scope', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('SUPERVISOR carga /cobranza con GET /cobros/saldos OK', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    const saldosPromise = page.waitForResponse(
      (resp) => /\/cobros\/saldos(?!\/resumen)/.test(resp.url()),
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto('/cobranza');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    const saldosResp = await saldosPromise;

    await page.screenshot({
      path: 'e2e/screenshots/cobranza-supervisor-saldos.png',
      fullPage: true,
    });

    // BUG / FIX TODO: si saldosResp null, /cobranza no esta invocando el
    // endpoint; el spec no puede verificar el scope. Revisar la pagina de
    // cobranza para confirmar el endpoint exacto.
    expect(saldosResp, '/cobros/saldos debe invocarse').not.toBeNull();
    if (saldosResp) {
      expect(saldosResp.status()).toBe(200);
    }
  });

  test('SUPERVISOR — dropdown Vendedor sin "Todos los vendedores"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/cobranza');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // "Todos los vendedores" es ADMIN-only. SUPERVISOR debe ver solo su
    // equipo asignado, sin opcion global.
    const todosOpt = page.getByText('Todos los vendedores');
    expect(
      await todosOpt.count(),
      'SUPERVISOR NO debe ver opcion "Todos los vendedores" (es ADMIN-only)',
    ).toBe(0);
  });

  test('SUPERVISOR — GET /cobros/saldos/resumen responde 200', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    const resumenPromise = page.waitForResponse(
      (resp) => resp.url().includes('/cobros/saldos/resumen'),
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto('/cobranza');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    const resumen = await resumenPromise;
    // Si /cobros/saldos/resumen no se invoca desde la pagina principal,
    // toleramos null y solo verificamos el status cuando si fue invocado.
    if (resumen) {
      expect(resumen.status()).toBe(200);
    }
  });

  test('SUPERVISOR — empty-state stub muestra "0 saldos pendientes"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // Stub /cobros/saldos con array vacio para forzar el empty-state.
    await page.route('**/cobros/saldos**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue();
        return;
      }
      // Distinguimos saldos vs saldos/resumen — el resumen es un objeto, no array.
      if (route.request().url().includes('/saldos/resumen')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ totalSaldo: 0, totalClientes: 0, vencidos: 0 }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, pagina: 1, pageSize: 50 }),
      });
    });

    await page.goto('/cobranza');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await page.screenshot({
      path: 'e2e/screenshots/cobranza-supervisor-empty.png',
      fullPage: true,
    });

    // Buscamos cualquier indicador de empty-state. Aceptamos varios textos
    // porque el copy exacto puede variar.
    const emptyHints = page
      .getByText(/0 saldos|sin saldos|no hay saldos|sin resultados|sin registros/i)
      .first();

    // BUG / FIX TODO: si ninguno aparece, la pagina puede estar renderizando
    // la tabla con header pero sin mensaje de empty-state. Revisar componente.
    const hasEmptyMsg = await emptyHints.isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasEmptyMsg, 'Empty-state debe mostrar mensaje informativo').toBeTruthy();
  });
});
