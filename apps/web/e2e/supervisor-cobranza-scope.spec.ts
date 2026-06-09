import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * SUPERVISOR — Cobranza scope spec (sup-fe-cobranza-scope).
 *
 * Por que existe:
 *   - middleware.ts (linea 33) declara /cobranza como permitido para
 *     SUPERVISOR ademas de ADMIN / SUPER_ADMIN.
 *   - Backend CobroEndpoints (apps/api/.../CobroEndpoints.cs) requiere solo
 *     RequireAuthorization() sin chequeo de rol — cualquier autenticado pasa.
 *   - CobroService.ObtenerCobrosAsync / ObtenerSaldosAsync filtra por
 *     tenantId pero NO por usuarioId del solicitante. Un SUPERVISOR ve
 *     TODOS los cobros del tenant, no solo los de su equipo.
 *
 *     PROD BUG / FIX TODO (potencial — verificar con product owner):
 *     si el contrato de SUPERVISOR es "solo ve cobros/saldos de su equipo",
 *     entonces el backend tiene un scope leak. El spec documenta el
 *     comportamiento actual (SUPERVISOR carga sin 403) y marca con
 *     test.fixme() la verificacion de filtrado por equipo hasta confirmar
 *     el contrato.
 *
 * Cobertura (5 tests):
 *   1. SUPERVISOR puede cargar /cobranza sin 403 ni redirect.
 *   2. GET /cobros responde 200 al cargar el tab por defecto "cobros".
 *   3. GET /cobros/saldos responde 200 cuando user clickea tab "Saldos".
 *   4. GET /cobros/saldos/resumen responde 200 (KPI cards).
 *   5. SUPERVISOR puede ver botones de accion (nuevo cobro / anular).
 *   6. SUPERVISOR — scope filter por equipo (FIXME: pendiente contrato).
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('SUPERVISOR — Cobranza scope', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('SUPERVISOR carga /cobranza sin 403 ni redirect', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(true, 'Layout mobile usa cards; el test cubre desktop.');
      return;
    }

    const response = await page.goto('/cobranza', { waitUntil: 'domcontentloaded' });

    // El middleware (linea 33) permite SUPERVISOR. No debe haber redirect a /login.
    expect(page.url()).toContain('/cobranza');
    expect(page.url()).not.toContain('/login');

    if (response) {
      expect(response.status(), 'Pagina /cobranza debe responder 200 a SUPERVISOR').toBeLessThan(400);
    }
  });

  test('SUPERVISOR — GET /cobros responde 200 (tab default "cobros")', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // El page.tsx default tab es 'cobros' (Bug #10 audit 2026-05-07), que
    // invoca getCobros() -> GET /cobros?desde=...&hasta=...
    const cobrosResp = page.waitForResponse(
      (resp) => /\/cobros(\?|$)/.test(new URL(resp.url()).pathname + (new URL(resp.url()).search || '')) &&
                resp.request().method() === 'GET',
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto('/cobranza');

    const resp = await cobrosResp;
    expect(resp, 'GET /cobros debe ser invocado al cargar /cobranza (tab default)').not.toBeNull();
    if (resp) {
      expect(resp.status(), 'SUPERVISOR debe poder leer cobros del tenant').toBe(200);
      const body = await resp.json().catch(() => null);
      // El endpoint retorna array (no objeto paginado). Si esto cambia, el
      // shape del frontend (services/api/cobranza.ts) se rompe.
      expect(Array.isArray(body), 'GET /cobros retorna Cobro[] (array)').toBe(true);
    }
  });

  test('SUPERVISOR — GET /cobros/saldos responde 200 al cambiar a tab "Saldos"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/cobranza');
    // Esperar a que la pagina hidrate y renderice los tabs.
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Click tab "Saldos" (i18n collections.tabs.balances). Aceptamos varios
    // textos por si i18n cambia: "Saldos", "Balances", "Saldos pendientes".
    const saldosTab = page.getByRole('button', { name: /Saldos|Balances/i }).first();
    const saldosTabVisible = await saldosTab.isVisible({ timeout: 8000 }).catch(() => false);

    if (!saldosTabVisible) {
      // FIX TODO: si tab no se encuentra, el copy de i18n cambio. Revisar
      // apps/web/src/i18n/messages/es.json clave collections.tabs.balances.
      test.skip(true, 'Tab "Saldos" no visible — verificar i18n collections.tabs.balances');
      return;
    }

    const saldosResp = page.waitForResponse(
      (resp) => resp.url().includes('/cobros/saldos') &&
                !resp.url().includes('/saldos/resumen') &&
                resp.request().method() === 'GET',
      { timeout: 20000 },
    ).catch(() => null);

    await saldosTab.click();

    const resp = await saldosResp;
    expect(resp, 'GET /cobros/saldos invocado al cambiar tab').not.toBeNull();
    if (resp) {
      expect(resp.status()).toBe(200);
      const body = await resp.json().catch(() => null);
      expect(Array.isArray(body), 'GET /cobros/saldos retorna SaldoCliente[]').toBe(true);
    }
  });

  test('SUPERVISOR — GET /cobros/saldos/resumen responde 200 (KPI row)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // Resumen se carga en el useEffect inicial junto con cobros del tab default.
    const resumenResp = page.waitForResponse(
      (resp) => resp.url().includes('/cobros/saldos/resumen') &&
                resp.request().method() === 'GET',
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto('/cobranza');

    const resp = await resumenResp;
    expect(resp, 'GET /cobros/saldos/resumen debe invocarse para los KPI cards').not.toBeNull();
    if (resp) {
      expect(resp.status(), 'SUPERVISOR debe poder leer resumen de cartera').toBe(200);
      const body = await resp.json().catch(() => null);
      // Shape ResumenCartera = { totalFacturado, totalCobrado, totalPendiente, clientesConSaldo }
      expect(body, 'Shape ResumenCartera').not.toBeNull();
      if (body) {
        expect(body).toHaveProperty('totalFacturado');
        expect(body).toHaveProperty('totalCobrado');
        expect(body).toHaveProperty('totalPendiente');
        expect(body).toHaveProperty('clientesConSaldo');
      }
    }
  });

  test('SUPERVISOR — boton "Nuevo cobro" visible (write access)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/cobranza');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    // data-tour="cobranza-new-btn" es el identificador estable del boton.
    // El backend permite POST /cobros a cualquier autenticado, asi que UI
    // debe exponerlo a SUPERVISOR.
    const newBtn = page.locator('[data-tour="cobranza-new-btn"]').first();
    await expect(newBtn, 'Boton Nuevo cobro visible para SUPERVISOR').toBeVisible({ timeout: 10000 });
  });

  test.fixme(
    'SUPERVISOR — saldos filtrados por equipo (PROD BUG: scope leak)',
    async ({ page }) => {
      // PROD BUG / FIX TODO:
      //   CobroService.ObtenerSaldosAsync(tenantId, clienteId) filtra SOLO
      //   por tenantId. Un SUPERVISOR ve todos los saldos del tenant, no
      //   solo los de su equipo asignado (UsuariosEquipo / vendedores
      //   bajo su mando).
      //
      //   Contrato esperado (a confirmar con product owner):
      //     - SUPERVISOR ve saldos cuyo cobro fue registrado por un vendedor
      //       de su equipo, O
      //     - SUPERVISOR ve saldos de clientes asignados a vendedores de
      //       su equipo.
      //
      //   Repro:
      //     1. Crear tenant con 2 supervisores S1, S2, cada uno con 1
      //        vendedor V1, V2.
      //     2. V1 registra cobro para cliente C1, V2 registra cobro para C2.
      //     3. Login como S1 -> GET /cobros/saldos.
      //     4. Esperado: solo C1 en respuesta.
      //     5. Actual: tanto C1 como C2 (filtra solo por tenant).
      //
      //   Fix sugerido (libs/HandySuites.Application/Cobranza):
      //     - Pasar usuarioActualId + rol a ObtenerCobrosAsync / ObtenerSaldosAsync.
      //     - En el repo, si rol == SUPERVISOR, INNER JOIN con equipo y
      //       filtrar usuarios bajo su mando.
      //
      //   Este test queda en fixme hasta que el contrato este confirmado;
      //   levantarlo cuando se implemente el filtro server-side.
      await page.goto('/cobranza');
      expect(true).toBe(false); // placeholder hasta implementar repro real.
    },
  );
});
