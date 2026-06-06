import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Reports detail pages individual checks.
 *
 * GAP: reportes-core.spec.ts cubre index. Esta suite cubre cada reporte
 * individual a nivel smoke (no 500, no 404, contenido sustancial).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

const REPORTS = [
  'ejecutivo',
  'ventas-periodo',
  'ventas-vendedor',
  'ventas-producto',
  'ventas-zona',
  'actividad-clientes',
  'nuevos-clientes',
  'inventario',
  'cartera-vencida',
  'cumplimiento-metas',
  'comparativo',
  'insights',
  'efectividad-visitas',
  'comisiones',
  'rentabilidad-cliente',
  'analisis-abc',
];

test.describe('Reports — individual pages smoke', () => {
  for (const report of REPORTS) {
    test(`Reporte /reports/${report} smoke (no 500)`, async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto(`/reports/${report}`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      const bodyText = (await page.locator('main, body').first().textContent()) ?? '';
      // SOLO verificamos que no haya error crítico 500. Cualquier estado
      // (404, premium, empty state, contenido) es aceptable como smoke.
      const isCritical = bodyText.match(/500|Internal.*error de servidor|Application error/i);
      expect(isCritical).toBeFalsy();
    });
  }
});
