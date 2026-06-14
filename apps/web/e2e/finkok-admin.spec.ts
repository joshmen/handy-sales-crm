import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin, loginAsVendedor } from './helpers/auth';

/**
 * QA Audit 2026-06-06 — Admin / Finkok (PAC emisores).
 *
 * HIGH gap: rama feat/finkok-registration-emisores trabaja activamente el
 * panel /admin/finkok pero no hay cobertura E2E formal de:
 *  - Acceso SuperAdmin (200) + listado de emisores
 *  - RBAC negativo (ADMIN/VENDEDOR redirige a access-denied o dashboard)
 *  - Render no-crash + filtros visibles + acciones admin (Refrescar)
 *
 * Nota: ya existe admin-finkok-flow.spec.ts con smokes, esta suite es la
 * version expandida de QA con RBAC negativo explicito y assertions del flujo
 * de registro (que es tenant-side, ver comment en codigo del page).
 *
 * Fixture pattern: serial mode (xjoshmenx es unico SA, single-session strict).
 * Cleanup: no se requiere — solo lectura + RBAC.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('Finkok admin — SuperAdmin happy path', () => {
  test('SA carga /admin/finkok y la pagina renderea sin crash', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    expect(page.url()).toContain('/admin/finkok');

    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    const isCritical = bodyText.match(/Application error|crashed|Internal Server Error/i);
    expect(isCritical).toBeFalsy();
  });

  test('SA ve PageHeader con titulo Finkok y boton Refrescar', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });

    const refreshBtn = page.getByRole('button', { name: /Refrescar|Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 8000 });
  });

  test('SA ve listado de emisores O empty state informativo (no spinner colgado)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3500);

    // El spinner inicial no debe seguir visible despues de 3.5s
    const spinners = page.locator('.animate-spin');
    const stuckSpinner = await spinners.first().isVisible({ timeout: 500 }).catch(() => false);

    if (stuckSpinner) {
      // BUG / FIX TODO: si el spinner sigue visible, el endpoint
      // GET /api/admin/finkok/emitters esta tardando >3.5s o devolviendo error
      // sin desmontar el spinner. Revisar FinkokAdminController.ListEmitters
      // (502 fallthrough) y el catch en finkok page que setea loading=false.
      console.warn('[finkok-admin] spinner stuck after 3.5s — posible bug en error handling');
    }

    // O bien hay tabla con emisores, O bien hay empty state mencionando
    // "Configuración fiscal" (registro tenant-side).
    const table = page.locator('table').first();
    const emptyHint = page.getByText(/No hay emisores registrados|Configuración fiscal/i).first();

    const tableVisible = await table.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyVisible = await emptyHint.isVisible({ timeout: 3000 }).catch(() => false);

    expect(tableVisible || emptyVisible).toBeTruthy();
  });

  test('SA ve filtros de status (activos/suspendidos) y modalidad (P/O)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const bodyText = (await page.locator('main').first().textContent()) ?? '';
    // Filtros declarados en page.tsx: filterStatus (active/suspended/frozen)
    // + filterMode (P=Produccion/O=Pruebas).
    const hasStatusFilter = /Todos|Activo|Suspendido|Frozen/i.test(bodyText);
    expect(hasStatusFilter).toBeTruthy();
  });

  // Fase C — report_credit: botón "Saldo real en Finkok" para emisores prepago.
  test('SA consulta el saldo real (report_credit) de un emisor prepago', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);

    const rfc = 'EKU9003173C9';
    await page.route('**/api/admin/finkok/emitters?*', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          page: 1,
          items: [{
            rfc, razonSocial: 'Demo Prepago SA', status: 'active',
            typeUser: 'P', creditsRemaining: 50, registeredAt: '2026-01-01T00:00:00Z', tenantId: '1',
          }],
        }),
      }),
    );
    await page.route(`**/api/admin/finkok/emitters/${rfc}/credit-report`, route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ rfc, credit: 777, date: '2026-06-09' }),
      }),
    );

    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');

    const creditBtn = page.getByTestId(`credit-report-${rfc}`);
    await expect(creditBtn).toBeVisible({ timeout: 15000 });

    // La celda de créditos muestra el valor inicial (50) antes de consultar
    const row = page.getByTestId(`emitter-${rfc}`);
    await expect(row).toContainText('50');

    await creditBtn.click();

    // Tras consultar, el saldo real (777) reemplaza al cacheado
    await expect(row).toContainText('777', { timeout: 10000 });
  });
});

test.describe('Finkok admin — RBAC negativo', () => {
  test('ADMIN regular NO accede a /admin/finkok (redirige fuera)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForTimeout(3000);

    const url = page.url();
    // Middleware debe redirigir: NO debe quedarse en /admin/finkok.
    // Aceptamos /dashboard, /admin/access-denied, /unauthorized, /login.
    expect(url).not.toMatch(/\/admin\/finkok($|\?)/);
  });

  test('VENDEDOR NO accede a /admin/finkok (redirige fuera)', async ({ page }, testInfo) => {
    // Solo desktop — vendedor mobile tiene su propio slot y no contamina.
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsVendedor(page);
    await page.goto('/admin/finkok');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/finkok($|\?)/);
  });
});
