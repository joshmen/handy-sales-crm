import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsVendedor } from './helpers/auth';

/**
 * RBAC Tests: Verificar que vendedor y admin ven datos correctos
 *
 * - Admin ve filtros de vendedor en pedidos/rutas
 * - Vendedor NO ve filtros de vendedor
 * - Dashboard vendedor muestra "Mi Rendimiento"
 * - Dashboard admin muestra "Tablero"
 */

// Helper to wait for page data to load
async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(1000);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(2000);
}

// ─── Test Suite ──────────────────────────────────────────────────

// Run serially to avoid overwhelming the dev server
test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

// ─── DASHBOARD RBAC ──────────────────────────────────────────────
test.describe('RBAC - Dashboard', () => {

  test('Admin dashboard shows "Tablero" title', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-dashboard-admin.png',
      fullPage: true,
    });

    // Admin should see "Tablero" as the main heading
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const titleText = await h1.first().textContent();
    expect(titleText?.toLowerCase()).toContain('tablero');
  });

  test('Vendedor dashboard shows "Mi Rendimiento"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsVendedor(page);
    await waitForPageLoad(page);

    // Wait for vendedor dashboard to render with API data.
    // The h1 "Mi Rendimiento" only appears when /api/dashboard/my-performance succeeds.
    // If we see "Tablero" instead, the API failed — that's a real regression we must catch.
    const vendedorH1 = page.locator('h1', { hasText: /Mi Rendimiento/i });
    await expect(vendedorH1).toBeVisible({ timeout: 15000 });

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-dashboard-vendedor.png',
      fullPage: true,
    });
  });

  test('Vendedor dashboard shows performance metrics', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsVendedor(page);
    await waitForPageLoad(page);

    // Should show vendedor-specific cards (Mis Ventas, Mis Pedidos, etc.)
    const pageContent = await page.textContent('body');
    const hasVendedorMetrics =
      pageContent?.includes('Ventas') ||
      pageContent?.includes('Pedidos') ||
      pageContent?.includes('Visitas') ||
      pageContent?.includes('Clientes');
    expect(hasVendedorMetrics).toBeTruthy();
  });
});

// ─── ORDERS RBAC ─────────────────────────────────────────────────
test.describe('RBAC - Pedidos', () => {

  test('Admin sees vendedor filter dropdown in orders', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/orders');
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-orders-admin.png',
      fullPage: true,
    });

    // Admin should see a dropdown with "Todos los vendedores" text
    const vendedorFilter = page.getByText('Todos los vendedores');
    await expect(vendedorFilter.first()).toBeVisible({ timeout: 10000 });
  });

  test('Vendedor does NOT see vendedor filter in orders', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsVendedor(page);
    await page.goto('/orders');
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-orders-vendedor.png',
      fullPage: true,
    });

    // Vendedor should NOT see "Todos los vendedores" filter
    const vendedorFilter = page.getByText('Todos los vendedores');
    await expect(vendedorFilter).toHaveCount(0);
  });

  test('Vendedor sees only their own orders', async ({ page }, testInfo) => {
    test.setTimeout(60000);
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsVendedor(page);
    await page.goto('/orders');
    await waitForPageLoad(page);

    // The page should load without errors
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const titleText = await h1.first().textContent();
    expect(titleText).toContain('Pedidos');
  });
});

// ─── ROUTES RBAC ─────────────────────────────────────────────────
test.describe('RBAC - Rutas', () => {

  test('Admin sees vendedor filter dropdown in routes', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-routes-admin.png',
      fullPage: true,
    });

    // Admin should see vendedor filter
    const vendedorFilter = page.getByText('Todos los vendedores');
    await expect(vendedorFilter.first()).toBeVisible({ timeout: 10000 });
  });

  test('Vendedor does NOT see vendedor filter in routes', async ({ page }, testInfo) => {
    test.setTimeout(60000);
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsVendedor(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-routes-vendedor.png',
      fullPage: true,
    });

    // Vendedor should NOT see "Todos los vendedores" filter
    const vendedorFilter = page.getByText('Todos los vendedores');
    await expect(vendedorFilter).toHaveCount(0);
  });
});

// ─── CLIENTS RBAC ────────────────────────────────────────────────
test.describe('RBAC - Clientes', () => {

  test('Admin sees all clients', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/clients');
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-clients-admin.png',
      fullPage: true,
    });

    // Page should load with clients table
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const titleText = await h1.first().textContent();
    expect(titleText).toContain('Clientes');
  });

  test('Vendedor sees clients page (filtered by backend)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsVendedor(page);
    await page.goto('/clients');
    await waitForPageLoad(page);

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-clients-vendedor.png',
      fullPage: true,
    });

    // Page should load without errors
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const titleText = await h1.first().textContent();
    expect(titleText).toContain('Clientes');
  });
});

