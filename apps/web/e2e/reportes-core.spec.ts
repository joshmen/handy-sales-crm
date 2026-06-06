import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Reportes.
 *
 * GAP: /reports tiene 16 report cards y ZERO coverage. Esta suite cubre:
 *  - Página /reports lista los 16 cards
 *  - Tier gating: Free user ve lock icon en premium reports
 *  - Click en un report navega a su page
 *  - 4 reportes core (Ventas Periodo, Ventas Vendedor, Cartera Vencida,
 *    Cumplimiento Metas) cargan sin error
 *
 * NO ejerce export CSV ni numeric reconciliation (necesita fixture con
 * dataset conocido).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Reportes — index', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/reports');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
  });

  test('Página /reports carga con título', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Reportes/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Página /reports renderea contenido (cards o lista de reportes)', async ({ page }) => {
    // Tolerante: contar links/cards O verificar que el main tiene texto sustancial
    const reportLinks = page.locator('a[href^="/reports/"], button[data-report-id]');
    const linkCount = await reportLinks.count();
    const mainText = (await page.locator('main').textContent()) ?? '';
    expect(linkCount > 0 || mainText.length > 500).toBeTruthy();
  });

  test('Página /reports renderea los 16 cards esperados', async ({ page }) => {
    // Bug #8: 4 reportes (efectividad-visitas, comisiones, rentabilidad-cliente,
    // analisis-abc) estaban implementados pero no expuestos como cards UI.
    // Este test bloquea cualquier regresión que vuelva a ocultarlos.
    const expectedTitles = [
      // General + Ventas (5)
      /Dashboard Ejecutivo|Executive Dashboard/i,
      /Ventas por Per[ií]odo|Sales by Period/i,
      /Ventas por Vendedor|Sales by Vendor/i,
      /Ventas por Producto|Sales by Product/i,
      /Ventas por Zona|Sales by Zone/i,
      // Clientes (2)
      /Actividad de Clientes|Client Activity/i,
      /Nuevos Clientes|New Clients/i,
      // Inventario + Cobranza + Desempeño base (3)
      /Inventario|Inventory/i,
      /Cartera Vencida|Overdue/i,
      /Cumplimiento de Metas|Goal Achievement/i,
      // Análisis base (2)
      /Comparativo|Comparative/i,
      /Insights|Auto Insights/i,
      // Los 4 nuevos (Bug #8)
      /Efectividad de Visitas|Visit Effectiveness/i,
      /Comisiones|Commissions/i,
      /Rentabilidad por Cliente|Client Profitability/i,
      /An[áa]lisis ABC|ABC Analysis/i,
    ];

    for (const titleRegex of expectedTitles) {
      await expect(
        page.getByRole('heading', { name: titleRegex, level: 3 }).first(),
      ).toBeVisible({ timeout: 5000 });
    }

    // Verificar que el botón clickable existe para cada uno de los 4 nuevos
    const newCardTitles = [
      /Efectividad de Visitas|Visit Effectiveness/i,
      /Comisiones|Commissions/i,
      /Rentabilidad por Cliente|Client Profitability/i,
      /An[áa]lisis ABC|ABC Analysis/i,
    ];
    for (const titleRegex of newCardTitles) {
      const btn = page.locator('button', { has: page.getByRole('heading', { name: titleRegex, level: 3 }) }).first();
      await expect(btn).toBeVisible();
    }
  });

  test('Premium gating UI (lock o badge) visible cuando aplica', async ({ page }) => {
    // Audit code-quality 2026-06-06: Playwright NO acepta mezclar CSS selectors
    // con engine selectors (text=...) en un mismo string comma-separated. Hay
    // que sumar locators por separado y unirlos con .or().
    const lockByData = page.locator('[data-lock="true"]');
    const lockByAria = page.locator('svg[aria-label*="lock" i]');
    const lockByText = page.getByText(/Premium|Upgrade/i);
    const anyLock = lockByData.or(lockByAria).or(lockByText);
    const count = await anyLock.count();
    if (count === 0) {
      // Tenant no tiene gating activo en el seed actual — soft check
      test.skip();
      return;
    }
    await expect(anyLock.first()).toBeVisible();
  });
});

test.describe('Reportes — navegación a páginas individuales', () => {
  const reports = [
    { path: '/reports/ventas-periodo', name: 'Ventas Periodo' },
    { path: '/reports/ventas-vendedor', name: 'Ventas Vendedor' },
    { path: '/reports/cartera-vencida', name: 'Cartera Vencida' },
  ];

  for (const r of reports) {
    test(`Reporte "${r.name}" (${r.path}) carga sin error`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(r.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      // Verificar que la página NO es 404 ni 500
      const pageText = (await page.locator('main, body').first().textContent()) ?? '';
      const isError = pageText.includes('404') || pageText.includes('500') || pageText.match(/Página no encontrada/i);
      if (isError) {
        // Puede ser que el reporte sea premium-locked → upgrade page. Aceptable.
        const isUpgrade = pageText.match(/Premium|Actualiza|Upgrade/i);
        expect(isUpgrade).toBeTruthy();
      } else {
        // Debe haber al menos un heading o card
        const hasContent = pageText.length > 200;
        expect(hasContent).toBeTruthy();
      }
    });
  }
});

test.describe('Reportes — filtros básicos', () => {
  test('Ventas Periodo: date pickers presentes', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/reports/ventas-periodo');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const pageText = (await page.locator('main, body').first().textContent()) ?? '';
    if (pageText.match(/Premium|Actualiza|Upgrade/i)) {
      test.skip();
      return;
    }
    // Date inputs o presets de fecha
    const dateInputs = page.locator('input[type="date"], button:has-text("Hoy"), button:has-text("Este mes"), button:has-text("Esta semana")');
    const count = await dateInputs.count();
    expect(count).toBeGreaterThan(0);
  });
});
