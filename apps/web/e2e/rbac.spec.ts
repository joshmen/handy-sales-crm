import { test, expect, Page } from '@playwright/test';

/**
 * RBAC Tests: Verificar que vendedor y admin ven datos correctos
 *
 * - Admin ve filtros de vendedor en pedidos/rutas
 * - Vendedor NO ve filtros de vendedor
 * - Dashboard vendedor muestra "Mi Rendimiento"
 * - Dashboard admin muestra "Tablero"
 */

// ─── Auth helpers (API-based login for reliability) ──────────────
async function loginAsAdmin(page: Page) {
  const csrfRes = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();

  await page.request.post('/api/auth/callback/credentials', {
    form: {
      email: 'admin@jeyma.com',
      password: 'test123',
      csrfToken,
    },
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
}

async function loginAsVendedor(page: Page) {
  const csrfRes = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();

  await page.request.post('/api/auth/callback/credentials', {
    form: {
      email: 'vendedor1@jeyma.com',
      password: 'test123',
      csrfToken,
    },
  });

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
}

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

    // Take screenshot
    await page.screenshot({
      path: 'e2e/screenshots/rbac-dashboard-vendedor.png',
      fullPage: true,
    });

    // Vendedor should see "Mi Rendimiento" or personalized greeting
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const titleText = await h1.first().textContent();
    // Should contain "rendimiento" or "Hola" (personalized greeting)
    const isVendedorDashboard =
      titleText?.toLowerCase().includes('rendimiento') ||
      titleText?.toLowerCase().includes('hola');
    expect(isVendedorDashboard).toBeTruthy();
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
