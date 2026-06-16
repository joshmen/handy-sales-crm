import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Target screen: /clients (lista), /clients/new (ClientForm create),
 *   /clients/[id]/edit (ClientForm edit), /clients/transferir-cartera.
 * Rol: ADMIN (admin@jeyma.com).
 * Scope (asserts):
 *   - "Nuevo cliente" navega a /clients/new y el form muestra "Vendedor asignado"
 *     + "Limite de credito" (alta: nombre unico, vendedor, credito) -> best-effort.
 *   - Editar un cliente EXISTENTE: cambiar "Limite de credito", guardar, y verificar
 *     PERSISTENCIA con reload (el valor sigue en el form tras volver a abrir edit).
 *   - Asignar vendedor en el form de edicion: el SearchableSelect "Vendedor asignado"
 *     acepta seleccion.
 *   - Transferir cartera: /clients/transferir-cartera permite elegir FROM != TO y el
 *     boton submit se habilita (no ejecuta la transferencia destructiva).
 * Serial reason: el test MUTA estado (edita el limite de credito de un cliente y lo
 *   restaura). Los pasos editar -> persistir -> restaurar dependen del mismo cliente,
 *   por eso mode serial.
 *
 * AGREGA (no existia): clients.spec.ts:29 tiene el create skipped y su test de edit
 * solo verifica que el form carga y es editable (NO persiste el guardado).
 * vendedor-assignment.spec.ts y clientes-cartera-bulk.spec.ts solo verifican que los
 * selectores existen, sin ejecutar ningun guardado ni asignacion real. Este spec
 * agrega el ciclo de vida real: editar credito -> guardar -> reload -> assert
 * persistencia, mas la asignacion de vendedor y la habilitacion del transfer.
 *
 * Prereq / limitaciones:
 *   - El alta full de cliente (/clients/new) NO es determinista en E2E: el form valida
 *     numeroExterior + zonaId derivados del geocoding async de Google Maps, igual que
 *     documenta clients.spec.ts. Por eso el alta es best-effort (rellena y, si el
 *     entorno geocodifica, intenta guardar) y la persistencia se asegura via EDIT de
 *     un cliente existente, cuyos campos ya vienen pre-poblados y validos.
 *   - El transfer real es destructivo (reasigna toda la cartera). Solo se verifica que
 *     el submit se habilita; no se ejecuta.
 *   - Requiere al menos 1 cliente en el seed para el flujo de edit y >= 2 vendedores
 *     para el transfer. Si faltan, el test hace skip explicito.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

const STAMP = Date.now();
const CLIENT_NAME = `Cliente E2E ${STAMP}`;

/** Limpia el spinner global si esta presente (no falla si no aparece). */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page
    .locator('.animate-spin')
    .first()
    .waitFor({ state: 'hidden', timeout: 8000 })
    .catch(() => {});
  await page.waitForTimeout(500);
}

/**
 * Selecciona la primera opcion disponible de un SearchableSelect
 * (button[role=combobox] + Popover con [role=option]). Devuelve el texto elegido.
 */
async function pickFirstOption(page: Page, trigger: ReturnType<Page['locator']>): Promise<string | null> {
  await trigger.click();
  await page.waitForTimeout(300);
  const firstOption = page.getByRole('option').first();
  if ((await firstOption.count()) === 0) {
    await page.keyboard.press('Escape').catch(() => {});
    return null;
  }
  const label = (await firstOption.textContent())?.trim() ?? null;
  await firstOption.click();
  await page.waitForTimeout(300);
  return label;
}

