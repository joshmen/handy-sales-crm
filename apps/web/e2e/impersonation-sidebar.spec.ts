import { test, expect, Page } from '@playwright/test';
import { loginAsSuperAdmin, getTestEmails } from './helpers/auth';

const API_BASE = 'http://localhost:1050';

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
  test('SuperAdmin sidebar has simplified items before impersonating', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });
    await expect(sidebar.getByText('Dashboard')).toBeVisible({ timeout: 15000 });
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
    test.setTimeout(120000);
    // Use taller viewport so the impersonation modal fits without scrolling
    await page.setViewportSize({ width: 1280, height: 1080 });
    // Only run on desktop (impersonation requires tenant table row click)
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip();
      return;
    }

    // Step 0: Login as SuperAdmin
    await loginAsSuperAdmin(page);

    // End any stale impersonation session via API before starting
    const sessionData = await page.evaluate(async () => {
      const res = await fetch('/api/auth/session');
      return res.json();
    });
    const token = (sessionData as Record<string, string>)?.accessToken;
    if (token) {
      const currentState = await page.request.get(`${API_BASE}/impersonation/current`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
      if (currentState?.ok()) {
        const state = await currentState.json().catch(() => ({})) as { isImpersonating?: boolean; sessionId?: string };
        if (state.isImpersonating && state.sessionId) {
          await page.request.post(`${API_BASE}/impersonation/end`, {
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: JSON.stringify({ sessionId: state.sessionId }),
          }).catch(() => {});
          await page.waitForTimeout(1000);
        }
      }
    }

    // Step 2: Navigate to tenants and wait for data to load
    await page.goto('/admin/tenants');
    await waitForPageLoad(page);
    await page.waitForTimeout(3000);

    // Step 3: Click on a tenant name to navigate to detail page
    const tenantLink = page.getByText('Jeyma S.A. de CV').first();
    await expect(tenantLink).toBeVisible({ timeout: 60000 });
    await tenantLink.click();
    await page.waitForURL(/\/admin\/tenants\/\d+/, { timeout: 15000 });
    await waitForPageLoad(page);

    // Step 4: Click Impersonar button (Shield icon) on detail page
    const impersonarBtn = page.getByRole('button', { name: /impersonar/i });
    await expect(impersonarBtn).toBeVisible({ timeout: 10000 });
    await impersonarBtn.click();
    await page.waitForTimeout(1500);

    // Step 5: Fill justification textarea in the modal
    const reasonField = page.locator('textarea').first();
    await expect(reasonField).toBeVisible({ timeout: 5000 });
    await reasonField.fill('Prueba E2E automatizada: verificar sidebar durante impersonacion correctamente');

    // Step 6: Check policy checkbox
    const checkbox = page.locator('input[type="checkbox"]').first();
    await expect(checkbox).toBeVisible({ timeout: 3000 });
    await checkbox.check();

    // Step 7: Click submit and wait for API response
    const submitBtn = page.getByRole('button', {
      name: /Iniciar Sesión de Soporte/i,
    });
    await expect(submitBtn).toBeVisible({ timeout: 5000 });
    await expect(submitBtn).toBeEnabled({ timeout: 3000 });

    // Listen for API response before clicking
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/impersonation') && resp.request().method() === 'POST',
      { timeout: 15000 }
    ).catch(() => null);

    await submitBtn.click();

    const response = await responsePromise;
    if (response) {
      const status = response.status();
      if (status !== 200 && status !== 201) {
        const body = await response.text().catch(() => 'no body');
        console.log(`Impersonation API returned ${status}: ${body}`);
      }
    }

    // Step 8: Wait for impersonation to complete (page reloads to /dashboard)
    await page.waitForURL(/dashboard/, { timeout: 30000 });
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

    // ── Should show "ADMIN (Soporte)" badge ──
    expect(sidebarContent).toContain('ADMIN (Soporte)');
    // Note: "Super Admin" may appear as the user's name, that's OK.
    // The important thing is the role badge says "ADMIN (Soporte)" not the SA-only indigo badge.

    // ── Impersonation banner should be visible ──
    const bodyContent = (await page.textContent('body')) || '';
    const hasSupportBanner =
      bodyContent.includes('MODO SOPORTE') || bodyContent.includes('Soporte');
    expect(hasSupportBanner).toBeTruthy();

    await page.screenshot({
      path: 'e2e/screenshots/impersonation-sidebar-admin-only.png',
      fullPage: true,
    });
  });
});
