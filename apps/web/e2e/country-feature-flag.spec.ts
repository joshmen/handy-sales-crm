import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Country-based Feature Flags E2E Tests
 *
 * Verifies:
 * 1. Country selector appears in Settings > Appearance (both ES and EN)
 * 2. Changing country to non-MX hides the Facturación/Billing sidebar section
 * 3. Changing country back to MX restores it
 * 4. Labels translate correctly when switching language
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
  // Restore country to MX and language to ES to leave clean state
  try {
    await sharedPage.goto('/settings?tab=appearance');
    await sharedPage.waitForTimeout(1500);

    // Restore country to MX
    const countryCombobox = sharedPage.locator('button[role="combobox"]').nth(3);
    await countryCombobox.click();
    await sharedPage.waitForTimeout(300);
    const mxOption = sharedPage.locator('[role="option"]').filter({ hasText: 'MX' }).first();
    if (await mxOption.isVisible()) {
      await mxOption.click();
    }
    await sharedPage.waitForTimeout(300);

    // Restore language to ES
    const langCombobox = sharedPage.locator('button[role="combobox"]').nth(0);
    await langCombobox.click();
    await sharedPage.waitForTimeout(300);
    const esOption = sharedPage.locator('[role="option"]').filter({ hasText: 'Español' }).first();
    if (await esOption.isVisible()) {
      await esOption.click();
    }
    await sharedPage.waitForTimeout(300);

    // Save
    const saveBtn = sharedPage.getByRole('button', { name: /Guardar|Save/i });
    if (await saveBtn.isVisible()) {
      await saveBtn.click();
      await sharedPage.waitForTimeout(2000);
    }
  } catch {
    // Best effort cleanup
  }
  await sharedPage.context().close();
});

test('Settings > Appearance shows country selector (Spanish)', async () => {
  await sharedPage.goto('/settings?tab=appearance');
  await sharedPage.waitForTimeout(1500);

  // The card heading should be "Apariencia" in Spanish
  await expect(sharedPage.getByRole('heading', { name: 'Apariencia' })).toBeVisible();

  // Scroll down to see the Country field (below fold)
  await sharedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sharedPage.waitForTimeout(500);

  // Country label should exist (exact match)
  await expect(sharedPage.getByText('País', { exact: true })).toBeVisible();

  // Country description about SAT/CFDI
  await expect(sharedPage.getByText(/SAT\/CFDI/)).toBeVisible();

  // The country combobox should show MX by default
  // It's the 4th combobox: Language, Timezone, Currency, Country
  const countryCombobox = sharedPage.locator('button[role="combobox"]').nth(3);
  await expect(countryCombobox).toContainText('MX');
});

test('Sidebar shows Facturación when country is MX', async () => {
  await sharedPage.goto('/dashboard');
  await sharedPage.waitForTimeout(1500);

  // Facturación should be visible in sidebar (translated label)
  const billingLink = sharedPage.locator('[data-sidebar-item]').filter({ hasText: /Facturación|Billing/i });
  // If no data attribute, look for the sidebar text directly
  const sidebarBilling = sharedPage.getByText(/Facturación/i).first();
  await expect(sidebarBilling).toBeVisible();
});

test('Change country to US hides Facturación from sidebar', async () => {
  // Go to settings and change country to US
  await sharedPage.goto('/settings?tab=appearance');
  await sharedPage.waitForTimeout(1500);

  // Scroll down to country selector
  await sharedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sharedPage.waitForTimeout(500);

  // Click the country combobox (4th one)
  const countryCombobox = sharedPage.locator('button[role="combobox"]').nth(3);
  await countryCombobox.click();
  await sharedPage.waitForTimeout(500);

  // Select US
  const usOption = sharedPage.locator('[role="option"]').filter({ hasText: /US — Estados Unidos/ });
  await usOption.click();
  await sharedPage.waitForTimeout(300);

  // Scroll save button into view and click
  const saveBtn = sharedPage.getByRole('button', { name: /Guardar configuración/i });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click();

  // The save triggers window.location.reload() — wait for the page to fully reload
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // Navigate to dashboard to check sidebar
  await sharedPage.goto('/dashboard');
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // Facturación should NOT be visible in sidebar
  const sidebar = sharedPage.locator('nav').first();
  await expect(sidebar.getByText(/Facturación/i)).toHaveCount(0);
});

test('Change language to English — labels translate correctly', async () => {
  // Go to settings and switch language to English
  await sharedPage.goto('/settings?tab=appearance');
  await sharedPage.waitForTimeout(1500);

  // Click language combobox (1st one) — esperar a que esté hidratado
  const langCombobox = sharedPage.locator('button[role="combobox"]').nth(0);
  await langCombobox.waitFor({ state: 'visible', timeout: 10000 });
  await langCombobox.click();

  // Select English — esperar opción visible antes de click (race condition común
  // con Radix Select porque el portal renderea con delay)
  const enOption = sharedPage.locator('[role="option"]').filter({ hasText: 'English' });
  await enOption.waitFor({ state: 'visible', timeout: 5000 });
  await enOption.click();
  await sharedPage.waitForTimeout(300);

  // Save settings
  const saveBtn = sharedPage.getByRole('button', { name: /Guardar|Save/i });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click();

  // Wait for reload (language change triggers full reload)
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(3000);

  // Navigate to appearance tab in English
  await sharedPage.goto('/settings?tab=appearance');
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // Card heading should now be "Appearance"
  await expect(sharedPage.getByRole('heading', { name: 'Appearance' })).toBeVisible();

  // Scroll down to see Country field
  await sharedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sharedPage.waitForTimeout(500);

  // Country label should be "Country"
  await expect(sharedPage.getByText('Country', { exact: true })).toBeVisible();

  // Country description should be in English
  await expect(sharedPage.getByText(/SAT\/CFDI billing for Mexico/i)).toBeVisible();

  // Save button should be in English
  await expect(sharedPage.getByRole('button', { name: /Save settings/i })).toBeVisible();
});

test('Billing still hidden in English when country is US', async () => {
  await sharedPage.goto('/dashboard');
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // In English, Facturación becomes "Billing" — neither should appear in sidebar
  const sidebar = sharedPage.locator('nav').first();
  await expect(sidebar.getByText(/Facturación|Billing/i)).toHaveCount(0);
});

test('Restore country to MX — Billing reappears (in English)', async () => {
  await sharedPage.goto('/settings?tab=appearance');
  await sharedPage.waitForTimeout(1500);

  // Scroll down to country selector
  await sharedPage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sharedPage.waitForTimeout(500);

  // Click country combobox (4th)
  const countryCombobox = sharedPage.locator('button[role="combobox"]').nth(3);
  await countryCombobox.click();
  await sharedPage.waitForTimeout(500);

  // Select MX
  const mxOption = sharedPage.locator('[role="option"]').filter({ hasText: /MX — México/ });
  await mxOption.click();
  await sharedPage.waitForTimeout(300);

  // Save
  const saveBtn = sharedPage.getByRole('button', { name: /Save settings/i });
  await saveBtn.scrollIntoViewIfNeeded();
  await saveBtn.click();

  // Wait for reload
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // Go to dashboard and verify Billing is back
  await sharedPage.goto('/dashboard');
  await sharedPage.waitForLoadState('networkidle', { timeout: 15000 });
  await sharedPage.waitForTimeout(2000);

  // In English, the sidebar label for billing is "Billing"
  const sidebar = sharedPage.locator('nav').first();
  await expect(sidebar.getByText(/Billing/i)).toBeVisible();
});
