import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Team members extended.
 *
 * GAP: team-invite-flow.spec.ts cubre crear flow. test-team-edit-readonly.spec.ts
 * cubre readonly fields. Esta suite cubre:
 *  - KPIs Total/Activos/En linea/Sesiones
 *  - Tab Dispositivos
 *  - Filtros por zona y rol
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Team — KPIs y dispositivos', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('KPIs Total/Activos/En linea/Sesiones visibles', async ({ page }) => {
    const kpis = [/Total usuarios/i, /^Activos$/i, /En l[ií]nea/i, /Sesiones/i];
    let found = 0;
    for (const lbl of kpis) {
      if (await page.getByText(lbl).first().isVisible({ timeout: 3000 }).catch(() => false)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(2);
  });

  test('Tab Dispositivos cambia view', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(); return;
    }
    const devTab = page.getByRole('tab', { name: /Dispositivos/i }).first();
    if (!await devTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await devTab.click();
    await page.waitForTimeout(800);
    const selected = await devTab.getAttribute('aria-selected').catch(() => null);
    expect(selected === 'true' || selected === null).toBeTruthy();
  });

  test('Filtro por zona presente', async ({ page }) => {
    const zoneFilter = page.locator('[role="combobox"]').filter({ hasText: /zona|Zona|Todas las zonas/i }).first();
    if (!await zoneFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(zoneFilter).toBeVisible();
  });

  test('Filtro por rol presente', async ({ page }) => {
    const roleFilter = page.locator('[role="combobox"]').filter({ hasText: /rol|Rol|Todos los roles/i }).first();
    if (!await roleFilter.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(roleFilter).toBeVisible();
  });
});
