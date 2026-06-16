import { test, expect } from '@playwright/test';
import { loginAsAdmin, getTestEmails } from './helpers/auth';

test.describe('Authentication', () => {
  // Clear storageState — these tests verify login/redirect behavior without pre-existing auth
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show login page', async ({ page }) => {
    await page.goto('/login');

    // Verify login form elements - using actual page structure
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('should NOT redirect with invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Dismiss Next.js error overlay if present by pressing Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.locator('#email').fill('wrong@email.com');
    await page.locator('#password').fill('wrongpassword');

    // Use force click to bypass any overlay
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });

    // Wait for some time and verify we're still on login page (not redirected to dashboard)
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/login/);
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Dismiss Next.js error overlay if present
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    const { loginAdmin, password } = getTestEmails();
    await page.locator('#email').fill(loginAdmin);
    await page.locator('#password').fill(password);

    // Use force click to bypass any overlay
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });

    // El usuario de test puede arrastrar una sesión previa (zombie) → la app
    // muestra el modal "Ya tienes una sesión abierta" con "Continuar aquí"
    // (comportamiento correcto de single-session). Lo aceptamos para continuar
    // al dashboard, igual que fillLoginForm en helpers/auth.ts.
    const continueBtn = page.getByRole('button', { name: /Continuar aqu[ií]|Cerrar sesión anterior/i });
    try {
      await Promise.race([
        page.waitForURL(/dashboard/, { timeout: 10000 }),
        continueBtn.waitFor({ state: 'visible', timeout: 10000 }),
      ]);
    } catch {
      // Ninguno aún
    }
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
    }

    // Should redirect to dashboard after login
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });

  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login page
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });

  test.skip('should logout successfully', () => {
    // Logout invalida la sesión server-side (DeviceSession revoke + RefreshToken
    // delete). Eso rompe storageState de tests posteriores en otros archivos
    // (.auth/admin-desktop.json apunta a cookies cuyo backend ya no reconoce).
    // Cubrimos logout via secureStorage + UI manual; testear el redirect aquí
    // requeriría aislamiento de worker. Out of scope.
  });
});
