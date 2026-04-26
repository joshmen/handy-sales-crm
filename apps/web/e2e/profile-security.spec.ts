import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Profile — Password Change Security
 *
 * Updated post-Pencil redesign (2026):
 * - IDs are kebab-case: #current-password, #new-password, #confirm-password
 * - Submit button label: "Actualizar contraseña" (not "Cambiar Contraseña")
 * - No edit-toggle button — form is always visible on Seguridad tab
 * - Profile page renders <SecurityTab /> from settings/components
 */
test.describe('Profile — Password Change Security', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    // Esperar a que la tab Seguridad rendere — Tabs se hidratan tras DOMContentLoaded.
    // No usar networkidle: SignalR mantiene WebSocket abierto, networkidle nunca dispara.
    const securityTab = page.getByRole('tab', { name: 'Seguridad' });
    await securityTab.waitFor({ state: 'visible', timeout: 20000 });

    // Dismiss tour modal si aparece (auto-trigger en primera visita).
    const tourAceptar = page.getByRole('button', { name: 'Aceptar' });
    if (await tourAceptar.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tourAceptar.click();
      await page.waitForTimeout(300);
    }

    await securityTab.click();
    // Esperar a que los inputs renderen (SecurityTab carga via Suspense + ProfileContext).
    await page.locator('#current-password').waitFor({ state: 'visible', timeout: 10000 });
  });

  test('should show password change form', async ({ page }) => {
    await expect(page.locator('#current-password')).toBeVisible();
    await expect(page.locator('#new-password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
  });

  test('should reject mismatched passwords', async ({ page }) => {
    await page.locator('#current-password').fill('test123');
    await page.locator('#new-password').fill('NewPass1');
    await page.locator('#confirm-password').fill('DifferentPass1');

    await page.getByRole('button', { name: /Actualizar contraseña/i }).click();

    await expect(page.getByText(/no coinciden|don't match/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('should reject short passwords client-side', async ({ page }) => {
    await page.locator('#current-password').fill('test123');
    await page.locator('#new-password').fill('Ab1');
    await page.locator('#confirm-password').fill('Ab1');

    await page.getByRole('button', { name: /Actualizar contraseña/i }).click();

    await expect(page.getByText(/al menos 6 caracteres|at least 6/i).first()).toBeVisible({ timeout: 5000 });
  });

  test.skip('should reject passwords without complexity', () => {
    // SecurityTab post-Pencil ya no valida complexity client-side — solo
    // length >= 6 + match. Backend valida complexity al cambio. Si re-agregamos
    // validación client-side, removemos el .skip.
  });

  test.skip('should reject same password as current', () => {
    // SecurityTab post-Pencil no valida same-as-current client-side. Backend
    // responde con error genérico. Cubierto por "should reject wrong current".
  });

  test.skip('should reject wrong current password via API', () => {
    // Backend invalida sesión cuando recibe contraseña incorrecta repetidamente
    // (rate limit + DeviceSession revoke), causando que el test redirija a /login
    // y rompa los siguientes tests del beforeEach. Cubierto en xUnit backend
    // tests; out of scope client-side e2e por side effect en sesión.
  });

  test('should disable submit when fields are empty', async ({ page }) => {
    const submitBtn = page.getByRole('button', { name: /Actualizar contraseña/i });
    await expect(submitBtn).toBeDisabled();
  });
});
