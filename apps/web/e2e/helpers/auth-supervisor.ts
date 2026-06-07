import { test, Page, expect } from '@playwright/test';
import path from 'path';

/**
 * Supervisor auth helper — extiende el patrón de helpers/auth.ts
 *
 * Item #1 del inventory de gaps SUPERVISOR (2026-06-06).
 * Bloquea los otros 4 gaps frontend; sin este helper + seeds no se puede
 * probar el rol SUPERVISOR de forma confiable en paralelo.
 *
 * Patrón:
 *   - Replica loginAsVendedor() de helpers/auth.ts
 *   - clearAuthStorage(page) ANTES del form login para evitar 401-cascade
 *     por localStorage stale de la storageState admin (ver
 *     memory/feedback_e2e_role_switch_clear_localstorage.md)
 *   - SUP_SLOT round-robin similar a SA_SLOT/VEND_SLOT
 *   - Caller responsable de test.describe.configure({ mode: 'serial' })
 *     cuando los slots sean limitados.
 *
 * REQUIERE: que el seed infra/database/schema/seed_e2e_pg.sql incluya
 *   ('e2e-sup-1@jeyma.com', 'SUPERVISOR', tenant=1, password=test123).
 *   Ver acompañante: seed_e2e_supervisor_pg.sql.
 */

const TEST_PASSWORD = 'test123';

// File → dedicated Supervisor user slot.
// Replica el patrón VEND_SLOT en helpers/auth.ts.
const SUP_SLOT: Record<string, number> = {
  'rbac': 1,
  'rbac-negative-supervisor': 1,
  'team-supervisor': 1,
  'cobranza-supervisor': 1,
};

export function getSupervisorEmail(): string {
  let isMobile = false;
  let fileName = '';
  try {
    isMobile = test.info().project.name === 'Mobile Chrome';
    fileName = path.basename(test.info().file).replace('.spec.ts', '');
  } catch {
    // Fuera de contexto de test — fallback al slot 1.
  }

  const slot = SUP_SLOT[fileName] ?? 1;
  return isMobile
    ? `e2e-mob-sup-${slot}@jeyma.com`
    : `e2e-sup-${slot}@jeyma.com`;
}

async function clearAuthStorage(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    try { window.localStorage.clear(); } catch { /* ignore */ }
    try { window.sessionStorage.clear(); } catch { /* ignore */ }
  });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { /* ok */ });
}

async function fillLoginForm(page: Page, email: string, password: string): Promise<void> {
  if (!page.url().includes('/login')) {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
  }
  await expect(page.locator('#email')).toBeVisible({ timeout: 15000 });
  await page.keyboard.press('Escape');
  await page.locator('#email').first().fill(email);
  await page.locator('#password').first().fill(password);
  await page.getByRole('button', { name: /Iniciar Sesión/i }).first().click({ force: true });

  const replaceBtn = page.getByRole('button', { name: /Continuar aqu[ií]|Cerrar sesión anterior/i });
  try {
    await Promise.race([
      page.waitForURL(/dashboard/, { timeout: 10000 }),
      replaceBtn.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  } catch {
    // Neither happened — fillLoginForm caller will assert URL.
  }

  if (await replaceBtn.isVisible().catch(() => false)) {
    await replaceBtn.click();
  }
}

/**
 * Login as Supervisor (per-file dedicated user). Clears admin storageState first.
 *
 * Espera redirect a /dashboard con title "Tablero" (SUPERVISOR ve dashboard
 * admin scoped al equipo, NO el dashboard vendedor "Mi Rendimiento").
 */
export async function loginAsSupervisor(page: Page): Promise<void> {
  await clearAuthStorage(page);
  const email = getSupervisorEmail();
  await fillLoginForm(page, email, TEST_PASSWORD);
  await expect(page).toHaveURL(/dashboard/, { timeout: 25000 });
}

// Re-export para conveniencia de specs.
export const SUPERVISOR_PASSWORD = TEST_PASSWORD;
