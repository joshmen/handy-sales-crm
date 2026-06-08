import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsVendedor } from './helpers/auth';

/**
 * adm-fe-company-settings — Full coverage for /settings tab "Marca" (CompanyTab).
 *
 * Target screen: apps/web/src/app/(dashboard)/settings/page.tsx
 *                + apps/web/src/app/(dashboard)/settings/components/CompanyTab.tsx
 *
 * Scope (capa frontend, rol ADMIN):
 *  - Page renders for ADMIN, redirects non-admin (VENDEDOR) to /profile
 *  - 5 tabs visible (Perfil, Marca, Apariencia, Notificaciones, Sistema)
 *  - "Marca" tab activable + form fields render (nombre + colores)
 *  - Save button enable/disable lifecycle (no changes -> disabled; on change -> enabled)
 *  - Persist company name + primary color via Save and reload
 *  - Tab URL deeplink (?tab=company) opens the CompanyTab directly
 *  - Cross-link to /billing/settings (fiscal) is visible
 *  - RBAC negative: VENDEDOR cannot access /settings
 *
 * Notes:
 *  - No em-dashes in strings. Use ":" or "." per CLAUDE.md.
 *  - serial mode within the suite because tests share company state mutations.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

async function gotoBrandTab(page: Page): Promise<void> {
  await page.goto('/settings?tab=company');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);
  const brandTab = page.getByRole('tab', { name: /Marca|Brand/i }).first();
  await expect(brandTab).toBeVisible({ timeout: 15000 });
  // Defensive: clicking ensures activation even if deeplink default tab differs.
  await brandTab.click();
  await expect(brandTab).toHaveAttribute('data-state', 'active');
  // Wait for content (#company-name input present)
  await expect(page.locator('#company-name')).toBeVisible({ timeout: 10000 });
}

test.describe('Admin company settings — Marca tab full flow', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('renders /settings page with PageHeader for ADMIN', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const heading = page
      .getByRole('heading', { name: /Configuración|Settings/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Cross-link banner to billing fiscal settings.
    const fiscalLink = page.getByRole('link', {
      name: /Facturación.*Configuración Fiscal|Facturaci[oó]n/i,
    }).first();
    await expect(fiscalLink).toBeVisible({ timeout: 5000 });
    await expect(fiscalLink).toHaveAttribute('href', '/billing/settings');
  });

  test('shows 5 tabs (Perfil, Marca, Apariencia, Notificaciones, Sistema)', async ({
    page,
  }) => {
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(5);

    // Each expected tab should be reachable by name.
    await expect(
      page.getByRole('tab', { name: /Perfil/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Marca|Brand/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Apariencia|Appearance/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Notificaciones|Notifications/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Sistema|System/i }).first(),
    ).toBeVisible();
  });

  test('Marca tab activates and renders all form fields', async ({ page }) => {
    await gotoBrandTab(page);

    // CompanyTab card title.
    await expect(
      page.getByRole('heading', {
        name: /Configuración de Empresa|Company Settings/i,
      }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Form fields.
    await expect(page.locator('#company-name')).toBeVisible();
    await expect(page.locator('#primary-color')).toBeVisible();
    await expect(page.locator('#secondary-color')).toBeVisible();

    // Save button present.
    const saveBtn = page
      .getByRole('button', { name: /Guardar configuración|Save settings/i })
      .first();
    await expect(saveBtn).toBeVisible();
  });

  test('Save button is disabled when no changes, enabled after edit', async ({
    page,
  }) => {
    await gotoBrandTab(page);

    const saveBtn = page
      .getByRole('button', { name: /Guardar configuración|Save settings/i })
      .first();
    await expect(saveBtn).toBeDisabled({ timeout: 10000 });

    const nameInput = page.locator('#company-name');
    const original = await nameInput.inputValue();

    // Edit name -> button becomes enabled.
    await nameInput.fill(`${original} QA`);
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });

    // Revert -> button disabled again.
    await nameInput.fill(original);
    await expect(saveBtn).toBeDisabled({ timeout: 5000 });
  });

  test('saves company name change and persists after reload', async ({
    page,
  }) => {
    await gotoBrandTab(page);

    const nameInput = page.locator('#company-name');
    const original = await nameInput.inputValue();
    const stamp = Date.now().toString().slice(-6);
    const testName = `Jeyma QA ${stamp}`;

    await nameInput.fill(testName);

    const saveBtn = page
      .getByRole('button', { name: /Guardar configuración|Save settings/i })
      .first();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Button returns to disabled state once save round-trip completes
    // (hasChanges flips to false after originalSettings sync).
    await expect(saveBtn).toBeDisabled({ timeout: 15000 });

    // Reload + reopen Marca tab to verify persistence.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const brandTab = page.getByRole('tab', { name: /Marca|Brand/i }).first();
    await brandTab.click();
    await expect(page.locator('#company-name')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#company-name')).toHaveValue(testName, {
      timeout: 10000,
    });

    // Restore original to keep tests deterministic.
    await page.locator('#company-name').fill(original);
    const saveBtn2 = page
      .getByRole('button', { name: /Guardar configuración|Save settings/i })
      .first();
    await expect(saveBtn2).toBeEnabled();
    await saveBtn2.click();
    await expect(saveBtn2).toBeDisabled({ timeout: 15000 });
  });

  test('updates primary color via hex input and saves', async ({ page }) => {
    await gotoBrandTab(page);

    // Locate the text input that mirrors the primary color picker.
    // The picker has id=primary-color (type=color); the second text input next
    // to it accepts the same value. We target it by the visible placeholder.
    const primaryHexInput = page.getByPlaceholder('#3B82F6').first();
    await expect(primaryHexInput).toBeVisible();
    const originalHex = await primaryHexInput.inputValue();

    const newHex = '#22C55E';
    await primaryHexInput.fill(newHex);

    const saveBtn = page
      .getByRole('button', { name: /Guardar configuración|Save settings/i })
      .first();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(saveBtn).toBeDisabled({ timeout: 15000 });

    // Restore.
    await primaryHexInput.fill(originalHex || '#3B82F6');
    if (await saveBtn.isEnabled().catch(() => false)) {
      await saveBtn.click();
      await expect(saveBtn).toBeDisabled({ timeout: 15000 });
    }
  });

  test('deeplink ?tab=company opens Marca tab directly', async ({ page }) => {
    await page.goto('/settings?tab=company');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const brandTab = page.getByRole('tab', { name: /Marca|Brand/i }).first();
    await expect(brandTab).toBeVisible({ timeout: 10000 });
    await expect(brandTab).toHaveAttribute('data-state', 'active');
    await expect(page.locator('#company-name')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Admin company settings — RBAC negative', () => {
  test('VENDEDOR cannot access /settings (redirected away)', async ({
    page,
  }) => {
    await loginAsVendedor(page);

    await page.goto('/settings');
    await page.waitForTimeout(3000);

    // Middleware + page-level redirect: /settings is ADMIN-only.
    // Either middleware blocks (URL stays off /settings) or the page redirects
    // non-admin users to /profile (see settings/page.tsx useEffect).
    const url = page.url();
    expect(url).not.toMatch(/\/settings(\?|$)/);
  });
});
