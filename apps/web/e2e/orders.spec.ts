import { test, expect } from '@playwright/test';

// TODO: Fix auth setup for orders page test
test.describe.skip('Orders Page', () => {
  test('should display orders page', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.getByText('Pedidos')).toBeVisible({ timeout: 15000 });
  });
});
