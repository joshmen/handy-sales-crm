import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin } from './helpers/auth';

/**
 * SA-1 to SA-5: SuperAdmin Features E2E Tests
 *
 * Tests:
 * - SA-1: Tenant management page (list, create, detail drawer, suspend, add user)
 * - SA-2: Simplified sidebar for SuperAdmin (3 items only)
 * - SA-3: System dashboard (metrics, top tenants, recent tenants)
 * - SA-4: Impersonation trigger from detail drawer
 * - SA-5: Dashboard redirect for SuperAdmin
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(1000);
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});
  }
  await page.waitForTimeout(2000);
}

/** Navigate to a tenant detail page. On mobile, truncated text resolves as "hidden",
 *  so we use the "Detalle" button instead of clicking the tenant name. */
async function navigateToTenantDetail(page: Page, isMobile: boolean) {
  await page.goto('/admin/tenants');
  await waitForPageLoad(page);

  if (isMobile) {
    const detalleBtn = page.getByRole('button', { name: 'Detalle' }).first();
    await detalleBtn.waitFor({ state: 'visible', timeout: 60000 });
    await detalleBtn.click();
  } else {
    const tenantLink = page.getByText('Demo Corp SA de CV').first();
    await tenantLink.waitFor({ state: 'visible', timeout: 60000 });
    await tenantLink.click();
  }

  await page.waitForURL(/\/admin\/tenants\/\d+/, { timeout: 15000 });
  await waitForPageLoad(page);
}

// ─── SA-5: Dashboard Redirect ─────────────────────────────────
test.describe('SA-5: Dashboard Redirect', () => {
  test('SuperAdmin is redirected from /dashboard to /admin/system-dashboard', async ({
    page,
  }) => {
    await loginAsSuperAdmin(page);

    // Should have been redirected
    await expect(page).toHaveURL(/system-dashboard/, { timeout: 15000 });
  });
});

// ─── SA-2: Simplified Sidebar ─────────────────────────────────
test.describe('SA-2: Sidebar Simplificado', () => {
  test('SuperAdmin sees simplified sidebar with 3 items', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    // Wait for sidebar to be visible AND fully loaded with menu items
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByText('Dashboard')).toBeVisible({ timeout: 15000 });

    const sidebarContent = (await sidebar.textContent()) || '';

    // Should have the 3 simplified items
    expect(sidebarContent).toContain('Dashboard');
    expect(sidebarContent).toContain('Empresas');
    expect(sidebarContent).toContain('Configuración');

    // Should NOT have regular admin items
    expect(sidebarContent).not.toContain('Clientes');
    expect(sidebarContent).not.toContain('Productos');
    expect(sidebarContent).not.toContain('Pedidos');
    expect(sidebarContent).not.toContain('Inventarios');

    await page.screenshot({
      path: 'e2e/screenshots/sa-sidebar-simplified.png',
      fullPage: true,
    });
  });

  test('SuperAdmin sees profile section at bottom of sidebar', async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    const sidebarContent = (await sidebar.textContent()) || '';

    // Should show Super Admin badge
    expect(sidebarContent).toContain('Super Admin');
  });

  test('Admin sees full sidebar with all menu items', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('Clientes')).toBeVisible({ timeout: 15000 });
    const sidebarContent = (await sidebar.textContent()) || '';

    // Admin should see full navigation
    expect(sidebarContent).toContain('Clientes');
    expect(sidebarContent).toContain('Productos');
    expect(sidebarContent).toContain('Pedidos');
  });
});

// ─── SA-1: Tenant Management Page ──────────────────────────────
test.describe('SA-1: Gestión de Empresas', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SuperAdmin can access /admin/tenants', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Gestión de Empresas|Empresas/i);

    await page.screenshot({
      path: 'e2e/screenshots/sa-tenants-page.png',
      fullPage: true,
    });
  });

  test('Tenant list shows multiple tenants', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Jeyma');
    expect(pageContent).toContain('Huichol');
  });

  test('Tenant page has create button', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    const createBtn = page.getByRole('button', {
      name: /nueva empresa|agregar|crear/i,
    });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
  });

  test('Tenant page has search and filters', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    // Search input
    const searchInput = page
      .locator(
        'input[placeholder*="Buscar"], input[type="search"], input[type="text"]'
      )
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    // Filter dropdowns
    const pageContent = await page.textContent('body');
    const hasFilters =
      pageContent?.includes('Activo') ||
      pageContent?.includes('Todos los estados');
    expect(hasFilters).toBeTruthy();
  });

  test('Click on tenant opens detail page', async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const isMobile = testInfo.project.name === 'Mobile Chrome';
    await navigateToTenantDetail(page, isMobile);

    // Detail page should show tenant info
    const pageContent = await page.textContent('body');
    expect(pageContent).toContain('Estadísticas');
    expect(pageContent).toContain('Impersonar');

    await page.screenshot({
      path: 'e2e/screenshots/sa-tenant-detail-page.png',
      fullPage: true,
    });
  });

  test('Detail page shows impersonar button', async ({ page }, testInfo) => {
    // Mobile shows icon-only buttons without accessible text names
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    const isMobile = false;
    await navigateToTenantDetail(page, isMobile);

    // Should have Impersonar button on the detail page
    const impersonarBtn = page.getByRole('button', {
      name: /impersonar/i,
    });
    await expect(impersonarBtn).toBeVisible({ timeout: 10000 });
  });

  test('Detail page shows edit and suspend buttons', async ({ page }, testInfo) => {
    // Mobile shows icon-only buttons without accessible text names
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    const isMobile = false;
    await navigateToTenantDetail(page, isMobile);

    // Edit button on detail page
    const editBtn = page.getByRole('button', { name: /editar/i });
    await expect(editBtn).toBeVisible({ timeout: 10000 });

    // Suspend/Reactivar button
    const suspendBtn = page.getByRole('button', {
      name: /suspender|reactivar/i,
    });
    await expect(suspendBtn).toBeVisible({ timeout: 10000 });
  });
});

