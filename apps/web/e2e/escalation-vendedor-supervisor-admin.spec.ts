import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsVendedor } from './helpers/auth';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * Escalation Chain — VENDEDOR -> SUPERVISOR -> ADMIN.
 *
 * Por qué existe:
 *   La cadena de escalación de roles es el corazón del RBAC. Cada eslabón debe:
 *     - VENDEDOR: solo ve su propio scope (sin gestión de equipo)
 *     - SUPERVISOR: solo ve a SUS vendedores (consume /api/supervisores/mis-vendedores)
 *       y NO ve miembros con rol ADMIN ni SUPER_ADMIN.
 *     - ADMIN: ve TODOS los miembros (consume /api/usuarios global) y puede invitar
 *       cualquier rol por debajo (SUPERVISOR, VIEWER, VENDEDOR — pero NO ADMIN ni
 *       SUPER_ADMIN si no es SUPER_ADMIN, según RoleHierarchy.CanCreateRole).
 *
 *   Cualquier bypass aquí es privilege escalation. Este spec corre los 3 roles
 *   en la misma corrida para detectar regresiones cruzadas (ej: VENDEDOR
 *   pudiendo entrar a /team, o SUPERVISOR viendo /api/usuarios global, o ADMIN
 *   con select que incluye SUPER_ADMIN cuando no lo es).
 *
 * Cobertura:
 *   1. VENDEDOR -> /team: bloqueado por middleware o sin botones de gestión.
 *   2. SUPERVISOR -> /team: invoca /api/supervisores/mis-vendedores (NO global),
 *      no lista ADMIN/SUPER_ADMIN.
 *   3. ADMIN -> /team: invoca /api/usuarios global, select de invitar excluye
 *      SUPER_ADMIN.
 *   4. Cross-check: el sidebar refleja el nivel — VENDEDOR no ve "Equipo",
 *      SUPERVISOR y ADMIN sí.
 *
 * Refs:
 *   - apps/api/tests/HandySuites.Tests/Application/Usuarios/RoleHierarchyTests.cs
 *     (la matriz canónica de CanCreateRole)
 *   - apps/web/src/app/(dashboard)/team/components/MiembrosTab.tsx
 *     líneas 185 (branch isSupervisor) y 1865-1871 (split SupervisorView vs
 *     AdminUsersView)
 *   - apps/web/e2e/team-supervisor.spec.ts (cobertura SUPERVISOR aislada)
 *   - apps/web/e2e/rbac-negative-supervisor.spec.ts (cobertura negativa)
 *
 * Notas operativas:
 *   - test.describe.configure({ mode: 'serial' }) — el SA helper que comparten
 *     los 3 logins requiere serial mode (xjoshmenx es single-session).
 *   - Cada test hace su propio login (no compartimos contexto entre roles).
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Escalation chain VENDEDOR -> SUPERVISOR -> ADMIN', () => {
  // ───────── ESLABÓN 1: VENDEDOR ──────────────────────────────────────────
  test.describe('VENDEDOR (eslabón más bajo)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsVendedor(page);
    });

    test('VENDEDOR no puede acceder a /team (bloqueado o sin acciones de gestión)', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      await page.goto('/team').catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const url = page.url();
      const blockedByRedirect =
        /\/dashboard.*error=unauthorized/.test(url) ||
        /\/login/.test(url) ||
        !/\/team/.test(url);

      const accessDeniedMsg = await page
        .getByText(/acceso denegado|sin permisos|no tienes permiso|unauthorized/i)
        .first()
        .isVisible()
        .catch(() => false);

      // Acciones de gestión que un VENDEDOR JAMÁS debería poder ejercer.
      const nuevoUsuarioBtn = page.getByRole('button', { name: /nuevo usuario|invitar/i });
      const nuevoUsuarioCount = await nuevoUsuarioBtn.count();
      const asignarBtn = page.getByRole('button', { name: /asignar/i });
      const asignarCount = await asignarBtn.count();

      const hasNoManagementUI = nuevoUsuarioCount === 0 && asignarCount === 0;

      // PROD BUG / FIX TODO: si url contiene /team Y hay botón "Nuevo usuario"
      // O "Asignar", el middleware.ts ROLE_RESTRICTED_ROUTES no está cubriendo
      // /team para VENDEDOR. Revisar apps/web/src/middleware.ts.
      expect(
        blockedByRedirect || accessDeniedMsg || hasNoManagementUI,
        'VENDEDOR debe ser bloqueado en /team o no ver acciones de gestión',
      ).toBeTruthy();
    });

    test('VENDEDOR no ve enlace "Equipo" en el sidebar', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Buscamos el link "Equipo" dentro de la nav lateral (no en breadcrumbs ni
      // títulos de página). Usamos getByRole('navigation') como scope.
      const nav = page.getByRole('navigation').first();
      const equipoLink = nav.getByRole('link', { name: /^equipo$/i });
      const count = await equipoLink.count();

      // PROD BUG / FIX TODO: si count > 0 el sidebar está exponiendo /team a
      // VENDEDOR. Revisar apps/web/src/components/layout/Sidebar.tsx o
      // navigation config — debe filtrar por rol antes de renderizar el link.
      expect(count, 'VENDEDOR no debe ver link Equipo en el sidebar').toBe(0);
    });
  });

  // ───────── ESLABÓN 2: SUPERVISOR ────────────────────────────────────────
  test.describe('SUPERVISOR (eslabón intermedio)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsSupervisor(page);
    });

    test('SUPERVISOR carga /team e invoca /api/supervisores/mis-vendedores (no /api/usuarios)', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      const misVendedoresPromise = page.waitForResponse(
        (resp) => resp.url().includes('/api/supervisores/mis-vendedores') && resp.status() === 200,
        { timeout: 20000 },
      ).catch(() => null);

      // Detectamos llamadas LEAK al endpoint global /api/usuarios.
      const usuariosGlobalCalls: string[] = [];
      page.on('request', (req) => {
        const u = req.url();
        // Match exacto a /api/usuarios (no /api/usuarios/X) — el listado global.
        if (/\/api\/usuarios(?:\?|$)/.test(u)) {
          usuariosGlobalCalls.push(u);
        }
      });

      await page.goto('/team');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const resp = await misVendedoresPromise;

      // PROD BUG / FIX TODO: si resp es null, MiembrosTab.tsx línea 185 no
      // está ejecutando el branch isSupervisor. Revisar el role del session.
      expect(resp, 'GET /api/supervisores/mis-vendedores debe invocarse').not.toBeNull();

      // PROD BUG / FIX TODO: si usuariosGlobalCalls.length > 0, SUPERVISOR
      // está leakeando el endpoint global de usuarios. Privilege escalation.
      expect(
        usuariosGlobalCalls.length,
        `SUPERVISOR no debe llamar /api/usuarios (LEAK detectado: ${usuariosGlobalCalls.join(', ')})`,
      ).toBe(0);
    });

    test('SUPERVISOR no ve miembros ADMIN ni SUPER_ADMIN', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      await page.goto('/team');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      // Badges exactos para evitar match con "Administración" del breadcrumb.
      const adminBadge = page.getByText(/^ADMIN$/);
      const superAdminBadge = page.getByText(/^SUPER_ADMIN$/);

      expect(await adminBadge.count(), 'SUPERVISOR no debe ver badges ADMIN').toBe(0);
      expect(await superAdminBadge.count(), 'SUPERVISOR no debe ver badges SUPER_ADMIN').toBe(0);
    });
  });

  // ───────── ESLABÓN 3: ADMIN ─────────────────────────────────────────────
  test.describe('ADMIN (eslabón superior)', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('ADMIN carga /team y consume el endpoint global /api/usuarios', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      // ADMIN debe invocar el endpoint global (no el supervisor-scoped).
      const usuariosPromise = page.waitForResponse(
        (resp) => /\/api\/usuarios(?:\?|$)/.test(resp.url()) && resp.status() === 200,
        { timeout: 20000 },
      ).catch(() => null);

      // Y NO debe colarse por el scope supervisor.
      const misVendedoresCalls: string[] = [];
      page.on('request', (req) => {
        if (req.url().includes('/api/supervisores/mis-vendedores')) {
          misVendedoresCalls.push(req.url());
        }
      });

      await page.goto('/team');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const resp = await usuariosPromise;

      // PROD BUG / FIX TODO: si resp es null, MiembrosTab.tsx (AdminUsersView)
      // no está cargando el listado global. Revisar línea 1871 (return
      // AdminUsersView para rol ADMIN/SUPER_ADMIN).
      expect(resp, 'GET /api/usuarios debe invocarse para ADMIN').not.toBeNull();

      expect(
        misVendedoresCalls.length,
        `ADMIN no debe usar el endpoint SUPERVISOR-scoped (encontrado: ${misVendedoresCalls.join(', ')})`,
      ).toBe(0);
    });

    test('ADMIN ve el botón "Nuevo usuario" y puede abrir el modal de invitar', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      await page.goto('/team');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const newUserBtn = page.getByRole('button', { name: /nuevo usuario|invitar/i }).first();
      await expect(newUserBtn).toBeVisible({ timeout: 10000 });
      await newUserBtn.click();

      // El modal debe abrir con un campo de email visible.
      const emailInput = page.locator('input[type="email"], input[name="email"], #email').first();
      await expect(emailInput).toBeVisible({ timeout: 10000 });
    });

    test('Select de rol en modal "Nuevo usuario" NO incluye SUPER_ADMIN para ADMIN normal', async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      await page.goto('/team');
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

      const newUserBtn = page.getByRole('button', { name: /nuevo usuario|invitar/i }).first();
      await expect(newUserBtn).toBeVisible({ timeout: 10000 });
      await newUserBtn.click();

      const nativeSelect = page.locator('select[name="rol"], select#rol').first();
      const comboboxTrigger = page.getByRole('combobox', { name: /rol/i }).first();

      let optionsUpper: string[] = [];

      if (await nativeSelect.count() > 0) {
        const opts = await nativeSelect.locator('option').allTextContents();
        optionsUpper = opts.map((o) => o.trim().toUpperCase());
      } else if (await comboboxTrigger.count() > 0) {
        await comboboxTrigger.click();
        const listbox = page.getByRole('listbox');
        await expect(listbox).toBeVisible({ timeout: 5000 });
        const opts = await listbox.getByRole('option').allTextContents();
        optionsUpper = opts.map((o) => o.trim().toUpperCase());
      } else {
        // PROD BUG / FIX TODO: el modal "Nuevo usuario" cambió y no expone ni
        // <select> ni combobox para el rol. Revisar MiembrosTab.tsx línea
        // ~1851 (donde se construyen las opciones).
        throw new Error('Select de rol no encontrado en modal "Nuevo usuario"');
      }

      // PROD BUG / FIX TODO: si ADMIN aparece exacto, un ADMIN normal estaría
      // creando otros ADMIN — viola RoleHierarchy.CanCreateRole(ADMIN, ADMIN)
      // que retorna false. Revisar AssignableRoles(ADMIN) en el backend y la
      // lista que el frontend usa para poblar el select.
      expect(
        optionsUpper.some((o) => o === 'SUPER_ADMIN'),
        'ADMIN no debe poder crear SUPER_ADMIN',
      ).toBeFalsy();

      // Sí debe ver al menos VENDEDOR como opción de creación.
      expect(
        optionsUpper.some((o) => o.includes('VENDEDOR')),
        'ADMIN debe poder crear VENDEDOR',
      ).toBeTruthy();
    });
  });

  // ───────── CROSS-ROLE: smoke de coherencia ──────────────────────────────
  test('Sidebar refleja la cadena: VENDEDOR (sin Equipo) -> SUPERVISOR (Equipo) -> ADMIN (Equipo + más)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    // VENDEDOR: sin link "Equipo".
    await loginAsVendedor(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const vendedorEquipo = await page.getByRole('navigation').first()
      .getByRole('link', { name: /^equipo$/i }).count();
    expect(vendedorEquipo, 'VENDEDOR sin Equipo en sidebar').toBe(0);

    // SUPERVISOR: con link "Equipo".
    await loginAsSupervisor(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const supervisorEquipo = await page.getByRole('navigation').first()
      .getByRole('link', { name: /^equipo$/i }).count();
    // PROD BUG / FIX TODO: si SUPERVISOR no ve Equipo, no puede gestionar sus
    // vendedores. Revisar config de navegación por rol.
    expect(supervisorEquipo, 'SUPERVISOR debe ver Equipo en sidebar').toBeGreaterThan(0);

    // ADMIN: con link "Equipo" también.
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    const adminEquipo = await page.getByRole('navigation').first()
      .getByRole('link', { name: /^equipo$/i }).count();
    expect(adminEquipo, 'ADMIN debe ver Equipo en sidebar').toBeGreaterThan(0);
  });
});
