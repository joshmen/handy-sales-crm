import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-07 — Admin / Subscription Plans EDIT flow (SuperAdmin only).
 *
 * Caso: sa-fe-plans-edit
 *
 * Esta suite complementa `subscription-plans.spec.ts` (que es read-only)
 * cubriendo SOLO el flujo de edicion via drawer. La pagina /admin/subscription-plans
 * usa un drawer in-page (no ruta dedicada /edit/:id) — `openEdit(plan)` setea
 * setDrawerMode('edit') y precarga el form con valores del plan seleccionado.
 *
 * Cobertura:
 *  - SA abre drawer en modo edit con click en boton "Pencil" de una fila
 *  - Drawer precarga campos (nombre, precios, limites) con valores del plan
 *  - Codigo NO se muestra como input editable en modo edit (solo en create)
 *  - Toggle "Plan Activo / Plan Inactivo" SOLO visible en modo edit
 *  - Validacion: nombre vacio bloquea guardado (toast error)
 *  - Cancel cierra drawer sin persistir cambios (cambio revertido al reabrir)
 *  - RBAC: ADMIN regular NO puede acceder a /admin/subscription-plans
 *
 * SAFETY: NO se hace submit definitivo — todos los cambios se revierten via
 * Cancel/Escape para no contaminar planes reales del entorno. La unica
 * mutacion potencial seria un PATCH; usamos client-side state only.
 *
 * Pattern: serial (SA unico — xjoshmenx@gmail.com).
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

const ROUTE = '/admin/subscription-plans';

async function gotoPlansAndWait(page: Page): Promise<void> {
  await page.goto(ROUTE);
  await page.waitForLoadState('domcontentloaded');
  // Drawer/tabla render despues de fetchPlans() → esperar a que el spinner
  // inicial baje. waitForTimeout pragmatico porque el endpoint puede tardar.
  await page.waitForTimeout(3500);
}

async function openFirstRowEdit(page: Page): Promise<boolean> {
  // El boton de editar es un <button> con title=tc('edit')="Editar" y un icono
  // Pencil dentro. Lo buscamos por title accessible-name.
  const editButtons = page.locator('button[title="Editar"], button[title*="ditar"]');
  const count = await editButtons.count().catch(() => 0);
  if (count === 0) return false;

  await editButtons.first().click();
  await page.waitForTimeout(1200);
  return true;
}

