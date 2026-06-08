import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * Histórico GPS del equipo — cobertura FUNCIONAL para rol SUPERVISOR.
 *
 * Por qué existe:
 *   La página /team/gps (apps/web/src/app/(dashboard)/team/gps/page.tsx)
 *   consume GET /api/team/ubicaciones-recientes que ya autoriza
 *   {ADMIN, SUPERVISOR, SUPER_ADMIN} (ver TeamLocationEndpoints.cs L44).
 *   No teníamos spec que valide el flujo end-to-end SUPERVISOR:
 *     1. Acceso al índice /team/gps (no 403).
 *     2. El listado invoca el endpoint correcto.
 *     3. Buscar + Refrescar funcionan sin error.
 *     4. Drill-down a /team/{id}/gps carga eventos del día (preset Hoy)
 *        e invoca GET /api/team/usuarios/{id}/actividad-gps.
 *     5. Filtros de tipo y export CSV no tronan.
 *
 * Cobertura: Frontend funcional end-to-end (UI + network).
 * Slot: usa SUP_SLOT['supervisor-team-gps-functional'] → fallback 1 (helper
 *   maneja default). Marca serial para no chocar con team-supervisor.spec.ts
 *   que usa el mismo slot.
 *
 * Requiere: SUPERVISOR seed slot 1 con al menos un vendedor con actividad GPS
 *   reciente (seed_e2e_supervisor_pg.sql + seed_e2e_pg.sql con visitas/pedidos).
 *
 * Notas de diseño:
 *   - Mobile Chrome: skip drill-down porque el split mapa+lista usa Leaflet
 *     que tarda en hidratar headless. El índice sí se prueba en mobile.
 *   - El test no asume que existan resultados — un tenant sin actividad GPS
 *     muestra emptyState válido y eso TAMBIÉN es un pass. Lo que NO se acepta
 *     es: 403, error banner persistente, o el endpoint backend no invocado.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('SUPERVISOR — Histórico GPS funcional', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('Índice /team/gps carga e invoca GET /api/team/ubicaciones-recientes', async ({ page }) => {
    // Capturamos antes de navegar — evita race con el useEffect de la página.
    const ubicacionesPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/team/ubicaciones-recientes') &&
        resp.request().method() === 'GET',
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto('/team/gps');

    // PageHeader con título "Histórico GPS" debe pintarse.
    await expect(page.getByRole('heading', { name: /Hist[oó]rico GPS/i }).first())
      .toBeVisible({ timeout: 15000 });

    const resp = await ubicacionesPromise;

    // PROD BUG / FIX TODO: si resp es null, la página /team/gps no consumió
    // el endpoint esperado — revisar teamLocation.ts basePath y page.tsx
    // (apps/web/src/app/(dashboard)/team/gps/page.tsx L36/L51).
    expect(resp, 'GET /api/team/ubicaciones-recientes debe haber sido invocado').not.toBeNull();

    // SUPERVISOR está autorizado en backend (TeamLocationEndpoints L44),
    // por lo tanto NO debe recibir 401/403. 200 (lista) y 204 (vacío) son OK.
    const status = resp!.status();
    expect(
      status,
      `SUPERVISOR no debe recibir 401/403 — recibido ${status}`,
    ).toBeLessThan(400);

    // El subtítulo del header refleja "subtitle" o "subtitleWithCount".
    // Ambos están permitidos; verificamos que al menos uno está presente.
    const subtitleVisible = await page
      .getByText(/Recorrido GPS|vendedor con actividad GPS|vendedores con actividad GPS/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(subtitleVisible, 'Subtítulo de la página /team/gps debe estar visible').toBeTruthy();
  });

  test('Botón Refrescar dispara una segunda llamada al endpoint', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team/gps');
    await expect(page.getByRole('heading', { name: /Hist[oó]rico GPS/i }).first())
      .toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // Espera la siguiente request al endpoint (la inicial ya pasó).
    const secondCallPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/team/ubicaciones-recientes') &&
        resp.request().method() === 'GET',
      { timeout: 15000 },
    ).catch(() => null);

    // El botón "Refrescar" tiene icon RefreshCw + label en sm:inline. En mobile
    // solo el icon, así que buscamos por title/aria o por el span text.
    // page.tsx L194-201: usa <button> con texto "Refrescar" en >sm.
    const refreshBtn = page
      .getByRole('button', { name: /Refrescar/i })
      .first();

    await expect(refreshBtn).toBeVisible({ timeout: 5000 });
    await refreshBtn.click();

    const resp = await secondCallPromise;
    // PROD BUG / FIX TODO: si null, fetchData no se está re-ejecutando al
    // click — revisar page.tsx L195 onClick={fetchData}.
    expect(resp, 'Click en Refrescar debe disparar GET /ubicaciones-recientes').not.toBeNull();
    expect(resp!.status()).toBeLessThan(400);
  });

  test('Búsqueda filtra el DataGrid sin tronar el render', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team/gps');
    await expect(page.getByRole('heading', { name: /Hist[oó]rico GPS/i }).first())
      .toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // SearchBar con placeholder "Buscar vendedor por nombre o email..."
    const searchInput = page
      .getByPlaceholder(/Buscar vendedor por nombre o email/i)
      .first();

    await expect(searchInput).toBeVisible({ timeout: 5000 });
    await searchInput.fill('zzz-no-match-supervisor-test');

    // El filtro es client-side (page.tsx L65 useMemo) — NO debe haber 500 ni
    // error banner. La empty state del DataGrid debe mostrarse.
    // emptySearchMessage: "No se encontraron vendedores que coincidan..."
    await expect(
      page.getByText(/No se encontraron vendedores que coincidan/i),
    ).toBeVisible({ timeout: 5000 });

    // No debe haber error banner persistente (clase de ErrorBanner).
    const errorBanner = page.locator('[role="alert"], .bg-red-50, [class*="ErrorBanner"]');
    const errorCount = await errorBanner.count();
    if (errorCount > 0) {
      const visible = await errorBanner.first().isVisible().catch(() => false);
      expect(visible, 'No debe haber error banner tras búsqueda').toBeFalsy();
    }
  });

  test('Drill-down /team/{id}/gps carga eventos del día y filtros funcionan', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // El índice nos puede dar un usuarioId del tenant del SUPERVISOR.
    // Si no hay datos, navegamos directamente a un id conocido (vendedor seed
    // slot 1). Como no podemos garantizar IDs estables, intentamos extraer
    // uno desde la API directamente.
    const apiResp = await page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/team/ubicaciones-recientes') &&
          resp.request().method() === 'GET',
        { timeout: 20000 },
      )
      .catch(() => null);

    await page.goto('/team/gps');
    await expect(page.getByRole('heading', { name: /Hist[oó]rico GPS/i }).first())
      .toBeVisible({ timeout: 15000 });

    let usuarioId: number | null = null;
    if (apiResp && apiResp.ok()) {
      try {
        const body = (await apiResp.json()) as Array<{ usuarioId: number }>;
        if (Array.isArray(body) && body.length > 0) {
          usuarioId = body[0].usuarioId;
        }
      } catch {
        // ignore parse errors — caemos al fallback skip.
      }
    }

    if (usuarioId == null) {
      // Sin datos no hay nada que drill-down. NO es bug — tenant vacío.
      // PROD BUG / FIX TODO: si el seed del SUPERVISOR slot 1 nunca tiene
      // actividad GPS, este test pierde cobertura. Considerar agregar seed
      // fixture con UbicacionesVendedor o ClienteVisitas para slot 1.
      test.skip(true, 'SUPERVISOR sin vendedores con actividad GPS — drill-down no aplicable');
      return;
    }

    const detallePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/team/usuarios/${usuarioId}/actividad-gps`) &&
        resp.request().method() === 'GET',
      { timeout: 20000 },
    ).catch(() => null);

    await page.goto(`/team/${usuarioId}/gps`);

    // La página tiene PageHeader con el nombre del vendedor o "#id" fallback.
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });

    const detResp = await detallePromise;
    expect(
      detResp,
      'GET /api/team/usuarios/{id}/actividad-gps debe haber sido invocado',
    ).not.toBeNull();
    expect(detResp!.status()).toBeLessThan(400);

    // Las KPI cards renderizan siempre (eventos, ventas, cobros, visitas).
    await expect(page.getByText(/eventos/i).first()).toBeVisible({ timeout: 10000 });

    // Botón Exportar CSV existe (puede estar disabled si 0 eventos — eso es OK).
    const exportBtn = page.getByRole('button', { name: /Exportar CSV/i }).first();
    await expect(exportBtn).toBeVisible({ timeout: 5000 });

    // Filtros tipo chips (page.tsx L364-385). Click en "Visita" debe togglear
    // aria-pressed sin disparar errores de network.
    const visitaChip = page
      .getByRole('button', { name: /Activar filtro: Visita|Desactivar filtro: Visita/i })
      .first();

    if (await visitaChip.count() > 0) {
      const before = await visitaChip.getAttribute('aria-pressed');
      await visitaChip.click();
      // El aria-pressed debe haber cambiado tras el click.
      await expect(visitaChip).not.toHaveAttribute('aria-pressed', before ?? '');
    }
  });

  test('Preset "Ayer" cambia la URL y dispara nueva petición', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // Extraemos un usuarioId desde el listado.
    const listadoPromise = page
      .waitForResponse(
        (resp) =>
          resp.url().includes('/api/team/ubicaciones-recientes') &&
          resp.request().method() === 'GET',
        { timeout: 20000 },
      )
      .catch(() => null);

    await page.goto('/team/gps');
    const listadoResp = await listadoPromise;
    let usuarioId: number | null = null;
    if (listadoResp && listadoResp.ok()) {
      try {
        const body = (await listadoResp.json()) as Array<{ usuarioId: number }>;
        if (Array.isArray(body) && body.length > 0) {
          usuarioId = body[0].usuarioId;
        }
      } catch { /* ignore */ }
    }

    if (usuarioId == null) {
      test.skip(true, 'SUPERVISOR sin vendedores — preset Ayer no aplicable');
      return;
    }

    await page.goto(`/team/${usuarioId}/gps`);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15000 });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const ayerPromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/team/usuarios/${usuarioId}/actividad-gps`) &&
        resp.request().method() === 'GET',
      { timeout: 15000 },
    ).catch(() => null);

    // El botón "Ayer" tiene texto "Ayer" (ver page.tsx L329-346).
    const ayerBtn = page.getByRole('button', { name: /^Ayer$/i }).first();
    await expect(ayerBtn).toBeVisible({ timeout: 5000 });
    await ayerBtn.click();

    // La URL debe contener ?dia=YYYY-MM-DD (page.tsx L239).
    await expect(page).toHaveURL(/\?dia=\d{4}-\d{2}-\d{2}/, { timeout: 5000 });

    // Y debe haber disparado una nueva petición al backend con ese día.
    const resp = await ayerPromise;
    // PROD BUG / FIX TODO: si null, handlePreset no está re-cargando el día.
    // Revisar useEffect L224-234 del page.tsx detalle.
    expect(resp, 'Click en "Ayer" debe disparar GET /actividad-gps').not.toBeNull();
    expect(resp!.status()).toBeLessThan(400);
  });
});
