import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Navigation tests — verify each main page is reachable.
 * Post-Pencil redesign usa direct URL navigation en vez de sidebar links
 * (sidebar puede estar colapsado y los links pueden estar en sub-menus).
 */
test.describe('Navigation (Authenticated)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('should be on Dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should navigate to Clients page', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/client/);
    await expect(page.getByRole('heading', { name: /Clientes/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Products page', async ({ page }) => {
    await page.goto('/products');
    await expect(page).toHaveURL(/product/);
    await expect(page.getByRole('heading', { name: /Productos/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Orders page', async ({ page }) => {
    await page.goto('/orders');
    await expect(page).toHaveURL(/order/);
    await expect(page.getByRole('heading', { name: /Pedidos/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Inventory page', async ({ page }) => {
    await page.goto('/inventory');
    await expect(page).toHaveURL(/inventory/);
    // Inventario heading puede ser "Inventario" o "Stock"
    await expect(page.getByRole('heading', { name: /Inventario|Stock/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Routes page', async ({ page }) => {
    await page.goto('/routes');
    await expect(page).toHaveURL(/routes/);
    await expect(page.getByRole('heading', { name: /Rutas/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Team page', async ({ page }) => {
    // Pencil redesign: usuarios del tenant viven en /team (no /users)
    await page.goto('/team');
    await expect(page).toHaveURL(/team/);
    await expect(page.getByRole('heading', { name: /Equipo|Usuarios|Team/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/settings/);
    await expect(page.getByRole('heading', { name: /Configuraci[oó]n/i }).first()).toBeVisible({ timeout: 10000 });
  });
});
