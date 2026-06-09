import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Audit code-quality 2026-06-06 — Bug #11 UX coverage.
 *
 * Mobile users CAN start interactive tours, via the "Ayuda" (Info icon)
 * button in the header — always visible across viewports — which opens
 * the HelpPanel containing a `TourButton` that calls `useTour().startTour()`
 * for the current pathname. The drawer-tour-spotlight.spec.ts already
 * exercises the FAB modal flow on Desktop; this spec covers the canonical
 * Mobile path.
 *
 * If this test fails it means mobile users lost access to onboarding tours.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Tour entry via Ayuda — Mobile', () => {
  test('Ayuda button in header opens HelpPanel and Empezar tour starts driver.js', async ({ page }, testInfo) => {
    // El path es válido en cualquier viewport (Ayuda siempre visible). Se ejerce
    // específicamente en Mobile porque ahí no usamos el FAB (ver Bug #11).
    if (testInfo.project.name !== 'Mobile Chrome') {
      test.skip(true, 'Cubrimos el path Ayuda solo en Mobile; Desktop usa el FAB');
      return;
    }

    await loginAsAdmin(page);
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Limpiar persistencia para garantizar que el tour NO está marcado como
    // completado (sino el TourButton mostraría "Repetir" + flujo idéntico, ok).
    await page.evaluate(() => {
      localStorage.removeItem('handy-tours-completed');
      localStorage.removeItem('handy-tours-prompt');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // 1) Botón Ayuda en header — siempre visible (i18n: common.help = "Ayuda").
    const helpBtn = page.getByRole('button', { name: /^Ayuda$/i }).first();
    await expect(helpBtn).toBeVisible({ timeout: 10000 });
    await helpBtn.click();

    // 2) HelpPanel abre desde la derecha. Buscamos el botón TourButton dentro.
    // i18n key help.tourPrompt.startTour = "Iniciar tour interactivo".
    const tourBtn = page.getByRole('button', { name: /Iniciar tour interactivo|Repetir tour/i }).first();
    await expect(tourBtn).toBeVisible({ timeout: 5000 });
    await tourBtn.click();

    // 3) Tras 350ms (close-panel animation), startTour() inicia driver.js.
    // El popover de driver.js es .driver-popover.
    const popover = page.locator('.driver-popover').first();
    await expect(popover).toBeVisible({ timeout: 10000 });

    // 4) Verificar progress text (debe contener "1 de N").
    const progress = page.locator('.driver-popover-progress-text').first();
    await expect(progress).toBeVisible();
    const progressText = await progress.textContent();
    expect(progressText).toMatch(/1\s+(de|of)\s+\d+/i);

    // 5) Cleanup: cerrar tour si hay botón "Done" o ESC.
    await page.keyboard.press('Escape').catch(() => {});
  });
});
