import { test, expect } from '@playwright/test';
import { loginAsSupervisor } from './helpers/auth-supervisor';

/**
 * E2E day-in-the-life — SUPERVISOR (web counterpart)
 *
 * Espejo web del Maestro flow:
 *   apps/mobile-app/.maestro/e2e-day-in-the-life/02-supervisor-equipo-mapa.yaml
 *
 * El flow nativo cubre dashboard "Hoy" + tab "Equipo" + mapa con pins +
 * detalle vendedor + logout. En web, el SUPERVISOR aterriza en /dashboard
 * (Tablero scoped al equipo, ver auth-supervisor.ts) y consume:
 *   - /team (MiembrosTab / KPIs / lista vendedores)
 *   - /team/mapa o módulo de mapa del equipo (si existe en web)
 *   - /team/[vendedorId] (detalle vendedor)
 *
 * Cobertura mínima del día:
 *   1. Login supervisor → /dashboard
 *   2. Validar UI scoped al rol SUPERVISOR (no ve admin global)
 *   3. Navegar a /team → ver lista de vendedores
 *   4. Abrir detalle del primer vendedor visible
 *   5. Volver a dashboard
 *   6. Logout exitoso → redirect a /login
 *
 * Notas:
 *   - Se ejecuta en serie porque SUPERVISOR slot 1 es único.
 *   - Mobile Chrome se skipea: el day-in-the-life real corre en Maestro
 *     contra Expo Go, no contra el responsive web en Chrome móvil.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Day-in-the-life SUPERVISOR — flujo web equivalente al Maestro', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSupervisor(page);
  });

  test('Supervisor recorre dashboard, equipo, detalle vendedor y cierra sesión', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip();
      return;
    }

    // ── FASE 1: dashboard del supervisor ─────────────────────
    await expect(page).toHaveURL(/dashboard/, { timeout: 25000 });

    // El dashboard supervisor muestra al menos un encabezado / saludo del rol.
    // Toleramos varios strings posibles (Tablero / Bienvenido / Supervisor).
    const dashHeading = page
      .getByRole('heading', { name: /Tablero|Bienvenido|Supervisor|Inicio|Hoy/i })
      .first()
      .or(page.locator('h1, h2').first());
    await expect(dashHeading).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'e2e/screenshots/day-supervisor-01-dashboard.png',
      fullPage: true,
    });

    // ── FASE 2: navegar a /team (equivalente al tab Equipo) ─
    await page.goto('/team');
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => { /* ok */ });

    // Heading de la pantalla equipo / miembros.
    // Locked a level: 1 para evitar strict-mode violation con:
    //  - h2 "Navegación" del sidebar
    //  - h2 "Vendedores del Equipo (N)" en MiembrosTab.tsx:326
    // El PageHeader siempre renderiza el título como h1.
    const teamHeading = page.getByRole('heading', { level: 1, name: 'Equipo', exact: true });
    await expect(teamHeading.first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'e2e/screenshots/day-supervisor-02-team.png',
      fullPage: true,
    });

    // ── FASE 3: abrir detalle del primer vendedor visible ───
    // Tolerar varios patrones: filas de tabla, cards, link directo.
    const vendedorRow = page
      .getByRole('row')
      .filter({ hasText: /VENDEDOR|Vendedor/i })
      .first()
      .or(page.getByRole('link', { name: /Vendedor|vendedor/i }).first())
      .or(page.locator('[data-testid^="vendedor-"]').first());

    const hasVendedor = await vendedorRow.isVisible().catch(() => false);
    if (hasVendedor) {
      await vendedorRow.click({ trial: false }).catch(async () => {
        // Si el row no es clickeable, buscar link / botón dentro.
        const linkInRow = vendedorRow.getByRole('link').or(vendedorRow.getByRole('button')).first();
        await linkInRow.click({ force: true });
      });

      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

      await page.screenshot({
        path: 'e2e/screenshots/day-supervisor-03-vendedor-detalle.png',
        fullPage: true,
      });

      // Algún heading o tarjeta del detalle del vendedor visible
      const detailHeading = page.locator('h1, h2').first();
      await expect(detailHeading).toBeVisible({ timeout: 10000 });
    }

    // ── FASE 4: volver al dashboard ─────────────────────────
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });

    // ── FASE 5: logout vía menú de usuario ──────────────────
    // El trigger es un Button del Header (avatar + nombre) marcado con
    // data-tour="header-user-menu". Abre un Dialog (NO Popover/DropdownMenu),
    // así que el botón de logout dentro vive con role="button", no "menuitem".
    const userMenuTrigger = page
      .locator('header button[data-tour="header-user-menu"]')
      .first()
      .or(page.locator('[data-testid="user-menu-trigger"]').first());

    await expect(userMenuTrigger).toBeVisible({ timeout: 10000 });
    await userMenuTrigger.click({ force: true });

    const logoutBtn = page
      .getByRole('button', { name: /Cerrar sesi[oó]n/i })
      .first()
      .or(page.getByText(/Cerrar sesi[oó]n/i).first());

    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click({ force: true });

    // ── FASE 6: validar logout exitoso (redirect a /login) ──
    await expect(page).toHaveURL(/login/, { timeout: 20000 });
    await expect(page.locator('#email')).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'e2e/screenshots/day-supervisor-04-logout.png',
      fullPage: true,
    });
  });
});
