import { test } from '@playwright/test';

const BASE = 'http://localhost:1083';

test('Debug invoiced orders', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'admin@jeyma.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.goto(`${BASE}/orders`);
  await page.waitForTimeout(8000);

  // Filter console for invoiced/billing
  const relevant = logs.filter(l => l.includes('invoic') || l.includes('billing') || l.includes('1051') || l.includes('warn'));
  console.log('=== Relevant console logs ===');
  relevant.forEach(l => console.log(l));

  // Check DOM state
  const state = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return {
      facturar: btns.filter(b => b.textContent?.trim() === 'Facturar').length,
      aLinks: btns.filter(b => /^A-\d+$/.test(b.textContent?.trim() || '')).length,
      allBtnTexts: btns.map(b => b.textContent?.trim()).filter(t => t && (t.includes('Factur') || t.includes('A-'))),
    };
  });
  console.log('DOM state:', JSON.stringify(state));
});
