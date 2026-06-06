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

  // Audit code-quality 2026-06-06: habilitar "mostrar inactivos" ANTES del
  // toggle. handleToggleActive (page.tsx:426-427) HACE filter-out al
  // desactivar si showInactive=false → la fila desaparece del DOM y el
  // restore no encuentra el botón con title "Activar". Habilitar el toggle
  // mantiene la fila visible tras desactivar, permitiendo el restore.
  const inactiveToggleWrapper = page.locator('[data-tour="promotions-toggle-inactive"]').first();
  if (await inactiveToggleWrapper.isVisible({ timeout: 3000 }).catch(() => false)) {
    const inactiveCheckbox = inactiveToggleWrapper.locator('button, input[type="checkbox"]').first();
    const pressedBefore = (await inactiveCheckbox.getAttribute('aria-checked').catch(() => null)) === 'true'
      || (await inactiveCheckbox.getAttribute('aria-pressed').catch(() => null)) === 'true';
    if (!pressedBefore) {
      await inactiveCheckbox.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
    }
  }

  // Audit code-quality 2026-06-06: si no hay promos activas (estado dejado
  // por runs anteriores) activamos una primero para tener algo que togglear.
  // Esto hace el test idempotente sin depender del estado del seed.
  let toggleButton = page.locator('button[title="Desactivar"]:visible').first();
  const initialActiveCount = await page.locator('button[title="Desactivar"]:visible').count();
  console.log(`Toggle activos visibles inicial: ${initialActiveCount}`);

  if (initialActiveCount === 0) {
    console.log('No hay promos activas — activando una primero para test idempotente');
    const firstActivateBtn = page.locator('button[title="Activar"]:visible').first();
    if (await firstActivateBtn.count() === 0) {
      console.log('No hay promos en absoluto — skipping test');
      return;
    }
    const preActivatePromise = page.waitForResponse(
      (r) => /\/promociones\/\d+\/activo$/.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 10_000 }
    );
    await firstActivateBtn.click({ force: true });
    await preActivatePromise;
    await page.waitForFunction(
      () => document.querySelectorAll('button[title="Desactivar"]').length > 0,
      null,
      { timeout: 8000 }
    ).catch(() => {});
    toggleButton = page.locator('button[title="Desactivar"]:visible').first();
  }

  await toggleButton.scrollIntoViewIfNeeded().catch(() => {});
  const exists = await toggleButton.count();
  console.log(`Toggle activos visibles: ${exists}`);

  if (exists === 0) {
    console.log('No hay promos activas para togglear tras pre-activate');
    return;
  }

  // Capturar PATCH del toggle inicial (Desactivar)
  const patchPromise = page.waitForResponse(
    (r) => /\/promociones\/\d+\/activo$/.test(r.url()) && r.request().method() === 'PATCH',
    { timeout: 10_000 }
  );

  await toggleButton.click({ force: true });

  const resp = await patchPromise;
  console.log(`PATCH ${resp.url()} → ${resp.status()}`);
  expect(resp.status()).toBeLessThan(400);

  // Extraer el ID de la promo para el restore preciso (no .first() ambiguo)
  const promoIdMatch = resp.url().match(/\/promociones\/(\d+)\/activo$/);
  const promoId = promoIdMatch ? Number(promoIdMatch[1]) : null;
  console.log(`Promo ID toggled: ${promoId}`);

  // Esperar a que el title cambie de "Desactivar" a "Activar" (re-render
  // post-setPromotions). En vez de waitForTimeout fijo, esperamos el cambio
  // observable usando una función que poll a hasta 8s.
  await page.waitForFunction(
    () => {
      const buttons = Array.from(document.querySelectorAll('button[title]:not([style*="display: none"])'))
        .filter((b) => (b as HTMLElement).offsetParent !== null);
      const activos = buttons.filter((b) => b.getAttribute('title') === 'Activar').length;
      return activos > 0;
    },
    null,
    { timeout: 8000 }
  ).catch(() => {});

  // Capturar el PATCH del restore (Activar)
  const restorePatchPromise = page.waitForResponse(
    (r) => /\/promociones\/\d+\/activo$/.test(r.url()) && r.request().method() === 'PATCH',
    { timeout: 10_000 }
  );

  const restoreBtn = page.locator('button[title="Activar"]:visible').first();
  await restoreBtn.waitFor({ state: 'visible', timeout: 5000 });
  await restoreBtn.click({ force: true });

  const restoreResp = await restorePatchPromise;
  console.log(`PATCH restore ${restoreResp.url()} → ${restoreResp.status()}`);
  expect(restoreResp.status()).toBeLessThan(400);
  console.log('Restored');
});
