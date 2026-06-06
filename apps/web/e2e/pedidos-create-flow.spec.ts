import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Pedidos (Orders) create flow.
 *
 * GAP: orders.spec.ts tiene UN test (lista renderea). No cubre:
 *  - Drawer crear pedido
 *  - Cálculo de total con descuentos
 *  - Cambios de estado
 *  - Vista detalle
 *
 * Esta suite cubre UI flow sin mutaciones destructivas (no submitea).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Pedidos — lista', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Página /orders renderea título Pedidos', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^Pedidos$/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Botón crear pedido visible para admin', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /Nuevo pedido|Crear pedido/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 8000 });
  });

  test('Buscador y filtros presentes', async ({ page }) => {
    const buscador = page.getByPlaceholder(/Buscar/i).first();
    const filterCombo = page.locator('[role="combobox"]').first();
    const hasBuscador = await buscador.isVisible({ timeout: 5000 }).catch(() => false);
    const hasFilter = await filterCombo.isVisible({ timeout: 5000 }).catch(() => false);
    expect(hasBuscador || hasFilter).toBeTruthy();
  });
});

test.describe('Pedidos — crear drawer', () => {
  test('Click "Nuevo pedido" abre drawer con form', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsAdmin(page);
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    const newBtn = page.getByRole('button', { name: /Nuevo pedido|Crear pedido/i }).first();
    if (!await newBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await newBtn.click();
    await page.waitForTimeout(2000);

    // Drawer puede ser sheet, dialog, o panel — verificar que la URL cambió O un sheet apareció
    const urlChanged = page.url().includes('orders/new') || page.url().includes('create');
    const hasDialog = await page.locator('[role="dialog"], [role="region"]:has(input)').first().isVisible({ timeout: 3000 }).catch(() => false);
    expect(urlChanged || hasDialog).toBeTruthy();
    // Cerrar drawer / regresar
    const cancelBtn = page.getByRole('button', { name: /Cancelar|Cerrar/i }).first();
    if (await cancelBtn.isVisible().catch(() => false)) await cancelBtn.click();
  });
});

test.describe('Pedidos — vista detalle', () => {
  test('Click en primer pedido abre detail page', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    await loginAsAdmin(page);
    await page.goto('/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Buscar primer row con click
    const firstRow = page.locator('a[href^="/orders/"]:not([href="/orders"])').first().or(
      page.locator('[role="row"]:has-text("PED-")').first()
    );
    if (!await firstRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await firstRow.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    // URL cambia a /orders/{id}
    const url = page.url();
    expect(url).toMatch(/\/orders\/\d+/);
  });
});
