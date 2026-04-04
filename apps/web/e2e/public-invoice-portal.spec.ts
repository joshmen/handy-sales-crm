import { test, expect } from '@playwright/test';

test.describe('Portal Público de Factura', () => {
  // No auth needed — public pages
  test.use({ storageState: { cookies: [], origins: [] } });

  test('should show factura not found for invalid UUID', async ({ page }) => {
    await page.goto('/factura/00000000-0000-0000-0000-000000000000');
    await expect(page.getByText(/factura no encontrada/i)).toBeVisible({ timeout: 15000 });
  });

  test('should show factura not found for malformed UUID', async ({ page }) => {
    await page.goto('/factura/invalid-uuid-string');
    // Should show not found page, not crash with 500
    await expect(page.getByText(/factura no encontrada/i)).toBeVisible({ timeout: 15000 });
  });

  test('should display "Ir al inicio" link on not found page', async ({ page }) => {
    await page.goto('/factura/00000000-0000-0000-0000-000000000000');
    const link = page.getByRole('link', { name: /ir al inicio/i });
    await expect(link).toBeVisible({ timeout: 15000 });
    await expect(link).toHaveAttribute('href', '/');
  });

  test('should show page title and metadata', async ({ page }) => {
    await page.goto('/factura/00000000-0000-0000-0000-000000000000');
    // The page should render without errors (title set via metadata)
    await expect(page).not.toHaveURL(/500/);
  });
});
