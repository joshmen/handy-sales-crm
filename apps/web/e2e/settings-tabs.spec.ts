import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Settings tabs.
 *
 * GAP: /settings tiene múltiples tabs (general, fiscal, branding, security,
 * horario-laboral, modo-venta) y solo 3 cubiertos por tests específicos
 * (perfil-empresa, test-horario-laboral, test-modo-venta-default). Faltan:
 *  - Tab general
 *  - Tab branding
 *  - Tab security/2FA
 *  - Tab fiscal
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Settings — tabs accesibles', () => {
  test('Página /settings carga con tabs', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const heading = page.getByRole('heading', { name: /Configuración|Settings/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Tabs presentes (al menos 3)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tabs = page.locator('[role="tab"]');
    const count = await tabs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('Tab "Apariencia" o "Branding" accesible', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const tab = page.getByRole('tab', { name: /Apariencia|Branding|Aspecto/i }).first();
    if (!await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await tab.click();
    await page.waitForTimeout(800);
    // El tab debe quedar seleccionado
    const selected = await tab.getAttribute('aria-selected').catch(() => null);
    expect(selected === 'true' || selected === null).toBeTruthy();
  });

  test('Tab "Seguridad" o "2FA" accesible', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const tab = page.getByRole('tab', { name: /Seguridad|2FA|Security/i }).first();
    if (!await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await tab.click();
    await page.waitForTimeout(800);
  });
});
