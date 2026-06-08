import { test, Page, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'path';

/**
 * Shared auth helpers for E2E tests.
 *
 * THREE levels of user isolation to prevent session_version conflicts:
 *
 * 1. PROJECT-level: Desktop Chrome vs Mobile Chrome use different admin users
 *    (storageState set once by auth.setup.ts, shared by all workers via fast-path)
 *
 * 2. FILE-level: Each test file that logins as SA or Vendedor gets its OWN
 *    dedicated user, so parallel workers never bump the same session_version.
 *
 * 3. LOGIN-TEST: Tests that explicitly test the login flow use a separate
 *    "loginAdmin" user to avoid invalidating the storageState admin session.
 *
 * Password: test123 for all. See 06_e2e_parallel_users.sql for seed data.
 */

const TEST_PASSWORD = 'test123';

const API_BASE = 'http://localhost:1050';

// ── File → dedicated SuperAdmin user mapping ──
// Each key is the spec file basename (without .spec.ts).
const SA_SLOT: Record<string, number> = {
  'superadmin': 1,
  'announcement-displaymode': 2,
  'security-announcements': 3,
  'subscription-tenant': 4,
  'impersonation-sidebar': 5,
};

// ── File → dedicated Vendedor user mapping ──
const VEND_SLOT: Record<string, number> = {
  'rbac': 1,
  'perfil-empresa': 2,
};

/**
 * Returns test emails isolated by project AND file.
 *
 * - `admin`: storageState admin (used by fast-path loginAsAdmin, never re-login)
 * - `loginAdmin`: separate admin for tests that explicitly test the login flow
 * - `superAdmin`: per-file SA user (avoids parallel session conflicts)
 * - `vendedor`: per-file vendedor user (avoids parallel session conflicts)
 */
export function getTestEmails() {
  let isMobile = false;
  let fileName = '';
  try {
    isMobile = test.info().project.name === 'Mobile Chrome';
    fileName = path.basename(test.info().file).replace('.spec.ts', '');
  } catch {
    // Outside test context — default to desktop, no file mapping
  }

  const saSlot = SA_SLOT[fileName];
  const vendSlot = VEND_SLOT[fileName];

  // SOLO xjoshmenx@gmail.com es SUPER_ADMIN en el sistema (real prod intent).
  // Los slots e2e-sa-* fueron demoteados a ADMIN; no son válidos para tests SA.
  // Como hay un único SA, los SA tests no pueden correr en paralelo (sesión única).
  // saSlot se ignora; la dedupe via test.describe.configure({ mode: 'serial' })
  // dentro de cada spec es responsabilidad del autor del test.
  void saSlot;
  const superAdmin = 'xjoshmenx@gmail.com';

  let vendedor: string;
  if (vendSlot) {
    vendedor = isMobile
      ? `e2e-mob-vend-${vendSlot}@jeyma.com`
      : `e2e-vend-${vendSlot}@jeyma.com`;
  } else {
    vendedor = isMobile
      ? 'e2e-mobile-vendedor@jeyma.com'
      : 'vendedor1@jeyma.com';
  }

  return {
    admin: isMobile ? 'e2e-mobile-admin@jeyma.com' : 'admin@jeyma.com',
    loginAdmin: isMobile ? 'e2e-mob-login-admin@jeyma.com' : 'e2e-login-admin@jeyma.com',
    vendedor,
    superAdmin,
    password: TEST_PASSWORD,
    apiBase: API_BASE,
  };
}

async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  // Audit code-quality (2026-06-05): si ya estamos en /login no re-navegar,
  // ahorra round-trip cuando el caller ya llamo clearAuthStorage.
  if (!page.url().includes('/login')) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  }
  // Esperar a que el form realmente este interactivo (LoginContent wrapped in Suspense).
  await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill(password);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click({ force: true });

  // Botón actualizado: el modal de "Ya tienes una sesión abierta" ahora usa
  // "Continuar aquí" (i18n: continueHere) en vez del legacy "Cerrar sesión
  // anterior". Aceptamos ambos para ser robustos a futuros renames.
  const replaceBtn = page.getByRole('button', { name: /Continuar aqu[ií]|Cerrar sesión anterior/i });
  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 10000 }),
      replaceBtn.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  } catch {
    // Neither happened
  }

  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }
}

