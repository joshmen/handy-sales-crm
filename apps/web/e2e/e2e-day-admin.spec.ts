import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * E2E DAY-IN-THE-LIFE — ADMIN (web)
 *
 * Perfil:        ADMIN
 * Email:         admin@jeyma.com
 * Password:      test123
 *
 * Cubre el "día del admin" navegando los módulos principales del backoffice:
 *   1. Login admin + landing en /dashboard con "Tablero" visible
 *   2. Sidebar → Clientes (/clients) + abrir/cerrar drawer "Nuevo cliente"
 *   3. Sidebar → Productos (/products)
 *   4. Sidebar → Pedidos (/orders)
 *   5. Sidebar → Equipo (/team)
 *   6. Sidebar → Reportes (/reports)
 *   7. User menu top-right → Cerrar sesión → /login
 *
 * Refs sidebar:
 *   apps/web/src/components/layout/Sidebar.tsx
 *     line 102 label 'Clientes' href '/clients'
 *     line 143 label 'Productos' href '/products'
 *     line 83  label 'Pedidos'  href '/orders'
 *     line 286 label 'Equipo'   href '/team'
 *     line 263 label 'Reportes' href '/reports'
 *
 * Logout ref: apps/web/src/components/layout/Header.tsx (handleLogout + tc('signOut'))
 *
 * Notas operativas:
 *   - test.describe.configure({ mode: 'serial' }) — los pasos comparten state
 *     de navegación; serial evita race conditions.
 *   - El logout final invalida la storageState admin compartida. Por eso el
 *     test corre en su propio context (afterAll cleanup no es necesario porque
 *     auth.setup.ts re-genera storageState al inicio de cada test run).
 *   - Skip explícito en Mobile Chrome: el sidebar en mobile es un drawer
 *     toggle distinto y este flow está pensado para desktop (donde el cliente
 *     visualiza el back-office). Cobertura mobile via Maestro
 *     (03-admin-mobile-dashboard.yaml).
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Day-in-the-life ADMIN — dashboard + navegación módulos + logout', () => {
  test.beforeAll(({ }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); }
  });

  test('ADMIN: login → dashboard "Tablero" visible', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 25000 });

    // Aceptamos "Tablero" (es) o "Dashboard" (en/título genérico). El layout
    // canónico usa PageHeader con el título de la sección. Locked a level: 1
    // para evitar strict-mode collision con h2 "Navegación" del sidebar.
    const tableroHeading = page.getByRole('heading', { level: 1, name: /^(Tablero|Dashboard)$/i });
    await expect(tableroHeading.first()).toBeVisible({ timeout: 15000 });
  });

  test('ADMIN: sidebar → Clientes (/clients) + abrir drawer "Nuevo cliente"', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

    const nav = page.getByRole('navigation').first();
    // "Clientes" en el sidebar es un button parent (no href) que toggle un
    // submenu. El link real al index es "Lista de clientes" (href="/clients").
    const clientesToggle = nav.getByRole('button', { name: /^Clientes$/i }).first();
    await expect(clientesToggle).toBeVisible({ timeout: 15000 });
    await clientesToggle.click();

    const clientesLink = nav.getByRole('link', { name: /^Lista de clientes$/i }).first();
    await expect(clientesLink).toBeVisible({ timeout: 10000 });
    await clientesLink.click();

    await expect(page).toHaveURL(/\/clients/, { timeout: 15000 });

    // Header de la página (h1 vía PageHeader)
    await expect(
      page.getByRole('heading', { level: 1, name: /Clientes/i }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Botón "Nuevo cliente" (si existe — algunos planes lo ocultan). Tolerar
    // ausencia: si no aparece el botón, el sub-step de drawer se omite.
    const nuevoClienteBtn = page.getByRole('button', { name: /nuevo cliente|crear cliente|nuevo/i }).first();
    const hasNuevoBtn = await nuevoClienteBtn.isVisible().catch(() => false);

    if (hasNuevoBtn) {
      await nuevoClienteBtn.click();

      // Drawer/modal abierto: buscar un email/nombre input típico, o role=dialog.
      const drawer = page.getByRole('dialog')
        .or(page.locator('[role="dialog"]'))
        .or(page.locator('input[name="nombre"], input[name="email"], input[type="email"]'));
      await expect(drawer.first()).toBeVisible({ timeout: 10000 });

      // Cerrar via Escape (más resiliente que buscar botón "Cancelar"/"X")
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('ADMIN: sidebar → Productos (/products)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

    const nav = page.getByRole('navigation').first();
    // "Productos" en el sidebar es un button parent (no href) que toggle un
    // submenu (Sidebar.tsx:142-183). El link real al index es
    // "Lista de productos" (href="/products"). Mismo patrón que Clientes.
    const productosToggle = nav.getByRole('button', { name: /^Productos$/i }).first();
    await expect(productosToggle).toBeVisible({ timeout: 15000 });
    await productosToggle.click();

    const productosLink = nav.getByRole('link', { name: /^Lista de productos$/i }).first();
    await expect(productosLink).toBeVisible({ timeout: 10000 });
    await productosLink.click();

    await expect(page).toHaveURL(/\/products/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { level: 1, name: /Productos/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('ADMIN: sidebar → Pedidos (/orders)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

    const nav = page.getByRole('navigation').first();
    const pedidosLink = nav.getByRole('link', { name: /^Pedidos$/i }).first();
    await expect(pedidosLink).toBeVisible({ timeout: 15000 });
    await pedidosLink.click();

    await expect(page).toHaveURL(/\/orders/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { level: 1, name: /Pedidos/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('ADMIN: sidebar → Equipo (/team)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

    const nav = page.getByRole('navigation').first();
    // "Equipo" en el sidebar es un button parent (no href) que toggle un
    // submenu (Sidebar.tsx:285-298). El link real al index es "Miembros"
    // (href="/team"). Mismo patrón que Clientes y Productos.
    const equipoToggle = nav.getByRole('button', { name: /^Equipo$/i }).first();
    await expect(equipoToggle).toBeVisible({ timeout: 15000 });
    await equipoToggle.click();

    const miembrosLink = nav.getByRole('link', { name: /^Miembros$/i }).first();
    await expect(miembrosLink).toBeVisible({ timeout: 10000 });
    await miembrosLink.click();

    await expect(page).toHaveURL(/\/team/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { level: 1, name: /Equipo|Miembros/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('ADMIN: sidebar → Reportes (/reports)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

    const nav = page.getByRole('navigation').first();
    const reportesLink = nav.getByRole('link', { name: /^Reportes$/i }).first();
    await expect(reportesLink).toBeVisible({ timeout: 15000 });
    await reportesLink.click();

    await expect(page).toHaveURL(/\/reports/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { level: 1, name: /Reportes/i }).first(),
    ).toBeVisible({ timeout: 15000 });
  });

  test('ADMIN: user menu (avatar) → Cerrar sesión → /login', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => { /* ok */ });

    // El user menu en Header.tsx es un Dialog que se abre via avatar/initials
    // en la esquina superior derecha. Buscamos por aria-label/name comunes.
    const avatarBtn = page
      .getByRole('button', { name: /perfil|avatar|usuario|admin|cuenta|menu de usuario/i })
      .first();

    if (await avatarBtn.isVisible().catch(() => false)) {
      await avatarBtn.click();
      await page.waitForTimeout(500);
    } else {
      // Fallback: buscar el primer button dentro del header que abre el menú.
      const headerBtn = page.locator('header button').last();
      if (await headerBtn.isVisible().catch(() => false)) {
        await headerBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // El botón "Cerrar sesión" puede aparecer como button o menuitem; tolerar
    // ambos via .or() chain. Match con tilde (i18n es) y sin tilde (en).
    const logoutBtn = page.getByRole('button', { name: /cerrar sesi[oó]n|sign out|salir/i })
      .or(page.getByRole('menuitem', { name: /cerrar sesi[oó]n|sign out|salir/i }))
      .first();

    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();

    // Esperar redirect a /login o landing /. Header.handleLogout hace
    // router.push('/') tras signOut, y el middleware redirige no-auth a /login.
    await expect(page).toHaveURL(/\/login|\/$/, { timeout: 20000 });
  });
});