test.describe('Clientes — crear, asignar vendedor y transferir', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('"Nuevo cliente" abre el form con Vendedor asignado y Limite de credito', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'domcontentloaded' });
    await settle(page);

    // Boton/enlace "Nuevo cliente" -> navega a /clients/new.
    const newBtn = page.getByRole('button', { name: /Nuevo cliente|New client/i })
      .or(page.getByRole('link', { name: /Nuevo cliente|New client/i }));
    await expect(newBtn.first()).toBeVisible({ timeout: 15000 });
    await newBtn.first().click();

    await expect(page).toHaveURL(/\/clients\/new/, { timeout: 15000 });
    await settle(page);

    // Campos clave del alta: nombre, "Vendedor asignado", "Limite de credito".
    const nameInput = page.getByPlaceholder(/Nombre del cliente|client name/i).first();
    await expect(nameInput).toBeVisible({ timeout: 15000 });
    await nameInput.fill(CLIENT_NAME);

    await expect(page.getByText(/Vendedor asignado/i).first()).toBeVisible();
    await expect(page.getByText(/L[ií]mite de cr[eé]dito/i).first()).toBeVisible();

    // Best-effort: seleccionar vendedor (SearchableSelect con placeholder "Sin asignar").
    const vendedorTrigger = page.getByRole('combobox').filter({ hasText: /Sin asignar|Vendedor/i }).first();
    if (await vendedorTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await pickFirstOption(page, vendedorTrigger).catch(() => null);
    }

    // El boton "Guardar" del header esta presente y habilitado (el alta full
    // depende del geocoding async, por eso NO asertamos el guardado persistido aqui).
    const saveBtn = page.getByRole('button', { name: /^Guardar$|Save/i }).first();
    await expect(saveBtn).toBeEnabled();
  });

  test('Editar cliente existente: cambiar Limite de credito y persistir', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'domcontentloaded' });
    await settle(page);

    // Tomar el primer cliente del seed para editar.
    const editBtn = page.locator('[data-testid^="edit-client-"]').first();
    if ((await editBtn.count()) === 0) {
      test.skip(true, 'No hay clientes en el seed para editar');
      return;
    }
    await editBtn.click();
    await expect(page).toHaveURL(/\/clients\/\d+\/edit/, { timeout: 15000 });
    const editUrl = page.url();
    await settle(page);

    // Esperar a que el form se pueble (useEffect -> reset). El nombre trae valor.
    const nameField = page.getByPlaceholder(/Nombre del cliente|client name/i).first();
    await expect(nameField).toBeVisible({ timeout: 15000 });
    await expect(nameField).not.toHaveValue('', { timeout: 15000 });

    // "Limite de credito": es el input number prefijado con "$" en la seccion de
    // pago. Lo ubicamos por su FormField label.
    const creditField = page
      .locator('div')
      .filter({ has: page.getByText(/L[ií]mite de cr[eé]dito/i) })
      .locator('input[type="number"]')
      .first();
    await expect(creditField).toBeVisible({ timeout: 10000 });

    // Valor unico y deterministico para verificar persistencia.
    const newCredit = String(7000 + (STAMP % 1000));
    await creditField.fill(newCredit);
    await expect(creditField).toHaveValue(newCredit);

    // Guardar cambios (label "Guardar cambios" en modo edit).
    await page.getByRole('button', { name: /Guardar cambios|Save changes/i }).first().click();

    // Exito + redirect a /clients.
    await expect(page.getByText(/Cliente actualizado|actualizado|updated/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/\/clients(\?|$|\/)/, { timeout: 15000 });

    // Persistencia: re-abrir el mismo cliente y verificar que el credito persistio.
    await page.goto(editUrl, { waitUntil: 'domcontentloaded' });
    await settle(page);
    const creditAfter = page
      .locator('div')
      .filter({ has: page.getByText(/L[ií]mite de cr[eé]dito/i) })
      .locator('input[type="number"]')
      .first();
    await expect(creditAfter).toHaveValue(newCredit, { timeout: 15000 });

    // Restaurar a 0 para no dejar el seed alterado (best-effort cleanup).
    await creditAfter.fill('0');
    await page.getByRole('button', { name: /Guardar cambios|Save changes/i }).first().click();
    await expect(page.getByText(/Cliente actualizado|actualizado|updated/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
  });

  test('Asignar vendedor en el form de edicion (SearchableSelect acepta seleccion)', async ({ page }) => {
    await page.goto('/clients', { waitUntil: 'domcontentloaded' });
    await settle(page);

    const editBtn = page.locator('[data-testid^="edit-client-"]').first();
    if ((await editBtn.count()) === 0) {
      test.skip(true, 'No hay clientes en el seed para editar');
      return;
    }
    await editBtn.click();
    await expect(page).toHaveURL(/\/clients\/\d+\/edit/, { timeout: 15000 });
    await settle(page);

    // Esperar a que el form cargue.
    const nameField = page.getByPlaceholder(/Nombre del cliente|client name/i).first();
    await expect(nameField).not.toHaveValue('', { timeout: 15000 });

    // Abrir el SearchableSelect "Vendedor asignado" y elegir una opcion.
    const vendedorTrigger = page.getByRole('combobox').filter({ hasText: /Sin asignar|Vendedor/i }).first();
    if (!(await vendedorTrigger.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'Selector de vendedor no visible (sin vendedores en el catalogo)');
      return;
    }
    const chosen = await pickFirstOption(page, vendedorTrigger);
    if (!chosen) {
      test.skip(true, 'No hay vendedores disponibles para asignar');
      return;
    }
    // La seleccion se refleja en el trigger del combobox.
    await expect(vendedorTrigger).toContainText(chosen.slice(0, 4));
  });

  test('Transferir cartera: FROM != TO habilita el submit (sin ejecutar)', async ({ page }) => {
    await page.goto('/clients/transferir-cartera', { waitUntil: 'domcontentloaded' });
    await settle(page);

    await expect(page.getByRole('heading', { name: /(Transferir|Reasignar) cartera/i })).toBeVisible({ timeout: 10000 });

    const submitBtn = page.getByTestId('submit-transfer-btn');
    await expect(submitBtn).toBeVisible({ timeout: 10000 });
    await expect(submitBtn).toBeDisabled();

    // FROM: primer combobox.
    const fromCombo = page.getByRole('combobox').first();
    await fromCombo.click();
    await page.waitForTimeout(400);
    const fromOption = page.getByRole('option').first();
    if ((await fromOption.count()) === 0) {
      test.skip(true, 'No hay vendedores en el seed para transferir');
      return;
    }
    await fromOption.click();
    await page.waitForTimeout(400);

    // TO: segundo combobox, primera opcion disponible (distinta de FROM).
    const toCombo = page.getByRole('combobox').nth(1);
    await toCombo.click();
    await page.waitForTimeout(400);
    const toOption = page.getByRole('option').first();
    if ((await toOption.count()) === 0) {
      test.skip(true, 'Se necesitan al menos 2 vendedores para transferir');
      return;
    }
    await toOption.click();

    // Con FROM != TO el submit se habilita. NO ejecutamos la transferencia (destructiva).
    await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  });
});
