import { test } from '@playwright/test';

const BASE = 'http://localhost:1083';

test('Cancelar factura', async ({ page }) => {
  // Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'admin@jeyma.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  // Primero timbrar una factura nueva para poder cancelarla
  await page.goto(`${BASE}/orders`);
  await page.waitForTimeout(3000);

  const facturarBtn = page.locator('text=Facturar').first();
  if (await facturarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('1. Facturando pedido...');
    await facturarBtn.click();
    await page.waitForTimeout(3000);

    const timbrarBtn = page.locator('button:has-text("Crear y Timbrar")');
    if (await timbrarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await timbrarBtn.click();
      await page.waitForTimeout(8000);
      console.log('2. Factura timbrada, URL:', page.url());
    }
  }

  // Ir a facturas y abrir la más reciente
  await page.goto(`${BASE}/billing/invoices`);
  await page.waitForTimeout(3000);

  const facturaLink = page.locator('a[href*="/billing/invoices/"]').first();
  if (await facturaLink.isVisible({ timeout: 3000 }).catch(() => false)) {
    await facturaLink.click();
    await page.waitForTimeout(3000);
    console.log('3. Detalle factura:', page.url());
    await page.screenshot({ path: 'e2e/screenshots/01-factura-detail.png', fullPage: true });

    // Esperar un poco (sandbox requiere 2-5 min, pero probamos)
    console.log('4. Esperando 10s antes de cancelar...');
    await page.waitForTimeout(10000);

    // Click "Cancelar factura"
    const cancelBtn = page.locator('button:has-text("Cancelar factura")');
    if (await cancelBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'e2e/screenshots/02-cancel-modal.png', fullPage: true });

      // Select motivo 03
      await page.selectOption('select', '03');

      // Click "Quiero cancelar esta factura"
      const confirmStep1 = page.locator('button:has-text("Quiero cancelar")');
      if (await confirmStep1.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmStep1.click();
        await page.waitForTimeout(500);
      }

      // Click "Sí, cancelar"
      const confirmStep2 = page.locator('button:has-text("Sí, cancelar")');
      if (await confirmStep2.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmStep2.click();
        console.log('5. Enviando cancelación...');
        await page.waitForTimeout(10000);

        await page.screenshot({ path: 'e2e/screenshots/03-after-cancel.png', fullPage: true });
        console.log('6. URL después de cancelar:', page.url());

        // Check toast
        const toast = page.locator('[data-sonner-toast]').first();
        const toastText = await toast.textContent().catch(() => 'no toast');
        console.log('7. Toast:', toastText);

        // Check if factura status changed
        const statusBadge = page.locator('span:has-text("Cancelada"), span:has-text("Timbrada")').first();
        const statusText = await statusBadge.textContent().catch(() => 'unknown');
        console.log('8. Estado factura:', statusText);
      }
    } else {
      console.log('4. No hay botón Cancelar factura');
    }
  } else {
    console.log('3. No hay facturas');
  }
});
