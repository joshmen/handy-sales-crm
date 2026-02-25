import { test } from '@playwright/test';
import path from 'path';
import { loginAsAdmin } from './helpers/auth';

const OUTPUT_DIR = path.resolve(__dirname, '../public/images/tour');

test('Capture fresh tour screenshots', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'Desktop Chrome') {
    test.skip();
    return;
  }

  test.setTimeout(60000);

  // Login
  await loginAsAdmin(page);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 1. Clients page — click "Nuevo Cliente" to open drawer
  await page.goto('/clients');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const nuevoClienteBtn = page.getByRole('button', { name: /Nuevo Cliente/i });
  if (await nuevoClienteBtn.isVisible()) {
    await nuevoClienteBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'clientes-crear.jpg'),
    type: 'jpeg',
    quality: 90,
  });
  console.log('clientes-crear.jpg saved');

  // Close drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // 2. Orders page — click "Nuevo Pedido" to open drawer
  await page.goto('/orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const nuevoPedidoBtn = page.getByRole('button', { name: /Nuevo Pedido/i });
  if (await nuevoPedidoBtn.isVisible()) {
    await nuevoPedidoBtn.click();
    await page.waitForTimeout(1500);
  }

  await page.screenshot({
    path: path.join(OUTPUT_DIR, 'pedidos-crear.jpg'),
    type: 'jpeg',
    quality: 90,
  });
  console.log('pedidos-crear.jpg saved');
});
