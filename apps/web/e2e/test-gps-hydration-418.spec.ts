import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Regression — admin@jeyma.com 2026-05-02:
 * Navegando a /team/{id}/gps?rango=7d, la consola del browser registraba
 * "Uncaught Error: Minified React error #418" (hydration mismatch).
 * Causa: cómputos inline con `new Date()` durante render
 * (todayIso(tz) en línea 139 + preset useState lazy initializer en 155-159)
 * generaban valores distintos server vs client.
 * Fix: cualquier cómputo basado en `new Date()` se mueve a useEffect
 * (estado inicializado vacío en el render inicial).
 */
test.setTimeout(60_000);

/**
 * Captura errores de hydration solo durante la navegación a la URL bajo test.
 * Errores previos (login + /dashboard) se ignoran porque pueden venir de
 * páginas que no son las que estamos validando.
 */
function capturarErroresGpsPage(page: import('@playwright/test').Page) {
  const errores: string[] = [];
  let activo = false;
  page.on('pageerror', (e) => { if (activo) errores.push(e.message); });
  page.on('console', (msg) => {
    if (activo && msg.type() === 'error') errores.push(msg.text());
  });
  return {
    activar: () => { activo = true; },
    obtenerHydrationErrors: () => errores.filter((e) =>
      /Minified React error #41[89]|Hydration failed|did not match|Text content does not match/i.test(e)
    ),
  };
}

test.describe('GPS detail hydration — React #418 regression', () => {
  test('/team/{id}/gps?rango=7d no produce React error #418 ni hydration warning', async ({ page }) => {
    await loginAsAdmin(page);
    const monitor = capturarErroresGpsPage(page);
    monitor.activar();

    // Navega a un vendedor — id 3 = vendedor1 en seed admin@jeyma.com.
    await page.goto('/team/3/gps?rango=7d', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const hydrationErrors = monitor.obtenerHydrationErrors();
    if (hydrationErrors.length > 0) {
      console.log('Hydration errors en /team/{id}/gps?rango=7d:');
      hydrationErrors.forEach((e, i) => console.log(`  [${i}]`, e.slice(0, 500)));
    }
    expect(hydrationErrors, 'No debe haber errores de hydration en GPS detail').toHaveLength(0);
  });

  test('/team/{id}/gps (sin query) tampoco produce React error #418', async ({ page }) => {
    await loginAsAdmin(page);
    const monitor = capturarErroresGpsPage(page);
    monitor.activar();

    await page.goto('/team/3/gps', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const hydrationErrors = monitor.obtenerHydrationErrors();
    if (hydrationErrors.length > 0) {
      console.log('Hydration errors en /team/{id}/gps:');
      hydrationErrors.forEach((e, i) => console.log(`  [${i}]`, e.slice(0, 500)));
    }
    expect(hydrationErrors, 'No debe haber errores de hydration en GPS detail').toHaveLength(0);
  });
});
