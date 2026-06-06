import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Zones.
 *
 * GAP: zones-visual.spec.ts solo cubre visual. NO CRUD.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Zones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/zones');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Página /zones renderea con título', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Zonas/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Botón "Nueva zona" presente', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /Nueva zona|Crear zona/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });

  test('Drawer crear zona abre', async ({ page, context }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    // handleCreateZone pide geolocation con timeout 5s antes de abrir el drawer.
    // Concedemos permiso y mockeamos coords para evitar el delay en CI.
    await context.grantPermissions(['geolocation'], { origin: page.url().replace(/\/zones.*/, '') }).catch(() => {});
    await context.setGeolocation({ latitude: 20.6736, longitude: -103.344 }).catch(() => {});

    const newBtn = page.locator('[data-tour="zones-add-btn"]').first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
    await newBtn.click();

    // Patrón canónico: [data-drawer-panel] del Drawer compartido (createPortal).
    const drawer = page.locator('[data-drawer-panel]');
    await expect(drawer).toBeVisible({ timeout: 8000 });
    await expect(drawer.getByRole('heading', { name: /Nueva zona|Crear zona/i })).toBeVisible({ timeout: 5000 });

    // Cierre: scope al drawer para no colisionar con HelpPanel "Cerrar".
    await drawer.locator('button[aria-label="Cerrar"]').first().click();
    // Si form dirty dispara UnsavedChangesDialog, descartar.
    const discard = page.getByRole('button', { name: /Descartar cambios/i });
    if (await discard.isVisible({ timeout: 1000 }).catch(() => false)) await discard.click();
    await expect(drawer).not.toBeVisible({ timeout: 3000 });
  });
});
