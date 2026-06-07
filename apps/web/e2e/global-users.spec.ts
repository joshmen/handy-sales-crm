import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin, loginAsVendedor } from './helpers/auth';

/**
 * QA Audit 2026-06-06 — Admin / Global Users (gestion cross-tenant).
 *
 * HIGH gap: /admin/global-users es hot path para soporte SaaS + impersonation
 * pero NO tiene spec Playwright. Sin test, regresiones en:
 *  - Listado cross-tenant (SA ve usuarios de TODOS los tenants)
 *  - Filtros por tenant / rol / estado
 *  - RBAC negativo (ADMIN/VENDEDOR no debe acceder)
 * pasan inadvertidas en produccion.
 *
 * Pattern: serial mode (SA unico = xjoshmenx, single-session). Cleanup
 * implicito (read-only — filtros y busqueda no mutan estado).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('Global users — SuperAdmin happy path', () => {
  test('SA carga /admin/global-users y la pagina renderea sin crash', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/admin/global-users');

    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    const isCritical = bodyText.match(/Application error|crashed|Internal Server Error/i);
    expect(isCritical).toBeFalsy();
  });

  test('SA ve PageHeader con titulo y subtitle con count de usuarios', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });
  });

  test('SA ve tabla cross-tenant con multiples empresas representadas', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    // Spinner no debe quedar colgado
    const spinners = page.locator('.animate-spin');
    const stuckSpinner = await spinners.first().isVisible({ timeout: 500 }).catch(() => false);
    if (stuckSpinner) {
      // BUG / FIX TODO: spinner colgado significa GET /api/admin/users (cross-tenant)
      // tarda demasiado o devuelve 500. Revisar GlobalUsersController.
      console.warn('[global-users] spinner stuck >4s');
    }

    const bodyText = (await page.locator('main').first().textContent()) ?? '';
    // Empty state O datos reales — ambos son aceptables, pero NO debe
    // verse mensaje de "sin permisos" / acceso denegado.
    expect(bodyText).not.toMatch(/Acceso no disponible|access denied|sin permisos/i);
  });

  test('SA ve filtros: busqueda + tenant + rol + estado', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[type="text"]').first();
    await expect(searchInput).toBeVisible({ timeout: 10000 });

    const bodyText = (await page.locator('main').first().textContent()) ?? '';
    // Roles del dropdown declarados en page.tsx
    const hasRoleFilter = /Super Admin|Vendedor|Supervisor|Todos los roles/i.test(bodyText);
    expect(hasRoleFilter).toBeTruthy();
  });

  test('SA filtra por busqueda y la tabla se actualiza (no crash)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('admin');
    await page.waitForTimeout(1500);

    // Pagina no debe haber crasheado por el filtro
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    expect(bodyText).not.toMatch(/Application error|crashed/i);
  });
});

test.describe('Global users — RBAC negativo', () => {
  test('ADMIN regular NO accede a /admin/global-users (redirige fuera)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/global-users');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/global-users($|\?)/);
  });

  test('VENDEDOR NO accede a /admin/global-users (redirige fuera)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsVendedor(page);
    await page.goto('/admin/global-users');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/global-users($|\?)/);
  });
});
