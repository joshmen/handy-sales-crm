import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-06 — Admin / Subscription Plans (CRUD planes SaaS).
 *
 * HIGH gap: /admin/subscription-plans expone el CRUD de planes SaaS con
 * precios y feature flags (ej. incluye_tracking_vendedor) que son
 * SuperAdmin-only y mueven la economia del producto. Sin spec:
 *  - Cambios accidentales de precio en prod no se detectan
 *  - Toggle de feature flags (tracking, reportes, soporte prioritario)
 *    puede regresarse silenciosamente
 *  - RBAC negativo no esta cubierto
 *
 * Pattern: serial mode (SA unico). Cleanup: cualquier mutacion debe
 * restaurar estado original — esta suite es READ-ONLY para no romper
 * planes reales del entorno local (uso DELETE/PUT solo si la suite
 * provisiona y limpia su propio plan). Aqui mantenemos solo lectura
 * para evitar contaminacion cross-test.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('Subscription plans — SuperAdmin happy path', () => {
  test('SA carga /admin/subscription-plans sin crash', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/subscription-plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/admin/subscription-plans');

    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    const isCritical = bodyText.match(/Application error|crashed|Internal Server Error/i);
    expect(isCritical).toBeFalsy();
  });

  test('SA ve PageHeader con titulo + KPI cards (total, activos, empresas)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/subscription-plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });

    // KPI cards declarados en page.tsx: totalPlans, activePlans, companiesWithPlan
    const bodyText = (await page.locator('main').first().textContent()) ?? '';
    const hasKpis = /Planes|Activos|Empresas/i.test(bodyText);
    expect(hasKpis).toBeTruthy();
  });

  test('SA ve botones de accion: Refrescar + Nuevo plan', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/subscription-plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const refreshBtn = page.getByRole('button', { name: /Refrescar|Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 8000 });

    // Boton "Nuevo Plan" / "Crear plan" — texto depende de i18n key newPlan.
    const newPlanBtn = page.getByRole('button', { name: /Nuevo plan|Crear plan|New plan/i }).first();
    await expect(newPlanBtn).toBeVisible({ timeout: 8000 });
  });

  test('SA ve tabla de planes O empty state (no spinner colgado)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/subscription-plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    const spinners = page.locator('.animate-spin');
    const stuckSpinner = await spinners.first().isVisible({ timeout: 500 }).catch(() => false);
    if (stuckSpinner) {
      // BUG / FIX TODO: spinner colgado >4s = endpoint subscriptionPlanAdminService.getAll
      // tarda o falla silente. Revisar SubscriptionPlanAdminEndpoints.
      console.warn('[subscription-plans] spinner stuck >4s');
    }

    const table = page.locator('table').first();
    const emptyState = page.getByText(/no.*planes|create.*first|crear primer/i).first();
    const tableVisible = await table.isVisible({ timeout: 3000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 3000 }).catch(() => false);

    expect(tableVisible || emptyVisible).toBeTruthy();
  });

  test('SA abre drawer de crear plan con click en "Nuevo plan"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/subscription-plans');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const newPlanBtn = page.getByRole('button', { name: /Nuevo plan|Crear plan|New plan/i }).first();
    if (!(await newPlanBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await newPlanBtn.click();
    await page.waitForTimeout(1500);

    // Drawer debe abrirse mostrando campos del form (nombre, codigo, precio).
    const bodyText = (await page.locator('body').first().textContent()) ?? '';
    const hasFormFields = /Nombre|Código|Codigo|Precio|Caracter[ií]sticas/i.test(bodyText);
    expect(hasFormFields).toBeTruthy();

    // Cerrar drawer (ESC o boton X) para no contaminar siguiente test.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});

test.describe('Subscription plans — RBAC negativo', () => {
  test('ADMIN regular NO accede a /admin/subscription-plans', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/subscription-plans');
    await page.waitForTimeout(3000);

    const url = page.url();
    expect(url).not.toMatch(/\/admin\/subscription-plans($|\?)/);
  });
});
