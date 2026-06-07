import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * Team / MiembrosTab — SUPERVISOR scope (caso sup-fe-team-miembros).
 *
 * Por que existe:
 *   MiembrosTab.tsx (linea 1867) hace branching por rol: cuando el caller es
 *   SUPERVISOR renderiza <SupervisorView /> (NO AdminUsersView). Este branch
 *   tiene contrato distinto:
 *     - Llama supervisorService.getMisVendedores() → GET /api/supervisores/mis-vendedores
 *     - Llama supervisorService.getDashboard()     → GET /api/supervisores/dashboard
 *     - NO llama /api/usuarios global (leak de privilegios)
 *     - NO renderiza el boton "Nuevo usuario" del PageHeader (el header
 *       solo lo muestra cuando activeTab==='miembros' && createFn esta seteado;
 *       SupervisorView NUNCA invoca onCreateReady).
 *     - Renderiza tarjetas KPI con dashboard.{totalVendedores, pedidosHoy,
 *       pedidosMes, totalClientes, ventasMes}
 *     - Renderiza header "Mi Equipo" con count de vendedores asignados
 *     - NO permite asignar/desasignar (esas acciones solo aparecen si isAdmin)
 *
 * Cobertura (asserts reales, no solo navegar):
 *   1. GET /api/supervisores/mis-vendedores invocado al cargar /team
 *   2. GET /api/supervisores/dashboard invocado al cargar /team
 *   3. NO se invoca /api/usuarios global (RBAC negative — leak detection)
 *   4. Tarjetas KPI visibles con labels esperados
 *   5. Boton "Nuevo usuario / Invitar" NO esta presente para SUPERVISOR
 *   6. Boton "Asignar vendedores" NO esta presente para SUPERVISOR
 *   7. Boton "Refresh / Actualizar" SI esta presente
 *   8. La tab Dispositivos sigue accesible (SUPERVISOR puede ver dispositivos
 *      de su equipo — esto valida que el tab switching no rompe el branch)
 *
 * Requiere: e2e-sup-1@jeyma.com con rol SUPERVISOR y vendedores asignados
 *   (seed_e2e_supervisor_pg.sql segun helpers/auth-supervisor.ts).
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('SUPERVISOR — Team Miembros tab', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('SUPERVISOR carga /team → invoca mis-vendedores Y dashboard, NO /api/usuarios', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // Capturamos las 3 senales ANTES de navegar para evitar race.
    const misVendedoresPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/supervisores/mis-vendedores'),
      { timeout: 25000 },
    ).catch(() => null);

    const dashboardPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/supervisores/dashboard'),
      { timeout: 25000 },
    ).catch(() => null);

    // Detector de leak: si MiembrosTab cae al branch AdminUsersView por bug,
    // hara GET /api/usuarios?... que NO debe ocurrir para SUPERVISOR.
    const usuariosLeakCalls: string[] = [];
    page.on('response', (resp) => {
      const url = resp.url();
      // Solo nos importa /api/usuarios global, no /api/usuarios/{id}/...
      // ni /api/supervisores/* (que es lo correcto).
      if (
        url.includes('/api/usuarios') &&
        !url.includes('/api/supervisores') &&
        !url.includes('/api/usuarios/me')
      ) {
        usuariosLeakCalls.push(url);
      }
    });

    await page.goto('/team');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 15000 });

    const [misVendResp, dashResp] = await Promise.all([
      misVendedoresPromise,
      dashboardPromise,
    ]);

    // Pequena espera adicional para drenar cualquier request lazy.
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    // PROD BUG / FIX TODO: si misVendResp es null, MiembrosTab no esta
    // dispatcheando al SupervisorView. Revisar MiembrosTab.tsx linea 1867.
    expect(
      misVendResp,
      'GET /api/supervisores/mis-vendedores debe ser invocado para SUPERVISOR',
    ).not.toBeNull();
    expect(misVendResp?.status(), 'mis-vendedores debe responder 200/304').toBeLessThan(400);

    expect(
      dashResp,
      'GET /api/supervisores/dashboard debe ser invocado para SUPERVISOR',
    ).not.toBeNull();
    expect(dashResp?.status(), 'dashboard debe responder 200/304').toBeLessThan(400);

    // PROD BUG / FIX TODO: si hay calls a /api/usuarios global, hay leak de
    // privilegios o el branch isSupervisor de MiembrosTab.tsx fallo.
    expect(
      usuariosLeakCalls,
      `SUPERVISOR no debe invocar /api/usuarios global. Leak detectado: ${usuariosLeakCalls.join(', ')}`,
    ).toHaveLength(0);
  });

  test('SUPERVISOR ve tarjetas KPI del dashboard de equipo', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // El SupervisorView muestra KPICard con labels t('sellers'), t('ordersToday'),
    // t('ordersMonth'), t('clients'), t('salesMonth'). En i18n es:
    // "Vendedores", "Pedidos Hoy", "Pedidos Mes", "Clientes", "Ventas Mes".
    // Usamos regex laxa que tolera variaciones de capitalizacion/espacios.
    const kpiLabels = [
      /vendedores/i,
      /pedidos\s*(hoy|de hoy|del d[ií]a)/i,
      /pedidos\s*(mes|del mes)/i,
      /clientes/i,
      /ventas\s*(mes|del mes)/i,
    ];

    let visibleKpis = 0;
    for (const label of kpiLabels) {
      const count = await page.getByText(label).count();
      if (count > 0) visibleKpis++;
    }

    // PROD BUG / FIX TODO: si visibleKpis < 3, el dashboard no esta hidratando.
    // Posible causa: backend devolvio 401/403/500 al endpoint dashboard, o el
    // SupervisorView no esta llamando setDashboard(). Revisar SupervisorView
    // useEffect en MiembrosTab.tsx ~linea 204.
    expect(
      visibleKpis,
      'Al menos 3 de 5 KPIs (Vendedores/Pedidos Hoy/Pedidos Mes/Clientes/Ventas Mes) deben ser visibles',
    ).toBeGreaterThanOrEqual(3);
  });

  test('SUPERVISOR NO ve boton "Nuevo usuario" ni "Asignar vendedores"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // El PageHeader solo renderiza el boton "Nuevo usuario" cuando createFn
    // esta seteado, lo cual solo ocurre en AdminUsersView (onCreateReady).
    // SupervisorView NUNCA invoca onCreateReady → boton ausente.
    // PROD BUG / FIX TODO: si este boton aparece para SUPERVISOR, MiembrosTab
    // esta cayendo al branch AdminUsersView (regression del branch en linea 1867).
    const newUserBtn = page.getByRole('button', { name: /nuevo usuario|invitar/i });
    expect(
      await newUserBtn.count(),
      'SUPERVISOR no debe ver el boton "Nuevo usuario" (es exclusivo de ADMIN/SUPER_ADMIN)',
    ).toBe(0);

    // El boton "Asignar vendedores" solo aparece si isAdmin en SupervisorView
    // (MiembrosTab.tsx ~linea 277). SUPERVISOR no debe verlo.
    const assignBtn = page.getByRole('button', { name: /asignar vendedores/i });
    expect(
      await assignBtn.count(),
      'SUPERVISOR no debe ver el boton "Asignar vendedores" (es exclusivo de ADMIN)',
    ).toBe(0);
  });

  test('SUPERVISOR SI ve boton "Actualizar/Refresh" del SupervisorView', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // SupervisorView renderiza siempre el boton refresh (MiembrosTab.tsx ~linea 268).
    const refreshBtn = page.getByRole('button', { name: /actualizar|refresh/i }).first();
    await expect(refreshBtn, 'Boton "Actualizar" debe estar visible en SupervisorView').toBeVisible({ timeout: 10000 });

    // Click refresh → debe re-invocar GET /api/supervisores/mis-vendedores.
    const reloadPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/supervisores/mis-vendedores'),
      { timeout: 15000 },
    ).catch(() => null);

    await refreshBtn.click();
    const reloadResp = await reloadPromise;

    // PROD BUG / FIX TODO: si reloadResp es null, el handler onClick de
    // refresh no esta llamando loadData(). Revisar MiembrosTab.tsx ~linea 270.
    expect(
      reloadResp,
      'Click en "Actualizar" debe re-invocar GET /api/supervisores/mis-vendedores',
    ).not.toBeNull();
  });

  test('SUPERVISOR ve header "Mi Equipo" con count de vendedores', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // SupervisorView renderiza header con t('sellersTeamTitle', {count}) cuando
    // no es admin, que en es.json es algo como "Mi Equipo (N)" o
    // "Equipo de Vendedores (N)". Aceptamos varias variantes.
    const teamHeader = page.locator('h1, h2, h3').filter({
      hasText: /equipo|mi equipo|sellers team/i,
    });

    // PROD BUG / FIX TODO: si no aparece, SupervisorView no esta renderizando
    // la card "Mi Equipo" (MiembrosTab.tsx ~linea 326). Posible causa:
    // filteredVendedores es undefined o loading nunca termina.
    await expect(
      teamHeader.first(),
      'Header "Mi Equipo" debe estar visible en SupervisorView',
    ).toBeVisible({ timeout: 10000 });
  });

  test('SUPERVISOR puede cambiar a tab Dispositivos sin romper el branch', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // Tab Dispositivos debe estar accesible para SUPERVISOR (no hay gate de rol
    // en el role="tablist" de team/page.tsx).
    const dispositivosTab = page.getByRole('tab', { name: /dispositivos/i });
    await expect(dispositivosTab, 'Tab Dispositivos debe estar visible').toBeVisible({ timeout: 10000 });

    await dispositivosTab.click();
    await expect(dispositivosTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });

    // Volver a Miembros para validar que el branch SupervisorView se re-monta correctamente.
    const miembrosTab = page.getByRole('tab', { name: /miembros|members/i });
    await miembrosTab.click();
    await expect(miembrosTab).toHaveAttribute('aria-selected', 'true', { timeout: 5000 });

    // Tras volver, el boton "Actualizar" del SupervisorView debe estar de vuelta
    // (confirma que el branch no fallo silenciosamente).
    const refreshBtn = page.getByRole('button', { name: /actualizar|refresh/i }).first();
    await expect(
      refreshBtn,
      'Al volver a Miembros tras tab-switch, SupervisorView debe re-renderizar',
    ).toBeVisible({ timeout: 10000 });
  });
});
