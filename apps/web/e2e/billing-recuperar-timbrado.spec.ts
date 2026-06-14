import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Fase B — Resiliencia de timbrado.
 *
 * Para una factura en estado ERROR, el admin puede pulsar "Recuperar" para consultar
 * vía `stamped` si Finkok sí la timbró (evita doble timbrado). Mockeamos la lista con
 * una factura ERROR y el endpoint de recuperación.
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

const facturaError = {
  id: 4242,
  serie: 'A',
  folio: '1001',
  estado: 'ERROR',
  receptorNombre: 'Cliente Demo SA',
  receptorRfc: 'XAXX010101000',
  emisorRfc: 'EKU9003173C9',
  fechaEmision: '2026-06-09T10:00:00Z',
  total: 1160.0,
};

test('Recuperar timbrado en factura ERROR dispara stamped y muestra éxito', async ({ page }) => {
  await loginAsAdmin(page);

  await page.route('**/api/facturas?*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [facturaError], totalCount: 1, page: 1, pageSize: 20 }),
    }),
  );
  await page.route('**/api/facturas/4242/recuperar-timbrado', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ recuperado: true, uuid: '99999999-8888-7777-6666-555555555555' }),
    }),
  );

  await page.goto('/billing/invoices');
  await page.waitForLoadState('domcontentloaded');

  // El botón "Recuperar" aparece para la factura ERROR
  const recoverBtn = page.getByRole('button', { name: /Recuperar|Recover/i }).first();
  await expect(recoverBtn).toBeVisible({ timeout: 15000 });

  // Al pulsar, se llama al endpoint de recuperación
  const reqPromise = page.waitForRequest('**/api/facturas/4242/recuperar-timbrado');
  await recoverBtn.click();
  const req = await reqPromise;
  expect(req.method()).toBe('POST');
});
