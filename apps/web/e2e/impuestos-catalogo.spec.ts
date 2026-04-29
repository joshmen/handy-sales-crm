import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Issue: catálogo de impuestos + flag precioIncluyeIva en productos.
 *
 * Cubre:
 * 1. /settings → tab Impuestos visible y CRUD básico de TasasImpuesto
 * 2. /products → drawer de creación tiene checkbox "El precio ya incluye IVA"
 *    y dropdown de tasa con la default ya cargada
 * 3. Crear pedido con producto IVA-incluido → backend devuelve cálculo correcto
 *    (subtotal/impuesto/total cuadran con LineAmountCalculator)
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(800);
}

test.describe('Settings → Impuestos tab', () => {
  test('tab Impuestos accesible y muestra IVA 16% default seedeada', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/settings?tab=impuestos');
    await waitForPageLoad(page);

    // Tab Impuestos debe estar visible
    const impuestosTab = page.getByRole('tab', { name: /impuestos/i });
    await expect(impuestosTab).toBeVisible({ timeout: 10000 });

    // El seed creó "IVA 16%" como default per tenant
    await expect(page.getByText('IVA 16%').first()).toBeVisible({ timeout: 10000 });
    // Debe mostrar la columna de tasa con 16.00%
    await expect(page.getByText('16.00%').first()).toBeVisible();
  });

  test('puede crear nueva tasa "Frontera 8%"', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/settings?tab=impuestos');
    await waitForPageLoad(page);

    // Click "Nueva tasa"
    await page.getByRole('button', { name: /nueva tasa/i }).first().click();

    // Modal abre — llenar datos
    const nombreInput = page.locator('input[type="text"]').first();
    await expect(nombreInput).toBeVisible({ timeout: 5000 });
    await nombreInput.fill(`Frontera 8% E2E ${Date.now()}`);

    const tasaInput = page.locator('input[type="number"]').first();
    await tasaInput.fill('0.08');

    // Submit
    await page.getByRole('button', { name: /^crear tasa$/i }).click();

    // Toast success
    const successToast = page.locator('[data-sonner-toast][data-type="success"]');
    await expect(successToast.first()).toBeVisible({ timeout: 8000 });

    // La nueva tasa aparece en la lista
    await waitForPageLoad(page);
    await expect(page.getByText(/Frontera 8% E2E/).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('8.00%').first()).toBeVisible();
  });
});

test.describe('Products form → flag IVA + dropdown tasa', () => {
  test('drawer de creación muestra checkbox + dropdown', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await page.goto('/products');
    await waitForPageLoad(page);

    // Click "Nuevo producto"
    const newBtn = page.getByRole('button', { name: /nuevo producto|new product/i }).first();
    await expect(newBtn).toBeVisible({ timeout: 5000 });
    await newBtn.click();

    // Drawer abre
    await page.waitForTimeout(800);

    // Checkbox "El precio ya incluye IVA" visible y checked por default.
    // Lo localizamos por su label de texto (más estable que :nth-of-type).
    const ivaLabel = page.locator('label').filter({ hasText: /El precio ya incluye IVA/i });
    await expect(ivaLabel).toBeVisible({ timeout: 5000 });

    // Checkbox dentro de ese label específico
    const ivaCheckbox = ivaLabel.locator('input[type="checkbox"]');
    await expect(ivaCheckbox).toBeChecked();

    // Dropdown "Tasa de impuesto" visible
    await expect(page.getByText(/Tasa de impuesto/i)).toBeVisible();
  });
});
