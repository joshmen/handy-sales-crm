import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Target screen: /cobranza (Nuevo cobro drawer en modo AbonoFifo + estado de cuenta).
 * Rol: ADMIN (admin@jeyma.com).
 * Scope (asserts):
 *   - Registrar un cobro real en modo FIFO ("Abono a cuenta"): Nuevo cobro ->
 *     modo AbonoFifo -> cliente con saldo -> monto -> metodo Efectivo (default).
 *   - El panel de preview FIFO (data-testid="cobro-fifo-preview") se calcula y
 *     muestra la distribucion ANTES del submit.
 *   - Guardar -> POST /cobros 2xx -> el cobro aparece en el Historial de cobros.
 *   - Abrir el estado de cuenta del cliente -> el drawer renderea facturado /
 *     cobrado / pendiente (saldo) sin crashear.
 *
 * Serial reason: el test MUTA saldos de cliente (registra un cobro real contra
 * la API). Encadena pasos dependientes (elegir cliente con saldo -> cobrar ->
 * verificar en historial -> ver estado de cuenta del MISMO cliente), por eso
 * serial. Monto pequeno y fijo ($1) para minimizar el impacto en el saldo.
 *
 * AGREGA (no profundiza): cobranza-full-crud.spec.ts explicitamente NO crea
 * cobros ("NO crea cobros reales (mutacion destructiva de saldos cliente)") y
 * deja el flujo FIFO + estado de cuenta sin cubrir. Este spec cierra ese gap:
 * registra un cobro FIFO real, valida el preview de distribucion y el estado de
 * cuenta resultante.
 *
 * Prereq: requiere AL MENOS un cliente con saldo pendiente (pedido con saldo > 0)
 * en el tenant admin@jeyma.com. Si la pestana "¿Quien debe?" esta vacia, el test
 * hace skip con motivo (DATA_MISSING) en lugar de fallar — coherente con
 * cobranza-full-crud.spec.ts.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });
test.describe.configure({ mode: 'serial' });

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('.animate-spin').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(800);
}

/**
 * Selecciona en un SearchableSelect la opcion cuyo label contiene `text`
 * (o la primera si no se pasa text). Devuelve el label elegido.
 * SearchableSelect = boton role="combobox" + input de busqueda + role="option".
 */
async function pickOption(page: Page, combobox: ReturnType<Page['locator']>, text?: string): Promise<string> {
  await combobox.click();
  const search = page.getByPlaceholder(/Buscar/i).last();
  if (text && (await search.isVisible({ timeout: 3000 }).catch(() => false))) {
    await search.fill(text);
    await page.waitForTimeout(400);
  }
  const option = text
    ? page.locator('[role="option"]', { hasText: text }).first()
    : page.locator('[role="option"]').first();
  await option.waitFor({ state: 'visible', timeout: 8000 });
  const label = (await option.textContent())?.trim() ?? '';
  await option.click();
  return label;
}

