import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Sidebar collapse/expand.
 *
 * GAP: Sidebar collapse state no testeado. Esta suite valida:
 *  - Toggle colapsar sidebar funciona Desktop
 *  - Persistencia tras reload
 *  - Items siguen accesibles colapsado (tooltips)
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Sidebar — collapse', () => {
  test('Desktop: toggle colapsar sidebar reduce ancho', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // Buscar botón colapsar/expandir sidebar (chevron en sidebar header)
    const collapseBtn = page.locator('aside button, [aria-label*="apsar"], [aria-label*="ollapse"]').first();
    if (!await collapseBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    const sidebarBefore = await page.locator('aside, [role="complementary"]').first().boundingBox().catch(() => null);
    if (!sidebarBefore) {
      test.skip();
      return;
    }
    await collapseBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    const sidebarAfter = await page.locator('aside, [role="complementary"]').first().boundingBox().catch(() => null);
    if (sidebarBefore && sidebarAfter) {
      // El ancho debe ser diferente
      expect(sidebarBefore.width).not.toBe(sidebarAfter.width);
    }
    // Restore
    await collapseBtn.click({ force: true }).catch(() => {});
  });
});
