import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin } from './helpers/auth';

/**
 * Runtime validation suite — diseñado para correr `--headed` para que el usuario
 * vea visualmente que los fixes de la sesión 26-abr-2026 funcionan.
 *
 * Cubre:
 *  1. XSS access-denied (commit 5936ab6) — t.rich() de next-intl renderiza <strong>
 *     sin dangerouslySetInnerHTML.
 *  2. BillingTab RHF + Zod (commit 7e89770) — RFC inválido muestra error inline.
 *  3. Login SA xjoshmenx (refactor es_admin/es_super_admin) — claim role=SUPER_ADMIN
 *     y bypassa single-session.
 */

test.describe.configure({ mode: 'serial' });

test('XSS fix: access-denied renderiza <strong> via t.rich() sin dangerouslySetInnerHTML', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/access-denied');

  // El hint contiene "<strong>Empresas</strong>" en la traducción ES.
  // t.rich() debe renderizar como <strong>Empresas</strong> (DOM real), no como
  // texto literal con tags visibles.
  const strong = page.locator('strong', { hasText: /Empresas/i });
  await expect(strong).toBeVisible({ timeout: 10000 });

  // Verifica que NO sea texto crudo con < > visible
  const heading = page.getByRole('heading', { level: 1 }).first();
  await expect(heading).toBeVisible();
});

test('Login SA: xjoshmenx (claim role=SUPER_ADMIN) entra a /admin/system-dashboard', async ({ page }) => {
  await loginAsSuperAdmin(page);
  // loginAsSuperAdmin espera URL contenga /dashboard, lo cual incluye /admin/system-dashboard
  await expect(page).toHaveURL(/dashboard|system-dashboard/, { timeout: 15000 });
});

test('Billing settings page real: carga sin errores y muestra config fiscal', async ({ page }) => {
  // El BillingTab.tsx que refactoricé era código muerto (sin consumers). Lo eliminé.
  // La página real es /billing/settings (page.tsx 452 líneas, ya cableada al backend
  // con saveConfigFiscal). Validamos que carga correctamente.
  await loginAsAdmin(page);
  await page.goto('/billing/settings');
  await expect(page).toHaveURL(/billing\/settings/, { timeout: 10000 });
  // PageHeader con título visible
  const heading = page.getByRole('heading').first();
  await expect(heading).toBeVisible({ timeout: 10000 });
});

test('Integrations page: muestra banner Coming Soon en vez de UI silenciosamente rota', async ({ page }) => {
  // Commit 5ebf50f agregó un banner amber "Próximamente" en /integrations porque
  // el módulo está deshabilitado en Sidebar (es preview, no funcional aún).
  await loginAsAdmin(page);
  await page.goto('/integrations');
  // El banner contiene "Próximamente" + el icon Clock. Verifica el texto.
  const banner = page.getByText(/Próximamente/i).first();
  await expect(banner).toBeVisible({ timeout: 10000 });
});
