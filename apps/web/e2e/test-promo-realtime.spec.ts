import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.setTimeout(60_000);

/**
 * Smoke real-time: admin click toggle en /promotions → backend PATCH 200 →
 * SignalR emit. Verificación mobile va por logcat (Monitor en paralelo).
 */
test('toggle promo desde UI admin', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/promotions');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  // Audit code-quality 2026-06-05: cerrar panel Ayuda si está abierto (mobile).
  const closeAyuda = page.getByRole('button', { name: /cerrar panel de ayuda/i });
  if (await closeAyuda.isVisible().catch(() => false)) {
    await closeAyuda.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  // Audit code-quality 2026-06-05: filter :visible para mobile cards layout.
  const toggleButton = page.locator('button[title="Desactivar"]:visible').first();
  await toggleButton.scrollIntoViewIfNeeded().catch(() => {});
  const exists = await toggleButton.count();
  console.log(`Toggle activos visibles: ${exists}`);

  if (exists === 0) {
    console.log('No hay promos activas para togglear');
    return;
  }

  // Capturar PATCH del toggle
  const patchPromise = page.waitForResponse(
    (r) => /\/promociones\/\d+\/activo$/.test(r.url()) && r.request().method() === 'PATCH',
    { timeout: 10_000 }
  );

  await toggleButton.click({ force: true });

  const resp = await patchPromise;
  console.log(`PATCH ${resp.url()} → ${resp.status()}`);
  expect(resp.status()).toBeLessThan(400);

  // Esperar para que mobile reciba evento + dispare sync
  console.log('Esperando 8s para que mobile reciba SignalR event...');
  await page.waitForTimeout(8000);

  // Restaurar estado: click otra vez. Esperar hasta 5s a que el title del botón
  // cambie a "Activar" tras el PATCH (puede tardar en re-renderear).
  const restoreBtn = page.locator('button[title="Activar"]:visible').first();
  await restoreBtn.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  if (await restoreBtn.isVisible().catch(() => false)) {
    await restoreBtn.click({ force: true }).catch(() => {});
    await page.waitForTimeout(1500);
    console.log('Restored');
  } else {
    console.log('Restore skipped — botón "Activar" no apareció en 5s');
  }
});