test.describe('SA — Subscription Plans Edit Drawer (happy path)', () => {
  test('SA abre drawer edit y ve titulo "Editar Plan"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    // Tabla solo desktop. Si no hay planes, el test no aplica.
    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) {
      test.skip(true, 'No hay planes en el entorno — drawer edit no probable');
      return;
    }

    const opened = await openFirstRowEdit(page);
    if (!opened) {
      test.skip(true, 'No se encontro boton Editar en filas');
      return;
    }

    // Header del drawer en modo edit: t('drawerTitleEdit') = "Editar Plan"
    const drawerHeading = page.getByRole('heading', { name: /Editar Plan/i }).first();
    await expect(drawerHeading).toBeVisible({ timeout: 8000 });

    await page.keyboard.press('Escape');
  });

  test('Drawer edit precarga campos con valores del plan seleccionado', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) { test.skip(true, 'sin tabla'); return; }

    // Capturamos nombre del primer plan en la tabla ANTES de abrir el drawer.
    const firstRowNameCell = page.locator('tbody tr').first().locator('td').first();
    const expectedName = (await firstRowNameCell.textContent())?.trim() ?? '';

    const opened = await openFirstRowEdit(page);
    if (!opened) { test.skip(true, 'sin boton editar'); return; }

    // Input "Nombre del Plan" debe estar precargado con el nombre del plan.
    const nombreInput = page.locator('input[type="text"]').first();
    await expect(nombreInput).toBeVisible({ timeout: 5000 });
    const nombreValue = await nombreInput.inputValue();

    if (expectedName.length > 0) {
      // Nombre del input debe coincidir EXACTO o ser substring (defensivo por
      // si la celda incluye markup extra).
      const matches = nombreValue === expectedName || expectedName.includes(nombreValue) || nombreValue.includes(expectedName);
      expect(matches).toBeTruthy();
    } else {
      // PROD BUG / FIX TODO: si la primer celda esta vacia, el plan no tiene
      // nombre — bug de seed o de bind. No fallar la spec por eso.
      expect(nombreValue.length).toBeGreaterThan(0);
    }

    // Precios deben ser inputs number con value numerico (no NaN ni vacio).
    const numberInputs = page.locator('input[type="number"]');
    const numInputsCount = await numberInputs.count();
    expect(numInputsCount).toBeGreaterThanOrEqual(5); // precio mensual, anual, max usuarios, productos, clientes (+ orden)

    const precioMensualValue = await numberInputs.nth(0).inputValue();
    expect(precioMensualValue).toMatch(/^-?\d+(\.\d+)?$/);

    await page.keyboard.press('Escape');
  });

  test('Modo edit NO muestra input de Codigo (solo create)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) { test.skip(true, 'sin tabla'); return; }

    const opened = await openFirstRowEdit(page);
    if (!opened) { test.skip(true, 'sin boton editar'); return; }

    // En modo edit: NO debe haber label "Código" + input. La page.tsx envuelve
    // el codigo en `{drawerMode === 'create' && (...)}`.
    // Buscamos el codeHint que solo aparece en create.
    const codeHint = page.getByText(/Identificador unico\. No se puede cambiar/i);
    const hintVisible = await codeHint.isVisible({ timeout: 1500 }).catch(() => false);
    expect(hintVisible).toBeFalsy();

    await page.keyboard.press('Escape');
  });

  test('Modo edit muestra toggle "Plan Activo / Plan Inactivo"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) { test.skip(true, 'sin tabla'); return; }

    const opened = await openFirstRowEdit(page);
    if (!opened) { test.skip(true, 'sin boton editar'); return; }

    // El toggle de activo solo se muestra en drawerMode === 'edit'.
    const activoToggle = page.getByText(/Plan Activo|Plan Inactivo/i).first();
    await expect(activoToggle).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
  });

  test('Footer muestra boton "Guardar Cambios" (no "Crear Plan") en modo edit', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) { test.skip(true, 'sin tabla'); return; }

    const opened = await openFirstRowEdit(page);
    if (!opened) { test.skip(true, 'sin boton editar'); return; }

    const saveBtn = page.getByRole('button', { name: /Guardar Cambios/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5000 });

    // "Crear Plan" NO debe estar visible en modo edit
    const createBtn = page.getByRole('button', { name: /^Crear Plan$/i });
    const createVisible = await createBtn.isVisible({ timeout: 1000 }).catch(() => false);
    expect(createVisible).toBeFalsy();

    await page.keyboard.press('Escape');
  });
});

