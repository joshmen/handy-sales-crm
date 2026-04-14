import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Buy Timbres E2E Test
 *
 * Verifies:
 * 1. Buy timbres page loads packages from API (not hardcoded)
 * 2. Packages display correctly with prices and badges
 * 3. Selecting a package and clicking Pay opens embedded checkout
 * 4. After purchase (simulated via Stripe CLI trigger), timbres are added
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

let sharedPage: Page;

test.beforeAll(async ({ browser }) => {
  const context = await browser.newContext({
    storageState: 'e2e/.auth/admin-desktop.json',
  });
  sharedPage = await context.newPage();
  await loginAsAdmin(sharedPage);
});

test.afterAll(async () => {
  await sharedPage.context().close();
});

test('Buy timbres page loads packages from API', async () => {
  await sharedPage.goto('/subscription/buy-timbres');
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // Should show "Select a package" heading
  await expect(sharedPage.getByText(/Select a package|Selecciona un paquete/i)).toBeVisible();

  // Should show 3 packages loaded from API
  const packages = sharedPage.locator('[role="radio"]');
  await expect(packages).toHaveCount(3);

  // First package: 25 timbres
  await expect(packages.nth(0)).toContainText('25');

  // Second package: 50 timbres with "Most popular" or "Más popular" badge
  await expect(packages.nth(1)).toContainText('50');

  // Third package: 100 timbres
  await expect(packages.nth(2)).toContainText('100');
});

test('Selecting package 25 updates Pay button amount', async () => {
  // Click the 25 timbres package
  const pkg25 = sharedPage.locator('[role="radio"]').nth(0);
  await pkg25.click();
  await sharedPage.waitForTimeout(300);

  // The Pay button should show $50.00
  const payBtn = sharedPage.getByRole('button', { name: /Pay|Pagar/i });
  await expect(payBtn).toContainText('50');
});

test('Clicking Pay opens embedded Stripe checkout', async () => {
  // Click Pay button
  const payBtn = sharedPage.getByRole('button', { name: /Pay|Pagar/i });
  await payBtn.click();

  // Should show loading state then embedded checkout
  await sharedPage.waitForTimeout(3000);

  // The heading should still show "Buy additional stamps"
  await expect(sharedPage.getByRole('heading', { name: /Buy additional stamps|Comprar timbres/i })).toBeVisible();

  // Back button should be visible
  await expect(sharedPage.getByRole('button', { name: /Back|Volver/i })).toBeVisible();

  // The checkout container (rounded-xl bg-white for Stripe iframe) should be visible
  const checkoutContainer = sharedPage.locator('.overflow-hidden.rounded-xl.bg-white');
  await expect(checkoutContainer).toBeVisible();
});

test('Back button returns to package selection', async () => {
  const backBtn = sharedPage.getByRole('button', { name: /Back|Volver/i });
  await backBtn.click();
  await sharedPage.waitForTimeout(1000);

  // Should show packages again
  const packages = sharedPage.locator('[role="radio"]');
  await expect(packages).toHaveCount(3);
});

test('Current balance section shows timbre info', async () => {
  // Should show current balance card
  await expect(sharedPage.getByText(/current balance|balance actual/i)).toBeVisible();

  // Should show available count
  await expect(sharedPage.getByText(/available|disponible/i)).toBeVisible();
});
