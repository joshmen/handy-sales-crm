import { test, expect, Page } from '@playwright/test';
import { loginAsAdmin, loginAsSuperAdmin, getTestEmails } from './helpers/auth';

/**
 * Subscription + Tenant Deactivation E2E Tests
 *
 * Tests:
 * - SUB-1: Subscription plans API returns correct data
 * - SUB-2: Current subscription API returns tenant status
 * - SUB-3: Subscription page renders with real plan data
 * - SUB-4: Subscription expired page renders and shows plans
 * - SUB-5: Tenant-suspended page renders correctly
 * - SEC-T1: Deactivated tenant blocks login
 * - SEC-T2: Active session gets 403 after tenant deactivation
 * - SEC-T3: Login returns TENANT_DEACTIVATED code
 */

const API_BASE = 'http://localhost:1050';

test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

async function getBackendToken(page: Page, email: string, password: string): Promise<string> {
  const res = await page.request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  const data = await res.json();
  return data.token;
}

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(1000);
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner
      .first()
      .waitFor({ state: 'hidden', timeout: 15000 })
      .catch(() => {});
  }
  await page.waitForTimeout(2000);
}

// ─── SUB-1: Subscription Plans API ─────────────────────────────

test.describe('SUB-1: Subscription Plans API', () => {
  test('GET /api/subscription/plans returns 3 plans', async ({ page }) => {
    const token = await getBackendToken(page, getTestEmails().admin, 'test123');

    const res = await page.request.get(`${API_BASE}/api/subscription/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const plans = await res.json();
    expect(plans).toHaveLength(3);

    // Verify plan structure
    const codes = plans.map((p: { codigo: string }) => p.codigo);
    expect(codes).toContain('FREE');
    expect(codes).toContain('BASIC');
    expect(codes).toContain('PRO');

    // Verify pricing
    const free = plans.find((p: { codigo: string }) => p.codigo === 'FREE');
    expect(free.precioMensual).toBe(0);
    expect(free.maxUsuarios).toBe(2);

    const basic = plans.find((p: { codigo: string }) => p.codigo === 'BASIC');
    expect(basic.precioMensual).toBe(499);
    expect(basic.maxUsuarios).toBe(5);

    const pro = plans.find((p: { codigo: string }) => p.codigo === 'PRO');
    expect(pro.precioMensual).toBe(999);
    expect(pro.maxUsuarios).toBe(20);
    expect(pro.incluyeReportes).toBe(true);
    expect(pro.incluyeSoportePrioritario).toBe(true);
  });

  test('Plans are sorted by orden', async ({ page }) => {
    const token = await getBackendToken(page, getTestEmails().admin, 'test123');

    const res = await page.request.get(`${API_BASE}/api/subscription/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const plans = await res.json();
    for (let i = 1; i < plans.length; i++) {
      expect(plans[i].orden).toBeGreaterThan(plans[i - 1].orden);
    }
  });
});

// ─── SUB-2: Current Subscription API ───────────────────────────

test.describe('SUB-2: Current Subscription API', () => {
  test('GET /api/subscription/current returns tenant status', async ({ page }) => {
    const token = await getBackendToken(page, getTestEmails().admin, 'test123');

    const res = await page.request.get(`${API_BASE}/api/subscription/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status()).toBe(200);
    const sub = await res.json();

    // Verify required fields exist
    expect(sub).toHaveProperty('planTipo');
    expect(sub).toHaveProperty('subscriptionStatus');
    expect(sub).toHaveProperty('maxUsuarios');
    expect(sub).toHaveProperty('activeUsuarios');
    expect(sub).toHaveProperty('hasStripe');
    expect(sub).toHaveProperty('nombreEmpresa');

    // Verify values
    expect(sub.subscriptionStatus).toBe('Active');
    expect(sub.nombreEmpresa).toContain('Jeyma');
    expect(sub.activeUsuarios).toBeGreaterThan(0);
    expect(sub.maxUsuarios).toBeGreaterThan(0);
  });

  test('Requires authentication', async ({ page }) => {
    const res = await page.request.get(`${API_BASE}/api/subscription/current`);
    expect(res.status()).toBe(401);
  });
});

// ─── SUB-3: Subscription Page ──────────────────────────────────

test.describe('SUB-3: Subscription Page', () => {
  test('Subscription page loads and shows plan cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/subscription');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';

    // Should show plan names from API
    expect(pageContent).toContain('Gratis');
    expect(pageContent).toContain('Profesional');

    // Should show current subscription status
    const hasStatus =
      pageContent.includes('Activa') ||
      pageContent.includes('Active') ||
      pageContent.includes('Plan actual');
    expect(hasStatus).toBeTruthy();
  });

  test('Subscription page shows pricing', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/subscription');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';

    // Should show MXN pricing
    const hasPricing =
      pageContent.includes('$499') ||
      pageContent.includes('$999') ||
      pageContent.includes('MXN');
    expect(hasPricing).toBeTruthy();
  });

  test('Subscription page has monthly/annual toggle', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/subscription');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';
    const hasToggle =
      pageContent.includes('Mensual') || pageContent.includes('Anual');
    expect(hasToggle).toBeTruthy();
  });
});

// ─── SUB-4: Subscription Expired Page ──────────────────────────

test.describe('SUB-4: Subscription Expired Page', () => {
  test('Expired page renders with plan options', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/subscription/expired');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';

    // Alert banner
    expect(pageContent).toContain('suscripción ha expirado');

    // Should show plans from API (not hardcoded)
    expect(pageContent).toContain('Activar Plan');

    // Contact section
    expect(pageContent).toContain('ayuda para renovar');

    // Logout button
    const logoutBtn = page.getByRole('button', { name: /cerrar sesión/i });
    await expect(logoutBtn).toBeVisible({ timeout: 10000 });
  });
});

// ─── SUB-5: Tenant Suspended Page ──────────────────────────────

test.describe('SUB-5: Tenant Suspended Page', () => {
  test('Tenant-suspended page renders correctly', async ({ page }) => {
    await page.goto('/tenant-suspended');
    await waitForPageLoad(page);

    const pageContent = (await page.textContent('body')) || '';

    // Brand
    expect(pageContent).toContain('Handy Suites');

    // Message
    expect(pageContent).toContain('Cuenta Desactivada');
    expect(pageContent).toContain('desactivada');

    // Contact info
    expect(pageContent).toContain('soporte@handysuites.com');

    // Back to login button
    const loginBtn = page.getByRole('button', {
      name: /volver al inicio de sesión/i,
    });
    await expect(loginBtn).toBeVisible({ timeout: 10000 });
  });

  test('Back to login button navigates to /login', async ({ page }) => {
    await page.goto('/tenant-suspended');
    await waitForPageLoad(page);

    const loginBtn = page.getByRole('button', {
      name: /volver al inicio de sesión/i,
    });
    await loginBtn.click();

    await expect(page).toHaveURL(/login/, { timeout: 15000 });
  });
});

// ─── SEC-T1: Deactivated Tenant Blocks Login ───────────────────

test.describe('SEC-T1: Tenant Deactivation Security', () => {
  // Use tenant 4 (Huichol) for deactivation tests to avoid breaking other tests
  const TEST_TENANT_ID = 4;
  const TEST_USER_EMAIL = 'admin@huichol.com';
  const TEST_PASSWORD = 'test123';

  test('Deactivated tenant blocks backend login', async ({ page }) => {
    // Step 1: Get SuperAdmin token
    const saToken = await getBackendToken(
      page,
      getTestEmails().superAdmin,
      'test123'
    );

    // Step 2: Deactivate the test tenant
    const deactivateRes = await page.request.patch(
      `${API_BASE}/api/tenants/${TEST_TENANT_ID}/activo`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { activo: false },
      }
    );
    expect(deactivateRes.status()).toBe(200);

    // Step 3: Try to login with a user from the deactivated tenant
    const loginRes = await page.request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USER_EMAIL, password: TEST_PASSWORD },
    });

    const loginData = await loginRes.json();

    // Should return TENANT_DEACTIVATED code (not a valid token)
    expect(loginData.code).toBe('TENANT_DEACTIVATED');
    expect(loginData).not.toHaveProperty('token');

    // Step 4: CLEANUP — Reactivate the tenant
    const reactivateRes = await page.request.patch(
      `${API_BASE}/api/tenants/${TEST_TENANT_ID}/activo`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { activo: true },
      }
    );
    expect(reactivateRes.status()).toBe(200);
  });

  test('Reactivated tenant allows login again', async ({ page }) => {
    // Verify tenant is active (from cleanup above)
    const loginRes = await page.request.post(`${API_BASE}/auth/login`, {
      data: { email: TEST_USER_EMAIL, password: TEST_PASSWORD },
    });

    const loginData = await loginRes.json();
    expect(loginData).toHaveProperty('token');
    expect(loginData.token).toBeTruthy();
    expect(loginData.user.email).toBe(TEST_USER_EMAIL);
  });
});

// ─── SEC-T2: Active Session Blocked After Deactivation ─────────

test.describe('SEC-T2: Session Invalidation on Deactivation', () => {
  const TEST_TENANT_ID = 4;
  const TEST_USER_EMAIL = 'admin@huichol.com';
  const TEST_PASSWORD = 'test123';

  test('Existing token returns 403 after tenant deactivation', async ({
    page,
  }) => {
    // Step 1: Login as the test user FIRST (get a valid token)
    const userToken = await getBackendToken(
      page,
      TEST_USER_EMAIL,
      TEST_PASSWORD
    );

    // Verify the token works
    const beforeRes = await page.request.get(
      `${API_BASE}/api/subscription/current`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    expect(beforeRes.status()).toBe(200);

    // Step 2: SuperAdmin deactivates the tenant
    const saToken = await getBackendToken(
      page,
      getTestEmails().superAdmin,
      'test123'
    );

    await page.request.patch(
      `${API_BASE}/api/tenants/${TEST_TENANT_ID}/activo`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { activo: false },
      }
    );

    // Step 3: The old user token should now be rejected
    // SessionValidationMiddleware checks session_version (bumped on deactivation)
    const afterRes = await page.request.get(
      `${API_BASE}/api/subscription/current`,
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );

    // Should get 401 (session_version mismatch) or 403 (tenant deactivated)
    expect([401, 403]).toContain(afterRes.status());

    // Step 4: CLEANUP — Reactivate the tenant
    await page.request.patch(
      `${API_BASE}/api/tenants/${TEST_TENANT_ID}/activo`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { activo: true },
      }
    );
  });
});

// ─── SEC-T3: Frontend Login Handles TENANT_DEACTIVATED ─────────

test.describe('SEC-T3: Frontend Login Error Handling', () => {
  const TEST_TENANT_ID = 4;
  const TEST_USER_EMAIL = 'admin@huichol.com';
  const TEST_PASSWORD = 'test123';

  test('Login page shows error toast for deactivated tenant', async ({
    page,
  }) => {
    // Step 1: SuperAdmin deactivates the tenant
    const saToken = await getBackendToken(
      page,
      getTestEmails().superAdmin,
      'test123'
    );

    await page.request.patch(
      `${API_BASE}/api/tenants/${TEST_TENANT_ID}/activo`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { activo: false },
      }
    );

    // Step 2: Try to login via the UI
    await page.goto('/login');
    await page.waitForTimeout(1000);

    // Dismiss any Next.js overlay
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);

    // Fill login form
    await page.locator('#email').fill(TEST_USER_EMAIL);
    await page.locator('#password').fill(TEST_PASSWORD);

    // Submit
    await page
      .getByRole('button', { name: /iniciar sesión/i })
      .click({ force: true });

    // Wait for response
    await page.waitForTimeout(3000);

    // Should show error (toast or inline message about deactivated account)
    const pageContent = (await page.textContent('body')) || '';
    const hasDeactivatedMessage =
      pageContent.includes('desactivada') ||
      pageContent.includes('Cuenta desactivada') ||
      pageContent.includes('TENANT_DEACTIVATED');
    expect(hasDeactivatedMessage).toBeTruthy();

    // Should NOT have navigated to dashboard
    expect(page.url()).not.toContain('/dashboard');

    // Step 3: CLEANUP — Reactivate the tenant
    await page.request.patch(
      `${API_BASE}/api/tenants/${TEST_TENANT_ID}/activo`,
      {
        headers: { Authorization: `Bearer ${saToken}` },
        data: { activo: true },
      }
    );
  });
});

// ─── SUB-6: Checkout/Portal Require Admin ──────────────────────

test.describe('SUB-6: Subscription Endpoint Access Control', () => {
  test('Checkout endpoint requires admin role', async ({ page }) => {
    // Login as vendedor (non-admin)
    const vendedorToken = await getBackendToken(
      page,
      getTestEmails().vendedor,
      'test123'
    );

    const res = await page.request.post(
      `${API_BASE}/api/subscription/checkout`,
      {
        headers: { Authorization: `Bearer ${vendedorToken}` },
        data: {
          planCode: 'PRO',
          interval: 'month',
          successUrl: 'http://localhost:1083/subscription?success=true',
          cancelUrl: 'http://localhost:1083/subscription',
        },
      }
    );

    // Should be forbidden for non-admin
    expect(res.status()).toBe(403);
  });

  test('Cancel endpoint requires admin role', async ({ page }) => {
    const vendedorToken = await getBackendToken(
      page,
      getTestEmails().vendedor,
      'test123'
    );

    const res = await page.request.post(
      `${API_BASE}/api/subscription/cancel`,
      {
        headers: { Authorization: `Bearer ${vendedorToken}` },
      }
    );

    expect(res.status()).toBe(403);
  });

  test('Portal endpoint requires admin role', async ({ page }) => {
    const vendedorToken = await getBackendToken(
      page,
      getTestEmails().vendedor,
      'test123'
    );

    const res = await page.request.post(
      `${API_BASE}/api/subscription/portal`,
      {
        headers: { Authorization: `Bearer ${vendedorToken}` },
        data: { returnUrl: 'http://localhost:1083/subscription' },
      }
    );

    expect(res.status()).toBe(403);
  });
});
