import { test, expect, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Smoke tests contra staging real (https://staging.handysuites.com).
 *
 * Workaround: `test.use({ storageState })` descarta la cookie
 * `__Secure-next-auth.session-token` (httpOnly+Secure). Inyectamos las
 * cookies manualmente con `context.addCookies()` en cada test via beforeEach.
 *
 * Pre-requisito: correr `npx tsx e2e/staging-auth-setup.ts` para generar
 * e2e/.auth/staging.json. Vercel SSO sesión expira tras cada deploy → re-login.
 */

const STAGING_URL = 'https://staging.handysuites.com';
const STORAGE = path.resolve(__dirname, '.auth', 'staging.json');

test.describe.configure({ mode: 'serial' });
test.use({
  navigationTimeout: 60000,
  actionTimeout: 20000,
});

test.beforeEach(async ({ context }) => {
  if (fs.existsSync(STORAGE)) {
    const raw = JSON.parse(fs.readFileSync(STORAGE, 'utf8'));
    await context.addCookies(raw.cookies);
  }
});

async function loginStaging(page: Page) {
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

test.describe('Staging — Team GPS activity (Fase A tracking-vendedor)', () => {
  test('/team muestra columna "Última ubicación"', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/team`);
    await waitForPageLoad(page);

    // El header de la columna debe ser i18n correcto, no la key cruda
    await expect(page.getByText(/última ubicación|last location/i).first()).toBeVisible({ timeout: 15000 });
    // No debe aparecer la key sin traducir
    await expect(page.getByText(/team\.gpsActivity\.lastGpsActivity/i)).toHaveCount(0);
  });

  test('chip "Sin actividad GPS" visible en filas sin tracking', async ({ page }) => {
    await loginStaging(page);
    await page.goto(`${STAGING_URL}/team`);
    await waitForPageLoad(page);

    // En staging Jeyma tiene 0 visitas históricas, así que al menos un vendedor
    // debe mostrar "Sin actividad GPS". Si más adelante se generan eventos el
    // test seguirá pasando porque busca el texto en cualquier lugar de la tabla.
    const noGps = page.getByText(/sin actividad gps|no gps activity/i).first();
    await expect(noGps).toBeVisible({ timeout: 10000 });
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
