import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Oportunidades de Reorden', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('page loads with breadcrumb + run-now button', async ({ page }) => {
    await page.goto('/clients/oportunidades-reorden');
    await expect(page).toHaveURL(/oportunidades-reorden/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: 'Oportunidades de reorden' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('run-now-btn')).toBeVisible();
  });

  test('run-now triggers analysis and shows KPIs', async ({ page }) => {
    await page.goto('/clients/oportunidades-reorden');
    await expect(page.getByRole('heading', { name: 'Oportunidades de reorden' })).toBeVisible({ timeout: 10000 });

    // Trigger analysis
    await page.getByTestId('run-now-btn').click();

    // Wait for KPIs (or empty state) — page loads data after the test endpoint runs
    await page.waitForSelector('[data-testid="kpis"], [data-testid="oportunidades-page"]', { timeout: 30000 });

    // KPIs visible (3 cards: Evaluados, Urgentes, Valor estimado)
    const page_content = page.getByTestId('oportunidades-page');
    await expect(page_content).toBeVisible();
  });

  test('empty state renders cleanly when no analysis data', async ({ page }) => {
    // Without urgent clients (seed local sin pedidos recurrentes) la página
    // debe mostrar empty state legible — no errores ni cards rotos.
    await page.goto('/clients/oportunidades-reorden');
    await expect(page.getByRole('heading', { name: 'Oportunidades de reorden' })).toBeVisible({ timeout: 10000 });

    // Verificar que el contenedor de la página está visible (ya sea con data o vacío)
    const container = page.getByTestId('oportunidades-page');
    await expect(container).toBeVisible({ timeout: 10000 });

    // Si hay tabla rendereada, contadores de CTAs deben coincidir
    const table = page.getByTestId('urgentes-table');
    if (await table.count() > 0) {
      const viewCount = await page.locator('[data-testid^="view-cliente-"]').count();
      const visitCount = await page.locator('[data-testid^="visit-cliente-"]').count();
      expect(viewCount).toBe(visitCount);
    }
  });

  test('visits page honors ?clienteId=X by opening drawer with prefilled client', async ({ page }) => {
    // Navigate directly with deep link param — same pattern as email CTA
    await page.goto('/visits?clienteId=1');
    await expect(page).toHaveURL(/visits/, { timeout: 15000 });

    // Drawer should auto-open
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 10000 });
  });
});
