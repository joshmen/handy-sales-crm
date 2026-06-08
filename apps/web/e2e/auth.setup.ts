import { test as setup, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * Audit code-quality (2026-06-05): cleanup sesiones zombies en la DB antes
 * de cualquier setup. Single-session strict cascadea cuando sesiones de runs
 * anteriores quedan activas. Esta funcion ejecuta SQL idempotente que mantiene
 * solo la sesion mas reciente por usuario.
 *
 * Usa execFileSync con argument array (no shell interpolation) para evitar
 * cualquier riesgo de command injection — el SQL es estatico pero seguimos
 * la mejor practica documentada en security-guidance plugin.
 */
function cleanupZombieSessions(): void {
  const sql = 'WITH ranked AS ('
    + 'SELECT id, usuario_id, '
    + 'ROW_NUMBER() OVER (PARTITION BY usuario_id ORDER BY creado_en DESC) AS rn '
    + 'FROM "DeviceSessions" WHERE status=0 AND eliminado_en IS NULL'
    + ') '
    + 'UPDATE "DeviceSessions" SET status=4, actualizado_en=NOW() '
    + 'WHERE id IN (SELECT id FROM ranked WHERE rn > 1);';
  try {
    execFileSync(
      'docker',
      ['exec', '-i', 'handysuites_postgres_dev', 'psql', '-U', 'handy_user', '-d', 'handy_erp', '-c', sql],
      { stdio: 'pipe', timeout: 10000 },
    );
  } catch {
    // No-op: si docker no esta o la query falla, continuamos con el setup.
    // No queremos bloquear los tests por un cleanup opcional.
  }
}

/**
 * Playwright Auth Setup — runs ONCE before all test projects.
 *
 * Authenticates as admin and saves the browser storage state (cookies + localStorage)
 * so that all test workers share the same authenticated session WITHOUT re-logging in.
 *
 * This eliminates intra-project session conflicts caused by single-session enforcement:
 * - No repeated logins = no session_version bumps = no 401 SESSION_REPLACED errors
 * - All workers reuse the same JWT from the saved state
 *
 * Runs twice: once for Desktop Chrome (admin@jeyma.com) and once for Mobile Chrome
 * (e2e-mobile-admin@jeyma.com), saving separate state files.
 */

setup('authenticate as admin', async ({ page, context }, testInfo) => {
  const isMobile = testInfo.project.name.includes('mobile');
  const email = isMobile ? 'e2e-mobile-admin@jeyma.com' : 'admin@jeyma.com';
  const statePath = isMobile ? 'e2e/.auth/admin-mobile.json' : 'e2e/.auth/admin-desktop.json';

  // Audit code-quality (2026-06-05): cleanup automatico de sesiones zombies
  // antes de cada setup. Sin esto, single-session strict bloquea login con
  // ACTIVE_SESSION_EXISTS cuando hay sesiones de runs anteriores activas.
  cleanupZombieSessions();

  // Audit code-quality (2026-06-05) — clear context state ANTES de cualquier
  // navegacion para evitar que cookies de runs anteriores hagan redirect a
  // landing/dashboard en lugar de mostrar el form. Bug detectado: error
  // screenshot mostraba landing public ("Gestiona tu negocio desde cualquier
  // lugar"), no el login form, porque cookies stale forzaban redirect.
  await context.clearCookies();
  await context.clearPermissions();

  // Audit code-quality (2026-06-05) — networkidle en lugar de domcontentloaded:
  // la page de login es client-side React con LoginContent wrapped in Suspense.
  // domcontentloaded retorna ANTES de que el form (#email, #password) este en
  // el DOM. networkidle espera a que JS termine de hidratar el form.
  await page.goto('/login', { waitUntil: 'networkidle' });

  if (!page.url().includes('/login')) {
    await page.goto('/login?force=true', { waitUntil: 'networkidle' });
  }

  // Dismiss cookie consent banner if present
  const acceptCookies = page.getByRole('button', { name: /Aceptar/i });
  if (await acceptCookies.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptCookies.click();
    await page.waitForTimeout(300);
  }

  // Esperar a que el form realmente este visible y interactivo antes de fill.
  await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
  await page.locator('#email').fill(email);
  await expect(page.locator('#password')).toBeVisible();
  await page.locator('#password').fill('test123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click();

  // Handle session conflict — multiple flows possible:
  //  1. Direct success -> /dashboard
  //  2. "Continuar aquí" modal -> click for force-login
  //  3. SESSION_BLOCKED banner -> requires manual session cleanup (lanzar warning)
  const continueBtn = page.getByRole('button', { name: /Continuar aqu[ií]|Cerrar sesi[oó]n anterior/i });
  const sessionBlockedBanner = page.locator('text=/sesi[oó]n.*activa|active.*session/i').first();

  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 20000 }),
      continueBtn.waitFor({ state: 'visible', timeout: 20000 }),
      sessionBlockedBanner.waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  } catch { /* continue */ }

  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    // Esperar nuevamente al dashboard tras force-login
    try {
      await page.waitForURL(/dashboard/, { timeout: 15000 });
    } catch { /* continue */ }
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

  // Save authenticated state for all workers in this project
  await page.context().storageState({ path: statePath });
});

/**
 * Audit code-quality (2026-06-06) — Bug #13: SA single-session causa que
 * workers paralelos se bumpeen entre si cuando cada uno hace su propio
 * loginAsSuperAdmin (xjoshmenx@gmail.com es el unico SA del sistema).
 *
 * Solucion: autenticar SA UNA sola vez aqui en el setup y guardar su
 * storageState a sa-desktop.json / sa-mobile.json. Los specs SA cargan ese
 * state via loginAsSuperAdmin fast-path → todos los workers comparten la
 * MISMA sesion SA → cero session bumps cross-worker.
 *
 * Cleanup zombies + clearCookies ANTES del login para evitar
 * ACTIVE_SESSION_EXISTS de runs anteriores.
 */
setup('authenticate as superAdmin', async ({ page, context }, testInfo) => {
  const isMobile = testInfo.project.name.includes('mobile');
  const statePath = isMobile ? 'e2e/.auth/sa-mobile.json' : 'e2e/.auth/sa-desktop.json';

  cleanupZombieSessions();

  await context.clearCookies();
  await context.clearPermissions();

  await page.goto('/login', { waitUntil: 'networkidle' });

  const acceptCookies = page.getByRole('button', { name: /Aceptar/i });
  if (await acceptCookies.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptCookies.click();
    await page.waitForTimeout(300);
  }

  await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
  await page.locator('#email').fill('xjoshmenx@gmail.com');
  await page.locator('#password').fill('test123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click();

  const continueBtn = page.getByRole('button', { name: /Continuar aqu[ií]|Cerrar sesi[oó]n anterior/i });

  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 20000 }),
      continueBtn.waitFor({ state: 'visible', timeout: 20000 }),
    ]);
  } catch { /* continue */ }

  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    try {
      await page.waitForURL(/dashboard/, { timeout: 15000 });
    } catch { /* continue */ }
  }

  await expect(page).toHaveURL(/dashboard/, { timeout: 30000 });

  await page.context().storageState({ path: statePath });
});
