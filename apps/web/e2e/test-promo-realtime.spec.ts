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

  // ActiveToggle component renders <button title="Desactivar"> when active
  const toggleButton = page.locator('button[title="Desactivar"]').first();
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

  await toggleButton.click();

  const resp = await patchPromise;
  console.log(`PATCH ${resp.url()} → ${resp.status()}`);
  expect(resp.status()).toBeLessThan(400);

  // Esperar para que mobile reciba evento + dispare sync
  console.log('Esperando 8s para que mobile reciba SignalR event...');
  await page.waitForTimeout(8000);

  // Restaurar estado: click otra vez
  const restoreBtn = page.locator('button[title="Activar"]').first();
  if (await restoreBtn.count() > 0) {
    await restoreBtn.click().catch(() => {});
    await page.waitForTimeout(1500);
    console.log('Restored');
  }
});
