import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Logo & Branding Verification', () => {
  // Clear storageState — most tests here verify public/login pages without auth
  test.use({ storageState: { cookies: [], origins: [] } });

  test('Landing page renders correctly on desktop', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chrome') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Take full-page screenshot
    await page.screenshot({ path: 'test-results/landing-desktop-full.png', fullPage: true });

    // Verify nav
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('nav img[src="/logo-icon.svg"]')).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: /Comienza gratis/i })).toBeVisible();
    await expect(page.locator('nav').getByRole('link', { name: /Iniciar sesión/i })).toBeVisible();

    // Verify hero headline
    await expect(page.getByRole('heading', { name: /La plataforma todo-en-uno/i })).toBeVisible();

    // Verify hero screenshot loads
    const heroImg = page.locator('img[src="/images/hero-dashboard.png"]');
    await expect(heroImg).toBeVisible();
    const dims = await heroImg.evaluate((img: HTMLImageElement) => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
    expect(dims.naturalWidth).toBeGreaterThan(0);
    console.log(`[Landing] hero-dashboard.png: natural=${dims.naturalWidth}x${dims.naturalHeight}`);

    // Verify feature grid
    await expect(page.getByRole('heading', { name: 'CRM y Clientes' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ventas y Pedidos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rutas y Logística' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Facturación SAT' })).toBeVisible();

    // Verify pricing section
    await expect(page.getByText('$499')).toBeVisible();
    await expect(page.getByText('$999')).toBeVisible();
    await expect(page.getByText('Más popular')).toBeVisible();

    // Verify footer
    await expect(page.getByText('© 2026 Handy Suites®').first()).toBeVisible();
  });

  test('Landing page renders correctly on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Mobile Chrome') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/landing-mobile-full.png', fullPage: true });

    // Verify nav logo visible
    await expect(page.locator('nav img[src="/logo-icon.svg"]')).toBeVisible();

    // Verify hero headline
    await expect(page.getByRole('heading', { name: /La plataforma todo-en-uno/i })).toBeVisible();
  });

  test('Login page shows split layout with form on right', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chrome') {
      test.skip();
      return;
    }

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/login-desktop-full.png', fullPage: true });

    // Verify logo visible
    await expect(page.locator('img[src="/logo-icon.svg"]').first()).toBeVisible();

    // Verify "Volver al inicio" link
    await expect(page.getByText('Volver al inicio')).toBeVisible();

    // Verify form heading
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();

    // Verify form fields
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();

    // Verify split layout: left panel with gradient overlay exists on desktop
    const leftPanel = page.locator('.bg-gradient-to-t');
    await expect(leftPanel).toBeVisible();

    // Verify footer
    await expect(page.getByText('© 2026 Handy Suites®')).toBeVisible();
  });

  test('Login page shows centered form on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Mobile Chrome') {
      test.skip();
      return;
    }

    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'test-results/login-mobile-full.png', fullPage: true });

    // Verify heading and form visible
    await expect(page.getByRole('heading', { name: /Iniciar sesión/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('Page title contains Handy Suites', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const title = await page.title();
    expect(title).toContain('Handy Suites');
    console.log(`Landing page title: "${title}"`);
  });

  test('SVG assets load correctly', async ({ request }) => {
    for (const asset of ['favicon.svg', 'logo-icon.svg', 'logo.svg', 'logo-dark.svg']) {
      const response = await request.get(`/${asset}`);
      expect(response.status()).toBe(200);
      const body = await response.text();
      expect(body).toContain('<svg');
      console.log(`${asset}: ${response.status()}, size=${body.length} bytes`);
    }
  });

  test('Header shows logo-icon.svg after login', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chrome') {
      test.skip();
      return;
    }

    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/dashboard-with-header.png', fullPage: false });

    // Check header has logo-icon.svg or a custom company logo
    const headerLogo = page.locator('header img[src="/logo-icon.svg"]');
    const customLogo = page.locator('header img[alt]').first();

    const iconVisible = await headerLogo.isVisible().catch(() => false);
    const anyLogoVisible = await customLogo.isVisible().catch(() => false);

    expect(iconVisible || anyLogoVisible).toBeTruthy();

    if (iconVisible) {
      const dims = await headerLogo.evaluate((img: HTMLImageElement) => ({
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
      expect(dims.naturalWidth).toBeGreaterThan(0);
      console.log(`[Header] logo-icon.svg loaded: ${dims.naturalWidth}x${dims.naturalHeight}`);
    }

    const header = page.locator('header').first();
    await header.screenshot({ path: 'test-results/header-logo-area.png' });
  });

  test('Landing "Comienza gratis" navigates to login', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chrome') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click "Comienza gratis" in hero
    await page.getByRole('link', { name: /Comienza gratis/i }).first().click();
    await expect(page).toHaveURL(/login/, { timeout: 5000 });
  });
});
