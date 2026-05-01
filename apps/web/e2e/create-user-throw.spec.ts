import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Issue 2: crear vendedor desde admin debe disparar toast.error real
 * cuando el backend rechaza (ej: email duplicado).
 *
 * Bug original: useCreateUser retornaba null en error → handler nunca
 * entraba al catch → toast.success aparecía aunque el backend devolvía 400.
 * Fix (e78574d): el hook ahora throw en error.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

test.describe('Issue 2: crear vendedor con error → toast.error real', () => {
  test('email duplicado dispara toast.error (no toast.success silencioso)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/team');
    await waitForPageLoad(page);

    const miembrosTab = page.getByRole('tab', { name: /miembros/i }).first();
    if (await miembrosTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await miembrosTab.click();
      await waitForPageLoad(page);
    }

    const createBtn = page.getByRole('button', { name: /crear usuario|new user|nuevo usuario/i }).first();
    await expect(createBtn).toBeVisible({ timeout: 5000 });
    await createBtn.click();

    await page.locator('input[type="email"]').first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator('input[type="text"]').first().fill('Vendedor Duplicado E2E');
    await page.locator('input[type="email"]').first().fill('admin@jeyma.com');
    await page.locator('input[type="password"]').first().fill('test1234');

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/usuarios') && resp.request().method() === 'POST',
      { timeout: 10000 }
    );

    await page.getByRole('button', { name: /^crear usuario$|^create user$/i }).last().click();

    const response = await responsePromise;
    expect(response.status()).toBeGreaterThanOrEqual(400);

    const errorToast = page.locator('[data-sonner-toast][data-type="error"]');
    await expect(errorToast.first()).toBeVisible({ timeout: 5000 });

    const successToast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(successToast).toHaveCount(0);
  });
});
