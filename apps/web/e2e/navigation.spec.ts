import { test, expect } from '@playwright/test';

// Authenticated test fixture - run serially to avoid session conflicts
test.describe('Navigation (Authenticated)', () => {
  // Run these tests serially to avoid parallel login conflicts
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    // Login before each test (using same selectors as passing auth tests)
    await page.goto('/login');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.locator('#email').fill('superadmin@handy.com');
    await page.locator('#password').fill('password123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });
    await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
  });

  test('should be on Dashboard after login', async ({ page }) => {
    // Already on dashboard after beforeEach login
    await expect(page).toHaveURL(/dashboard/);
  });

  test.skip('should navigate to Clients page', async ({ page }) => {
    // TODO: Update selectors after Pencil redesign
    await page.getByRole('link', { name: /clientes|clients/i }).click();
    await expect(page).toHaveURL(/client/, { timeout: 10000 });
  });

  test.skip('should navigate to Products page', async ({ page }) => {
    // TODO: Update selectors after Pencil redesign
    await page.getByRole('link', { name: /productos|products/i }).click();
    await expect(page).toHaveURL(/product/, { timeout: 10000 });
  });

  test.skip('should navigate to Orders page', async ({ page }) => {
    // TODO: Update selectors after Pencil redesign
    await page.getByRole('link', { name: /pedidos|orders/i }).click();
    await expect(page).toHaveURL(/order|pedido/, { timeout: 10000 });
  });

  test.skip('should navigate to Inventory page', async ({ page }) => {
    // TODO: Update selectors after Pencil redesign
    await page.getByRole('link', { name: /inventario|inventory/i }).click();
    await expect(page).toHaveURL(/inventory|inventario/, { timeout: 10000 });
  });

  test.skip('should navigate to Routes page', async ({ page }) => {
    // Skip - Routes might not be in sidebar
    await page.getByRole('link', { name: /rutas|routes/i }).click();
    await expect(page).toHaveURL(/route|ruta/, { timeout: 10000 });
  });

  test.skip('should navigate to Users page', async ({ page }) => {
    // Skip - Users might not be in sidebar
    await page.getByRole('link', { name: /usuarios|users/i }).click();
    await expect(page).toHaveURL(/user|usuario/, { timeout: 10000 });
  });

  test.skip('should navigate to Settings page', async ({ page }) => {
    // Skip - Settings might not be in sidebar
    await page.getByRole('link', { name: /configuración|settings/i }).click();
    await expect(page).toHaveURL(/setting|config/, { timeout: 10000 });
  });
});
