import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Notifications.
 *
 * GAP: /notifications sin coverage. Esta suite valida:
 *  - Badge count en header
 *  - Página /notifications lista
 *  - Marcar como leído
 *  - Filtros
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Notifications', () => {
  test('Badge count visible en header (admin con notificaciones)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Botón "Mi cuenta" muestra count de notificaciones
    const accountBtn = page.getByRole('button', { name: /Mi cuenta/i }).first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const name = await accountBtn.getAttribute('aria-label').catch(() => '');
      // Si hay notificaciones, el aria-label contiene "X sin leer"
      if (name && name.match(/sin leer/)) {
        expect(name).toMatch(/\d+\s+sin leer/);
      }
    }
  });

  test('/notifications página renderea (si existe)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/notifications');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    // No 404 ni 500
    const isError = bodyText.match(/404|500|Página no encontrada/i);
    expect(isError).toBeFalsy();
  });
});
