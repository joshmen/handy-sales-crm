import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

async function advanceTourToStep(page: Page, targetStep: number) {
  for (let i = 1; i < targetStep; i++) {
    const nextBtn = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
    await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn.click();
    await page.waitForTimeout(600);
  }
}

async function setupTour(page: Page, path: string) {
  await loginAsAdmin(page);
  await page.goto(path);
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => {
    localStorage.removeItem('handy-tours-completed');
    localStorage.removeItem('handy-tours-prompt');
  });
  await page.reload();
  await page.waitForLoadState('networkidle');

  const cookieBtn = page.locator('button:has-text("Aceptar")');
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  const fab = page.locator('button[aria-label="Tour disponible"]');
  await fab.waitFor({ state: 'visible', timeout: 8000 });
  await fab.click({ force: true });
  await page.waitForTimeout(300);

  const startBtn = page.getByRole('button', { name: 'Iniciar tour', exact: true });
  await startBtn.waitFor({ state: 'visible', timeout: 3000 });
  await startBtn.click();
  await page.waitForTimeout(500);
}

test('Orders tour: drawer spotlight on steps 8-10', async ({ page }) => {
  await setupTour(page, '/orders');

  // Advance to step 7 (create button, opens drawer)
  await advanceTourToStep(page, 7);
  await expect(page.locator('.driver-popover-progress-text')).toContainText('7 de 11');

  // Step 7 → 8: opens drawer
  const nextBtn7 = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
  await nextBtn7.click();
  await page.waitForTimeout(1500);

  await expect(page.locator('.driver-popover-progress-text')).toContainText('8 de 11');
  await page.screenshot({ path: 'test-results/orders-spotlight-step8.png', fullPage: true });

  // Step 9
  const nextBtn8 = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
  await nextBtn8.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/orders-spotlight-step9.png', fullPage: true });

  // Step 10
  const nextBtn9 = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
  await nextBtn9.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/orders-spotlight-step10.png', fullPage: true });
});

test('Cobranza tour: drawer spotlight on steps 4-6', async ({ page }) => {
  await setupTour(page, '/cobranza');

  // Advance to step 3 (new cobro button)
  await advanceTourToStep(page, 3);

  // Step 3 → 4: opens drawer
  const nextBtn3 = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
  await nextBtn3.click();
  await page.waitForTimeout(1500);

  await expect(page.locator('.driver-popover-progress-text')).toContainText('4 de 9');
  await page.screenshot({ path: 'test-results/cobranza-spotlight-step4.png', fullPage: true });

  // Step 5
  const nextBtn4 = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
  await nextBtn4.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/cobranza-spotlight-step5.png', fullPage: true });

  // Step 6
  const nextBtn5 = page.locator('.driver-popover-navigation-btns button:has-text("Siguiente")');
  await nextBtn5.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/cobranza-spotlight-step6.png', fullPage: true });
});
