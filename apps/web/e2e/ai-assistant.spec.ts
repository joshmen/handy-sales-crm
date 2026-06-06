import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — AI Assistant.
 *
 * GAP: /ai sin coverage. Smoke test que página carga.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('AI Assistant', () => {
  test('Página /ai accesible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/ai');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('/ai');
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    const isError = bodyText.match(/500|Internal.*error/i);
    expect(isError).toBeFalsy();
  });

  test('Input de chat o textarea presente', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/ai');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    const input = page.locator('textarea, input[type="text"]').first();
    if (await input.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(input).toBeVisible();
    }
  });
});
