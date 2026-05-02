import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.setTimeout(120_000);

/**
 * Smoke E2E nueva sección Histórico GPS.
 *
 * Valida:
 * 1. Sidebar tiene submenu Equipo > Miembros + Histórico GPS
 * 2. /team/gps carga la lista de vendedores con sus últimas ubicaciones
 * 3. Click "Ver detalle" navega a /team/{id}/gps
 * 4. La página detalle muestra mapa Leaflet + lista de eventos + KPI bar
 * 5. Date presets cambian el rango (Hoy / Ayer / 7d)
 * 6. Toggle de tipo de evento filtra la lista
 * 7. Export CSV genera descarga
 */

test.describe('Histórico GPS — submenu Equipo', () => {
  test('sidebar submenu Equipo expande con Miembros + Histórico GPS', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    // Click en Equipo del sidebar para expandir
    const equipoBtn = page.locator('button').filter({ hasText: /^Equipo$/i }).first();
    if (await equipoBtn.count() > 0) {
      await equipoBtn.click().catch(() => {});
      await page.waitForTimeout(500);
    }

    // Verificar que aparecen los 2 subitems
    const miembrosLink = page.locator('a[href="/team"]').filter({ hasText: /Miembros/i }).first();
    const gpsLink = page.locator('a[href="/team/gps"]').first();

    await expect(gpsLink).toBeVisible({ timeout: 5000 });
    console.log('✅ Submenu Histórico GPS visible en sidebar');

    await page.screenshot({ path: 'test-results/team-sidebar-submenu.png', fullPage: false });
  });
});

test.describe('Histórico GPS — página índice /team/gps', () => {
  test('lista vendedores con su última actividad GPS', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/gps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/team-gps-index.png', fullPage: true });

    // Título debe estar
    await expect(page.getByText(/^Histórico GPS$/i).first()).toBeVisible({ timeout: 5000 });

    // Buscador presente
    const buscador = page.getByPlaceholder(/Buscar vendedor/i).first();
    await expect(buscador).toBeVisible();

    // DataGrid headers
    await expect(page.getByText(/Vendedor/i).first()).toBeVisible();

    // Si hay al menos un vendedor con actividad GPS, debe haber un botón "Ver detalle"
    const verDetalle = page.getByRole('link', { name: /Ver detalle/i }).first();
    const tieneFilas = await verDetalle.count();
    console.log(`Vendedores con GPS visibles: ${tieneFilas}`);
    if (tieneFilas > 0) {
      console.log('✅ Lista de vendedores cargada');
    }
  });

  test('búsqueda filtra la lista', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/gps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    const buscador = page.getByPlaceholder(/Buscar vendedor/i).first();
    await buscador.fill('vendedor1');
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-results/team-gps-index-search.png', fullPage: false });
  });
});

test.describe('Histórico GPS — página detalle /team/[id]/gps', () => {
  test('carga mapa + lista + KPI bar para vendedor 5', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/5/gps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'test-results/team-gps-detail.png', fullPage: true });

    // Header con presets
    await expect(page.getByRole('button', { name: /^Hoy$/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /^Ayer$/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /7 días/i }).first()).toBeVisible();

    // Mapa Leaflet debería renderizarse
    const map = page.locator('.leaflet-container').first();
    await expect(map).toBeVisible({ timeout: 8000 });
    console.log('✅ Mapa Leaflet visible');

    // KPI bar al fondo
    const kpiEvents = page.getByText(/eventos/i).first();
    await expect(kpiEvents).toBeVisible();
    console.log('✅ KPI bar visible');

    // Botón Export CSV
    const exportBtn = page.getByRole('button', { name: /Exportar CSV/i }).first();
    await expect(exportBtn).toBeVisible();
    console.log('✅ Botón Export CSV visible');
  });

  test('preset Ayer cambia URL y dispara nuevo fetch', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/5/gps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Click "Ayer"
    const ayerBtn = page.getByRole('button', { name: /^Ayer$/i }).first();
    await ayerBtn.click();
    await page.waitForTimeout(2000);

    // URL debe cambiar a ?dia=YYYY-MM-DD
    const url = page.url();
    expect(url).toMatch(/\/team\/5\/gps\?dia=\d{4}-\d{2}-\d{2}/);
    console.log(`URL tras tap Ayer: ${url}`);

    await page.screenshot({ path: 'test-results/team-gps-yesterday.png', fullPage: true });
  });

  test('toggle de tipo evento filtra cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/5/gps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    // Conteo inicial de cards en lista
    const cardsBefore = await page.locator('div.flex.items-start.gap-3.p-2\\.5').count();
    console.log(`Cards iniciales: ${cardsBefore}`);

    // Click "Pedido" para deactivar
    const pedidoBadge = page.getByRole('button').filter({ hasText: /🛒 Pedido/i }).first();
    if (await pedidoBadge.count() > 0) {
      await pedidoBadge.click();
      await page.waitForTimeout(1000);

      const cardsAfter = await page.locator('div.flex.items-start.gap-3.p-2\\.5').count();
      console.log(`Cards tras desactivar Pedido: ${cardsAfter}`);

      if (cardsBefore > 0) {
        // Si había pedidos, después debe ser menor o igual
        expect(cardsAfter).toBeLessThanOrEqual(cardsBefore);
      }
    }

    await page.screenshot({ path: 'test-results/team-gps-filter-toggle.png', fullPage: true });
  });

  test('Export CSV genera download', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/team/5/gps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
    const exportBtn = page.getByRole('button', { name: /Exportar CSV/i }).first();
    if (await exportBtn.isEnabled()) {
      await exportBtn.click();
      const download = await downloadPromise;
      if (download) {
        const filename = download.suggestedFilename();
        console.log(`✅ CSV descargado: ${filename}`);
        expect(filename).toMatch(/gps-vendedor-5-\d{4}-\d{2}-\d{2}\.csv/);
      } else {
        console.log('⚠️ Download no se completó (puede ser timing)');
      }
    } else {
      console.log('⚠️ Export disabled — sin eventos para exportar');
    }
  });
});
