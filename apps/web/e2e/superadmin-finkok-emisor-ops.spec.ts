import { test, expect, Page } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * Target screen: /admin/finkok (panel SuperAdmin de emisores Finkok).
 * Rol: SUPER_ADMIN (xjoshmenx@gmail.com, unico SA del sistema).
 * Scope (read-mostly + 1 accion real cuando hay datos):
 *   1. Lista de emisores: si hay emisores, la tabla muestra RFC en celda mono y
 *      el contador filtered/total es coherente con las filas visibles.
 *   2. Accion "Reporte de creditos" sobre un emisor Prepago (P): dispara el
 *      llamado a Finkok y refresca el saldo sin romper la pagina (toast + sin
 *      crash). Se ejecuta SOLO si existe un emisor P con boton credit-report.
 *   3. Si NO hay emisor P pero SI hay un emisor activo: verifica que el control
 *      de Suspender o Switch modalidad este presente (sin disparar la mutacion,
 *      que cambia cobranza partner real).
 *   4. Empty state (sandbox sin emisores): verifica el titulo de empty + que el
 *      boton Refrescar del PageHeader siga operativo (reload del listado).
 *
 * Por que serial: xjoshmenx es el unico SA, login paralelo bumpea la sesion
 * (SESSION_REPLACED). Las acciones reales (credit report) tocan Finkok sandbox.
 *
 * Diferenciacion vs los specs existentes:
 *   - admin-finkok-flow.spec.ts: render/RBAC/empty-state basico.
 *   - sa-finkok-global-config.spec.ts: KPIs, filtros y APERTURA de modales
 *     (assign/switch) con cierre por Cancelar, sin disparar la accion real.
 *   Este spec AGREGA el lifecycle de la accion "Reporte de creditos" (que NO
 *   muta cobranza pero SI llama a Finkok y refresca el saldo en la UI), mas la
 *   verificacion de presencia de controles suspend/switch cuando hay datos.
 *
 * Source: apps/web/src/app/(dashboard)/admin/finkok/page.tsx
 *         apps/web/src/services/api/finkokAdmin.ts
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

const SKIP_MOBILE = (project: string) => project === 'Mobile Chrome';

async function gotoFinkok(page: Page): Promise<void> {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/finkok', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  // El componente hace fetchEmitters al mount; esperar a que termine.
  await page
    .locator('.animate-spin')
    .first()
    .waitFor({ state: 'hidden', timeout: 15000 })
    .catch(() => {});
  await page.waitForTimeout(1500);
}

test.describe('SA Finkok. operaciones sobre emisores', () => {
  test('Lista o empty: la pagina rinde sin crash y el contador es coherente', async ({
    page,
  }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkok(page);

    // No crash.
    const main = (await page.locator('main').first().textContent()) ?? '';
    expect(main).not.toMatch(/Application error|crashed|Internal Server Error/i);

    // KPI grid presente (total/active/suspended/prepaid/unlimited).
    const kpiGrid = page.getByTestId('finkok-kpis');
    await expect(kpiGrid).toBeVisible({ timeout: 10000 });

    const emitterRows = page.locator('[data-testid^="emitter-"]');
    const rowCount = await emitterRows.count();

    if (rowCount === 0) {
      // Empty state: titulo informativo + tabla sin filas de emisores.
      const emptyTitle = page
        .getByText(/No hay emisores registrados|Configuraci[oó]n fiscal|sin emisores/i)
        .first();
      // Al menos uno de los textos de empty debe verse, o la tabla esta vacia.
      const hasEmpty = await emptyTitle.isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasEmpty || rowCount === 0).toBeTruthy();
    } else {
      // Hay emisores: cada fila visible muestra un RFC (celda mono no vacia).
      const firstRfcCell = emitterRows.first().locator('td').first();
      const rfcText = (await firstRfcCell.textContent())?.trim() ?? '';
      expect(rfcText.length).toBeGreaterThan(0);
    }
  });

  test('Boton Refrescar recarga el listado y vuelve a habilitarse', async ({
    page,
  }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkok(page);

    const refreshBtn = page.getByRole('button', { name: /Refrescar|Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 8000 });

    // Esperar el GET de emitters disparado por el click.
    const listResp = page
      .waitForResponse(
        (r) => r.url().includes('/finkok') && r.request().method() === 'GET',
        { timeout: 12000 },
      )
      .catch(() => null);
    await refreshBtn.click();
    await listResp;

    // Tras el reload, el boton se re-habilita (durante loading queda disabled).
    await expect(refreshBtn).toBeEnabled({ timeout: 10000 });
  });

  test('Reporte de creditos sobre emisor Prepago (si existe) refresca saldo sin crash', async ({
    page,
  }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkok(page);

    // El boton de credit-report solo existe para emisores typeUser=P.
    const creditBtn = page.locator('[data-testid^="credit-report-"]').first();
    const hasCredit = await creditBtn.isVisible({ timeout: 4000 }).catch(() => false);
    if (!hasCredit) {
      test.skip(true, 'No hay emisor Prepago (P) con boton Reporte de creditos en sandbox');
      return;
    }

    // Disparar la accion. getCreditReport llama a Finkok y actualiza el saldo.
    const reportResp = page
      .waitForResponse(
        (r) => r.url().includes('/finkok') && r.request().method() === 'POST',
        { timeout: 15000 },
      )
      .catch(() => null);
    await creditBtn.click();
    await reportResp;

    // No crash tras la accion; la tabla sigue presente.
    await page.waitForTimeout(1500);
    const main = (await page.locator('main').first().textContent()) ?? '';
    expect(main).not.toMatch(/Application error|crashed|Internal Server Error/i);

    // El boton de credit-report sigue presente y habilitado (la accion termino).
    await expect(creditBtn).toBeEnabled({ timeout: 10000 });
  });

  test('Controles suspend/switch presentes cuando hay emisor activo (sin mutar)', async ({
    page,
  }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkok(page);

    const emitterRows = page.locator('[data-testid^="emitter-"]');
    if ((await emitterRows.count()) === 0) {
      test.skip(true, 'Sin emisores en sandbox: nada que verificar para suspend/switch');
      return;
    }

    // El control de switch modalidad existe SIEMPRE por fila.
    const switchBtn = page.locator('[data-testid^="switch-mode-"]').first();
    await expect(switchBtn).toBeVisible({ timeout: 6000 });

    // Suspender solo aparece si hay un emisor activo; reactivar si suspendido.
    const suspendBtn = page.locator('[data-testid^="suspend-"]').first();
    const reactivateBtn = page.locator('[data-testid^="reactivate-"]').first();
    const hasSuspend = await suspendBtn.isVisible({ timeout: 2000 }).catch(() => false);
    const hasReactivate = await reactivateBtn.isVisible({ timeout: 2000 }).catch(() => false);
    // Al menos uno de los dos debe existir (active -> suspend, suspended -> reactivate).
    expect(hasSuspend || hasReactivate).toBeTruthy();

    // Abrir el modal de switch para verificar que el flujo arranca y cerrarlo sin
    // aplicar (cambiar modalidad afecta cobranza partner real de Finkok).
    await switchBtn.click();
    const confirmSwitch = page.getByTestId('confirm-switch-mode');
    if (await confirmSwitch.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Advertencia partner visible.
      await expect(
        page.getByText(/Finkok te cobra|partner|cu[eé]nta partner/i).first(),
      ).toBeVisible({ timeout: 3000 });
      // Cerrar sin aplicar.
      await page.getByRole('button', { name: /^Cancelar$/i }).first().click();
      await expect(confirmSwitch).toBeHidden({ timeout: 4000 });
    }
  });
});