// ─── SA-1: Access Control ──────────────────────────────────────
test.describe('SA-1: Access Control', () => {
  test('Admin is redirected from /admin/tenants', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/tenants');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).not.toContain('/admin/tenants');
  });

  test('SuperAdmin sees access denied page on /inventory without impersonating', async ({
    page,
  }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/inventory');
    await waitForPageLoad(page);

    // Middleware redirects to /admin/access-denied (no flash of inventory content)
    await expect(page).toHaveURL(/access-denied/, { timeout: 10000 });
    const pageContent = (await page.textContent('body')) || '';
    expect(pageContent).toContain('Acceso no disponible');
    expect(pageContent).toContain('impersonar una empresa');
  });

  test('SuperAdmin sees access denied page on /products without impersonating', async ({
    page,
  }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/products');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/access-denied/, { timeout: 10000 });
    const pageContent = (await page.textContent('body')) || '';
    expect(pageContent).toContain('Acceso no disponible');
  });

  test('SuperAdmin sees access denied page on /clients without impersonating', async ({
    page,
  }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/clients');
    await waitForPageLoad(page);

    await expect(page).toHaveURL(/access-denied/, { timeout: 10000 });
    const pageContent = (await page.textContent('body')) || '';
    expect(pageContent).toContain('Acceso no disponible');
  });
});

// ─── SA-3: System Dashboard ────────────────────────────────────
test.describe('SA-3: Dashboard Sistema', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSuperAdmin(page);
  });

  test('SuperAdmin can access /admin/system-dashboard', async ({ page }) => {
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Dashboard.*Sistema|Dashboard/i);

    await page.screenshot({
      path: 'e2e/screenshots/sa-system-dashboard.png',
      fullPage: true,
    });
  });

  test('System dashboard shows KPI cards', async ({ page }) => {
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';
    expect(pageContent).toContain('Total Empresas');
    expect(pageContent).toContain('Usuarios Activos');
  });

  test('System dashboard shows top/recent tenants', async ({ page }) => {
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';
    const hasTopOrRecent =
      pageContent.includes('Top') ||
      pageContent.includes('Últimas') ||
      pageContent.includes('Recientes');
    expect(hasTopOrRecent).toBeTruthy();
  });
});

// ─── SA-4: Impersonation from Detail ──────────────────────────
test.describe('SA-4: Impersonation Trigger', () => {
  test('Impersonar button opens impersonation modal', async ({ page }, testInfo) => {
    // Mobile shows icon-only buttons without accessible text names
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    const isMobile = false;
    await navigateToTenantDetail(page, isMobile);

    // Click Impersonar button on detail page
    const impersonarBtn = page.getByRole('button', {
      name: /impersonar/i,
    });
    await impersonarBtn.click();
    await page.waitForTimeout(1000);

    // Impersonation modal should appear
    const modalContent = await page.textContent('body');
    expect(modalContent).toContain('Justificación');

    await page.screenshot({
      path: 'e2e/screenshots/sa-impersonation-modal.png',
      fullPage: true,
    });
  });

  test('SuperAdmin sees Impersonar Empresa in user menu', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    // Click user avatar/menu button in header
    const userMenuBtn = page.locator('header button').last();
    await userMenuBtn.click();
    await page.waitForTimeout(1000);

    const dialogContent = (await page.textContent('body')) || '';
    expect(dialogContent).toContain('Impersonar Empresa');
  });

  test('Admin does NOT see Impersonar Empresa in user menu', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    const userMenuBtn = page.locator('header button').last();
    await userMenuBtn.click();
    await page.waitForTimeout(1000);

    const dialogContent = (await page.textContent('body')) || '';
    expect(dialogContent).not.toContain('Impersonar Empresa');
  });
});
