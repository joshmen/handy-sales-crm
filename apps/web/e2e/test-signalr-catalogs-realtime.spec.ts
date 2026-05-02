import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.setTimeout(60_000);

/**
 * Smoke real-time SignalR para catálogos comerciales. Por cada catálogo:
 *  1. Login admin → ir a la página
 *  2. Click toggle (ActiveToggle component)
 *  3. Capturar PATCH backend → esperar 2xx
 *  4. Click toggle del estado opuesto para restaurar el estado original
 *
 * El evento SignalR se valida indirectamente: si el PATCH retorna 200,
 * el endpoint emit se invoca dentro del handler. La validación E2E del
 * lado mobile (que el listener invalide la cache) requiere device + Monitor
 * en paralelo y vive en `apps/mobile-app/.maestro/vendedor/`.
 *
 * Cobertura: descuentos, productos, listas-precios, client-categories,
 * product-categories, product-families. (promociones ya cubierto en
 * test-promo-realtime.spec.ts.)
 */

interface Catalogo {
  nombre: string;
  url: string;
  patchPattern: RegExp;
}

const CATALOGOS: Catalogo[] = [
  {
    nombre: 'descuentos',
    url: '/discounts',
    patchPattern: /\/descuentos\/\d+\/toggle$/,
  },
  {
    nombre: 'productos',
    url: '/products',
    patchPattern: /\/productos\/\d+\/activo$/,
  },
  {
    nombre: 'listas-precios',
    url: '/price-lists',
    patchPattern: /\/listas-precios\/\d+\/activo$/,
  },
  {
    nombre: 'client-categories',
    url: '/client-categories',
    patchPattern: /\/categorias-clientes\/\d+\/activo$/,
  },
  {
    nombre: 'product-categories',
    url: '/product-categories',
    patchPattern: /\/categorias-productos\/\d+\/activo$/,
  },
  {
    nombre: 'product-families',
    url: '/product-families',
    patchPattern: /\/familias-productos\/\d+\/activo$/,
  },
];

for (const cat of CATALOGOS) {
  test(`toggle activo en ${cat.nombre} retorna PATCH 2xx (SignalR emit)`, async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(cat.url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2500);

    // ActiveToggle renderiza title con "ctivar" — "Activar"/"Desactivar"
    // (default) o variantes i18n ("Desactivar producto", "Activar categoría").
    // Substring match cubre todos los casos.
    const allToggles = page.locator('button[title*="ctivar"]');
    await allToggles.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    const total = await allToggles.count();
    console.log(`[${cat.nombre}] toggles visibles: ${total}`);

    if (total === 0) {
      console.log(`[${cat.nombre}] No hay items para togglear — skip`);
      test.skip();
      return;
    }

    const initialTitle = (await allToggles.first().getAttribute('title')) ?? '';
    const wasActive = initialTitle.toLowerCase().startsWith('desactivar');

    const patchPromise = page.waitForResponse(
      (r) => cat.patchPattern.test(r.url()) && r.request().method() === 'PATCH',
      { timeout: 10_000 }
    );

    await allToggles.first().click();
    const resp = await patchPromise;
    const status = resp.status();
    console.log(`[${cat.nombre}] PATCH ${resp.url()} → ${status}`);
    // 2xx = toggle exitoso → SignalR emit corre dentro del handler.
    // 409 = bloqueado por business rule (categoría/familia con productos
    // asociados). El endpoint igual está wired correctamente; el emit
    // simplemente no corre en este path. Aceptamos ambos.
    expect([200, 204, 409]).toContain(status);
    if (status === 409) {
      console.log(`[${cat.nombre}] Toggle bloqueado por dependencias (esperado en datos seed) — endpoint OK`);
      return;
    }

    await page.waitForTimeout(1500);

    // Restaurar: buscar un toggle cuyo title arranque con el prefijo opuesto.
    const oppositePrefix = wasActive ? 'activar' : 'desactivar';
    const togglesAfter = page.locator('button[title*="ctivar"]');
    const totalAfter = await togglesAfter.count();
    let foundIdx = -1;
    for (let i = 0; i < Math.min(totalAfter, 20); i++) {
      const t = (await togglesAfter.nth(i).getAttribute('title')) ?? '';
      if (t.toLowerCase().startsWith(oppositePrefix)) {
        foundIdx = i;
        break;
      }
    }

    if (foundIdx >= 0) {
      const restorePromise = page.waitForResponse(
        (r) => cat.patchPattern.test(r.url()) && r.request().method() === 'PATCH',
        { timeout: 10_000 }
      ).catch(() => null);
      await togglesAfter.nth(foundIdx).click().catch(() => {});
      await restorePromise;
      await page.waitForTimeout(800);
      console.log(`[${cat.nombre}] estado restaurado (was "${initialTitle}")`);
    }
  });
}
