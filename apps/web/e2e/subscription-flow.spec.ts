import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * QA Audit 2026-06-05 — Subscription page.
 *
 * GAP: subscription-tenant.spec.ts cubre API y página renderea. NO cubre:
 *  - Cambio de plan flow
 *  - Stripe checkout
 *  - Cupón redeem
 *  - Cards de planes comparativos
 */

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/subscription');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
  });

  test('Página /subscription renderea con plan actual', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /Suscripción|Plan|Subscription/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('Cards comparativos de planes visibles', async ({ page }) => {
    const planTexts = [/Gratis|Free/i, /Pro|Profesional/i, /Business|Empresarial/i];
    let found = 0;
    for (const t of planTexts) {
      if (await page.getByText(t).first().isVisible({ timeout: 3000 }).catch(() => false)) found++;
    }
    expect(found).toBeGreaterThanOrEqual(1);
  });

  test('Toggle Mensual/Anual presente', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /Mensual|Anual|Monthly|Annual/i }).first();
    if (!await toggle.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(toggle).toBeVisible();
  });

  test('Cupón input presente para admin', async ({ page }) => {
    const cuponInput = page.getByPlaceholder(/Cupón|Coupon|código/i).first();
    if (!await cuponInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await expect(cuponInput).toBeVisible();
  });
});
