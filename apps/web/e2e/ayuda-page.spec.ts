import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Ayuda / Help page.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Ayuda', () => {
  test('Página /ayuda accesible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/ayuda');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toContain('/ayuda');
  });

  test('Contiene secciones de ayuda (FAQ, soporte, etc)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/ayuda');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const helpSections = page.locator('text=/FAQ|Soporte|Preguntas|Ayuda|Contactar/i');
    const count = await helpSections.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
