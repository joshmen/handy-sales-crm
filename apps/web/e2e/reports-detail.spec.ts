import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Audit code-quality 2026-06-06 — Bug #12 fix.
 *
 * El spec anterior navegaba a `/reports/${id}` para cada reporte, pero
 * /reports es SPA con state `activeReport` (no usa router individual).
 * Por eso 16 tests pasaban trivialmente: `goto('/reports/X')` → 404 →
 * status 404 != 500 → assertion `expect(status).not.toBe(500)` PASSED.
 *
 * Reescrito para usar el flow REAL: click en cada card del index renderea
 * el reporte inline dentro de `<div data-tour="reports-content">`.
 * Verifica:
 *   1. La card es clickable y dispara setActiveReport
 *   2. ActiveComponent monta (`[data-tour="reports-content"]` aparece)
 *   3. Botón ArrowLeft "Volver a reportes" presente para regresar
 *   4. Click en breadcrumb "Reportes" o ArrowLeft → vuelve al grid
 *   5. NO hay "Application error" / crashed durante el flujo
 *
 * Cubre los 16 reportes (incluyendo los 4 restaurados por Bug #8).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

// (id, regex bilingüe del título del card) — espejo del reports array en
// page.tsx + reportes-core.spec.ts. Mantener sincronizado al agregar reportes.
const REPORTS: Array<{ id: string; titleRegex: RegExp }> = [
  { id: 'ejecutivo', titleRegex: /Dashboard Ejecutivo|Executive Dashboard/i },
  { id: 'ventas-periodo', titleRegex: /Ventas por Per[ií]odo|Sales by Period/i },
  { id: 'ventas-vendedor', titleRegex: /Ventas por Vendedor|Sales by Vendor/i },
  { id: 'ventas-producto', titleRegex: /Ventas por Producto|Sales by Product/i },
  { id: 'ventas-zona', titleRegex: /Ventas por Zona|Sales by Zone/i },
  { id: 'actividad-clientes', titleRegex: /Actividad de Clientes|Client Activity/i },
  { id: 'nuevos-clientes', titleRegex: /Nuevos Clientes|New Clients/i },
  { id: 'inventario', titleRegex: /Inventario|Inventory/i },
  { id: 'cartera-vencida', titleRegex: /Cartera Vencida|Overdue/i },
  { id: 'cumplimiento-metas', titleRegex: /Cumplimiento de Metas|Goal Achievement/i },
  { id: 'comparativo', titleRegex: /Comparativo|Comparative/i },
  { id: 'insights', titleRegex: /Insights|Auto Insights/i },
  { id: 'efectividad-visitas', titleRegex: /Efectividad de Visitas|Visit Effectiveness/i },
  { id: 'comisiones', titleRegex: /Comisiones|Commissions/i },
  { id: 'rentabilidad-cliente', titleRegex: /Rentabilidad por Cliente|Client Profitability/i },
  { id: 'analisis-abc', titleRegex: /An[áa]lisis ABC|ABC Analysis/i },
];

test.describe('Reports — SPA flow (click card → render inline)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // El spec es Desktop-only: en mobile algunas reports tienen layouts
    // complejos que ya cubre reportes-core. Aquí validamos la NAV interaction,
    // no el render. test.skip() en beforeEach hace skip del test individual
    // (no del describe entero como hacer skip() afuera).
    test.skip(testInfo.project.name === 'Mobile Chrome',
      'Mobile cubierto por reportes-core; este spec valida nav SPA Desktop');

    await loginAsAdmin(page);
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
  });

  for (const report of REPORTS) {
    test(`Card "${report.id}" abre reporte inline + back vuelve al grid`, async ({ page }) => {
      // 1) Localizar el card específico del reporte: scope al wrapper
      // [data-tour="reports-cards"] para evitar match con los tabs.
      // Usamos filter({ hasText }) en vez de filter({ has: nested locator })
      // porque la versión nested no resuelve relativo al button.
      const cardsWrapper = page.locator('[data-tour="reports-cards"]');
      await expect(cardsWrapper.getByRole('heading', { name: report.titleRegex, level: 3 }).first())
        .toBeVisible({ timeout: 10000 });

      // Card es un <button> que contiene el heading. Si el reporte es premium-
      // lock para el tenant FREE seedeado, click triggera toast.error con texto
      // i18n `reports.lockedReport` = "Este reporte requiere un plan superior.
      // Tu plan actual: {plan}" → setActiveReport NO se llama y el grid sigue
      // visible. Detectamos ese caso y skipeamos.
      const cardBtn = cardsWrapper.locator('button').filter({ hasText: report.titleRegex }).first();
      await cardBtn.click();
      await page.waitForTimeout(800);

      // 2) Detectar lock por toast.error (regex matchea i18n es+en exactos del
      // backend ReportAccessService + reports.lockedReport key).
      const reportContent = page.locator('[data-tour="reports-content"]');
      const lockToast = page.locator(
        'text=/Este reporte requiere un plan superior|This report requires a higher plan/i'
      ).first();
      const isLocked = await lockToast.isVisible({ timeout: 1500 }).catch(() => false);
      if (isLocked) {
        test.info().annotations.push({
          type: 'skipped',
          description: `${report.id} bloqueado por tier FREE — flujo lock OK`,
        });
        // Verificar que NO abrió el reporte: el grid de cards sigue visible.
        await expect(page.locator('[data-tour="reports-cards"]')).toBeVisible();
        return;
      }

      // 3) Reporte ABIERTO: el wrapper [data-tour="reports-content"] está visible.
      // Timeout 10s para reports con data-fetch pesado (ejecutivo, comparativo).
      await expect(reportContent).toBeVisible({ timeout: 10000 });

      // 4) No hay "Application error" en el body al renderizar.
      const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
      const crashed = bodyText.match(/Application error|crashed|Internal Server Error/i);
      expect(crashed).toBeFalsy();

      // 5) Botón "Volver a reportes" (ArrowLeft) está presente.
      // El page.tsx renderea actions del PageHeader con aria-label=t('backToReports').
      const backBtn = page.getByRole('button', { name: /Volver a reportes|Back to reports/i }).first();
      await expect(backBtn).toBeVisible({ timeout: 5000 });

      // 6) Click back → reporte se cierra, vuelve al grid de cards.
      await backBtn.click();
      await page.waitForTimeout(500);
      await expect(reportContent).not.toBeVisible({ timeout: 5000 });

      // Verificar que volvimos al index: el card del reporte X vuelve visible.
      await expect(cardsWrapper.getByRole('heading', { name: report.titleRegex, level: 3 }).first())
        .toBeVisible({ timeout: 5000 });
    });
  }
});