/**
 * Login as Admin via storageState fast-path (no form fill if cookies exist).
 *
 * Audit code-quality (2026-06-05): el fallback path antes clearCookies pero
 * NO limpiaba localStorage ni navegaba a /login — la siguiente fillLoginForm
 * podia hit middleware redirect con cookies parciales. Ahora el fallback
 * pasa por clearAuthStorage() completo (cookies + localStorage + sessionStorage).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const cookies = await page.context().cookies();
  const hasSession = cookies.some(
    (c) => c.name.includes('session-token') || c.name.includes('next-auth'),
  );

  if (hasSession) {
    await page.goto('/dashboard');
    try {
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
      return;
    } catch {
      // Session cookie was stale — full clean before form login.
      await clearAuthStorage(page);
    }
  }

  const { admin } = getTestEmails();
  await fillLoginForm(page, admin, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 25000 });
}

/**
 * Clears cookies + localStorage + sessionStorage AND navigates to /login.
 * Without clearing localStorage, the admin storageState leaves stale token
 * state that causes 401 cascades for the new role's session and triggers an
 * unwanted signOut redirect to /login.
 *
 * Audit code-quality (2026-06-05): reorden — clearCookies primero ANTES de
 * goto, asi el middleware no recibe cookies stale durante la navegacion.
 * Networkidle wait final para que el form (#email, #password) este hidratado.
 */
async function clearAuthStorage(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try { window.localStorage.clear(); } catch { /* ignore */ }
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
  });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { /* ok */ });
}

/**
 * Login as Vendedor (per-file dedicated user). Clears admin storageState first.
 */
export async function loginAsVendedor(page: Page): Promise<void> {
  await clearAuthStorage(page);
  const { vendedor } = getTestEmails();
  await fillLoginForm(page, vendedor, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 25000 });
}

/**
 * Login as SuperAdmin.
 *
 * Audit code-quality (2026-06-06) — Bug #13: xjoshmenx@gmail.com es el unico
 * SA y single-session strict cascadea cuando workers paralelos hacen su
 * propio login (cada uno bumpea al anterior → 401 SESSION_REPLACED).
 *
 * Solucion: auth.setup.ts autentica SA UNA vez y guarda storageState a
 * sa-desktop.json / sa-mobile.json. Aqui hacemos fast-path: cargar cookies +
 * localStorage del state y navegar directo a dashboard. Si el state no existe
 * o esta corrupto, fallback al form login (slow path para CI fresh runs).
 *
 * NOTA: este fast-path NO bumpea session_version porque reusa las cookies
 * del setup — es la MISMA sesion, solo replicada en cada worker context.
 */
export async function loginAsSuperAdmin(page: Page): Promise<void> {
  const isMobile = (() => {
    try { return test.info().project.name === 'Mobile Chrome'; }
    catch { return false; }
  })();

  const statePath = path.resolve(
    process.cwd(),
    isMobile ? 'e2e/.auth/sa-mobile.json' : 'e2e/.auth/sa-desktop.json',
  );

  if (fs.existsSync(statePath)) {
    try {
      const raw = fs.readFileSync(statePath, 'utf8');
      type CookieEntry = Parameters<ReturnType<typeof page.context>['addCookies']>[0][number];
      const state = JSON.parse(raw) as {
        cookies?: CookieEntry[];
        origins?: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
      };

      await page.context().clearCookies();
      if (state.cookies?.length) {
        await page.context().addCookies(state.cookies);
      }

      const lsEntries = state.origins?.[0]?.localStorage ?? [];
      if (lsEntries.length) {
        // addInitScript corre antes de cualquier script del page → localStorage
        // disponible cuando React monta y NextAuth lee tokens.
        await page.addInitScript((entries: Array<{ name: string; value: string }>) => {
          for (const e of entries) {
            try { window.localStorage.setItem(e.name, e.value); } catch { /* ignore */ }
          }
        }, lsEntries);
      }

      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
      return;
    } catch {
      // State corrupto o sesion expirada → fallback al form login.
    }
  }

  // Slow path (CI fresh run o state ausente).
  await clearAuthStorage(page);
  const { superAdmin } = getTestEmails();
  await fillLoginForm(page, superAdmin, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 25000 });
}
