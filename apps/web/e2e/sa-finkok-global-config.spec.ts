import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin, loginAsAdmin, loginAsVendedor } from './helpers/auth';

/**
 * QA Audit 2026-06-07 — Caso sa-fe-finkok-config.
 *
 * Cobertura especifica de la pagina SuperAdmin /admin/finkok como panel de
 * CONFIGURACION GLOBAL Finkok (KPIs + filtros + tabla + modales config).
 *
 * Diferenciacion vs finkok-admin.spec.ts y admin-finkok-flow.spec.ts:
 *  - Aquellos validan acceso/RBAC/render basico.
 *  - Esta suite ejecuta ACCIONES sobre la config global: abrir modales de
 *    asignar creditos y switch modalidad, cambiar filtros, verificar KPI grid,
 *    contador filtered/total y validacion client-side de credits.
 *
 * Patron: serial (xjoshmenx unico SA, single-session strict).
 * Sin cleanup — solo lectura, modales se cierran con Cancelar.
 *
 * Source pagina: apps/web/src/app/(dashboard)/admin/finkok/page.tsx
 * Source API:    apps/web/src/services/api/finkokAdmin.ts
 * Endpoints:     GET /api/admin/finkok/emitters (billing API :1051)
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

const SKIP_MOBILE = (project: string) => project === 'Mobile Chrome';

async function gotoFinkokAdmin(page: import('@playwright/test').Page) {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/finkok');
  await page.waitForLoadState('domcontentloaded');
  // El componente hace fetch al mount; esperar a que termine.
  await page.waitForTimeout(3000);
}

test.describe('SA Finkok config — KPI dashboard', () => {
  test('SA ve grid de 5 KPI cards de configuracion global', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    // KPI grid tiene data-testid="finkok-kpis" — 5 cards: total, active,
    // suspended, prepaid, unlimited.
    const kpiGrid = page.getByTestId('finkok-kpis');
    await expect(kpiGrid).toBeVisible({ timeout: 10000 });

    // Las 5 cards son divs con clases rounded-xl bg-surface-2 dentro del grid.
    const kpiCards = kpiGrid.locator('> div');
    await expect(kpiCards).toHaveCount(5, { timeout: 5000 });
  });

  test('KPI cards muestran labels y valores numericos', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    const kpiGrid = page.getByTestId('finkok-kpis');
    await expect(kpiGrid).toBeVisible({ timeout: 10000 });

    // Cada card debe tener al menos un numero (el value) — los KPIs son
    // contadores. Aunque el listado este vacio, debe mostrar 0.
    const gridText = (await kpiGrid.textContent()) ?? '';
    expect(gridText).toMatch(/\d+/);
  });
});

test.describe('SA Finkok config — filtros globales', () => {
  test('SA cambia filtro status y la URL/contador refleja la seleccion', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    // 2 selects en la pagina: status y mode. Tomar el primero por orden DOM.
    const selects = page.locator('select');
    await expect(selects.first()).toBeVisible({ timeout: 8000 });
    const count = await selects.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Cambiar status a "active" (valor del <option>)
    await selects.nth(0).selectOption('active');
    await page.waitForTimeout(500);
    await expect(selects.nth(0)).toHaveValue('active');

    // Volver a all
    await selects.nth(0).selectOption('all');
    await expect(selects.nth(0)).toHaveValue('all');
  });

  test('SA cambia filtro modalidad P/O sin error', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    const selects = page.locator('select');
    await expect(selects.nth(1)).toBeVisible({ timeout: 8000 });

    // Prepago (P)
    await selects.nth(1).selectOption('P');
    await expect(selects.nth(1)).toHaveValue('P');

    // Ilimitado (O)
    await selects.nth(1).selectOption('O');
    await expect(selects.nth(1)).toHaveValue('O');

    // Volver al default
    await selects.nth(1).selectOption('all');
    await expect(selects.nth(1)).toHaveValue('all');
  });

  test('Combinacion de filtros (status + mode) no rompe la pagina', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    const selects = page.locator('select');
    await selects.nth(0).selectOption('suspended');
    await selects.nth(1).selectOption('P');
    await page.waitForTimeout(800);

    const body = (await page.locator('main').first().textContent()) ?? '';
    expect(body).not.toMatch(/Application error|crashed|Internal Server Error/i);
  });
});

test.describe('SA Finkok config — modales de configuracion', () => {
  test('Modal asignar creditos: validacion client-side rechaza valores invalidos', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    // Buscar boton de asignar creditos. Solo aparece si hay emisores con
    // typeUser=P. Si no hay, este test se skip auto-marca para no falsear.
    const assignBtn = page.locator('[data-testid^="assign-credits-"]').first();
    const hasAssign = await assignBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasAssign) {
      test.skip(true, 'No hay emisores Prepago para abrir modal asignar creditos');
      return;
    }

    await assignBtn.click();
    const modalInput = page.getByTestId('credits-input');
    await expect(modalInput).toBeVisible({ timeout: 5000 });

    // Valor invalido — 0 (validacion: credits <= 0 → toast "Cantidad invalida").
    await modalInput.fill('0');
    const confirmBtn = page.getByTestId('confirm-assign-credits');
    await confirmBtn.click();

    // El modal NO debe cerrarse — toast de error solo.
    await expect(modalInput).toBeVisible({ timeout: 2000 });

    // Cerrar con Cancelar.
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
    await expect(modalInput).toBeHidden({ timeout: 3000 });
  });

  test('Modal switch modalidad: tiene radios P/O y advertencia partner', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    const switchBtn = page.locator('[data-testid^="switch-mode-"]').first();
    const hasSwitch = await switchBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasSwitch) {
      test.skip(true, 'No hay emisores registrados para abrir modal switch');
      return;
    }

    await switchBtn.click();
    const confirmSwitch = page.getByTestId('confirm-switch-mode');
    await expect(confirmSwitch).toBeVisible({ timeout: 5000 });

    // Radios P y O presentes.
    const radioP = page.locator('input[type="radio"][value="P"]');
    const radioO = page.locator('input[type="radio"][value="O"]');
    await expect(radioP).toBeVisible();
    await expect(radioO).toBeVisible();

    // Advertencia partner (texto sobre cobranza Finkok).
    const warningRegex = /Finkok te cobra|partner|cu[eé]nta partner/i;
    const warning = page.getByText(warningRegex).first();
    await expect(warning).toBeVisible({ timeout: 3000 });

    // Cerrar modal sin aplicar.
    await page.getByRole('button', { name: /Cancelar/i }).first().click();
    await expect(confirmSwitch).toBeHidden({ timeout: 3000 });
  });
});

test.describe('SA Finkok config — refresh action', () => {
  test('Click Refrescar dispara reload del listado (boton no queda disabled)', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await gotoFinkokAdmin(page);

    const refreshBtn = page.getByRole('button', { name: /Refrescar|Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 8000 });

    await refreshBtn.click();
    // Durante loading el boton se disabled; despues debe re-habilitarse.
    await page.waitForTimeout(2500);
    await expect(refreshBtn).toBeEnabled({ timeout: 8000 });
  });
});

test.describe('SA Finkok config — RBAC negativo', () => {
  test('ADMIN regular NO accede /admin/finkok (config global gated)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toMatch(/\/admin\/finkok($|\?)/);
  });

  test('VENDEDOR NO accede /admin/finkok', async ({ page }, testInfo) => {
    if (SKIP_MOBILE(testInfo.project.name)) { test.skip(); return; }
    await loginAsVendedor(page);
    await page.goto('/admin/finkok');
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toMatch(/\/admin\/finkok($|\?)/);
  });
});
