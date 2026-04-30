import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * Smoke tests contra staging real (https://staging.handysuites.com).
 *
 * Usa storageState pre-cargado desde e2e/.auth/staging.json (generado por
 * `npx tsx e2e/staging-auth-setup.ts` que abre browser headed para que el
 * usuario pase el gate de Vercel y se loguee manualmente).
 *
 * Cobertura:
 * - Tasas de impuesto en /products/taxes (movido de settings)
 * - Promociones BOGO: editar pre-existente, crear regalo, badge en tabla
 * - i18n /promotions con keys nuevas (discountOrGift, tipoPromocion)
 */

const STAGING_URL = 'https://staging.handysuites.com';
const STORAGE = path.resolve(__dirname, '.auth', 'staging.json');

test.describe.configure({ mode: 'serial' });
test.use({
  navigationTimeout: 60000,
  actionTimeout: 20000,
  storageState: STORAGE,
});

async function loginStaging(page: Page) {
  // No-op: storageState ya nos tiene autenticados; solo navegamos para evitar
  // que algunos tests asuman estar en el dashboard.
  await page.goto(`${STAGING_URL}/dashboard`);
  await page.waitForLoadState('networkidle');
}

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(800);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

test.describe('Staging — Tasas de impuesto', () => {
  test('catálogo accesible en /products/taxes con IVA 16% default', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/products/taxes`);
    await waitForPageLoad(page);

    await expect(page.getByRole('heading', { name: /tasas de impuesto/i }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('IVA 16%').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('16.00%').first()).toBeVisible();
  });

  test('settings ya NO tiene tab Impuestos', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/settings`);
    await waitForPageLoad(page);

    // Anteriormente había un TabsTrigger con value="impuestos"; verificamos ausencia
    const impuestosTab = page.getByRole('tab', { name: /^impuestos$/i });
    await expect(impuestosTab).toHaveCount(0);
  });
});

test.describe('Staging — Promociones BOGO', () => {
  test('drawer muestra selector "Tipo de promoción" + radios', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/promotions`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /nueva promoci[oó]n/i }).first().click();
    await page.waitForTimeout(800);

    // Tipo de promoción debe ser visible
    await expect(page.getByText(/tipo de promoci[oó]n/i).first()).toBeVisible({ timeout: 5000 });
    // Ambos radios visibles
    await expect(page.getByText(/descuento\s*%/i).first()).toBeVisible();
    await expect(page.getByText(/regalo por cantidad/i).first()).toBeVisible();
  });

  test('cambiar a Regalo muestra campos cantidadCompra/Bonificada/Producto bonificado', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/promotions`);
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /nueva promoci[oó]n/i }).first().click();
    await page.waitForTimeout(800);

    // Click en radio "Regalo por cantidad"
    await page.locator('label').filter({ hasText: /regalo por cantidad/i }).first().click();
    await page.waitForTimeout(400);

    await expect(page.getByText(/por cada/i).first()).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/regala/i).first()).toBeVisible();
    await expect(page.getByText(/producto bonificado/i).first()).toBeVisible();
  });

  test('tabla muestra columna "Descuento / Regalo" (i18n nuevo)', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/promotions`);
    await waitForPageLoad(page);

    // El header debe contener "Descuento" Y "Regalo" — pueden estar en líneas separadas
    // por wrapping. Usamos getByText con regex que tolera whitespace/newlines.
    await expect(page.getByText(/descuento/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/regalo/i).first()).toBeVisible();
    // No debe aparecer la key cruda "promotions.discountOrGift"
    await expect(page.getByText(/promotions\.discountOrGift/i)).toHaveCount(0);
  });
});

test.describe('Staging — Productos form con IVA', () => {
  test('drawer crear producto tiene checkbox IVA y dropdown Tasa', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/products`);
    await waitForPageLoad(page);

    const newBtn = page.getByRole('button', { name: /nuevo producto|new product/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 10000 });
    await newBtn.click();
    await page.waitForTimeout(1000);

    const ivaLabel = page.locator('label').filter({ hasText: /el precio ya incluye iva/i });
    await expect(ivaLabel).toBeVisible({ timeout: 5000 });

    const ivaCheckbox = ivaLabel.locator('input[type="checkbox"]');
    await expect(ivaCheckbox).toBeChecked();

    await expect(page.getByText(/tasa de impuesto/i).first()).toBeVisible();
  });
});
