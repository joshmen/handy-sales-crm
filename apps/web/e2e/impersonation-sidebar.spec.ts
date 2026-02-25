import { test, expect, Page } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * Impersonation Sidebar Fix E2E Tests
 *
 * Verifies that when SuperAdmin impersonates a tenant, the sidebar shows
 * ONLY admin-level items (not a mix of SuperAdmin + Admin items).
 *
 * Bug fixed: Sidebar was showing "Gestión de Empresas", "Dashboard Sistema",
 * "Configuración Global" during impersonation because hasPermission() was
 * using SUPER_ADMIN permissions instead of ADMIN permissions.
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

// ─── Pre-impersonation: SuperAdmin sidebar ──────────────────
test.describe('Impersonation Sidebar: Before', () => {
  test('SuperAdmin sidebar has simplified items before impersonating', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    const sidebarContent = (await sidebar.textContent()) || '';

    // SuperAdmin should see simplified menu
    expect(sidebarContent).toContain('Empresas');
    expect(sidebarContent).toContain('Dashboard');

    // SuperAdmin should NOT see tenant-level items
    expect(sidebarContent).not.toContain('Clientes');
    expect(sidebarContent).not.toContain('Productos');
    expect(sidebarContent).not.toContain('Pedidos');

    // Should show "Super Admin" badge
    expect(sidebarContent).toContain('Super Admin');
  });
});

// ─── During impersonation: Admin-only sidebar ───────────────
test.describe('Impersonation Sidebar: During', () => {
  test('Sidebar shows ADMIN items (not SuperAdmin) during impersonation', async ({
    page,
  }, testInfo) => {
    // Only run on desktop (impersonation requires tenant table row click)
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip();
      return;
    }

    // Step 1: Login as SuperAdmin
    await loginAsSuperAdmin(page);

    // Step 2: Navigate to tenants and wait for data to load
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);
    // Extra wait for API data to populate the table
    await page.waitForTimeout(3000);

    // Step 3: Click on first tenant row to open drawer
    const tenantRow = page.locator('table tbody tr').first();
    await expect(tenantRow).toBeVisible({ timeout: 20000 });
    await tenantRow.click();
    await page.waitForTimeout(2000);

    // Step 4: Click Impersonar button in drawer
    const impersonarBtn = page.getByRole('button', {
      name: /impersonar empresa/i,
    });
    await expect(impersonarBtn).toBeVisible({ timeout: 5000 });
    await impersonarBtn.click();
    await page.waitForTimeout(1500);

    // Step 5: Fill justification textarea
    const reasonField = page.locator('textarea').first();
    await expect(reasonField).toBeVisible({ timeout: 5000 });
    await reasonField.fill('Prueba E2E automatizada: verificar sidebar durante impersonacion correctamente');

    // Step 6: Check policy checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 3000 });
    await checkbox.check();

    // Step 7: Click submit
    const submitBtn = page.getByRole('button', {
      name: /Iniciar Sesión de Soporte/i,
    });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    await submitBtn.click();

    // Step 8: Wait for impersonation to complete (page reloads to /dashboard)
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await waitForPageLoad(page);

    // Step 9: Assert sidebar content
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    const sidebarContent = (await sidebar.textContent()) || '';

    // ── Should show ADMIN items ──
    expect(sidebarContent).toContain('Clientes');
    expect(sidebarContent).toContain('Productos');
    expect(sidebarContent).toContain('Pedidos');
    expect(sidebarContent).toContain('Dispositivos');

    // ── Should NOT show SuperAdmin-only items ──
    expect(sidebarContent).not.toContain('Gestión de Empresas');
    expect(sidebarContent).not.toContain('Dashboard Sistema');
    expect(sidebarContent).not.toContain('Configuración Global');

    // ── Should show "ADMIN (Soporte)" badge, not "Super Admin" ──
    expect(sidebarContent).toContain('ADMIN (Soporte)');
    expect(sidebarContent).not.toContain('Super Admin');

    // ── Impersonation banner should be visible ──
    const bodyContent = (await page.textContent('body')) || '';
    const hasBanner =
      bodyContent.includes('MODO SOPORTE') || bodyContent.includes('Soporte');
    expect(hasBanner).toBeTruthy();

    await page.screenshot({
      path: 'e2e/screenshots/impersonation-sidebar-admin-only.png',
      fullPage: true,
    });
  });
});
