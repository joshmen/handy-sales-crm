import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * Team / MiembrosTab — SUPERVISOR scope (Item #3 inventory gaps 2026-06-06).
 *
 * Por que existe:
 *   MiembrosTab.tsx (lineas 185, 1607-1609, 1851-1853) tiene branch
 *   isSupervisor que:
 *     1. consume GET /api/supervisores/mis-vendedores (NO /api/usuarios global)
 *     2. limita el select "Rol" del modal "Invitar" a [SUPERVISOR, VIEWER, VENDEDOR]
 *     3. esconde miembros con rol ADMIN o SUPER_ADMIN
 *   team-invite-flow.spec.ts solo prueba el caller ADMIN; no valida el
 *   branch SUPERVISOR. Una regresion que conecte a /usuarios global o que
 *   reintroduzca ADMIN/SUPER_ADMIN en el select pasa silenciosa.
 *
 * Cobertura:
 *   - GET /api/supervisores/mis-vendedores se invoca (NO /api/usuarios global).
 *   - Modal "Invitar" muestra select con SOLO {SUPERVISOR, VIEWER, VENDEDOR}.
 *   - ADMIN y SUPER_ADMIN ausentes del select.
 *
 * Requiere: SUPERVISOR slot 1 sembrado con vendedores asignados (ver
 * seed_e2e_supervisor_pg.sql).
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Team SUPERVISOR — MiembrosTab scope', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('SUPERVISOR carga /team e invoca /api/supervisores/mis-vendedores', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // Capturamos el request ANTES de navegar para no race-condition.
    const misVendedoresPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/supervisores/mis-vendedores') && resp.status() === 200,
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto('/team');

    // Esperamos a que la tab MiembrosTab pintee (titulo o tabla visible).
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    const resp = await misVendedoresPromise;

    await page.screenshot({
      path: 'e2e/screenshots/team-supervisor-miembros.png',
      fullPage: true,
    });

    // BUG / FIX TODO: si resp es null el branch SUPERVISOR no se ejecuto
    // y MiembrosTab esta usando el endpoint global /api/usuarios (leak).
    // Revisar MiembrosTab.tsx lineas 185 / 1607-1609.
    expect(resp, 'GET /api/supervisores/mis-vendedores debe haber sido invocado').not.toBeNull();
  });

  test('SUPERVISOR no ve miembros con rol ADMIN ni SUPER_ADMIN en la tabla', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // La tabla MiembrosTab no debe listar badges ADMIN / SUPER_ADMIN.
    // Usamos getByText con matchers exactos para evitar match con la palabra
    // "ADMIN" dentro de "ADMINistracion" del breadcrumb.
    const adminBadge = page.getByText(/^ADMIN$/);
    const superAdminBadge = page.getByText(/^SUPER_ADMIN$/);

    // Toleramos 0 matches; si hay >0, es leak de privilegios.
    expect(await adminBadge.count(), 'SUPERVISOR no debe ver miembros ADMIN').toBe(0);
    expect(await superAdminBadge.count(), 'SUPERVISOR no debe ver miembros SUPER_ADMIN').toBe(0);
  });

  test('Modal "Invitar" muestra solo {SUPERVISOR, VIEWER, VENDEDOR}', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Abrir modal "Nuevo usuario" (alineado con team-invite-flow.spec.ts).
    const newUserBtn = page.getByRole('button', { name: /nuevo usuario|invitar/i }).first();
    await expect(newUserBtn).toBeVisible({ timeout: 10000 });
    await newUserBtn.click();

    // El select de rol puede ser un <select> nativo o un combobox Radix.
    // Intentamos primero como select nativo; si no, fallback a combobox.
    const nativeSelect = page.locator('select[name="rol"], select#rol').first();
    const comboboxTrigger = page.getByRole('combobox', { name: /rol/i }).first();

    if (await nativeSelect.count() > 0) {
      const options = await nativeSelect.locator('option').allTextContents();
      const upper = options.map((o) => o.trim().toUpperCase());

      expect(upper.some((o) => o.includes('SUPERVISOR'))).toBeTruthy();
      expect(upper.some((o) => o.includes('VIEWER'))).toBeTruthy();
      expect(upper.some((o) => o.includes('VENDEDOR'))).toBeTruthy();
      // BUG / FIX TODO: si ADMIN o SUPER_ADMIN aparecen, MiembrosTab.tsx
      // lineas 1851-1853 no esta filtrando para isSupervisor.
      expect(upper.some((o) => o === 'ADMIN')).toBeFalsy();
      expect(upper.some((o) => o === 'SUPER_ADMIN')).toBeFalsy();
    } else if (await comboboxTrigger.count() > 0) {
      await comboboxTrigger.click();
      // Esperamos a que el listbox aparezca.
      const listbox = page.getByRole('listbox');
      await expect(listbox).toBeVisible({ timeout: 5000 });

      const optTexts = await listbox.getByRole('option').allTextContents();
      const upper = optTexts.map((o) => o.trim().toUpperCase());

      expect(upper.some((o) => o.includes('SUPERVISOR'))).toBeTruthy();
      expect(upper.some((o) => o.includes('VIEWER'))).toBeTruthy();
      expect(upper.some((o) => o.includes('VENDEDOR'))).toBeTruthy();
      expect(upper.some((o) => o === 'ADMIN')).toBeFalsy();
      expect(upper.some((o) => o === 'SUPER_ADMIN')).toBeFalsy();
    } else {
      // BUG / FIX TODO: si el modal no tiene ni <select> ni combobox visible,
      // el form cambio sin actualizar este spec. Revisar MiembrosTab.tsx.
      throw new Error('Select de rol no encontrado en modal Invitar (revisar MiembrosTab.tsx)');
    }
  });
});
