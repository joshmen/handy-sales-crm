import { test, expect } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * Smoke de la Consola de plataforma (Super Admin): las 8 paginas nuevas cargan,
 * el SA tiene acceso (no redirige a /admin/access-denied) y renderizan su cabecera
 * sin caer en un error boundary. La capa de datos (endpoints) se valida aparte
 * (smoke de API). SA = sesion unica -> serial.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

const CONSOLE_PAGES = [
  '/admin/subscriptions',
  '/admin/analytics',
  '/admin/onboarding',
  '/admin/dunning',
  '/admin/changelog',
  '/admin/modules',
  '/admin/status',
  '/admin/support',
];

test.describe('Consola de plataforma (SA)', () => {
  test('las 8 paginas nuevas cargan y el SA tiene acceso', async ({ page }) => {
    await loginAsSuperAdmin(page);

    for (const path of CONSOLE_PAGES) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1200);

      // 1) No redirige a access-denied ni a login (el SA tiene acceso).
      expect(page.url(), `acceso a ${path}`).toContain(path);
      expect(page.url(), `${path} no debe ir a access-denied`).not.toContain('access-denied');

      // 2) Renderiza una cabecera (PageHeader h1) — la pagina monto sin crash.
      await expect(page.locator('h1').first(), `cabecera en ${path}`).toBeVisible({ timeout: 15000 });

      // 3) No quedo el scaffold "en construccion" (fue reemplazado por el modulo real).
      await expect(page.getByText('Modulo en construccion')).toHaveCount(0);
    }
  });
});
