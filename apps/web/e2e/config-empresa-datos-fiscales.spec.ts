import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Config Empresa: pestana "Perfil de Empresa" (Datos Fiscales) en /settings.
 *
 * Target: apps/web/src/app/(dashboard)/settings/page.tsx (tab perfil-empresa)
 *         + components/PerfilEmpresaTab.tsx. Rol: ADMIN.
 * Scope (asserts): editar razonSocial + identificadorFiscal (RFC) +
 *   tipoIdentificadorFiscal (select), Guardar, toast de exito, reload, y
 *   assert de PERSISTENCIA de los 3 campos. Restaura los valores originales.
 *
 * Que PROFUNDIZA respecto a specs existentes:
 *   - perfil-empresa.spec.ts solo lee #razonSocial (assert not-empty) y muta
 *     #telefono / #sitioWeb. NUNCA edita los campos fiscales clave
 *     (razon social, RFC, tipo de identificador) que alimentan el CFDI SAT.
 *   - admin-company-settings-full.spec.ts cubre la pestana "Marca"
 *     (CompanyTab: nombre, colores), una pestana distinta. No toca Datos
 *     Fiscales.
 *   Este spec cierra ese hueco mutando + persistiendo los datos fiscales reales.
 *
 * Serial: muta estado compartido (DatosEmpresa del tenant Jeyma) y reusa la
 *   sesion ADMIN; correr en paralelo cruzaria escrituras del mismo registro.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

async function goToPerfilEmpresaTab(page: Page): Promise<void> {
  // perfil-empresa es el tab default, pero el deeplink lo fuerza por si el
  // default cambia. Click defensivo para garantizar activacion.
  await page.goto('/settings?tab=perfil-empresa', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500);

  const perfilTab = page.getByRole('tab', { name: /Perfil/i }).first();
  await expect(perfilTab).toBeVisible({ timeout: 15000 });
  await perfilTab.click();
  await expect(perfilTab).toHaveAttribute('data-state', 'active');

  // El form aparece tras cargar datosEmpresaService.get(). Limpiar spinner.
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await expect(page.locator('#razonSocial')).toBeVisible({ timeout: 15000 });
}

test.describe('Config Empresa - Datos Fiscales (Perfil de Empresa)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('edita razon social + RFC + tipo identificador y persiste tras reload', async ({
    page,
  }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip();
      return;
    }
    test.setTimeout(55000);

    await goToPerfilEmpresaTab(page);

    const razonSocial = page.locator('#razonSocial');
    const rfc = page.locator('#identificadorFiscal');
    const tipo = page.locator('#tipoIdentificadorFiscal');

    // Capturar originales para restaurar al final y mantener el seed limpio.
    const origRazon = await razonSocial.inputValue();
    const origRfc = await rfc.inputValue();
    const origTipo = await tipo.inputValue();

    // El boton "Guardar cambios" arranca deshabilitado (sin cambios).
    const saveBtn = page.getByRole('button', { name: /Guardar cambios/i }).first();
    await expect(saveBtn).toBeDisabled();

    // Datos unicos por corrida. RFC persona moral valido (12 chars) generico.
    const stamp = Date.now().toString().slice(-6);
    const testRazon = `Distribuidora QA ${stamp} S.A. de C.V.`;
    const testRfc = `QAT${stamp}AB1`; // 12 chars, mayusculas (el input fuerza upper).

    await razonSocial.fill(testRazon);
    await rfc.fill(testRfc);
    // El select tiene RFC, NIT, CUIT, CNPJ, RUT, RUC. Elegimos un valor
    // distinto al original para forzar cambio detectable.
    const targetTipo = origTipo === 'NIT' ? 'RFC' : 'NIT';
    await tipo.selectOption(targetTipo);

    // hasChanges debe habilitar el boton.
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();

    // Toast de exito (texto i18n exacto del backend de PerfilEmpresaTab).
    await expect(
      page.getByText(/actualizados correctamente/i),
    ).toBeVisible({ timeout: 10000 });

    // Tras guardar, original se re-sincroniza → boton vuelve a deshabilitado.
    await expect(saveBtn).toBeDisabled({ timeout: 10000 });

    // PERSISTENCIA: reload + reabrir tab + assert los 3 campos.
    await page.reload();
    await goToPerfilEmpresaTab(page);

    await expect(page.locator('#razonSocial')).toHaveValue(testRazon, { timeout: 10000 });
    await expect(page.locator('#identificadorFiscal')).toHaveValue(testRfc, { timeout: 10000 });
    await expect(page.locator('#tipoIdentificadorFiscal')).toHaveValue(targetTipo, {
      timeout: 10000,
    });

    // Restaurar valores originales para no contaminar el seed compartido.
    await page.locator('#razonSocial').fill(origRazon);
    await page.locator('#identificadorFiscal').fill(origRfc);
    await page.locator('#tipoIdentificadorFiscal').selectOption(origTipo || 'RFC');

    const saveBtn2 = page.getByRole('button', { name: /Guardar cambios/i }).first();
    await expect(saveBtn2).toBeEnabled({ timeout: 5000 });
    await saveBtn2.click();
    await expect(
      page.getByText(/actualizados correctamente/i),
    ).toBeVisible({ timeout: 10000 });
    await expect(saveBtn2).toBeDisabled({ timeout: 10000 });
  });

  test('boton Descartar revierte cambios fiscales sin guardar', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip();
      return;
    }

    await goToPerfilEmpresaTab(page);

    const razonSocial = page.locator('#razonSocial');
    const original = await razonSocial.inputValue();

    await razonSocial.fill(`${original} EDIT`);

    const saveBtn = page.getByRole('button', { name: /Guardar cambios/i }).first();
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });

    // El boton "Descartar cambios" solo aparece cuando hasChanges es true.
    const discardBtn = page.getByRole('button', { name: /Descartar cambios/i }).first();
    await expect(discardBtn).toBeVisible();
    await discardBtn.click();

    // Valor revertido y boton de guardar deshabilitado de nuevo.
    await expect(razonSocial).toHaveValue(original);
    await expect(saveBtn).toBeDisabled({ timeout: 5000 });
  });
});
