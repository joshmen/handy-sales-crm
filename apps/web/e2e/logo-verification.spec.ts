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
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Take full-page screenshot
    await page.screenshot({ path: 'test-results/landing-desktop-full.png', fullPage: true });

    // Core assertions: cosas que NO cambian en redesigns menores.
    // Specifico header nav (no footer) para evitar strict mode violations.
    const headerNav = page.locator('header nav, nav').first();
    await expect(headerNav).toBeVisible();
    await expect(page.locator('img[src="/logo-icon.svg"]').first()).toBeVisible();
    // Botón principal de login en header (texto exacto puede cambiar entre
    // 'Iniciar sesión'/'Inicia sesión'/'Sign in', regex flexible).
    await expect(page.getByRole('link', { name: /Iniciar sesi[oó]n|Sign in/i }).first()).toBeVisible();

    // Hero headline — string base estable
    await expect(page.getByRole('heading', { name: /La plataforma todo-en-uno/i })).toBeVisible();

    // Hero CTA "Comienza gratis" (button or link)
    await expect(page.getByText(/Comienza gratis/i).first()).toBeVisible();

    // Hero screenshot loads. Next.js <Image> transforma src a /_next/image?url=...
    // Uso match por alt (estable) en lugar de src exacto.
    const heroImg = page.getByAltText(/Dashboard de Handy Suites/i);
    await expect(heroImg).toBeVisible();
    const dims = await heroImg.evaluate((img: HTMLImageElement) => ({
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
    expect(dims.naturalWidth).toBeGreaterThan(0);

    // Footer brand presente (año cambia, marca no)
    await expect(page.getByText(/Handy Suites/i).first()).toBeVisible();
  });

  test('Landing page renders correctly on mobile', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Mobile Chrome') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
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
    await page.waitForLoadState('domcontentloaded');
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
    await page.waitForLoadState('domcontentloaded');
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
    await page.waitForLoadState('domcontentloaded');
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

  test('Landing "Comienza gratis" navigates to register', async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'Desktop Chrome') {
      test.skip();
      return;
    }

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Click "Comienza gratis" in hero — link va a /register (Crear cuenta) post-redesign,
    // antes iba a /login.
    await page.getByRole('link', { name: /Comienza gratis/i }).first().click();
    await expect(page).toHaveURL(/register|login/, { timeout: 5000 });
  });
});
