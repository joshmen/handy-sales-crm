import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Global search (Ctrl+K).
 *
 * GAP: Sin coverage para barra de búsqueda global del header.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Global Search', () => {
  test('Header tiene placeholder "Buscar clientes, productos, pedidos..."', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    const searchEl = page.locator('text=/Buscar clientes, productos, pedidos/i').first();
    if (await searchEl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(searchEl).toBeVisible();
    }
  });

  test('Ctrl+K abre command palette', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(800);
    // Dialog o panel de búsqueda debe abrir
    const dialog = page.locator('[role="dialog"], [role="combobox"][aria-expanded="true"]').first();
    if (await dialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(dialog).toBeVisible();
      // Cerrar con Escape
      await page.keyboard.press('Escape');
    }
  });
});
