import { test, expect, Page } from '@playwright/test';

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

// ─── Auth helpers ──────────────────────────────────────────────
async function loginAsSuperAdmin(page: Page) {
  const csrfRes = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();

  await page.request.post('/api/auth/callback/credentials', {
    form: {
      email: 'superadmin@handysales.com',
      password: 'test123',
      csrfToken,
    },
  });

  // SuperAdmin is redirected from /dashboard to /admin/system-dashboard
  await page.goto('/dashboard');
  await page.waitForTimeout(3000);
}

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
  test('SuperAdmin sees simplified sidebar with 3 items', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    // Sidebar header should say "Administración"
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

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
  }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    const sidebarContent = (await sidebar.textContent()) || '';

    // Should show Super Admin badge
    expect(sidebarContent).toContain('Super Admin');
  });

  test('Admin sees full sidebar with all menu items', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
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

  test('Click on tenant opens detail drawer', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    // Click on the first tenant row (desktop) or card (mobile)
    const tenantRow = page.locator('table tbody tr').first();
    if (await tenantRow.isVisible()) {
      await tenantRow.click();
    } else {
      // Mobile: click on first card
      const tenantCard = page
        .locator('.bg-white.rounded-lg.border')
        .first();
      await tenantCard.click();
    }

    await page.waitForTimeout(1500);

    // Detail drawer should be open
    const drawerContent = await page.textContent('body');
    expect(drawerContent).toContain('Detalle de Empresa');
    expect(drawerContent).toContain('Estadísticas');
    expect(drawerContent).toContain('Usuarios del Tenant');

    await page.screenshot({
      path: 'e2e/screenshots/sa-tenant-detail-drawer.png',
      fullPage: true,
    });
  });

  test('Detail drawer shows impersonar button', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    // Click on first tenant row
    const tenantRow = page.locator('table tbody tr').first();
    if (await tenantRow.isVisible()) {
      await tenantRow.click();
    }
    await page.waitForTimeout(1500);

    // Should have Impersonar button
    const impersonarBtn = page.getByRole('button', {
      name: /impersonar empresa/i,
    });
    await expect(impersonarBtn).toBeVisible({ timeout: 5000 });
  });

  test('Detail drawer shows edit and suspend buttons', async ({ page }) => {
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    const tenantRow = page.locator('table tbody tr').first();
    if (await tenantRow.isVisible()) {
      await tenantRow.click();
    }
    await page.waitForTimeout(1500);

    // Scope to the drawer overlay
    const drawer = page.locator('.animate-slide-in-right');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Edit button inside drawer footer
    const editBtn = drawer.getByRole('button', { name: /editar/i });
    await expect(editBtn).toBeVisible({ timeout: 5000 });

    // Suspend/Reactivar button
    const suspendBtn = drawer.getByRole('button', {
      name: /suspender|reactivar/i,
    });
    await expect(suspendBtn).toBeVisible({ timeout: 5000 });
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
  test('Impersonar button opens impersonation modal', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);

    // Open detail drawer
    const tenantRow = page.locator('table tbody tr').first();
    if (await tenantRow.isVisible()) {
      await tenantRow.click();
    }
    await page.waitForTimeout(1500);

    // Click Impersonar button
    const impersonarBtn = page.getByRole('button', {
      name: /impersonar empresa/i,
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
