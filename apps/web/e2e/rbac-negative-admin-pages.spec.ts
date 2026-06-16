import { test, expect, Page } from '@playwright/test';
import { loginAsVendedor } from './helpers/auth';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * RBAC Negative: gating de middleware.ts para paginas admin/config.
 *
 * Target: apps/web/src/middleware.ts (ROLE_RESTRICTED_ROUTES + SUPER_ADMIN gate).
 * Roles bajo prueba: VENDEDOR y SUPERVISOR (ambos < ADMIN).
 * Scope (asserts): tras hit directo a /settings, /discounts, /admin/tenants,
 *   /admin/finkok, la URL final NO sigue dentro de la ruta admin solicitada
 *   (redirect a /dashboard?error=unauthorized o /admin/access-denied), y el
 *   heading nunca es de UI admin. Cubre el gating del middleware end-to-end.
 *
 * Que AGREGA respecto a specs existentes:
 *   - rbac.spec.ts cubre VENDEDOR en /admin, /superadmin, /admin/finkok,
 *     /admin/companies, /admin/cupones, /admin/team, /admin/global-users.
 *     NO cubre /settings ni /discounts (rutas config con
 *     [ADMIN, SUPER_ADMIN]) ni /admin/tenants. Este spec llena ese hueco.
 *   - rbac-negative-supervisor.spec.ts cubre SUPERVISOR solo en
 *     transferir-cartera. NO valida que SUPERVISOR sea bloqueado de /settings
 *     ni de /admin/*. Aqui se agrega esa cobertura cruzada.
 *
 * Serial: ambos roles son single-session por tenant (cada login bumpea
 *   session_version del slot dedicado). Evita 401-cascade entre tests.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

// Espera a que se asiente cualquier redirect client-side del middleware/NextAuth.
async function settleRedirect(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
  await page.waitForTimeout(500);
}

// Assertion compartida: el rol no-admin NO debe quedar dentro de la ruta
// solicitada y no debe renderizarse heading de UI admin.
async function assertBlocked(page: Page, route: string): Promise<void> {
  const finalUrl = page.url();

  // 1. URL final no debe seguir en la ruta admin (salvo que sea la pagina
  //    de feedback /admin/access-denied, que SI es un bloqueo valido).
  const onAccessDenied = finalUrl.includes('/admin/access-denied');
  const stillInsideRoute =
    finalUrl.includes(route) &&
    !onAccessDenied &&
    !finalUrl.includes('error=unauthorized') &&
    !finalUrl.includes('error=no_permission');

  expect(
    stillInsideRoute,
    `Rol no-admin quedo dentro de ${route}: regresion de gating en middleware. final=${finalUrl}`,
  ).toBe(false);

  // 2. Debe haber feedback de bloqueo: redirect a dashboard con error,
  //    /admin/access-denied, /unauthorized o /login.
  const blockedByRedirect =
    onAccessDenied ||
    /error=unauthorized|error=no_permission/.test(finalUrl) ||
    /\/dashboard(\?|$|#)/.test(finalUrl) ||
    /\/login/.test(finalUrl) ||
    /\/unauthorized/.test(finalUrl);

  expect(
    blockedByRedirect,
    `No hubo redirect de bloqueo para ${route}. final=${finalUrl}`,
  ).toBe(true);

  // 3. El heading nunca debe ser de UI admin/config protegida.
  const h1Text = (await page.locator('h1').first().textContent().catch(() => '')) ?? '';
  expect(
    /Finkok|Empresas|Tenants|Planes de Suscripci[oó]n|Configuraci[oó]n$|Cupones/i.test(h1Text),
    `Heading admin renderizado para rol no-admin en ${route}: "${h1Text}"`,
  ).toBe(false);
}

// Rutas bajo prueba. Mezcla rutas de config ([ADMIN, SUPER_ADMIN]) con rutas
// estrictamente SUPER_ADMIN (/admin/*) para cubrir ambos gates del middleware.
const RESTRICTED_ROUTES = ['/settings', '/discounts', '/admin/tenants', '/admin/finkok'];

test.describe('RBAC Negative - VENDEDOR bloqueado de paginas admin/config', () => {
  for (const route of RESTRICTED_ROUTES) {
    test(`VENDEDOR no accede a ${route}`, async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') {
        test.skip();
        return;
      }
      test.setTimeout(45000);

      await loginAsVendedor(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {
        // El middleware puede cortar la navegacion; validamos URL final abajo.
      });
      await settleRedirect(page);

      const safeName = route.replace(/\//g, '_').replace(/^_/, '');
      await page.screenshot({
        path: `e2e/screenshots/rbac-neg-vendedor-${safeName}.png`,
        fullPage: true,
      });

      await assertBlocked(page, route);
    });
  }
});

// Repetir la clave con SUPERVISOR: gating de /settings (config ADMIN-only) y
// de /admin/* (SUPER_ADMIN-only). SUPERVISOR esta por debajo de ADMIN, asi que
// el resultado esperado es identico al de VENDEDOR para estas rutas.
test.describe('RBAC Negative - SUPERVISOR bloqueado de /settings y /admin/*', () => {
  const SUPERVISOR_ROUTES = ['/settings', '/admin/tenants', '/admin/finkok'];

  for (const route of SUPERVISOR_ROUTES) {
    test(`SUPERVISOR no accede a ${route}`, async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') {
        test.skip();
        return;
      }
      test.setTimeout(45000);

      await loginAsSupervisor(page);
      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {});
      await settleRedirect(page);

      const safeName = route.replace(/\//g, '_').replace(/^_/, '');
      await page.screenshot({
        path: `e2e/screenshots/rbac-neg-supervisor-${safeName}.png`,
        fullPage: true,
      });

      await assertBlocked(page, route);
    });
  }
});
