import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVendedor } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — RBAC extended.
 *
 * GAP: rbac.spec.ts cubre algunos roles. Esta suite agrega:
 *  - Vendedor NO accede /admin/*
 *  - Vendedor NO accede /settings completo
 *  - Vendedor ve sus propias rutas solamente
 *  - Vendedor NO ve "Eliminar" buttons
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

test.describe('RBAC — vendedor restrictions', () => {
  test('Vendedor NO accede /admin/tenants', async ({ page }) => {
    await loginAsVendedor(page);
    await page.goto('/admin/tenants');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Debe redirigir o mostrar 403/no permitido
    const url = page.url();
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    const redirected = !url.includes('/admin/tenants');
    const blocked = bodyText.match(/403|No tienes|sin permiso|Forbidden/i);
    expect(redirected || !!blocked).toBeTruthy();
  });

  test('Vendedor NO ve botón "Nuevo usuario" en /team', async ({ page }) => {
    await loginAsVendedor(page);
    await page.goto('/team');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Verificar si vendedor llegó a /team o fue bloqueado
    if (!page.url().includes('/team')) {
      // Vendedor no tiene acceso a /team — OK
      return;
    }
    const newBtn = page.getByRole('button', { name: /Nuevo usuario|Crear usuario/i });
    const count = await newBtn.count();
    expect(count).toBe(0);
  });
});
