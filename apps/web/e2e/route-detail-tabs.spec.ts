import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Refactor route-detail-tabs: pestañas internas en /routes/[id] reemplazan
 * la pantalla separada /routes/manage/[id]/load.
 *
 * Cubre:
 * - Las 4 tabs (Resumen / Paradas / Pedidos / Carga) renderizan
 * - URL sync vía ?tab= cuando se cambia de tab
 * - Redirect 301 desde /routes/manage/[id]/load → /routes/[id]?tab=carga
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

async function gotoFirstRouteDetail(page: Page) {
  // Direct navigation a una ruta conocida del seed (id=35 vendedor1 jeyma).
  // Mas confiable que click en lista — el DataGrid puede tardar en hidratar
  // o esconder filas con filtros default.
  await page.goto('/routes/35');
  await waitForPageLoad(page);
  await expect(page).toHaveURL(/\/routes\/35/, { timeout: 10000 });
  return 35;
}

test.describe('Route Detail Tabs', () => {
  test('renders 4 tabs (Resumen, Paradas, Pedidos, Carga)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const routeId = await gotoFirstRouteDetail(page);
    if (!routeId) return;

    // Radix tabs use role="tab"
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(4);

    await expect(page.getByRole('tab', { name: /resumen|summary/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /paradas|stops/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /pedidos|orders/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /carga|load/i })).toBeVisible();
  });

  test('switching tabs updates ?tab= URL param', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const routeId = await gotoFirstRouteDetail(page);
    if (!routeId) return;

    // Default tab = Resumen → no ?tab= param (or absent)
    const initialUrl = page.url();
    expect(initialUrl).not.toContain('tab=paradas');
    expect(initialUrl).not.toContain('tab=carga');

    // Click Carga
    await page.getByRole('tab', { name: /^carga$|^load$/i }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\?tab=carga/);

    // Click Paradas
    await page.getByRole('tab', { name: /^paradas$|^stops$/i }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\?tab=paradas/);

    // Click Resumen → tab param removed (default)
    await page.getByRole('tab', { name: /^resumen$|^summary$/i }).click();
    await page.waitForTimeout(500);
    await expect(page).not.toHaveURL(/\?tab=/);
  });

  test('Carga tab shows the consolidated table', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const routeId = await gotoFirstRouteDetail(page);
    if (!routeId) return;

    // Direct navigate via ?tab= — bookmarkable URL
    await page.goto(`/routes/${routeId}?tab=carga`);
    await waitForPageLoad(page);

    // Carga tab should be the active one
    const activeTab = page.locator('[role="tab"][data-state="active"]');
    await expect(activeTab).toHaveText(/carga|load/i);

    // The "Total asignado a la ruta" section should be visible
    await expect(page.getByText(/total.*asignado|total.*assigned/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Old /load URL redirect', () => {
  test('GET /routes/manage/[id]/load redirects to /routes/[id]?tab=carga', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    const routeId = await gotoFirstRouteDetail(page);
    if (!routeId) return;

    // Navigate to old URL
    await page.goto(`/routes/manage/${routeId}/load`);
    await waitForPageLoad(page);

    // Should land on /routes/[id]?tab=carga (Next.js 301)
    await expect(page).toHaveURL(new RegExp(`/routes/${routeId}\\?tab=carga$`), { timeout: 10000 });
  });
});
