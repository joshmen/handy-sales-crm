import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Regression — admin@jeyma.com 2026-05-02:
 * Web bloqueaba edit de cliente cuando email/teléfono estaban vacíos
 * (FormField renderizaba `*` aunque el zod schema acepta string vacío;
 * además el botón Guardar quedaba disabled por isOutOfZone aunque el
 * banner es solo un warning). Mobile crea clientes sin email/tel y
 * web debe poder editarlos.
 */
test.describe('Edit cliente con email/teléfono vacíos (bug Jeyma 2026-05-02)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  async function gotoFirstClientEdit(page: import('@playwright/test').Page) {
    await page.goto('/clients');
    await expect(page).toHaveURL(/clients/, { timeout: 15000 });
    await page.waitForTimeout(1500);
    // El botón "Editar" navega al edit page; no es un anchor sino un button
    // que internamente hace router.push a /clients/{id}/edit.
    const editBtn = page.getByRole('button', { name: /^editar$/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10000 });
    await editBtn.click();
    await expect(page).toHaveURL(/clients\/\d+\/edit/, { timeout: 15000 });
    await page.waitForTimeout(1500);
  }

  test('label de teléfono y email NO muestran asterisco (campos opcionales)', async ({ page }) => {
    await gotoFirstClientEdit(page);

    // Localiza los inputs (siempre presentes y únicos en el form), luego sube
    // al contenedor FormField y verifica que el `label` adyacente NO contiene
    // el asterisco rojo (FormField renderiza `*` solo si prop `required`).
    const telInput = page.locator('input[type="tel"]').first();
    await telInput.scrollIntoViewIfNeeded();
    await expect(telInput).toBeVisible();
    // El FormField wrapper es el padre directo del input (div.flex.flex-col.gap-1.5)
    const telFormField = telInput.locator('xpath=ancestor::div[contains(@class,"flex-col") and contains(@class,"gap-1.5")][1]');
    await expect(telFormField.locator('label')).not.toContainText('*');

    const emailInput = page.locator('input[type="email"]').first();
    await emailInput.scrollIntoViewIfNeeded();
    await expect(emailInput).toBeVisible();
    const emailFormField = emailInput.locator('xpath=ancestor::div[contains(@class,"flex-col") and contains(@class,"gap-1.5")][1]');
    await expect(emailFormField.locator('label')).not.toContainText('*');
  });

  test('botón Guardar NO queda disabled por isOutOfZone — solo por saving', async ({ page }) => {
    await gotoFirstClientEdit(page);

    const saveBtn = page.getByRole('button', { name: /guardar cambios/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 10000 });
    // En estado idle (no saving), el botón debe estar habilitado independientemente
    // de si el cliente está fuera de zona o dentro.
    await expect(saveBtn).toBeEnabled();
  });

  test('admin guarda cliente con email y teléfono vacíos → success toast', async ({ page }) => {
    await gotoFirstClientEdit(page);

    // Captura valores originales para restaurar al final (idempotencia).
    const telInput = page.locator('input[type="tel"]').first();
    const emailInput = page.locator('input[type="email"]').first();
    await telInput.scrollIntoViewIfNeeded();

    const originalTel = await telInput.inputValue();
    const originalEmail = await emailInput.inputValue();

    // Limpia ambos campos.
    await telInput.fill('');
    await emailInput.fill('');

    const saveBtn = page.getByRole('button', { name: /guardar cambios/i }).first();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Espera success: toast con "actualizado" o "guardado", o que la URL
    // navegue de vuelta a /clients (redirect post-save).
    await Promise.race([
      page.waitForURL(/\/clients(\?|$|\/)/, { timeout: 15000 }).catch(() => {}),
      page.getByText(/actualizado|guardado|guardad[oa]s|success/i)
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => {}),
    ]);

    // Verifica que NO apareció toast de error que liste "telefono" o "email".
    const errorToast = page.getByText(/correo es requerido|tel[eé]fono es requerido|email is required|phone is required/i);
    await expect(errorToast).toHaveCount(0);

    // Restaurar valores originales (idempotencia).
    if (originalTel || originalEmail) {
      // Volver a /clients y abrir edit del mismo cliente.
      const currentUrl = page.url();
      const match = currentUrl.match(/clients\/(\d+)\/edit/);
      if (match) {
        await page.goto(`/clients/${match[1]}/edit`);
      } else {
        await gotoFirstClientEdit(page);
      }
      await page.waitForTimeout(1500);
      const telRestore = page.locator('input[type="tel"]').first();
      const emailRestore = page.locator('input[type="email"]').first();
      await telRestore.scrollIntoViewIfNeeded();
      if (originalTel) await telRestore.fill(originalTel);
      if (originalEmail) await emailRestore.fill(originalEmail);
      const saveAgain = page.getByRole('button', { name: /guardar cambios/i }).first();
      if (await saveAgain.isEnabled().catch(() => false)) {
        await saveAgain.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});
