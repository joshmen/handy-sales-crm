import { test } from '@playwright/test';
const BASE = 'http://localhost:1083';

test('Debug: check order IDs vs invoiced keys', async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'admin@jeyma.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);

  await page.goto(`${BASE}/orders`);
  await page.waitForTimeout(10000);

  // Inject a check into the page context
  const debug = await page.evaluate(() => {
    // Try to find React state — look for __NEXT_DATA__ or React fiber
    const bodyText = document.body.innerText;
    const hasVerFactura = bodyText.includes('Ver Factura');

    // Count all buttons
    const allButtons = Array.from(document.querySelectorAll('button'));
    const facturarButtons = allButtons.filter(b => b.textContent?.trim() === 'Facturar');
    const verFacturaButtons = allButtons.filter(b => b.textContent?.includes('Ver Factura'));

    // Get all order IDs from the page (look for PED- pattern)
    const pedTexts = Array.from(document.querySelectorAll('*'))
      .map(el => el.textContent)
      .filter(t => t?.match(/PED-\d{8}-\d{4}/))
      .map(t => t?.match(/PED-\d{8}-\d{4}/)?.[0])
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 5);

    return {
      hasVerFactura,
      facturarCount: facturarButtons.length,
      verFacturaCount: verFacturaButtons.length,
      samplePedidos: pedTexts,
      totalButtons: allButtons.length,
    };
  });

  console.log('Debug result:', JSON.stringify(debug, null, 2));
});
