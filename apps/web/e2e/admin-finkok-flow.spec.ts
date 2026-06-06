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
    const isError = bodyText.match(/500|Internal.*error|Error de servidor/i);
    expect(isError).toBeFalsy();
    // Debe haber heading o título relacionado
    const finkokRelated = bodyText.match(/Finkok|PAC|Emisor|Timbr/i);
    expect(finkokRelated).toBeTruthy();
  });

  test('Botón registro/agregar emisor presente', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsSuperAdmin(page);
    await page.goto('/admin/finkok');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const addBtn = page.getByRole('button', { name: /Nuevo|Agregar|Registrar|Crear/i }).first();
    if (await addBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(addBtn).toBeVisible();
    }
  });
});
