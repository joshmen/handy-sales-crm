import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Regression suite — validates the 6 production fixes reported by
 * admin@jeyma.com (2026-05-02). Estos tests son los que DEBÍ haber
 * escrito ANTES del PR original; se agregan ahora como red de seguridad
 * para evitar que regresemos a esos bugs.
 *
 * Web fixes cubiertos aquí (Playwright):
 *   1. leaflet `_leaflet_pos` crash en /team/{id}/gps al navegar rápido
 *      tras click "Ver en mapa" (popupTimeoutRef + cleanup en unmount)
 *
 * Web fix cubierto en otro spec:
 *   - clients-edit-empty-fields.spec.ts: edit cliente con email/tel
 *     vacíos + isOutOfZone no bloquea Guardar
 *   - test-gps-hydration-418.spec.ts: React #418 hydration en GPS detail
 *
 * Mobile fixes (privacy modal admin, isOnline real, vendedor TZ correcta,
 * resumen-tenant) — cubiertos por verificación manual en emulador o
 * Maestro; Playwright no aplica (apps/mobile-app/ es React Native).
 */

test.setTimeout(90_000);

test.describe('Regression — Jeyma admin prod fixes', () => {
  test('leaflet _leaflet_pos no crashea al navegar tras click "Ver en mapa"', async ({ page }) => {
    const errores: string[] = [];
    page.on('pageerror', (e) => errores.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errores.push(msg.text());
    });

    await loginAsAdmin(page);
    await page.goto('/team/3/gps?rango=7d', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Si hay eventos visibles, intentar el escenario de race condition:
    // click "Ver en mapa" → navegar fuera ANTES del setTimeout(750ms) que
    // dispara openPopup. Sin el cleanup en unmount del componente, esto
    // disparaba "Cannot read properties of undefined (reading '_leaflet_pos')".
    const verMapaBtn = page.getByRole('button', { name: /Ver en mapa/i }).first();
    const tieneEventos = await verMapaBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (tieneEventos) {
      await verMapaBtn.click();
      // Race: navegar inmediatamente, antes del timeout 750ms del openPopup.
      await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500); // Esperar que el timeout original se dispare en background
    } else {
      // Sin eventos en este vendedor — al menos validar que el page no crashea.
      console.log('Vendor sin eventos GPS, validando solo render de la página');
    }

    const leafletErrors = errores.filter((e) =>
      /_leaflet_pos|Cannot read.*_leaflet_pos/i.test(e)
    );

    if (leafletErrors.length > 0) {
      console.log('Leaflet errors capturados:');
      leafletErrors.forEach((e, i) => console.log(`  [${i}]`, e.slice(0, 400)));
    }
    expect(leafletErrors, 'No debe haber crash de _leaflet_pos').toHaveLength(0);
  });

  test('GPS detail page renderiza header con preset Hoy', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/3/gps', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    // El botón "Hoy" debe estar — confirma que el page header renderizó.
    const hoyBtn = page.getByRole('button', { name: /^Hoy$/i }).first();
    await expect(hoyBtn).toBeVisible({ timeout: 5000 });
  });
});
