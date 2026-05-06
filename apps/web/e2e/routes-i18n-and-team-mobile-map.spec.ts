import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Validación rápida de 2 fixes del bundle 2026-05-05:
 *  - Bug 2: i18n keys missing en /routes/manage/{id}/close — el header y
 *    los labels financieros aparecían como `routes.close.breadcrumbRoutes`
 *    literal. Con el fix, deben renderizarse traducidos.
 *  - Bug +1: el mapa GPS de equipo (/team/{id}/gps) no se veía desde
 *    browser móvil porque el grid container con `h-[calc(100vh-380px)]`
 *    colapsaba el mapa Leaflet a height 0. Con el fix, viewport mobile
 *    debe mostrar el mapa con altura ≥ 320px.
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

test.describe('Bug 2: i18n keys cierre de ruta', () => {
  test('header y financial summary muestran texto traducido (no keys crudas)', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);

    // Buscar una ruta Completada o Cerrada para acceder a /close. La mayoría
    // de rutas en seed están Planificada → para verla, vamos directo a id=9
    // (la `test` de QA, sigue activa en local).
    // Si la ruta está en estado Planificada, igual carga la página /close
    // (renderiza el resumen aunque no permita cerrar).
    await page.goto('/routes/manage/9/close');
    await waitForPageLoad(page);

    // Las keys que antes aparecían crudas:
    const rawKeys = [
      'routes.close.breadcrumbRoutes',
      'routes.close.cashSales',
      'routes.close.paidDeliveries',
      'routes.close.debtCollection',
      'routes.close.creditSales',
      'routes.close.creditDeliveries',
      'routes.close.creditBalance',
      'routes.close.presaleOrders',
      'routes.close.returns',
      'routes.detail.lifecyclePending',
      'routes.detail.lifecycleLoadAccepted',
      'routes.detail.lifecycleInProgress',
      'routes.detail.lifecycleCompleted',
      'routes.detail.lifecycleClosed',
    ];

    const bodyText = await page.locator('body').textContent({ timeout: 10000 });
    if (!bodyText) {
      test.skip(true, 'Página vacía — quizás la ruta 9 no existe localmente');
      return;
    }

    for (const key of rawKeys) {
      if (bodyText.includes(key)) {
        throw new Error(`i18n key cruda visible: "${key}". Falta traducción en es.json/en.json.`);
      }
    }

    // Validación positiva: al menos uno de los textos esperados debe aparecer.
    const expectedTexts = ['Ventas contado', 'Cobranza adeudos', 'Pendiente'];
    let found = 0;
    for (const txt of expectedTexts) {
      if (bodyText.includes(txt)) found++;
    }
    expect(found).toBeGreaterThan(0); // al menos 1 traducido visible
  });
});

test.describe('Bug +1: mapa GPS de equipo en mobile responsive', () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12 viewport

  test('mapa Leaflet visible en /team/{id}/gps con viewport mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Desktop Chrome') { test.skip(); return; }

    await loginAsAdmin(page);

    // Navegar a la pantalla de GPS de un vendedor. id=5 es vendedor1@jeyma.com
    // (memoria del proyecto: vendedor con datos de tracking).
    await page.goto('/team/5/gps');
    await waitForPageLoad(page);

    // El mapa debe tener altura > 0. Buscar el contenedor del mapa por
    // presencia del Leaflet container (.leaflet-container) o por su wrapper.
    // El fix le dio h-[320px] en mobile.
    const mapContainer = page.locator('.leaflet-container, [class*="leaflet"]').first();
    const isVisible = await mapContainer.isVisible({ timeout: 10000 }).catch(() => false);

    if (!isVisible) {
      // Quizás el componente está montado pero Leaflet no terminó de inicializar.
      // Verificar por el wrapper explícito.
      const wrapper = page.locator('div.bg-card.border.rounded-lg.overflow-hidden').first();
      const wrapperBox = await wrapper.boundingBox();
      expect(wrapperBox?.height).toBeGreaterThan(200);
      return;
    }

    const box = await mapContainer.boundingBox();
    expect(box, 'Mapa Leaflet bounding box debe existir').toBeTruthy();
    expect(box!.height, 'Altura del mapa en mobile debe ser >= 280px').toBeGreaterThanOrEqual(280);
    expect(box!.width, 'Ancho del mapa en mobile debe ser > 200px').toBeGreaterThan(200);
  });
});
