import { test, expect, Page } from '@playwright/test';
import { loginAsSuperAdmin } from './helpers/auth';

/**
 * E2E DAY-IN-THE-LIFE — SUPER_ADMIN (web)
 *
 * Perfil:  xjoshmenx@gmail.com (único SUPER_ADMIN del sistema).
 * Surface: web es el primary para SA. Recorre el sidebar simplificado
 *          (Dashboard, Empresas, Usuarios Global, Planes, Anuncios,
 *           Cupones, Activity log, Configuración) y termina con
 *          logout desde el header.
 *
 * Mode: serial — sólo existe una sesión SA y el strict single-session
 *       cascadea si dos workers paralelos hacen login al mismo tiempo.
 *
 * Spec hermano en mobile:
 *   apps/mobile-app/.maestro/e2e-day-in-the-life/04-superadmin-mobile.yaml
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageReady(page: Page) {
  // Misma pausa que superadmin.spec.ts — los charts del system-dashboard
  // tardan en hidratar y los spinners viven dentro de las cards.
  await page.waitForLoadState('domcontentloaded');
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => { /* charts already mounted */ });
  }
  await page.waitForTimeout(500);
}

test.describe('Day in the life — SUPER_ADMIN web', () => {
  test('Recorrido full sidebar SA + logout', async ({ page }, testInfo) => {
    test.setTimeout(180000);

    // ── 1. Login SA — fast-path con storageState o form fallback.
    await loginAsSuperAdmin(page);

    // SA aterriza en /dashboard y un useEffect client-side hace
    // router.replace('/admin/system-dashboard'). Esa redirección ocurre
    // tras la hidratación, así que esperamos explícitamente la URL final.
    // Si el helper ya dejó al SA en /admin/system-dashboard, el waitForURL
    // resuelve inmediato.
    await page.waitForURL(/\/admin\/system-dashboard/, { timeout: 30000 });
    await expect(page).toHaveURL(/system-dashboard/, { timeout: 5000 });
    await waitForPageReady(page);

    // ── 2. Tablero — el título o KPIs principales deben estar visibles.
    const dashboardTitle = page.locator('h1').first();
    await expect(dashboardTitle).toBeVisible({ timeout: 15000 });
    await expect(dashboardTitle).toContainText(
      /Dashboard|Sistema|Tablero/i,
    );

    // KPI cards / labels esperados en el system-dashboard.
    const bodyText = (await page.textContent('body')) || '';
    expect(bodyText).toMatch(/Tenants|Empresas/);

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-01-system-dashboard.png',
      fullPage: true,
    });

    // En mobile el sidebar está colapsado; navegamos por URL directa
    // en lugar de buscar links en el aside. Los asserts de contenido
    // siguen siendo idénticos.
    const isMobile = testInfo.project.name === 'Mobile Chrome';

    // ── 3. Tenants ───────────────────────────────────────────────
    if (isMobile) {
      await page.goto('/admin/tenants');
    } else {
      const tenantsLink = page
        .locator('aside')
        .getByRole('link', { name: /Empresas|Tenants/i })
        .first();
      await tenantsLink.click();
    }
    await expect(page).toHaveURL(/\/admin\/tenants/, { timeout: 20000 });
    await waitForPageReady(page);

    // Tabla con al menos un tenant seed (Jeyma) o el heading correcto.
    const tenantsTitle = page.locator('h1').first();
    await expect(tenantsTitle).toContainText(/Empresas|Tenants/i);

    const tenantsBody = (await page.textContent('body')) || '';
    expect(tenantsBody).toMatch(/Jeyma|Huichol|Demo Corp/);

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-02-tenants.png',
      fullPage: true,
    });

    // ── 4. Planes (subscription-plans) ───────────────────────────
    if (isMobile) {
      await page.goto('/admin/subscription-plans');
    } else {
      const plansLink = page
        .locator('aside')
        .getByRole('link', { name: /Planes/i })
        .first();
      await plansLink.click();
    }
    await expect(page).toHaveURL(/\/admin\/subscription-plans/, {
      timeout: 20000,
    });
    await waitForPageReady(page);

    const plansBody = (await page.textContent('body')) || '';
    // Al menos uno de los planes seed debe aparecer en la lista.
    expect(plansBody).toMatch(/FREE|PRO|BUSINESS|Enterprise/i);

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-03-plans.png',
      fullPage: true,
    });

    // ── 5. Usuarios Global ───────────────────────────────────────
    if (isMobile) {
      await page.goto('/admin/global-users');
    } else {
      const usersLink = page
        .locator('aside')
        .getByRole('link', { name: /Usuarios Global|Usuarios/i })
        .first();
      await usersLink.click();
    }
    await expect(page).toHaveURL(/\/admin\/global-users/, { timeout: 20000 });
    await waitForPageReady(page);

    const usersBody = (await page.textContent('body')) || '';
    // Heading o la columna típica de tabla de usuarios.
    expect(usersBody).toMatch(/Usuarios|Email|Correo/i);

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-04-global-users.png',
      fullPage: true,
    });

    // ── 6. Configuración (global-settings) ───────────────────────
    if (isMobile) {
      await page.goto('/global-settings');
    } else {
      const settingsLink = page
        .locator('aside')
        .getByRole('link', { name: /Configuraci[oó]n/i })
        .first();
      await settingsLink.click();
    }
    await expect(page).toHaveURL(/\/global-settings/, { timeout: 20000 });
    await waitForPageReady(page);

    const settingsBody = (await page.textContent('body')) || '';
    expect(settingsBody).toMatch(/Configuraci[oó]n|Ajustes|Settings/i);

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-05-settings.png',
      fullPage: true,
    });

    // ── 7. Registro de actividad / Activity log ──────────────────
    // El item del sidebar apunta a /activity-logs (no /admin/...).
    if (isMobile) {
      await page.goto('/activity-logs');
    } else {
      const activityLink = page
        .locator('aside')
        .getByRole('link', { name: /Registro de actividad|Activity/i })
        .first();
      await activityLink.click();
    }
    await expect(page).toHaveURL(/\/activity-logs/, { timeout: 20000 });
    await waitForPageReady(page);

    const activityBody = (await page.textContent('body')) || '';
    expect(activityBody).toMatch(/Actividad|Activity|Registro/i);

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-06-activity.png',
      fullPage: true,
    });

    // ── 8. Logout desde header → user menu → "Cerrar sesión".
    // El user-menu se abre con el último botón del <header>.
    const userMenuBtn = page.locator('header button').last();
    await userMenuBtn.click();
    await page.waitForTimeout(800);

    const logoutBtn = page
      .getByRole('button', { name: /Cerrar sesi[oó]n|Sign out/i })
      .last();
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
    await logoutBtn.click();

    // El handleLogout hace signOut + redirect — esperamos /login o root.
    await expect(page).toHaveURL(/\/(login|$)/, { timeout: 20000 });

    await page.screenshot({
      path: 'e2e/screenshots/day-sa-07-logout.png',
      fullPage: true,
    });
  });
});
