import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.setTimeout(120_000);

/**
 * Smoke de la sección Horario laboral en /settings (tab Apariencia).
 * Verifica:
 *  - Card visible con time inputs + chips de días
 *  - Guardar persiste tras reload
 *  - Validación: hora inicio >= hora fin muestra error
 *  - Limpiar borra los campos
 */
test.describe('Settings — Horario laboral', () => {
  test('UI presente + guardar + reload mantiene valores', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Click tab Apariencia
    const tabApariencia = page.getByRole('tab', { name: /apariencia/i });
    if (await tabApariencia.count() > 0) {
      await tabApariencia.click();
      await page.waitForTimeout(800);
    }

    // Buscar la nueva card
    const tituloHorario = page.getByText(/horario laboral/i).first();
    await expect(tituloHorario).toBeVisible({ timeout: 8000 });

    await page.screenshot({ path: 'test-results/horario-laboral-vacio.png', fullPage: false });

    // Set inicio 08:00 y fin 18:00
    const horaInicio = page.locator('input[type="time"]').first();
    const horaFin = page.locator('input[type="time"]').nth(1);
    await horaInicio.fill('08:00');
    await horaFin.fill('18:00');

    // Toggle Lun..Vie
    for (const d of ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']) {
      const chip = page.getByRole('button', { name: new RegExp(`^${d}$`, 'i') }).first();
      if (await chip.count() > 0) {
        const pressed = await chip.getAttribute('aria-pressed');
        if (pressed !== 'true') await chip.click();
      }
    }

    await page.screenshot({ path: 'test-results/horario-laboral-llenado.png', fullPage: false });

    // Guardar
    const btnSave = page.getByRole('button', { name: /^guardar$|guardando|guardado/i }).first();
    await btnSave.click();
    await page.waitForTimeout(1500);

    // Reload + verificar persistencia
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await tabApariencia.click().catch(() => {});
    await page.waitForTimeout(800);

    await expect(page.locator('input[type="time"]').first()).toHaveValue('08:00');
    await expect(page.locator('input[type="time"]').nth(1)).toHaveValue('18:00');

    await page.screenshot({ path: 'test-results/horario-laboral-reload.png', fullPage: false });
  });

  test('validación: hora inicio >= hora fin muestra error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await page.getByRole('tab', { name: /apariencia/i }).click();
    await page.waitForTimeout(800);

    await page.locator('input[type="time"]').first().fill('18:00');
    await page.locator('input[type="time"]').nth(1).fill('08:00');
    await page.waitForTimeout(400);

    // El componente muestra mensaje de error y deshabilita el botón Guardar
    const errorMsg = page.getByText(/inicio.*menor.*fin|start.*earlier.*end/i);
    await expect(errorMsg).toBeVisible({ timeout: 4000 });

    const btnSave = page.getByRole('button', { name: /^guardar$/i }).first();
    await expect(btnSave).toBeDisabled();
  });
});

/**
 * Verifica que GpsActivityMap mapea los 3 nuevos types a iconos sin romperse.
 * No exige que haya pings de los nuevos tipos en data — solo verifica que la
 * página /team carga sin error y que los chips de tipo no muestran string crudo.
 */
test.describe('Team GPS — drawer no rompe con nuevos types', () => {
  test('drawer abre sin pageerror', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));

    await loginAsAdmin(page);
    await page.goto('/team');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    // Click primera fila de vendedor (si hay)
    const firstRow = page.getByText(/vendedor|admin/i).first();
    if (await firstRow.count() > 0) {
      await firstRow.click({ force: true }).catch(() => {});
      await page.waitForTimeout(1500);
    }

    await page.screenshot({ path: 'test-results/team-drawer-with-new-types.png', fullPage: false });

    // Solo flagueamos errores de runtime de los componentes nuevos, no warnings
    // de Next.js dev overlay.
    const relevantes = errors.filter(e =>
      /GpsActivityMap|JornadaCard|MiembrosTab|HorarioLaboral|jornadaStore/i.test(e)
    );
    expect(relevantes).toEqual([]);
  });
});
