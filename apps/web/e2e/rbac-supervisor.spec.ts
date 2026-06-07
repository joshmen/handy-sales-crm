import { test, expect, Page } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * RBAC Tests — SUPERVISOR (Item #2 inventory gaps 2026-06-06).
 *
 * Por que existe este archivo:
 *   rbac.spec.ts solo cubre ADMIN vs VENDEDOR. SUPERVISOR no aparecia
 *   en ningun describe pese a que lib/permissions.ts le da
 *   view_orders/view_routes/view_clients/view_visits/view_metas/view_team.
 *   Sin assertions, una regresion que escale privilegios (ver "Todos los
 *   vendedores") o restrinja vista (ocultar /orders al SUPERVISOR) pasa
 *   silenciosa.
 *
 * Cobertura:
 *   - SUPERVISOR carga /dashboard sin redirect a /login ni 403.
 *   - SUPERVISOR carga /orders, /routes, /clients sin error.
 *   - SUPERVISOR NO ve la opcion "Todos los vendedores" (es ADMIN-only).
 *     El dropdown vendedor debe estar scoped al equipo asignado.
 */

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(1000);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(2000);
}

// Single SUPERVISOR slot dedicado a rbac.spec — serial obligatorio.
test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

test.describe('RBAC - SUPERVISOR - Dashboard', () => {
  test('SUPERVISOR carga /dashboard con title "Tablero"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsSupervisor(page);
    await waitForPageLoad(page);

    await page.screenshot({
      path: 'e2e/screenshots/rbac-supervisor-dashboard.png',
      fullPage: true,
    });

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const title = (await h1.first().textContent())?.toLowerCase() ?? '';
    // SUPERVISOR ve dashboard admin scoped (Tablero), NO "Mi Rendimiento" vendedor.
    expect(title).toContain('tablero');
    expect(title).not.toContain('mi rendimiento');
  });
});

test.describe('RBAC - SUPERVISOR - Pedidos', () => {
  test('SUPERVISOR ve /orders pero SIN opcion "Todos los vendedores"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsSupervisor(page);
    await page.goto('/orders');
    await waitForPageLoad(page);

    await page.screenshot({
      path: 'e2e/screenshots/rbac-supervisor-orders.png',
      fullPage: true,
    });

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const title = await h1.first().textContent();
    expect(title).toContain('Pedidos');

    // BUG / FIX TODO: si el dropdown de vendedor muestra "Todos los vendedores"
    // para SUPERVISOR, hay leak de scope (deberia listar solo cartera asignada).
    // Inventory expected_status: filtro vendedor != "Todos los vendedores".
    const todosOpt = page.getByText('Todos los vendedores');
    await expect(todosOpt).toHaveCount(0);
  });
});

test.describe('RBAC - SUPERVISOR - Rutas', () => {
  test('SUPERVISOR ve /routes pero SIN opcion "Todos los vendedores"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsSupervisor(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    await page.screenshot({
      path: 'e2e/screenshots/rbac-supervisor-routes.png',
      fullPage: true,
    });

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });

    const todosOpt = page.getByText('Todos los vendedores');
    await expect(todosOpt).toHaveCount(0);
  });
});

test.describe('RBAC - SUPERVISOR - Clientes', () => {
  test('SUPERVISOR ve /clients scoped al equipo', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsSupervisor(page);
    await page.goto('/clients');
    await waitForPageLoad(page);

    await page.screenshot({
      path: 'e2e/screenshots/rbac-supervisor-clients.png',
      fullPage: true,
    });

    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible({ timeout: 10000 });
    const title = await h1.first().textContent();
    expect(title).toContain('Clientes');

    // Si /clients renderiza un filtro vendedor, no debe ofrecer "Todos los vendedores".
    const todosOpt = page.getByText('Todos los vendedores');
    await expect(todosOpt).toHaveCount(0);
  });
});
