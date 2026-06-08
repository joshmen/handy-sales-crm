import { test, expect, Page } from '@playwright/test';
import { loginAsVendedor } from './helpers/auth';

/**
 * E2E Day-in-the-life — Vendedor (read-only web view).
 *
 * El vendedor opera primariamente desde mobile (Maestro flow en
 * apps/mobile-app/.maestro/e2e-day-in-the-life/01-vendedor-jornada-completa.yaml).
 * Este spec valida el equivalente web read-only:
 *
 *   1. Login como vendedor
 *   2. Dashboard "Mi Rendimiento"
 *   3. Navegacion a Pedidos (lectura)
 *   4. Navegacion a Cobranza (lectura)
 *   5. Navegacion a Rutas / Clientes (lectura)
 *   6. Logout final
 *
 * Sigue las reglas de la suite: no em-dashes, BeOneOf via .or(), modo serial.
 */

test.setTimeout(90_000);

async function waitForPageLoad(page: Page): Promise<void> {
  // Espera por networkidle (XHR completos) — clave para que /orders termine
  // su fetchOrders() inicial antes de buscar el h1.
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);

  // Match más amplio: cubre spinner Tailwind (.animate-spin) y Loader2 con
  // [class*="spin"] que algunos PageHeader usan.
  const spinner = page.locator('.animate-spin, [class*="spin"]');
  if ((await spinner.count()) > 0) {
    await spinner
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => undefined);
  }
  await page.waitForTimeout(500);
}

test.describe('E2E Day - Vendedor (read-only web)', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') {
      test.skip();
      return;
    }
    await loginAsVendedor(page);
    await waitForPageLoad(page);
  });

  test('1. Dashboard vendedor muestra "Mi Rendimiento"', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });

    // Vendedor h1: "Mi Rendimiento" (no usar em-dash en assertion).
    const vendedorH1 = page.locator('h1', { hasText: /Mi Rendimiento/i });
    await expect(vendedorH1).toBeVisible({ timeout: 15000 });

    // Captura visual del dashboard del vendedor.
    await page.screenshot({
      path: 'e2e/screenshots/day-vendedor-01-dashboard.png',
      fullPage: true,
    });
  });

  test('2. Navegacion a /orders (lectura)', async ({ page }) => {
    await page.goto('/orders', { waitUntil: 'domcontentloaded' });
    // Esperar a que la URL final sea /orders (evita race con redirects RBAC tempranos).
    await page.waitForURL(/\/orders(\/|$|\?)/, { timeout: 20000 }).catch(() => undefined);

    // /orders dispara dos efectos en paralelo (fetchOrders + SignalR subscribe)
    // que pueden re-renderizar la página mientras intentamos leer el h1. La
    // espera explícita por el h1 con texto resuelto cubre tanto la hidratación
    // de i18n como el primer fetchOrders. Usamos level: 1 para evitar colisión
    // con h2 del sidebar ("Navegación") y demás.
    const heading = page.getByRole('heading', { level: 1, name: /Pedidos|Mis Pedidos/i });
    await expect(heading.first()).toBeVisible({ timeout: 30000 });

    // Estabilizar: esperar a que el textContent del h1 esté resuelto (no vacío
    // ni placeholder) — evita capturar la render intermedia entre fetch + signalR.
    await page.waitForFunction(() => {
      const h1 = document.querySelector('h1');
      return !!(h1 && h1.textContent && /pedido/i.test(h1.textContent));
    }, { timeout: 15000 }).catch(() => undefined);

    // Limpieza final de spinners + network idle (post hidratación).
    await waitForPageLoad(page);

    await page.screenshot({
      path: 'e2e/screenshots/day-vendedor-02-orders.png',
      fullPage: true,
    });
  });

  test('3. RBAC: vendedor NO puede acceder a /cobranza (redirect a /login)', async ({ page }) => {
    // Regla de negocio: cobranza esta restringida a ADMIN/SUPERVISOR/SUPER_ADMIN
    // (apps/web/src/middleware.ts). Vendedor debe ser redirigido a /login.
    // Este es un test POSITIVO de RBAC: validamos que la denegacion ocurre.
    await page.goto('/cobranza', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });

    await page.screenshot({
      path: 'e2e/screenshots/day-vendedor-03-cobranza-rbac-denied.png',
      fullPage: true,
    });

    // Restaurar sesion para los siguientes tests en modo serial.
    await loginAsVendedor(page);
    await waitForPageLoad(page);
  });

  test('4. Navegacion a /clients (lectura)', async ({ page }) => {
    await page.goto('/clients');
    await waitForPageLoad(page);

    const heading = page
      .locator('h1', { hasText: /Clientes/i })
      .or(page.locator('h1', { hasText: /Mis Clientes/i }));
    await expect(heading.first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'e2e/screenshots/day-vendedor-04-clients.png',
      fullPage: true,
    });
  });

  test('5. Navegacion a /routes (lectura)', async ({ page }) => {
    await page.goto('/routes');
    await waitForPageLoad(page);

    const heading = page
      .locator('h1', { hasText: /Rutas/i })
      .or(page.locator('h1', { hasText: /Mi Ruta/i }));

    const hasHeading = await heading
      .first()
      .isVisible({ timeout: 8000 })
      .catch(() => false);

    if (hasHeading) {
      await expect(heading.first()).toBeVisible();
    } else {
      // Vendedor puede no tener ruta del dia; validar que sigue en dashboard.
      await expect(page).not.toHaveURL(/login/, { timeout: 5000 });
    }

    await page.screenshot({
      path: 'e2e/screenshots/day-vendedor-05-routes.png',
      fullPage: true,
    });
  });

  test('6. Logout vendedor (vuelve a /login)', async ({ page }) => {
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Abrir menu de usuario y cerrar sesion. Tolerar varias variantes:
    // - boton con aria-label "Usuario" / "Perfil"
    // - boton text "Cerrar sesion" directo
    const userMenuBtn = page
      .getByRole('button', { name: /Usuario|Perfil|Mi cuenta|Avatar/i })
      .first();

    if (await userMenuBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await userMenuBtn.click();
      await page.waitForTimeout(500);
    }

    const logoutBtn = page
      .getByRole('button', { name: /Cerrar sesi[oó]n/i })
      .or(page.getByRole('menuitem', { name: /Cerrar sesi[oó]n/i }))
      .or(page.getByText(/Cerrar sesi[oó]n/i))
      .first();

    if (await logoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutBtn.click();

      // Modal de confirmacion "Si, cerrar sesion" (opcional).
      const confirmBtn = page
        .getByRole('button', { name: /S[ií], cerrar sesi[oó]n/i })
        .first();
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Validar redirect a login.
      await expect(page).toHaveURL(/login/, { timeout: 20000 });
    } else {
      // Fallback: signOut programatico via boton API si no hay UI directa.
      await page.goto('/api/auth/signout');
      await page.waitForTimeout(1000);
      // Confirmar en pagina de NextAuth si aparece.
      const confirmSignout = page
        .getByRole('button', { name: /Sign out|Cerrar sesi[oó]n/i })
        .first();
      if (await confirmSignout.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmSignout.click();
      }
      await expect(page).toHaveURL(/login|signout/, { timeout: 15000 });
    }

    await page.screenshot({
      path: 'e2e/screenshots/day-vendedor-06-logout.png',
      fullPage: true,
    });
  });
});
