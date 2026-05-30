import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Gastos redesign E2E (v25, 2026-05-30):
 * - /gastos standalone eliminado (sidebar + ruta)
 * - Tab "Gastos" en /routes/[id]
 * - Drawer en /routes/manage/[id]/close
 * - Lightbox via Modal anidado
 *
 * NOTE: estos tests son smoke. La existencia de gastos en DB depende del seed.
 * Si no hay gastos para la ruta, validamos el empty state o que el boton "Ver gastos"
 * simplemente no aparece.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: any) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(600);
}

test.describe('Gastos redesign', () => {
  test('/gastos standalone returns 404 (page eliminated)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const response = await page.goto('/gastos', { waitUntil: 'domcontentloaded' });
    // Next.js returns 404 page (still 200 status with not-found rendered, OR 404)
    // Cualquier indicador valido: status 404 o "404" / "not found" en el body
    const status = response?.status() ?? 0;
    const body = await page.content();
    const is404 = status === 404 || /404|not.?found|no se encontr/i.test(body);
    expect(is404).toBeTruthy();
  });

  test('sidebar no muestra item "Gastos"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // El sidebar puede estar colapsado en algunos viewports; buscamos el link role
    const sidebarGastos = page.getByRole('link', { name: /^Gastos$/i });
    const count = await sidebarGastos.count();
    expect(count).toBe(0);
  });

  test('Route detail tiene tab "Gastos"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    // Tomamos la primera ruta de la lista
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Buscar primer link a /routes/[id]
    const firstRouteLink = page.locator('a[href^="/routes/"]:not([href="/routes"]):not([href^="/routes/manage"]):not([href^="/routes/admin"])').first();
    if (await firstRouteLink.count() === 0) {
      test.skip();
      return;
    }
    await firstRouteLink.click();
    await waitForPageLoad(page);

    // Tab Gastos visible
    const gastosTab = page.getByRole('tab', { name: /Gastos/ });
    await expect(gastosTab).toBeVisible({ timeout: 10000 });

    // Click tab y verificar contenido renderizado
    await gastosTab.click();
    await waitForPageLoad(page);

    // Espera el heading o empty state
    const heading = page.getByText(/Gastos imputados a la ruta|Esta ruta a[uú]n no tiene gastos/);
    await expect(heading.first()).toBeVisible({ timeout: 10000 });
  });

  test('Tab gastos sync con URL ?tab=gastos', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const firstRouteLink = page.locator('a[href^="/routes/"]:not([href="/routes"]):not([href^="/routes/manage"]):not([href^="/routes/admin"])').first();
    if (await firstRouteLink.count() === 0) {
      test.skip();
      return;
    }
    const href = await firstRouteLink.getAttribute('href');
    if (!href) {
      test.skip();
      return;
    }
    await page.goto(`${href}?tab=gastos`);
    await waitForPageLoad(page);

    // Tab activo: aria-selected=true en el TabsTrigger
    const gastosTab = page.getByRole('tab', { name: /Gastos/ });
    await expect(gastosTab).toHaveAttribute('aria-selected', 'true', { timeout: 10000 });
  });

  test('Close screen: boton "Ver gastos" abre Drawer (skip si no hay gastos)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    // Buscar una ruta Completada/Cerrada para el close screen
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Tomamos cualquier ruta y vamos al close
    const firstRouteLink = page.locator('a[href^="/routes/"]:not([href="/routes"]):not([href^="/routes/manage"]):not([href^="/routes/admin"])').first();
    if (await firstRouteLink.count() === 0) {
      test.skip();
      return;
    }
    const href = await firstRouteLink.getAttribute('href');
    if (!href) { test.skip(); return; }
    // /routes/[id] → /routes/manage/[id]/close
    const id = href.split('/').pop();
    await page.goto(`/routes/manage/${id}/close`);
    await waitForPageLoad(page);

    // Si hay gastos el boton "Ver gastos" aparece
    const verBtn = page.getByRole('button', { name: /Ver gastos.*\(\d+\)/ });
    if (await verBtn.count() === 0) {
      test.skip(); // ruta sin gastos
      return;
    }

    await verBtn.click();
    await page.waitForTimeout(500);

    // Drawer abre: panel con role=dialog visible
    const drawer = page.locator('[data-drawer-panel][role="dialog"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // El titulo del drawer contiene "Gastos"
    await expect(drawer.getByRole('heading', { name: /Gastos/ })).toBeVisible();

    // ESC cierra el drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await expect(drawer).not.toBeVisible();
  });
});
