import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Regression — admin@jeyma.com 2026-05-03:
 * En prod la consola del browser mostraba 401 al navegar a /team/{id}/gps:
 *   GET /api/global-settings → 401
 *   GET /api/company/settings → 401
 *   GET /api/profile → 401
 *
 * Causa: race condition por orden de useEffect en React (child-first → parent-last).
 * GlobalSettings/Company/Profile providers (children) disparaban sus fetch en
 * useEffect ANTES de que HydrationProvider (parent) ejecutara su useEffect que
 * seteaba `_cachedAccessToken` en api.ts. Resultado: requests salían sin
 * Authorization header → 401 → response interceptor refresh + retry (transparente
 * para el user pero contaminaba la consola).
 *
 * Fix: setApiAccessToken movido al cuerpo del hook useAuthSession (sync durante
 * render). Por mount/render order (parent-first), HydrationProvider llena el
 * cache antes de que cualquier child renderee.
 */
test.setTimeout(60_000);

test.describe('Auth race condition — 401s en initial load', () => {
  test('navegar a /team/{id}/gps no produce 401 en endpoints de bootstrap', async ({ page }) => {
    const reqs401: Array<{ url: string; status: number }> = [];

    page.on('response', (resp) => {
      if (resp.status() === 401) {
        reqs401.push({ url: resp.url(), status: 401 });
      }
    });

    await loginAsAdmin(page);
    await page.goto('/team/3/gps?dia=2026-05-02', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    const bootstrap401s = reqs401.filter((r) =>
      /\/api\/(global-settings|company\/settings|profile)(\?|$)/.test(r.url)
    );

    if (bootstrap401s.length > 0) {
      console.log('401s en bootstrap endpoints:');
      bootstrap401s.forEach((r, i) => console.log(`  [${i}]`, r.url));
    }
    expect(bootstrap401s, 'No debe haber 401 en bootstrap endpoints (race condition fix)').toHaveLength(0);
  });

  test('navegar a /dashboard como admin tampoco produce 401 en bootstrap endpoints', async ({ page }) => {
    const reqs401: Array<{ url: string; status: number }> = [];

    page.on('response', (resp) => {
      if (resp.status() === 401) {
        reqs401.push({ url: resp.url(), status: 401 });
      }
    });

    await loginAsAdmin(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const bootstrap401s = reqs401.filter((r) =>
      /\/api\/(global-settings|company\/settings|profile)(\?|$)/.test(r.url)
    );

    expect(bootstrap401s, 'Dashboard tampoco debe disparar 401 en bootstrap').toHaveLength(0);
  });
});