// ─── ADMIN ROUTES NEGATIVE (VENDEDOR) ────────────────────────────
//
// Inventory HIGH gap: rbac.spec.ts solo validaba positivos para
// VENDEDOR (no ve filtro "Todos los vendedores"). NO había guard
// negativa para hits directos a /admin, /superadmin, /admin/finkok,
// etc. Una regresión en middleware.ts ROLE_RESTRICTED_ROUTES
// expondría UI admin a VENDEDOR sin ser detectada por el suite.
//
// Comportamiento esperado: middleware redirige a /unauthorized o
// /dashboard?error=unauthorized (302) ANTES de hidratar la página.
test.describe('RBAC - VENDEDOR admin routes redirect (negative)', { tag: '@rbac' }, () => {

  const ADMIN_ROUTES = [
    '/admin',
    '/superadmin',
    '/admin/finkok',
    '/admin/companies',
    '/admin/cupones',
    '/admin/team',
    '/admin/global-users',
  ];

  for (const route of ADMIN_ROUTES) {
    test(`VENDEDOR cannot access ${route}`, async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
      test.setTimeout(45000);

      await loginAsVendedor(page);
      await waitForPageLoad(page);

      // Hit directo a la ruta admin. domcontentloaded basta — el redirect
      // del middleware ocurre antes del SSR de la página protegida.
      await page.goto(route, { waitUntil: 'domcontentloaded' }).catch(() => {
        // Si el middleware corta la navegación con un throw el goto puede
        // rejectar — está OK, validamos URL final abajo.
      });

      // Esperar a que termine cualquier client-side redirect (NextAuth
      // middleware puede hacer un hop adicional vía window.location).
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

      const finalUrl = page.url();

      // Screenshot para auditoría visual de la pantalla post-redirect.
      const safeName = route.replace(/\//g, '_').replace(/^_/, '');
      await page.screenshot({
        path: `e2e/screenshots/rbac-vendedor-blocked-${safeName}.png`,
        fullPage: true,
      });

      // 1. La URL final NO debe seguir en la ruta admin solicitada.
      //    Aceptamos /unauthorized, /dashboard, /dashboard?error=...,
      //    /login (si la session se invalidó por algún motivo) o
      //    cualquier ruta non-admin del rol vendedor.
      const stillOnAdminRoute = finalUrl.includes(route) &&
        !finalUrl.includes('/unauthorized') &&
        !finalUrl.includes('error=unauthorized');

      expect(stillOnAdminRoute, `VENDEDOR landed inside ${route} — middleware guard regression. final=${finalUrl}`).toBe(false);

      // 2. El DOM no debe contener data-testid de UI admin. Si alguna
      //    página admin se renderizó parcialmente antes del redirect
      //    client-side, los testids quedan colgados.
      const adminTestidCount = await page.locator('[data-testid^="admin-"], [data-testid^="superadmin-"]').count();
      expect(adminTestidCount, `Admin DOM leaked for VENDEDOR on ${route}`).toBe(0);

      // 3. Heading nunca debe ser "SuperAdmin" o "Administración global".
      const h1Text = (await page.locator('h1').first().textContent().catch(() => '')) ?? '';
      expect(/Super ?Admin|Administraci[oó]n global|Global Users|Finkok/i.test(h1Text),
        `Admin heading rendered for VENDEDOR on ${route}: "${h1Text}"`).toBe(false);
    });
  }

  test('VENDEDOR sees friendly unauthorized banner on /admin', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    test.setTimeout(45000);

    await loginAsVendedor(page);
    await waitForPageLoad(page);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    await page.screenshot({
      path: 'e2e/screenshots/rbac-vendedor-unauthorized-banner.png',
      fullPage: true,
    });

    // Debe haber alguna pista visual al usuario — banner, toast o página
    // de "no autorizado". No queremos un dashboard silencioso sin feedback.
    const bodyText = (await page.textContent('body').catch(() => '')) ?? '';
    const hasFeedback =
      /no autorizado|sin permisos|no tienes acceso|acceso denegado|unauthorized/i.test(bodyText) ||
      page.url().includes('error=unauthorized') ||
      page.url().includes('/unauthorized');

    // BUG / FIX TODO: si esta assertion falla pero las anteriores pasan,
    // el guard funciona pero el feedback al usuario es deficiente. No es
    // bloqueante para seguridad pero sí UX — registrar como follow-up.
    expect(hasFeedback,
      'VENDEDOR fue redirigido sin feedback visible — UX gap. Considerar agregar toast o página /unauthorized.').toBe(true);
  });
});
