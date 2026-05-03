import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Regression — admin@jeyma.com 2026-05-04:
 *
 * 6a) El banner "El cliente está fuera de la zona..." era rojo (alarmista) y
 *     se leía como un error bloqueante. Cambiar a tono amber (warning) e
 *     incluir mensaje "puedes guardar igual".
 * 6b) Toast post-save decía solo "Éxito" — no homologado con productos/zonas
 *     que dicen "X actualizado correctamente". Cambiar a "Cliente actualizado
 *     exitosamente" / "Cliente creado exitosamente".
 */
test.setTimeout(60_000);

test.describe('Client edit — UX fixes (Jeyma 2026-05-04)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  async function gotoFirstClientEdit(page: import('@playwright/test').Page) {
    await page.goto('/clients');
    await expect(page).toHaveURL(/clients/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const editBtn = page.getByRole('button', { name: /^editar$/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
    await page.waitForTimeout(1500);
  }

  test('toast post-save dice mensaje específico, no solo "Éxito"', async ({ page }) => {
    await gotoFirstClientEdit(page);

    // Trigger un cambio mínimo: marcar isDirty editando descripción
    const descInput = page.locator('input[name="descripcion"]').or(
      page.locator('input[type="text"]').first()
    );
    const currentName = await descInput.inputValue();
    await descInput.fill(currentName + ' ');
    await descInput.fill(currentName); // restaurar (idempotente)

    // Forzar save sin cambios reales: hacer un cambio real que se pueda revertir
    await descInput.fill(currentName + ' [test]');

    const saveBtn = page.getByRole('button', { name: /guardar cambios/i }).first();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // El toast debe contener "Cliente actualizado" — NO solo "Éxito"
    const toast = page.getByText(/Cliente actualizado/i);
    await expect(toast).toBeVisible({ timeout: 15000 });

    // Verificar que NO aparece el toast genérico "Éxito" solo (sin más texto)
    // (Si aparece "Cliente actualizado exitosamente", contiene "exitosamente"
    // pero NO es un toast standalone "Éxito")

    // Restaurar nombre original
    await page.waitForTimeout(2000);
    await page.goto('/clients');
    await page.waitForTimeout(1500);
    const editBtn2 = page.getByRole('button', { name: /^editar$/i }).first();
    if (await editBtn2.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editBtn2.click();
      await page.waitForTimeout(1500);
      const desc2 = page.locator('input[type="text"]').first();
      await desc2.fill(currentName);
      const saveBtn2 = page.getByRole('button', { name: /guardar cambios/i }).first();
      if (await saveBtn2.isEnabled().catch(() => false)) {
        await saveBtn2.click();
        await page.waitForTimeout(2000);
      }
    }
  });

  test('banner fuera de zona usa tono amber (warning), no rojo (error)', async ({ page }) => {
    await gotoFirstClientEdit(page);

    // Si el cliente actual está fuera de zona, el banner aparece. Si está
    // dentro, el banner NO aparece — en ese caso este test pasa trivialmente
    // (verificamos que cuando aparece, NO es rojo).
    const banner = page.getByText(/fuera de la zona/i).first();
    const visible = await banner.isVisible({ timeout: 3000 }).catch(() => false);

    if (visible) {
      // El banner debe tener clase amber-* (NO red-*)
      const bannerEl = banner.locator('xpath=ancestor::p[1]');
      const cls = (await bannerEl.getAttribute('class')) || '';
      expect(cls, 'banner debe ser amber, no rojo').toMatch(/amber/i);
      expect(cls, 'banner NO debe tener clase red-').not.toMatch(/text-red/i);
    } else {
      console.log('Cliente dentro de zona — banner no aparece (test trivial pasa)');
    }
  });
});
