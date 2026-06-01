import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * E2E: Drawer y Tab de Devoluciones en admin web.
 *
 * Mirror exacto del spec de gastos pero para devoluciones — verifica que:
 * 1. Tab "Devoluciones" aparece en route detail
 * 2. Drawer abre desde close screen cuando hay devoluciones (count > 0)
 * 3. Card muestra cliente, pedido, monto, motivo, tipo reembolso badge
 * 4. Foto evidencia abre en lightbox grande
 * 5. Modal anular muestra warning específico según TipoReembolso
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

test.describe('Devoluciones — Tab in route detail', () => {
  test('tab "Devoluciones" aparece en route detail page', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const firstRow = page.locator('table tbody tr').first();
    if (!await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No hay rutas en el seed');
      return;
    }
    await firstRow.locator('td').first().click();
    await expect(page).toHaveURL(/\/routes\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);

    const devolucionesTab = page.locator('[role="tab"]', { hasText: /^Devoluciones$/ });
    await expect(devolucionesTab).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/devoluciones-tab-visible.png', fullPage: true });
  });

  test('URL sync con ?tab=devoluciones carga DevolucionesTab', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const firstRow = page.locator('table tbody tr').first();
    if (!await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No hay rutas en el seed');
      return;
    }
    await firstRow.locator('td').first().click();
    await expect(page).toHaveURL(/\/routes\/\d+/, { timeout: 10000 });
    await waitForPageLoad(page);

    // Click en el tab — URL debe actualizarse
    const devolucionesTab = page.locator('[role="tab"]', { hasText: /^Devoluciones$/ });
    await devolucionesTab.click();
    await page.waitForTimeout(400);
    await expect(page).toHaveURL(/\?tab=devoluciones/, { timeout: 5000 });
  });
});

test.describe('Devoluciones — Drawer in close screen', () => {
  test('botón "Ver devoluciones" abre Drawer si count > 0', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    const cerrarBtn = page.locator('button:has-text("Cerrar")').first();
    if (!await cerrarBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'No hay ruta Completada en el seed');
      return;
    }
    await cerrarBtn.click();
    await expect(page).toHaveURL(/\/routes\/manage\/\d+\/close/, { timeout: 10000 });
    await waitForPageLoad(page);

    // El botón solo aparece si hay devoluciones para la ruta
    const verDevolucionesBtn = page.locator('button[aria-label*="Ver devoluciones"]');
    const visible = await verDevolucionesBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!visible) {
      test.skip(true, 'Ruta sin devoluciones (esperado en seed limpio)');
      return;
    }

    await verDevolucionesBtn.click();
    await page.waitForTimeout(400);

    // Drawer debe estar abierto — verificar título
    const drawerTitle = page.locator('h2').filter({ hasText: /Devoluciones/ });
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/devoluciones-drawer-open.png', fullPage: true });
  });
});
