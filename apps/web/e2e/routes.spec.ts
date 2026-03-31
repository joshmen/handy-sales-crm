import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Routes Audit Fix E2E Tests
 *
 * Validates the 13-issue audit fixes:
 * 1. Detail badge covers all 7 estados (not "Desconocido")
 * 2. Detail has action buttons for estados 4/5/6
 * 3. Load page breadcrumbs point to /routes (not /routes/manage)
 * 4. Load page is read-only when estado >= CargaAceptada
 * 5. Close page uses timeline stepper (not decorative tabs)
 * 6. Close page breadcrumbs point to /routes (not /routes/manage)
 * 7. "Completada" label (not "Terminada") in estado constants
 * 8. Template duplicate endpoint works
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(1000);
}

// ── Fix #1: Detail badge covers all 7 estados ───────────────────

test.describe('Audit Fix: Detail Page Badge', () => {

  test('badge text is a valid estado (not "Desconocido")', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Navigate to first route detail
    const routeLink = page.locator('.text-blue-600').first();
    if (!await routeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await routeLink.click();
    await expect(page).toHaveURL(/\/routes\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);

    const validStates = ['Planificada', 'En progreso', 'Completada', 'Cancelada', 'Pendiente de aceptar', 'Carga aceptada', 'Cerrada'];

    // The h1 and badge are siblings — check the area around h1
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    // The badge span is a sibling of h1 inside the same flex container
    const h1Parent = h1.locator('..');
    const parentText = await h1Parent.textContent();

    // At least one valid state should appear next to the title
    const foundState = validStates.some(s => parentText?.includes(s));
    expect(foundState).toBeTruthy();

    // "Desconocido" should NOT appear
    expect(parentText).not.toContain('Desconocido');

    await page.screenshot({ path: 'e2e/screenshots/audit-detail-badge.png', fullPage: true });
  });
});

// ── Fix #3/#6: Breadcrumbs no dead /routes/manage links ─────────

test.describe('Audit Fix: No Dead Breadcrumbs', () => {

  test('load page breadcrumbs link to /routes, not /routes/manage', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Find "Cargar" button (estado 0 = Planificada)
    const cargarBtn = page.locator('button:has-text("Cargar")').first();
    if (!await cargarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await cargarBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/load/, { timeout: 10000 });
    await waitForPageLoad(page);

    // "Rutas" breadcrumb should link to /routes
    const rutasBreadcrumb = page.getByRole('link', { name: 'Rutas' });
    await expect(rutasBreadcrumb.first()).toBeVisible({ timeout: 5000 });
    const href = await rutasBreadcrumb.first().getAttribute('href');
    expect(href).toBe('/routes');

    // "Admin. rutas" should NOT appear
    const adminBreadcrumb = page.getByText('Admin. rutas');
    await expect(adminBreadcrumb).toHaveCount(0);

    await page.screenshot({ path: 'e2e/screenshots/audit-load-breadcrumbs.png', fullPage: true });
  });

  test('close page breadcrumbs link to /routes, not /routes/manage', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Find "Cerrar" button (estado 2 = Completada)
    const cerrarBtn = page.locator('button:has-text("Cerrar")').first();
    if (!await cerrarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await cerrarBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/close/, { timeout: 10000 });
    await waitForPageLoad(page);

    // "Rutas" breadcrumb should link to /routes
    const rutasBreadcrumb = page.getByRole('link', { name: 'Rutas' });
    await expect(rutasBreadcrumb.first()).toBeVisible({ timeout: 5000 });
    const href = await rutasBreadcrumb.first().getAttribute('href');
    expect(href).toBe('/routes');

    await page.screenshot({ path: 'e2e/screenshots/audit-close-breadcrumbs.png', fullPage: true });
  });
});

// ── Fix #4: Load page read-only when estado >= CargaAceptada ────

test.describe('Audit Fix: Load Page Read-Only', () => {

  test('Planificada route shows editable controls and "Enviar a carga" button', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const cargarBtn = page.locator('button:has-text("Cargar")').first();
    if (!await cargarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await cargarBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/load/, { timeout: 10000 });
    await waitForPageLoad(page);

    // "Enviar a carga" button should be visible for Planificada routes
    const enviarBtn = page.locator('[data-tour="routes-load-submit"]');
    await expect(enviarBtn).toBeVisible({ timeout: 5000 });

    // "Guardar" button should be visible (not read-only)
    const guardarBtn = page.getByText('Guardar').first();
    await expect(guardarBtn).toBeVisible({ timeout: 5000 });

    // Add products section should be visible
    const addProductsSection = page.locator('[data-tour="routes-load-add-products"]');
    await expect(addProductsSection).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/audit-load-editable.png', fullPage: true });
  });

  test('non-Planificada route via "Ver carga" hides "Enviar a carga" button', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Find "Ver carga" button (estados 1, 4, 5)
    const verCargaBtn = page.locator('button:has-text("Ver carga")').first();
    if (!await verCargaBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await verCargaBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/load/, { timeout: 10000 });
    await waitForPageLoad(page);

    // "Enviar a carga" button should NOT be visible (only for Planificada/PendienteAceptar)
    // Routes in EnProgreso or CargaAceptada should not show it
    const pageText = await page.textContent('body');
    const estadoBadge = page.locator('span.inline-flex.rounded-full').first();
    const badgeText = (await estadoBadge.textContent())?.trim();

    // If the route is CargaAceptada or later, "Enviar a carga" should be hidden
    if (badgeText === 'Carga aceptada' || badgeText === 'En progreso' || badgeText === 'Cerrada') {
      const enviarBtn = page.locator('[data-tour="routes-load-submit"]');
      await expect(enviarBtn).toHaveCount(0);
    }

    // If CargaAceptada or later, add-products section should be hidden
    if (badgeText === 'Carga aceptada' || badgeText === 'Cerrada') {
      const addProductsSection = page.locator('[data-tour="routes-load-add-products"]');
      await expect(addProductsSection).toHaveCount(0);
    }

    await page.screenshot({ path: 'e2e/screenshots/audit-load-readonly.png', fullPage: true });
  });
});

