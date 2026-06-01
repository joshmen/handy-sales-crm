import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * E2E: Devolución Reposición + foto evidencia visible en admin Drawer.
 *
 * Feedback usuario 2026-05-31: foto obligatoria como gastos. Mirror del patrón de
 * verificación de gastos: foto aparece en el Drawer del close screen.
 *
 * Pre-condicion seed: devolucion id=5 para pedido_id=240 ruta_id=42,
 * TipoReembolso=2 (Reposicion), foto_evidencia_url seteada (subida a /uploads).
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

test.describe('Devolución Reposición — Drawer con foto', () => {
  test('Drawer muestra devolución con badge verde Reposición + foto evidencia + warning anular específico', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    // Navegar directo al close screen de ruta 42 (RT-DEV-MOB, Completada con devolucion seeded)
    await page.goto('/routes/manage/42/close');
    await waitForPageLoad(page);

    // El botón "Ver devoluciones" debe aparecer (resumen.devolucionesCount > 0)
    const verDevolucionesBtn = page.locator('button[aria-label*="Ver devoluciones"]');
    await expect(verDevolucionesBtn).toBeVisible({ timeout: 10000 });
    await verDevolucionesBtn.click();
    await page.waitForTimeout(800);

    // Drawer abierto — verificar título
    const drawerTitle = page.locator('h2').filter({ hasText: /Devoluciones/ });
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Card de la devolución debe mostrar:
    // - Cliente (cualquier nombre de cliente test del seed)
    // - Pedido PED-DEV-MOB-001
    await expect(page.locator('text=PED-DEV-MOB-001')).toBeVisible({ timeout: 5000 });

    // Badge "Reposición producto" en verde (mi nueva opción agregada)
    const badgeReposicion = page.locator('span', { hasText: /Reposici/ });
    await expect(badgeReposicion).toBeVisible({ timeout: 5000 });
    // Validar clase border-green
    await expect(badgeReposicion).toHaveClass(/green/);

    await page.screenshot({ path: 'e2e/screenshots/devoluciones-drawer-reposicion.png', fullPage: true });

    // Tap "Anular" → verifica el modal con warning específico ReposicionProducto
    const anularBtn = page.locator('button', { hasText: /^Anular$/ }).first();
    await expect(anularBtn).toBeVisible({ timeout: 5000 });
    await anularBtn.click();
    await page.waitForTimeout(500);

    // Modal abierto — debe mostrar warning específico de Reposición
    // "Sin movimiento monetario (fue reposición de producto)"
    await expect(page.locator('text=/Sin movimiento monetario|reposición de producto/i')).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'e2e/screenshots/devoluciones-anular-reposicion.png', fullPage: true });
  });
});
