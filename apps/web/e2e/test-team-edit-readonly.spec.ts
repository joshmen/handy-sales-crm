import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Regression — admin@jeyma.com 2026-05-04:
 * Edit team member (vendedor) en /team daba error genérico y no permitía
 * cambios. Email + teléfono ahora son read-only (no editable) con icono
 * Lock visible. Solo nombre + status editables.
 */
test.setTimeout(60_000);

test.describe('Team member edit drawer — read-only fields', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('email y teléfono inputs son readOnly (no editables)', async ({ page }) => {
    await page.goto('/team');
    await expect(page).toHaveURL(/team/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Esperar a que la tabla cargue. Buscar al menos una fila con texto de email.
    const emailCell = page.getByText(/@jeyma\.com/).first();
    await expect(emailCell).toBeVisible({ timeout: 15000 });

    // Click en el botón Edit por aria-label
    const editBtn = page.getByRole('button', { name: /^Editar / }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await page.waitForTimeout(1500);

    // Email input debe ser readOnly
    const emailInput = page.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(emailInput).toHaveAttribute('readonly', '');

    // Phone input debe ser readOnly
    const phoneInput = page.locator('input[type="tel"]').first();
    if (await phoneInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(phoneInput).toHaveAttribute('readonly', '');
    }

    // Verificar que aparece el label "(no editable)" cerca de los inputs
    const labelHints = page.getByText('(no editable)');
    expect(await labelHints.count()).toBeGreaterThanOrEqual(1);
  });
});
