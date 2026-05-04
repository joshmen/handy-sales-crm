import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Audit del modal "Crear nuevo usuario" en /equipo (2026-05-04).
 *
 * Cobertura:
 * - Modal abre desde "Nuevo usuario".
 * - Por default, el password field está OCULTO (invite-link flow).
 * - Banner azul informativo aparece SOLO cuando email tiene contenido.
 * - Toggle "Vendedor de campo (sin email)" → muestra password field +
 *   deshabilita email field.
 * - Filtro de roles según rol del caller (admin no ve SUPER_ADMIN ni ADMIN).
 * - Submit con email + sin password → backend invita al usuario.
 *
 * NOTA: este spec NO submitea usuarios reales para no contaminar la DB de
 * staging/dev. Solo valida shape de UI + interacciones del form.
 */
test.describe('Team — invite-link create user flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/equipo');
  });

  test('opens modal sin campo password por default', async ({ page }) => {
    // Botón abrir modal — busca por testID o por texto "Nuevo usuario"
    const newUserBtn = page.getByRole('button', { name: /nuevo usuario/i }).first();
    await expect(newUserBtn).toBeVisible();
    await newUserBtn.click();

    // Modal abierto: título visible
    await expect(page.getByRole('heading', { name: /crear nuevo usuario|crear usuario/i })).toBeVisible();

    // Checkbox "sin email" presente y NO marcado por default
    const sinEmailCheckbox = page.getByTestId('create-user-sin-email');
    await expect(sinEmailCheckbox).toBeVisible();
    await expect(sinEmailCheckbox).not.toBeChecked();

    // Password field NO debe estar visible por default (invite-link flow)
    const passwordField = page.getByTestId('create-user-password');
    await expect(passwordField).toHaveCount(0);
  });

  test('banner invite aparece solo cuando email no esta vacio', async ({ page }) => {
    await page.getByRole('button', { name: /nuevo usuario/i }).first().click();

    // Sin email tipeado: banner NO debe aparecer
    await expect(page.getByText(/le enviaremos un correo a/i)).toHaveCount(0);

    // Tipea email válido
    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.fill('test-invite@example.com');

    // Banner debe aparecer mostrando el email
    await expect(page.getByText(/le enviaremos un correo a/i)).toBeVisible();
    await expect(page.getByText(/test-invite@example.com/)).toBeVisible();
    await expect(page.getByText(/expira en 24 horas/i)).toBeVisible();
  });

  test('toggle sin-email muestra password + deshabilita email', async ({ page }) => {
    await page.getByRole('button', { name: /nuevo usuario/i }).first().click();

    const sinEmailCheckbox = page.getByTestId('create-user-sin-email');
    await sinEmailCheckbox.check();

    // Password field debe aparecer
    const passwordField = page.getByTestId('create-user-password');
    await expect(passwordField).toBeVisible();

    // Email field debe quedar disabled
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeDisabled();

    // Banner invite NO debe aparecer
    await expect(page.getByText(/le enviaremos un correo a/i)).toHaveCount(0);
  });

  test('dropdown rol filtra SUPER_ADMIN y ADMIN cuando caller es admin', async ({ page }) => {
    // loginAsAdmin → admin (no super_admin)
    await page.getByRole('button', { name: /nuevo usuario/i }).first().click();

    // Tap dropdown rol — busca por placeholder "Seleccionar rol" o por label
    const roleDropdown = page.locator('[role="combobox"]').first();
    await roleDropdown.click();

    // ADMIN normal NO debe ver SUPER_ADMIN ni ADMIN como opciones
    // (filtro RoleHierarchy mirror del backend).
    await expect(page.getByRole('option', { name: /^SUPER_ADMIN$/i })).toHaveCount(0);
    await expect(page.getByRole('option', { name: /^ADMIN$/i })).toHaveCount(0);

    // SI debe ver SUPERVISOR / VENDEDOR
    await expect(page.getByRole('option', { name: /SUPERVISOR/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /VENDEDOR/i })).toBeVisible();
  });
});