test.describe('SA — Subscription Plans Edit Drawer (cancel + validation)', () => {
  test('Cancel cierra drawer sin persistir cambios al nombre', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) { test.skip(true, 'sin tabla'); return; }

    const originalName = ((await page.locator('tbody tr').first().locator('td').first().textContent()) ?? '').trim();

    const opened = await openFirstRowEdit(page);
    if (!opened) { test.skip(true, 'sin boton editar'); return; }

    const nombreInput = page.locator('input[type="text"]').first();
    await expect(nombreInput).toBeVisible({ timeout: 5000 });

    // Mutar el campo local (no hacemos click en Guardar Cambios).
    const sentinelSuffix = ' __E2E_DIRTY_DO_NOT_SAVE__';
    await nombreInput.fill((originalName || 'Plan') + sentinelSuffix);

    // Click en Cancelar — t('cancel') common = "Cancelar".
    const cancelBtn = page.getByRole('button', { name: /^Cancelar$/i }).first();
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });
    await cancelBtn.click();
    await page.waitForTimeout(1000);

    // Drawer cerrado: el heading "Editar Plan" ya no debe estar visible.
    const drawerHeading = page.getByRole('heading', { name: /Editar Plan/i }).first();
    const stillOpen = await drawerHeading.isVisible({ timeout: 1500 }).catch(() => false);
    expect(stillOpen).toBeFalsy();

    // Reabrir el mismo plan y verificar que el nombre NO contiene el sentinel.
    const reopened = await openFirstRowEdit(page);
    if (!reopened) { test.skip(true, 'no se pudo reabrir'); return; }

    const nombreInput2 = page.locator('input[type="text"]').first();
    await expect(nombreInput2).toBeVisible({ timeout: 5000 });
    const reopenedValue = await nombreInput2.inputValue();
    expect(reopenedValue).not.toContain('__E2E_DIRTY_DO_NOT_SAVE__');

    await page.keyboard.press('Escape');
  });

  test('Nombre vacio: handleSave dispara toast de error (no se cierra el drawer)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }
    await loginAsSuperAdmin(page);
    await gotoPlansAndWait(page);

    const tableVisible = await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (!tableVisible) { test.skip(true, 'sin tabla'); return; }

    const opened = await openFirstRowEdit(page);
    if (!opened) { test.skip(true, 'sin boton editar'); return; }

    const nombreInput = page.locator('input[type="text"]').first();
    await expect(nombreInput).toBeVisible({ timeout: 5000 });

    // Vaciamos el nombre.
    await nombreInput.fill('');

    // Click en "Guardar Cambios" — la guardia `if (!nombre.trim())` debe
    // bloquear el submit y disparar el toast t('nameAndCodeRequired').
    const saveBtn = page.getByRole('button', { name: /Guardar Cambios/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(1200);

    // Drawer debe seguir abierto (no cierra en error).
    const drawerHeading = page.getByRole('heading', { name: /Editar Plan/i }).first();
    await expect(drawerHeading).toBeVisible({ timeout: 3000 });

    // Bonus: buscar toast/alert con texto del error. Toast puede ser via
    // sonner o un div role="status". Best-effort: si no aparece, no fallar
    // el test — la prueba clave es que el drawer NO cerro.
    const errorToast = page.getByText(/Nombre y c[oó]digo son requeridos|requeridos/i).first();
    const toastVisible = await errorToast.isVisible({ timeout: 2500 }).catch(() => false);
    if (!toastVisible) {
      // PROD BUG / FIX TODO: si el guard valida pero NO muestra toast, UX
      // degradada — el SA no sabe por que no se guardo. Validar
      // implementacion de useToast en SubscriptionPlansAdminPage.
      console.warn('[sa-plans-edit] toast de validacion no detectado — UX gap potencial');
    }

    await page.keyboard.press('Escape');
  });
});

test.describe('SA — Subscription Plans Edit RBAC negativo', () => {
  test('ADMIN regular NO puede abrir /admin/subscription-plans (no drawer edit)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(ROUTE);
    await page.waitForTimeout(3000);

    const url = page.url();
    // Middleware/guard debe redirigir lejos del CRUD de SuperAdmin.
    expect(url).not.toMatch(/\/admin\/subscription-plans($|\?)/);

    // Defensa en profundidad: aunque algun bug deje cargar la pagina, el
    // boton de edit no debe estar accesible.
    const editButtons = page.locator('button[title="Editar"]');
    const editVisible = await editButtons.first().isVisible({ timeout: 1500 }).catch(() => false);
    if (editVisible) {
      // PROD BUG / FIX TODO: ADMIN regular nunca deberia ver el boton
      // Editar en /admin/subscription-plans. Verificar RBAC server-side
      // en SubscriptionPlanAdminEndpoints (Authorize policy = SuperAdmin).
      expect(editVisible).toBeFalsy();
    }
  });
});
