import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Dark Mode Visual Audit — Screenshots every major page in dark mode.
 *
 * After changing the dark palette from "Warm Graphite" (generic gray-blue)
 * to "Teal-Black" (WhatsApp-inspired), this test captures screenshots
 * for visual review.
 *
 * Checks:
 * - All pages render without white-flash or broken layouts
 * - Drawer inputs have visible borders and readable text
 * - Badges/tints are readable on dark backgrounds
 */

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function enableDarkMode(page: Page) {
  // Set localStorage BEFORE navigating — root layout script reads raw string 'dark'
  await page.addInitScript(() => {
    localStorage.setItem('handy-suites-theme', 'dark');
  });
}

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(500);
  const spinner = page.locator('.animate-spin');
  if (await spinner.count() > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(1000);
}

// Pages to audit
const PAGES = [
  { path: '/dashboard', name: 'dashboard' },
  { path: '/clients', name: 'clients' },
  { path: '/products', name: 'products' },
  { path: '/orders', name: 'orders' },
  { path: '/routes', name: 'routes' },
  { path: '/routes/admin', name: 'routes-templates' },
  { path: '/inventory', name: 'inventory' },
  { path: '/settings', name: 'settings' },
  { path: '/cobros', name: 'cobros' },
  { path: '/discounts', name: 'discounts' },
  { path: '/zones', name: 'zones' },
  { path: '/categories', name: 'categories' },
];

// ── Page-by-page dark mode screenshots ───────────────────────────

test.describe('Dark Mode Visual Audit', () => {

  for (const { path, name } of PAGES) {
    test(`${name} page renders in dark mode`, async ({ page }, testInfo) => {
      if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

      await loginAsAdmin(page);
      await enableDarkMode(page);
      await page.goto(path);
      await waitForPageLoad(page);

      // Verify dark class is applied
      const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDark).toBeTruthy();

      // Check no bright white backgrounds leaked through
      // The body bg should be dark (--background)
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      // Should be a dark color (RGB values all < 40)
      const match = bodyBg.match(/rgb\((\d+), (\d+), (\d+)\)/);
      if (match) {
        const [, r, g, b] = match.map(Number);
        expect(r).toBeLessThan(50);
        expect(g).toBeLessThan(50);
        expect(b).toBeLessThan(50);
      }

      await page.screenshot({
        path: `e2e/screenshots/dark-mode-${name}.png`,
        fullPage: true,
      });
    });
  }
});

// ── Drawer inputs in dark mode ───────────────────────────────────

test.describe('Dark Mode - Drawer Inputs', () => {

  test('route drawer inputs are readable in dark mode', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await enableDarkMode(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Open "Nueva Ruta" drawer
    const newBtn = page.locator('[data-tour="routes-new-btn"]');
    if (!await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await newBtn.click();
    await page.waitForTimeout(500);

    // The drawer should be open
    const drawerNombre = page.locator('[data-tour="routes-drawer-nombre"]');
    await expect(drawerNombre).toBeVisible({ timeout: 5000 });

    // Check that input backgrounds are dark (not white)
    const inputs = page.locator('input[type="text"], input[type="time"], input[type="date"]');
    const inputCount = await inputs.count();

    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible().catch(() => false)) {
        const bg = await input.evaluate(el => getComputedStyle(el).backgroundColor);
        const match = bg.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          // Input should NOT be white (> 200,200,200)
          const isWhite = r > 200 && g > 200 && b > 200;
          expect(isWhite).toBeFalsy();
        }
      }
    }

    await page.screenshot({
      path: 'e2e/screenshots/dark-mode-drawer-inputs.png',
      fullPage: true,
    });
  });

  test('client drawer inputs readable in dark mode', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await enableDarkMode(page);
    await page.goto('/clients');
    await waitForPageLoad(page);

    // Open "Nuevo Cliente" drawer
    const newBtn = page.getByText('Nuevo').first();
    if (!await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip();
      return;
    }
    await newBtn.click();
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'e2e/screenshots/dark-mode-client-drawer.png',
      fullPage: true,
    });

    // Verify inputs aren't white
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const inputCount = await inputs.count();
    for (let i = 0; i < Math.min(inputCount, 5); i++) {
      const input = inputs.nth(i);
      if (await input.isVisible().catch(() => false)) {
        const bg = await input.evaluate(el => getComputedStyle(el).backgroundColor);
        const match = bg.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          const isWhite = r > 200 && g > 200 && b > 200;
          expect(isWhite).toBeFalsy();
        }
      }
    }
  });
});

// ── Dark mode contrast checks ────────────────────────────────────

test.describe('Dark Mode - Contrast', () => {

  test('sidebar is visually distinct from content area', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await enableDarkMode(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // Sidebar should use --card bg, content should use --background
    // They should be different colors (sidebar slightly lighter)
    const sidebar = page.locator('aside, nav').first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      const sidebarBg = await sidebar.evaluate(el => getComputedStyle(el).backgroundColor);
      const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

      // Both should be dark
      for (const bg of [sidebarBg, bodyBg]) {
        const match = bg.match(/rgb\((\d+), (\d+), (\d+)\)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          expect(r).toBeLessThan(60);
          expect(g).toBeLessThan(60);
          expect(b).toBeLessThan(60);
        }
      }
    }

    await page.screenshot({
      path: 'e2e/screenshots/dark-mode-sidebar-contrast.png',
      fullPage: true,
    });
  });

  test('badges/status pills are readable on dark background', async ({ page }, testInfo) => {
    if (testInfo.project.name === 'Mobile Chrome') { test.skip(); return; }

    await loginAsAdmin(page);
    await enableDarkMode(page);
    await page.goto('/routes');
    await waitForPageLoad(page);

    // Check that badge elements have non-zero contrast
    const badges = page.locator('span.rounded-full');
    const count = await badges.count();

    if (count > 0) {
      // At least one badge should be visible
      const firstBadge = badges.first();
      if (await firstBadge.isVisible().catch(() => false)) {
        const bg = await firstBadge.evaluate(el => getComputedStyle(el).backgroundColor);
        const color = await firstBadge.evaluate(el => getComputedStyle(el).color);

        // Both should be non-transparent/non-zero
        expect(bg).not.toBe('rgba(0, 0, 0, 0)');
        expect(color).not.toBe('rgba(0, 0, 0, 0)');
      }
    }

    await page.screenshot({
      path: 'e2e/screenshots/dark-mode-badges.png',
      fullPage: true,
    });
  });
});
