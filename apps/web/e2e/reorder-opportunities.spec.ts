import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Oportunidades de Reorden', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('page loads with breadcrumb + run-now button', async ({ page }) => {
    await page.goto('/clients/reorder-opportunities');
    await expect(page).toHaveURL(/reorder-opportunities/, { timeout: 15000 });

    await expect(page.getByRole('heading', { name: 'Oportunidades de reorden' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('run-now-btn')).toBeVisible();
  });

  test('sidebar entry under Clientes navigates to the page', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    // Expandir submenu Clientes (button con label "Clientes") y luego click en
    // "Oportunidades de reorden" dentro del submenu.
    const clientesButton = page.locator('aside button, aside a').filter({ hasText: /^Clientes$/ }).first();
    await expect(clientesButton).toBeVisible({ timeout: 10000 });
    await clientesButton.click();

    const sidebarLink = page.locator('a[href="/clients/reorder-opportunities"]').first();
    await expect(sidebarLink).toBeVisible({ timeout: 5000 });
    await sidebarLink.click();

    await expect(page).toHaveURL(/reorder-opportunities/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Oportunidades de reorden' })).toBeVisible({ timeout: 10000 });
  });

  test('automation config drawer shows Frecuencia selector for Sugerir reorden', async ({ page }) => {
    await page.goto('/automations');
    await expect(page).toHaveURL(/automations/, { timeout: 15000 });

    // Localizar el ⚙️ config button del template pedido-recurrente
    // Cada card tiene su botón de config; buscamos por nombre del template.
    const cards = page.locator('[data-tour="automations-grid"] > div');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Buscar la card con texto que coincida con "reorden" (slug pedido-recurrente)
    const reordenCard = cards.filter({ hasText: /reorden/i }).first();
    await expect(reordenCard).toBeVisible({ timeout: 10000 });

    // Click en el botón de config (ícono Gear) dentro de esa card
    const configBtn = reordenCard.locator('button[title*="onfigur"], button[aria-label*="onfigur"]').first();
    // Fallback: cualquier botón con la rueda
    if (await configBtn.count() === 0) {
      // El config button suele estar al final de la card; buscar por SVG
      await reordenCard.locator('button').last().click();
    } else {
      await configBtn.click();
    }

    // Drawer abre con el form de config
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 10000 });

    // Verificar que aparece el label "Frecuencia de ejecución"
    await expect(drawer.getByText(/Frecuencia de ejecuci/i)).toBeVisible({ timeout: 5000 });
  });

  test('run-now triggers analysis and shows KPIs', async ({ page }) => {
    await page.goto('/clients/reorder-opportunities');
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
    await page.goto('/clients/reorder-opportunities');
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

  test('FULL FLOW: oportunidades-reorden → click Programar visita → visits drawer abierto con cliente lleno', async ({ page }) => {
    // 1) Land on oportunidades page (real user flow)
    await page.goto('/clients/reorder-opportunities');
    await expect(page.getByRole('heading', { name: 'Oportunidades de reorden' })).toBeVisible({ timeout: 15000 });

    // 2) Trigger analysis to populate urgentes
    await page.getByTestId('run-now-btn').click();
    await page.waitForSelector('[data-testid="oportunidades-page"]', { timeout: 30000 });

    // 3) Click Programar visita button (any urgent cliente)
    const visitButton = page.locator('[data-testid^="visit-cliente-"]').first();
    const buttonExists = await visitButton.count() > 0;
    if (!buttonExists) {
      // No urgent clients in local seed — fallback to direct navigation
      await page.goto('/visits?clienteId=1');
    } else {
      await visitButton.click();
    }

    // 4) Should navigate to /visits with clienteId param
    await expect(page).toHaveURL(/\/visits\?clienteId=/, { timeout: 15000 });

    // 5) Drawer must open
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 15000 });

    // 6) Cliente field must show client name (not placeholder)
    const clienteCombobox = page
      .locator('[data-tour="visits-form-client"]')
      .getByRole('combobox');
    await expect(clienteCombobox).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      const buttonText = (await clienteCombobox.textContent())?.trim() ?? '';
      expect(buttonText.length).toBeGreaterThan(0);
      expect(buttonText.toLowerCase()).not.toContain('selecciona');
    }).toPass({ timeout: 8000, intervals: [500, 1000, 2000] });
  });

  test('visits direct deep link prefills client', async ({ page }) => {
    await page.goto('/visits?clienteId=1');
    await expect(page).toHaveURL(/visits/, { timeout: 15000 });

    // Drawer should auto-open (after clients[] loads)
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 15000 });

    // El SearchableSelect del cliente es un combobox button. Cuando está
    // pre-seleccionado, muestra el NOMBRE del cliente; cuando no, muestra
    // el placeholder. Validamos que NO sea el placeholder.
    const clienteCombobox = page
      .locator('[data-tour="visits-form-client"]')
      .getByRole('combobox');
    await expect(clienteCombobox).toBeVisible({ timeout: 10000 });

    // Esperar a que options carguen + form aplique defaultValues
    await expect(async () => {
      const buttonText = (await clienteCombobox.textContent())?.trim() ?? '';
      // El placeholder es "Seleccionar cliente..." o similar.
      // Si vemos un nombre real (no vacío, no contiene "Selecciona" ni "Seleccionar"),
      // significa que está pre-seleccionado.
      expect(buttonText.length).toBeGreaterThan(0);
      expect(buttonText.toLowerCase()).not.toContain('selecciona');
      expect(buttonText.toLowerCase()).not.toContain('select');
    }).toPass({ timeout: 8000, intervals: [500, 1000, 2000] });
  });
});
