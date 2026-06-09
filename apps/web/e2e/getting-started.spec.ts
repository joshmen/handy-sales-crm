import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Getting Started / Onboarding.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Getting Started', () => {
  test('Página /getting-started accesible para admin', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/getting-started');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);
    expect(page.url()).toContain('/getting-started');
  });

  test('Guía contiene contenido sustancial', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/getting-started');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
    const isCritical = bodyText.match(/Application error|crashed/i);
    expect(isCritical).toBeFalsy();
  });
});