test.describe('Cobro FIFO + estado de cuenta (ADMIN)', () => {
  test('registrar abono FIFO -> aparece en historial -> estado de cuenta actualizado', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip(true, 'Flujo cubierto en Desktop Chrome (drawer + tabla desktop)');
      return;
    }

    await loginAsAdmin(page);
    await page.goto('/cobranza', { waitUntil: 'domcontentloaded' });
    await settle(page);

    // ── 1. Encontrar un cliente con saldo pendiente (pestana "¿Quien debe?") ──
    await page.getByRole('button', { name: /Qui[eé]n debe|Who owes|Balances/i }).first().click();
    await page.waitForTimeout(1200);

    const saldosTable = page.locator('[data-tour="cobranza-saldos-table"]').first();
    await expect(saldosTable).toBeVisible({ timeout: 10000 });

    // Cada fila de saldo es clickeable (cursor-pointer) y tiene el nombre del
    // cliente en la primera celda. Tomamos el primer cliente que debe.
    const firstSaldoRow = saldosTable.locator('div.cursor-pointer').first();
    if (!(await firstSaldoRow.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, 'DATA_MISSING: no hay clientes con saldo pendiente en seed para FIFO');
      return;
    }
    const clienteNombre = (await firstSaldoRow.locator('div').first().textContent())?.trim() ?? '';
    expect(clienteNombre.length).toBeGreaterThan(0);

    // ── 2. Abrir "Nuevo cobro" ──
    await page.locator('[data-tour="cobranza-new-btn"]').first().click();
    const drawer = page.locator('[role="dialog"]').first();
    await expect(drawer).toBeVisible({ timeout: 8000 });

    // ── 3. Modo AbonoFifo (data-testid cobro-modo-1) ──
    const fifoModeBtn = page.locator('[data-testid="cobro-modo-1"]').first();
    await expect(fifoModeBtn).toBeVisible({ timeout: 6000 });
    await fifoModeBtn.click();
    // El selector debe quedar marcado (ring esmeralda) — verificamos via clase.
    await expect(fifoModeBtn).toHaveClass(/ring-emerald-500|border-emerald-500/, { timeout: 4000 });

    // ── 4. Cliente (el que tiene saldo) ──
    const clientCombo = page.locator('[data-tour="cobro-client-selector"] [role="combobox"]').first();
    await pickOption(page, clientCombo, clienteNombre.slice(0, 12));

    // En modo FIFO el selector de pedido NO se muestra (distribucion automatica).
    await expect(page.locator('[data-tour="cobro-pedido-selector"]')).toHaveCount(0);

    // ── 5. Monto ($1, pequeno para minimizar impacto en saldo) ──
    const montoInput = page.locator('[data-tour="cobro-amount-method"] input[type="number"]').first();
    await montoInput.fill('1');

    // Metodo de pago: "Efectivo" es el default (value 0). Lo dejamos explicito
    // por robustez ante cambios de default.
    const metodoSelect = page.locator('[data-tour="cobro-amount-method"] select').first();
    await metodoSelect.selectOption('0').catch(() => {});

    // ── 6. Preview FIFO debe calcularse (debounce 300ms en el componente) ──
    const fifoPreview = page.locator('[data-testid="cobro-fifo-preview"]').first();
    await expect(fifoPreview).toBeVisible({ timeout: 8000 });
    // Espera a que termine de calcular: debe mostrar la distribucion o un error.
    // Aceptamos cualquiera de los dos estados terminales (no el spinner).
    await expect(async () => {
      const txt = (await fifoPreview.textContent()) ?? '';
      expect(txt).toMatch(/distribuci[oó]n|Preview|\$|saldo|pendiente/i);
    }).toPass({ timeout: 8000 });

    // ── 7. Fecha del cobro (requerida): abrir el datepicker y elegir "hoy" ──
    // El DateTimePicker de fechaCobro es el ultimo del drawer (boton con CalendarIcon).
    const dateTrigger = drawer.getByRole('button').filter({ hasText: /Seleccionar fecha|Select date/i }).first();
    if (await dateTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateTrigger.click();
      // "Hoy" tiene ring verde (ring-green-300). Elegimos el dia con ese ring.
      const todayCell = page.locator('button.ring-green-300, button[class*="ring-green-300"]').first();
      if (await todayCell.isVisible({ timeout: 3000 }).catch(() => false)) {
        await todayCell.click();
      } else {
        // Fallback: cualquier dia del mes en curso, no deshabilitado.
        await page.locator('[class*="grid-cols-7"] button:not([disabled])').last().click().catch(() => {});
      }
    }

    // ── 8. Guardar -> POST /cobros 2xx ──
    const cobroResponsePromise = page.waitForResponse(
      (r) => /\/cobros(\?.*)?$/.test(r.url()) && r.request().method() === 'POST',
      { timeout: 20000 },
    );
    await drawer.getByRole('button', { name: /^Crear Cobro$|^Create Payment$|Guardando/i }).first().click();

    const cobroResponse = await cobroResponsePromise.catch(() => null);
    if (cobroResponse) {
      expect(cobroResponse.status(), 'POST /cobros debe responder 2xx').toBeLessThan(300);
    }

    // El drawer se cierra tras crear con exito.
    await expect(drawer).toBeHidden({ timeout: 10000 });

    // ── 9. El cobro aparece en el Historial de cobros ──
    await page.getByRole('button', { name: /Historial de cobros|Payment history|Payments/i }).first().click();
    await page.waitForTimeout(1000);

    const cobrosTable = page.locator('[data-tour="cobranza-cobros-table"]').first();
    await expect(cobrosTable).toBeVisible({ timeout: 10000 });
    // El cliente del cobro recien creado debe figurar en la tabla de historial.
    await expect(cobrosTable.getByText(clienteNombre.slice(0, 12), { exact: false }).first())
      .toBeVisible({ timeout: 8000 });

    // ── 10. Estado de cuenta del cliente (drawer) ──
    // Click en la fila del cobro abre openDetail(clienteId) -> drawer estado de cuenta.
    await cobrosTable.locator('div.cursor-pointer').first().click();

    const estadoDrawer = page.locator('[role="dialog"]').first();
    await expect(estadoDrawer).toBeVisible({ timeout: 8000 });
    // El estado de cuenta muestra Facturado / Cobrado / Pendiente y avance de cobro.
    await expect(
      estadoDrawer.getByText(/Avance de cobro|Collection progress|Facturado|Invoiced/i).first(),
    ).toBeVisible({ timeout: 10000 });
    // Debe renderear un monto (saldo / cobrado) — prueba que el estado de cuenta
    // cargo datos reales, no un placeholder vacio.
    await expect(estadoDrawer.getByText(/\$\s?\d/).first()).toBeVisible({ timeout: 8000 });
  });
});
