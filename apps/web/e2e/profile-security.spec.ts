import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Profile — Password Change Security', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Click "Seguridad" tab to show password change section
    await page.getByText('Seguridad', { exact: true }).click();
    await page.waitForTimeout(500);
  });

  test('should show password change form', async ({ page }) => {
    // Click "Cambiar Contraseña" button to enter edit mode
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    await expect(page.locator('#currentPassword')).toBeVisible();
    await expect(page.locator('#newPassword')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
  });

  test('should reject mismatched passwords', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    await page.locator('#currentPassword').fill('test123');
    await page.locator('#newPassword').fill('NewPass1');
    await page.locator('#confirmPassword').fill('DifferentPass1');

    // Submit
    await page.getByRole('button', { name: /Cambiar Contraseña/i }).last().click();

    // Should show error toast
    await expect(page.getByText('Las contraseñas no coinciden')).toBeVisible({ timeout: 5000 });
  });

  test('should reject short passwords client-side', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    await page.locator('#currentPassword').fill('test123');
    await page.locator('#newPassword').fill('Ab1');
    await page.locator('#confirmPassword').fill('Ab1');

    await page.getByRole('button', { name: /Cambiar Contraseña/i }).last().click();

    await expect(page.getByText('al menos 6 caracteres')).toBeVisible({ timeout: 5000 });
  });

  test('should reject passwords without complexity', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    await page.locator('#currentPassword').fill('test123');
    await page.locator('#newPassword').fill('nocapshere1');
    await page.locator('#confirmPassword').fill('nocapshere1');

    await page.getByRole('button', { name: /Cambiar Contraseña/i }).last().click();

    await expect(page.getByText('minúscula, una mayúscula y un número')).toBeVisible({ timeout: 5000 });
  });

  test('should reject same password as current', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    // Use a password that passes complexity (upper+lower+digit) to reach the "same as current" check
    await page.locator('#currentPassword').fill('SamePass1');
    await page.locator('#newPassword').fill('SamePass1');
    await page.locator('#confirmPassword').fill('SamePass1');

    await page.getByRole('button', { name: /Cambiar Contraseña/i }).last().click();

    await expect(page.getByText('diferente a la actual')).toBeVisible({ timeout: 5000 });
  });

  test('should reject wrong current password via API', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    await page.locator('#currentPassword').fill('WrongPass99');
    await page.locator('#newPassword').fill('NewSecure1');
    await page.locator('#confirmPassword').fill('NewSecure1');

    await page.getByRole('button', { name: /Cambiar Contraseña/i }).last().click();

    // Backend rejects — look for error toast (could be "incorrecta" or validation error)
    await expect(page.getByText(/incorrecta|error|Error/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('should disable submit when fields are empty', async ({ page }) => {
    const editBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).first();
    await editBtn.click();

    // The submit button should be disabled when fields are empty
    const submitBtn = page.getByRole('button', { name: /Cambiar Contraseña/i }).last();
    await expect(submitBtn).toBeDisabled();
  });
});