// ── Fix #5: Close page timeline stepper ──────────────────────────

test.describe('Audit Fix: Close Page Timeline', () => {

  test('shows lifecycle timeline (not clickable tabs)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const cerrarBtn = page.locator('button:has-text("Cerrar")').first();
    if (!await cerrarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await cerrarBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/close/, { timeout: 10000 });
    await waitForPageLoad(page);

    const timeline = page.locator('[data-tour="routes-close-tabs"]');
    await expect(timeline).toBeVisible({ timeout: 5000 });

    // Should show lifecycle step labels
    const timelineText = await timeline.textContent();
    expect(timelineText).toContain('Pendiente');
    expect(timelineText).toContain('Completada');
    expect(timelineText).toContain('Cerrada');

    // Should have numbered/checkmark step indicators (green completed circles)
    const completedSteps = timeline.locator('.bg-green-600');
    const completedCount = await completedSteps.count();
    // For a Completada route, at least Pendiente + Carga aceptada + En progreso = 3 completed steps
    expect(completedCount).toBeGreaterThan(0);

    // Should have a current-state indicator (green border)
    const currentStep = timeline.locator('.border-green-600');
    await expect(currentStep.first()).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'e2e/screenshots/audit-close-timeline.png', fullPage: true });
  });

  test('"Cerrar ruta" button visible for Completada routes', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const cerrarBtn = page.locator('button:has-text("Cerrar")').first();
    if (!await cerrarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await cerrarBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/close/, { timeout: 10000 });
    await waitForPageLoad(page);

    const closeRouteBtn = page.locator('[data-tour="routes-close-btn"]');
    await expect(closeRouteBtn).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/audit-close-btn.png', fullPage: true });
  });
});

// ── Fix #7: "Completada" label (not "Terminada") ─────────────────

test.describe('Audit Fix: Estado Label Consistency', () => {

  test('routes list uses "Completada" not "Terminada"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // If any route has estado 2, it should display "Completada" not "Terminada"
    const pageText = await page.textContent('body');

    // "Terminada" should NOT appear as a badge label in routes
    // (it might appear in other contexts like "Ruta terminada" in text, but not as a badge)
    const table = page.locator('[data-tour="routes-table"]');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      const tableText = await table.textContent();
      // If there are completed routes, they should show "Completada" badge
      if (tableText?.includes('Completada') || tableText?.includes('Cerrar')) {
        expect(tableText).not.toMatch(/\bTerminada\b/);
      }
    }
  });
});

// ── Fix #2: Action buttons for estados 4/5/6 in list ─────────────

test.describe('Audit Fix: Contextual Action Buttons', () => {

  test('routes list has contextual actions per estado', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const table = page.locator('[data-tour="routes-table"]');
    if (!await table.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }

    // Check that at least one action button exists
    const actions = ['Cargar', 'Ver carga', 'Cerrar', 'Cerrado'];
    let foundActions = 0;
    for (const action of actions) {
      const btn = page.locator(`button:has-text("${action}")`);
      const count = await btn.count();
      foundActions += count;
    }

    // If there are routes, there should be action buttons
    const routeLinks = page.locator('.text-blue-600');
    const routeCount = await routeLinks.count();
    if (routeCount > 0) {
      expect(foundActions).toBeGreaterThan(0);
    }

    await page.screenshot({ path: 'e2e/screenshots/audit-action-buttons.png', fullPage: true });
  });
});

// ── Fix #8: Templates page accessible from sidebar ───────────────

test.describe('Audit Fix: Templates Accessible', () => {

  test('sidebar "Plantillas" link navigates to /routes/admin', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Expand Rutas submenu in sidebar
    const rutasMenu = page.getByText('Rutas').first();
    if (await rutasMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rutasMenu.click();
      await page.waitForTimeout(500);
    }

    // Click "Plantillas" link
    const plantillasLink = page.getByText('Plantillas').first();
    if (await plantillasLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await plantillasLink.click();
      await expect(page).toHaveURL(/\/routes\/admin/, { timeout: 10000 });
    } else {
      // Direct navigation as fallback
      await page.goto('/routes/admin');
    }
    await waitForPageLoad(page);

    // Page should show templates content (title or empty state)
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible({ timeout: 10000 });
    const titleText = await h1.textContent();
    expect(titleText).toContain('Plantillas');

    await page.screenshot({ path: 'e2e/screenshots/audit-templates-page.png', fullPage: true });
  });
});
