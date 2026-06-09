import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Admin / Finkok registration.
 *
 * GAP: rama activa `feat/finkok-registration-emisores` y NO hay specs para
 * /admin/finkok que valide:
 *  - Página renderea para SuperAdmin
 *  - Acceso bloqueado para admin regular
 *  - Lista de emisores registrados
 *  - Form de registro presente (no submitea)
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('Admin Finkok', () => {
  test('SuperAdmin puede acceder /admin/finkok', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    // Debe NO redirigir a /dashboard o /login
    expect(page.url()).toContain('/admin/finkok');
  });

  test('Página /admin/finkok renderea sin error', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    // Solo verificar no crash. Empty state aceptable.
    const isCritical = bodyText.match(/Application error|crashed/i);
    expect(isCritical).toBeFalsy();
  });

  test('Acciones de admin emisores (Refrescar) visibles', async ({ page }, testInfo) => {
    // Audit code-quality 2026-06-06: la página /admin/finkok es observacional
    // (suspend/reactivate/credits/switch). El registro de emisores se hace
    // tenant-side en Facturación → Configuración fiscal vía CatalogosController,
    // NO desde SuperAdmin. Por eso aquí no hay botón "Registrar/Crear emisor".
    // Validamos que el botón Refrescar SÍ está visible (siempre presente en
    // el PageHeader del page).
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const refreshBtn = page.getByRole('button', { name: /Refrescar|Refresh/i }).first();
    await expect(refreshBtn).toBeVisible({ timeout: 8000 });
  });

  test('Empty state informa flujo de registro tenant-side', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    // Si hay 0 emisores totales debe mostrar mensaje informativo
    // referenciando "Configuración fiscal" como origen del registro.
    const emptyHint = page.getByText(/No hay emisores registrados|Configuración fiscal/i).first();
    if (await emptyHint.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emptyHint).toBeVisible();
    } else {
      // Hay datos en Finkok — table presente, skip empty assertion
      const table = page.locator('table').first();
      await expect(table).toBeVisible({ timeout: 5000 });
    }
  });
});
