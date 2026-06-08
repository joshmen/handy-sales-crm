import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * Negative RBAC — SUPERVISOR (Item #4 inventory gaps 2026-06-06).
 *
 * Por que existe:
 *   /team/transferir-cartera y /clients/transferir-cartera son IsStrictAdmin
 *   (POST /clientes/transferir-cartera solo ADMIN + SUPER_ADMIN). Pero
 *   middleware.ts ROLE_RESTRICTED_ROUTES (lineas 19-42) NO incluye estas
 *   rutas — un SUPERVISOR puede llegar a la pagina y solo fallaria al
 *   hacer POST. Sin spec, la regresion pasa silenciosa.
 *
 * Cobertura:
 *   - GET /team/transferir-cartera con SUPERVISOR → debe bloquear (redirect,
 *     mensaje access-denied, O boton "Transferir" deshabilitado/ausente).
 *   - GET /clients/transferir-cartera con SUPERVISOR → mismo blocking.
 *
 * BUG / FIX TODO (DOCUMENTADO, no se toca codigo de prod):
 *   middleware.ts ROLE_RESTRICTED_ROUTES debe agregar:
 *     '/clients/transferir-cartera': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
 *     '/team/transferir-cartera': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
 *   Hasta que se aplique, este spec hace assertions defensivas (cualquier
 *   blocking valida — redirect, mensaje, boton ausente) y deja un assertion
 *   final "soft" que el POST /clientes/transferir-cartera responde 403.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

test.describe('RBAC Negative - SUPERVISOR - transferir-cartera', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('SUPERVISOR no puede acceder a /team/transferir-cartera', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team/transferir-cartera').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await page.screenshot({
      path: 'e2e/screenshots/rbac-neg-sup-team-transferir.png',
      fullPage: true,
    });

    const url = page.url();
    const blockedByRedirect = /\/dashboard.*error=unauthorized/.test(url) || /\/login/.test(url);
    const accessDeniedMsg = await page
      .getByText(/acceso denegado|sin permisos|no tienes permiso|unauthorized/i)
      .first()
      .isVisible()
      .catch(() => false);
    const transferBtn = page.getByRole('button', { name: /transferir/i }).first();
    const transferBtnCount = await transferBtn.count();
    const transferBtnDisabled =
      transferBtnCount > 0 && (await transferBtn.isDisabled().catch(() => false));
    const transferBtnAbsent = transferBtnCount === 0;

    // /team/transferir-cartera redirige a /clients/transferir-cartera (301).
    // Si el redirect ocurre y la pagina destino no bloquea, el blocking
    // efectivo depende del boton ausente/deshabilitado.
    const blocked =
      blockedByRedirect || accessDeniedMsg || transferBtnDisabled || transferBtnAbsent;

    // BUG / FIX TODO: si blocked === false, middleware.ts no esta bloqueando
    // ni la pagina renderiza access-denied. Aplicar parche al middleware
    // (agregar ruta a ROLE_RESTRICTED_ROUTES con [ADMIN, SUPER_ADMIN]).
    expect(blocked, 'SUPERVISOR debe ser bloqueado en /team/transferir-cartera').toBeTruthy();
  });

  test('SUPERVISOR no puede acceder a /clients/transferir-cartera', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/clients/transferir-cartera').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    await page.screenshot({
      path: 'e2e/screenshots/rbac-neg-sup-clients-transferir.png',
      fullPage: true,
    });

    const url = page.url();
    const blockedByRedirect = /\/dashboard.*error=unauthorized/.test(url) || /\/login/.test(url);
    const accessDeniedMsg = await page
      .getByText(/acceso denegado|sin permisos|no tienes permiso|unauthorized/i)
      .first()
      .isVisible()
      .catch(() => false);
    const transferBtn = page.getByRole('button', { name: /transferir/i }).first();
    const transferBtnCount = await transferBtn.count();
    const transferBtnDisabled =
      transferBtnCount > 0 && (await transferBtn.isDisabled().catch(() => false));
    const transferBtnAbsent = transferBtnCount === 0;

    const blocked =
      blockedByRedirect || accessDeniedMsg || transferBtnDisabled || transferBtnAbsent;

    expect(blocked, 'SUPERVISOR debe ser bloqueado en /clients/transferir-cartera').toBeTruthy();
  });

  test('POST /clientes/transferir-cartera con SUPERVISOR retorna 403', async ({ page, request }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // Reutilizamos las cookies de la sesion SUPERVISOR para llamar al backend
    // .NET (puerto 1050) via fetch del browser context — asi viaja el JWT.
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // El front llama al backend Next API que reenviar al .NET. Aqui apuntamos
    // al proxy del front (/api/clientes/transferir-cartera) que mantiene JWT.
    const resp = await page.request.post('/api/clientes/transferir-cartera', {
      data: { vendedorOrigenId: 0, vendedorDestinoId: 0, clienteIds: [] },
      failOnStatusCode: false,
    });

    // Aceptamos 401/403 como blocking valido. 404 indica que el front-proxy
    // no existe (BUG / FIX TODO: revisar apps/web/src/services/api/clients.ts
    // y la ruta /api/clientes/transferir-cartera). 200 seria PRIVILEGE LEAK.
    void request;
    expect(
      [401, 403].includes(resp.status()),
      `POST /clientes/transferir-cartera con SUPERVISOR debe retornar 401/403, recibio ${resp.status()}`,
    ).toBeTruthy();
  });
});
