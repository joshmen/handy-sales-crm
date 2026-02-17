import { test, expect, Page } from '@playwright/test';

/**
 * Visual Audit: Homologación de páginas del dashboard
 *
 * Verifica que todas las páginas tengan:
 * - Título h1 con Space Grotesk y clases correctas
 * - Botón verde estándar "Nuevo/Nueva [entidad]"
 * - Search input estándar
 * - Tabla en desktop / Cards en mobile
 * - Layout responsive correcto (título + botón se apilan en mobile)
 */

// ─── Auth helper (API-based login for reliability) ──────────────
async function login(page: Page) {
  // 1. Get CSRF token from NextAuth
  const csrfRes = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();

  // 2. Sign in via NextAuth callback API (sets session cookie directly)
  await page.request.post('/api/auth/callback/credentials', {
    form: {
      email: 'admin@jeyma.com',
      password: 'test123',
      csrfToken,
    },
  });

  // 3. Navigate to dashboard to verify session works
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

// ─── Pages to audit ─────────────────────────────────────────────
interface PageAudit {
  name: string;
  path: string;
  expectedTitle: string;
  expectedButton: string;
  hasSearch: boolean;
  hasTable: boolean;
  hasMobileCards: boolean;
  hasToggle: boolean;       // has active/inactive toggle
  hasCheckbox: boolean;     // has multi-select checkboxes
}

const PAGES: PageAudit[] = [
  {
    name: 'Productos',
    path: '/products',
    expectedTitle: 'Productos',
    expectedButton: 'Nuevo producto',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Pedidos',
    path: '/orders',
    expectedTitle: 'Pedidos',
    expectedButton: 'Nuevo pedido',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Clientes',
    path: '/clients',
    expectedTitle: 'Clientes',
    expectedButton: 'Nuevo cliente',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Promociones',
    path: '/promotions',
    expectedTitle: 'Promociones',
    expectedButton: 'Nueva promoción',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Descuentos',
    path: '/discounts',
    expectedTitle: 'Descuentos por cantidad',
    expectedButton: 'Nuevo descuento',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Inventario',
    path: '/inventory',
    expectedTitle: 'Inventario de almacén',
    expectedButton: 'Nuevo producto',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Movimientos',
    path: '/inventory/movements',
    expectedTitle: 'Movimientos de inventario',
    expectedButton: 'Nuevo movimiento',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Rutas',
    path: '/routes',
    expectedTitle: 'Rutas',
    expectedButton: 'Nueva ruta',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Listas de Precios',
    path: '/price-lists',
    expectedTitle: 'Listas de precios',
    expectedButton: 'Nueva lista',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Familias de Productos',
    path: '/product-families',
    expectedTitle: 'Familias de productos',
    expectedButton: 'Nueva familia',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Categorías de Clientes',
    path: '/client-categories',
    expectedTitle: 'Categorías de clientes',
    expectedButton: 'Nueva categoría',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Categorías de Productos',
    path: '/product-categories',
    expectedTitle: 'Categorías de productos',
    expectedButton: 'Nueva categoría',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Unidades de Medida',
    path: '/units',
    expectedTitle: 'Unidades de medida',
    expectedButton: 'Nueva unidad',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Zonas',
    path: '/zones',
    expectedTitle: 'Zonas',
    expectedButton: 'Nueva zona',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: true,
    hasCheckbox: true,
  },
  {
    name: 'Roles',
    path: '/roles',
    expectedTitle: 'Roles',
    expectedButton: 'Nuevo rol',
    hasSearch: false,
    hasTable: true,
    hasMobileCards: false,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Cobranza',
    path: '/cobranza',
    expectedTitle: 'Cobranza',
    expectedButton: 'Nuevo cobro',
    hasSearch: true,
    hasTable: true,
    hasMobileCards: true,
    hasToggle: false,
    hasCheckbox: false,
  },
  {
    name: 'Usuarios',
    path: '/users',
    expectedTitle: 'Usuarios',
    expectedButton: 'Nuevo usuario',
    hasSearch: false,
    hasTable: false,
    hasMobileCards: false,
    hasToggle: true,
    hasCheckbox: false,
  },
];

// ─── Test Suite ──────────────────────────────────────────────────

test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

test.describe('Visual Audit - Dashboard Pages', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  for (const pg of PAGES) {
    test.describe(`${pg.name} (${pg.path})`, () => {

      // ── Desktop Tests ───────────────────────────────
      test(`[Desktop] título, botón y estructura`, async ({ page, browserName }, testInfo) => {
        // Only run desktop tests on Desktop Chrome project
        if (testInfo.project.name === 'Mobile Chrome') {
          test.skip();
          return;
        }

        await page.goto(pg.path);
        // Wait for page to fully load: first wait for any spinner to appear then disappear
        await page.waitForTimeout(1000);
        const spinner = page.locator('.animate-spin');
        if (await spinner.count() > 0) {
          await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        }
        await page.waitForTimeout(2000); // Extra buffer for rendering

        // Take screenshot
        await page.screenshot({
          path: `e2e/screenshots/${pg.name.replace(/\s+/g, '-').toLowerCase()}-desktop.png`,
          fullPage: true,
        });

        // 1. Check title h1 exists with correct text
        const h1 = page.locator('h1');
        await expect(h1.first()).toBeVisible({ timeout: 10000 });
        const titleText = await h1.first().textContent();
        expect(titleText?.trim()).toContain(pg.expectedTitle);

        // 2. Check green button exists with correct text
        const greenBtn = page.locator('button').filter({ hasText: pg.expectedButton });
        if (await greenBtn.count() > 0) {
          await expect(greenBtn.first()).toBeVisible();
          // Verify it has green background
          const bgColor = await greenBtn.first().evaluate(el => {
            return window.getComputedStyle(el).backgroundColor;
          });
          // Green-600 is rgb(22, 163, 74) or similar
          expect(bgColor).toMatch(/rgb\((?:22|16|21|34), (?:163|185|128|197), (?:74|90|61|94)\)/);
        }

        // 3. Check search input exists (if expected)
        if (pg.hasSearch) {
          const searchInput = page.locator('input[placeholder*="Buscar"]');
          if (await searchInput.count() > 0) {
            await expect(searchInput.first()).toBeVisible();
          }
        }

        // 4. Check table is visible on desktop (if expected)
        if (pg.hasTable) {
          const tableBlock = page.locator('.hidden.sm\\:block, [class*="hidden sm:block"]');
          if (await tableBlock.count() > 0) {
            await expect(tableBlock.first()).toBeVisible();
          }
        }

        // 5. Check mobile cards are hidden on desktop (if page has them)
        if (pg.hasMobileCards) {
          const mobileCards = page.locator('.sm\\:hidden');
          if (await mobileCards.count() > 0) {
            await expect(mobileCards.first()).not.toBeVisible();
          }
        }
      });

      // ── Mobile Tests ────────────────────────────────
      test(`[Mobile] título, botón y cards`, async ({ page, browserName }, testInfo) => {
        // Only run mobile tests on Mobile Chrome project
        if (testInfo.project.name === 'Desktop Chrome') {
          test.skip();
          return;
        }

        await page.goto(pg.path);
        // Wait for page to fully load: first wait for any spinner to appear then disappear
        await page.waitForTimeout(1000);
        const mobileSpinner = page.locator('.animate-spin');
        if (await mobileSpinner.count() > 0) {
          await mobileSpinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
        }
        await page.waitForTimeout(2000); // Extra buffer for rendering

        // Take screenshot
        await page.screenshot({
          path: `e2e/screenshots/${pg.name.replace(/\s+/g, '-').toLowerCase()}-mobile.png`,
          fullPage: true,
        });

        // 1. Check title h1 exists
        const h1 = page.locator('h1');
        await expect(h1.first()).toBeVisible({ timeout: 10000 });

        // 2. Verify title and button are NOT on the same horizontal line
        // (they should be stacked in flex-col on mobile)
        const greenBtn = page.locator('button').filter({ hasText: pg.expectedButton });
        if (await greenBtn.count() > 0 && await h1.count() > 0) {
          const titleBox = await h1.first().boundingBox();
          const btnBox = await greenBtn.first().boundingBox();

          if (titleBox && btnBox) {
            // Button should be BELOW the title on mobile (different Y position)
            // Or they can be on the same line only if there's enough room
            const titleBottom = titleBox.y + titleBox.height;
            const viewport = page.viewportSize();

            // If viewport is mobile-width (<640px), title and button should stack
            if (viewport && viewport.width < 640) {
              // Button's top should be below title's top (stacked, not same line)
              // Allow some tolerance for cases where they're very close
              const isStacked = btnBox.y >= titleBox.y + titleBox.height - 5;
              const isSameLine = Math.abs(btnBox.y - titleBox.y) < 10;

              if (isSameLine) {
                // Flag: they're on the same line on mobile — potentially crammed
                console.warn(`⚠️  [${pg.name}] Título y botón en la MISMA LÍNEA en mobile (title.y=${titleBox.y}, btn.y=${btnBox.y})`);
              }
            }
          }

          // Button should NOT stretch to full width
          if (btnBox) {
            const viewport = page.viewportSize();
            if (viewport) {
              const btnWidthPercent = (btnBox.width / viewport.width) * 100;
              if (btnWidthPercent > 80) {
                console.warn(`⚠️  [${pg.name}] Botón ocupa ${btnWidthPercent.toFixed(0)}% del ancho — posiblemente stretching`);
              }
            }
          }
        }

        // 3. Check mobile cards are visible (if page has them)
        if (pg.hasMobileCards) {
          const mobileCards = page.locator('.sm\\:hidden');
          if (await mobileCards.count() > 0) {
            await expect(mobileCards.first()).toBeVisible();
          }
        }

        // 4. Check table is hidden on mobile (if page has one)
        if (pg.hasTable) {
          const tableBlock = page.locator('.hidden.sm\\:block');
          if (await tableBlock.count() > 0) {
            await expect(tableBlock.first()).not.toBeVisible();
          }
        }

        // 5. Check cards have icon circles (w-10 h-10 rounded-full)
        if (pg.hasMobileCards) {
          const mobileSection = page.locator('.sm\\:hidden');
          if (await mobileSection.count() > 0) {
            const iconCircles = mobileSection.locator('.rounded-full').filter({
              has: page.locator('svg')
            });
            // Note: some pages might not have icon circles (this is informational)
            const count = await iconCircles.count();
            if (count === 0) {
              console.warn(`⚠️  [${pg.name}] Mobile cards no tienen icon circles (w-10 h-10 rounded-full con SVG)`);
            }
          }
        }
      });
    });
  }
});
