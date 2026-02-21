import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.locator('#email').fill('admin@jeyma.com');
  await page.locator('#password').fill('test123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

async function goToPerfilTab(page: Page) {
  await page.goto('/settings');
  await page.waitForTimeout(2000);

  // Click the Perfil tab explicitly
  const perfilTab = page.getByRole('tab', { name: /Perfil/i });
  await expect(perfilTab).toBeVisible({ timeout: 10000 });
  await perfilTab.click();

  // Wait for loading to finish — either the spinner disappears or the form appears
  await expect(page.locator('#razonSocial')).toBeVisible({ timeout: 15000 });
}

test.describe('Perfil de Empresa (Settings Tab)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should show Perfil tab for Admin and activate it', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);

    const perfilTab = page.getByRole('tab', { name: /Perfil/i });
    await expect(perfilTab).toBeVisible({ timeout: 10000 });

    await perfilTab.click();
    await expect(perfilTab).toHaveAttribute('data-state', 'active');
  });

  test('should load form with data from API', async ({ page }) => {
    await goToPerfilTab(page);

    // Verify form fields exist and have Jeyma seed data
    await expect(page.locator('#razonSocial')).not.toHaveValue('');
    await expect(page.locator('#rfc')).not.toHaveValue('');
    await expect(page.locator('#telefono')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#contacto')).toBeVisible();
    await expect(page.locator('#sitioWeb')).toBeVisible();
    await expect(page.locator('#direccion')).toBeVisible();
    await expect(page.locator('#ciudad')).toBeVisible();
    await expect(page.locator('#estado')).toBeVisible();
    await expect(page.locator('#codigoPostal')).toBeVisible();
    await expect(page.locator('#descripcion')).toBeVisible();
  });

  test('should enable save button only when form changes', async ({ page }) => {
    await goToPerfilTab(page);

    // Save button should be disabled initially
    const saveButton = page.getByRole('button', { name: /Guardar cambios/i });
    await expect(saveButton).toBeDisabled();

    // Modify a field
    const telefono = page.locator('#telefono');
    const originalValue = await telefono.inputValue();
    await telefono.clear();
    await telefono.fill('555-TEST-1234');

    // Save button should be enabled
    await expect(saveButton).toBeEnabled();

    // Discard button should appear
    const discardButton = page.getByRole('button', { name: /Descartar cambios/i });
    await expect(discardButton).toBeVisible();

    // Click discard
    await discardButton.click();

    // Value should revert and save button disabled
    await expect(telefono).toHaveValue(originalValue);
    await expect(saveButton).toBeDisabled();
  });

  test('should save changes and show success toast', async ({ page }) => {
    await goToPerfilTab(page);

    const sitioWeb = page.locator('#sitioWeb');
    const originalValue = await sitioWeb.inputValue();

    // Modify
    const testValue = `https://test-${Date.now()}.com`;
    await sitioWeb.clear();
    await sitioWeb.fill(testValue);

    // Save
    const saveButton = page.getByRole('button', { name: /Guardar cambios/i });
    await saveButton.click();

    // Success toast
    await expect(page.getByText(/actualizados correctamente/i)).toBeVisible({ timeout: 10000 });

    // Save button disabled again
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    // Verify persistence after reload
    await page.reload();
    await page.waitForTimeout(2000);
    await page.getByRole('tab', { name: /Perfil/i }).click();
    await expect(page.locator('#razonSocial')).toBeVisible({ timeout: 15000 });
    await expect(sitioWeb).toHaveValue(testValue);

    // Restore original
    await sitioWeb.clear();
    await sitioWeb.fill(originalValue);
    await saveButton.click();
    await expect(page.getByText(/actualizados correctamente/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Perfil de Empresa - RBAC', () => {
  test('vendedor should NOT see Perfil tab in Settings', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.locator('#email').fill('vendedor1@jeyma.com');
    await page.locator('#password').fill('test123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });
    await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });

    await page.goto('/settings');
    await page.waitForTimeout(2000);

    const perfilTab = page.getByRole('tab', { name: /Perfil/i });
    await expect(perfilTab).toBeHidden();
  });
});
