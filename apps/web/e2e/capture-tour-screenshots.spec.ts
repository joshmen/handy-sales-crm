import { test } from '@playwright/test';
import path from 'path';

const OUTPUT_DIR = path.resolve(__dirname, '../public/images/tour');

test('Capture fresh tour screenshots', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'Desktop Chrome') {
    test.skip();
    return;
  }

  test.setTimeout(60000);

  // Login
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  await page.locator('#email').fill('admin@jeyma.com');
  await page.locator('#password').fill('test123');
  await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });
  await page.waitForURL(/dashboard/, { timeout: 15000 });
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
