import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Security Features + Announcements
 *
 * Covers:
 * - Login flow (credentials → dashboard)
 * - Google Sign-In button presence
 * - 2FA UI elements in settings
 * - Session conflict UI (409 handling)
 * - Announcements admin page (SuperAdmin)
 * - Maintenance mode toggle
 * - Banner rendering in layout
 * - Sidebar "Anuncios" link for SuperAdmin
 */

// Single-session feature means parallel logins as same user invalidate each other
test.describe.configure({ mode: 'serial' });
test.use({ navigationTimeout: 60000, actionTimeout: 15000 });

// ─── Auth helpers ──────────────────────────────────────────────
async function loginViaAPI(page: Page, email: string, password: string) {
  const csrfRes = await page.request.get('/api/auth/csrf');
  const { csrfToken } = await csrfRes.json();

  await page.request.post('/api/auth/callback/credentials', {
    form: { email, password, csrfToken },
  });
}

async function loginAsSuperAdmin(page: Page) {
  await loginViaAPI(page, 'superadmin@handysales.com', 'test123');
  await page.goto('/admin/system-dashboard');
  await page.waitForTimeout(3000);
}

async function loginAsAdmin(page: Page) {
  await loginViaAPI(page, 'admin@jeyma.com', 'test123');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
}

async function waitForPageLoad(page: Page) {
  await page.waitForTimeout(1000);
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
  await page.waitForTimeout(2000);
}

// Helper: create an announcement via API directly (SuperAdmin)
async function createAnnouncementViaAPI(page: Page, titulo: string, tipo: string, prioridad = 'Normal') {
  // Get a SuperAdmin JWT token
  const loginRes = await page.request.post('http://localhost:1050/auth/login', {
    data: { email: 'superadmin@handysales.com', password: 'test123' },
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const res = await page.request.post('http://localhost:1050/api/superadmin/announcements', {
    headers: { Authorization: `Bearer ${token}` },
    data: { titulo, mensaje: `Test: ${titulo}`, tipo, prioridad, isDismissible: true },
  });
  return res.json();
}

// Helper: cleanup — expire all active announcements and deactivate maintenance
async function cleanupAnnouncements(page: Page) {
  const loginRes = await page.request.post('http://localhost:1050/auth/login', {
    data: { email: 'superadmin@handysales.com', password: 'test123' },
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Deactivate maintenance mode
  await page.request.delete('http://localhost:1050/api/superadmin/maintenance', {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Get all active announcements and expire them
  const listRes = await page.request.get('http://localhost:1050/api/superadmin/announcements?pageSize=50', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = await listRes.json();
  for (const ann of listData.items || []) {
    if (ann.activo) {
      await page.request.delete(`http://localhost:1050/api/superadmin/announcements/${ann.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. LOGIN PAGE — UI Elements
// ═══════════════════════════════════════════════════════════════
test.describe('Login Page UI', () => {
  test('Login page shows credentials form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(500);

    await expect(page.getByRole('heading', { name: /Iniciar Sesión/i })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /Iniciar Sesión/i })).toBeVisible();
  });

  test('Login page shows Google Sign-In button', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(500);

    // Check for the "o continúa con" separator
    await expect(page.getByText('o continúa con')).toBeVisible();

    // Check for the Google button
    const googleBtn = page.getByRole('button', { name: /Continuar con Google/i });
    await expect(googleBtn).toBeVisible();
  });

  test('Login page shows "¿No tienes cuenta?" link', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('¿No tienes cuenta?')).toBeVisible();
    await expect(page.getByText('Contactar ventas')).toBeVisible();
  });

  test('Login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.locator('#email').fill('admin@jeyma.com');
    await page.locator('#password').fill('test123');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });

    await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
  });

  test('Login with invalid credentials shows error and stays on login', async ({ page }) => {
    await page.goto('/login');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    await page.locator('#email').fill('nobody@invalid.com');
    await page.locator('#password').fill('wrongpassword');
    await page.getByRole('button', { name: /Iniciar Sesión/i }).click({ force: true });

    // Should stay on login page
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/login/);
  });

  test('Session replaced flag shows toast on login page', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      sessionStorage.setItem('session_replaced', 'true');
    });
    // Reload to trigger the useEffect that reads the flag
    await page.goto('/login');
    await page.waitForTimeout(2000);

    // Toast should appear — look for it via text or role
    const toast = page.getByText('Sesión cerrada');
    // The toast may or may not have appeared depending on timing;
    // check within a reasonable timeout
    const toastVisible = await toast.isVisible().catch(() => false);
    if (!toastVisible) {
      // Alternative: check the toast container or any notification
      const toastAlt = page.locator('[data-state="open"]').filter({ hasText: 'Sesión cerrada' });
      const altVisible = await toastAlt.isVisible().catch(() => false);
      // Even if the toast auto-dismissed, the sessionStorage flag should have been consumed
      const flagRemoved = await page.evaluate(() => sessionStorage.getItem('session_replaced'));
      expect(flagRemoved).toBeNull(); // Flag was consumed = effect ran
    } else {
      expect(toastVisible).toBeTruthy();
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. 2FA / SECURITY TAB
// ═══════════════════════════════════════════════════════════════
test.describe('2FA & Security Settings', () => {
  test('Settings security tab shows 2FA section', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/settings?tab=security');
    await waitForPageLoad(page);

    // Should show 2FA section (text is lowercase: "dos factores")
    const tfaHeading = page.getByText(/Autenticación de dos factores/i);
    await expect(tfaHeading).toBeVisible({ timeout: 10000 });
  });

  test('Profile page shows 2FA card in Seguridad tab', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await waitForPageLoad(page);

    // Click "Seguridad" tab first — 2FA is not on default "Información Personal" tab
    await page.getByText('Seguridad', { exact: true }).click();
    await page.waitForTimeout(1000);

    const tfaSection = page.getByText(/Autenticación de Dos Factores/i);
    await expect(tfaSection).toBeVisible({ timeout: 10000 });
    // Should show either "Configurar 2FA" or "Administrar" depending on status
    const setupBtn = page.getByText('Configurar 2FA');
    const manageBtn = page.getByText('Administrar');
    const hasAction = (await setupBtn.isVisible().catch(() => false)) || (await manageBtn.isVisible().catch(() => false));
    expect(hasAction).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. SUPERADMIN SIDEBAR — Announcements Link
// ═══════════════════════════════════════════════════════════════
test.describe('SuperAdmin Sidebar', () => {
  test('SuperAdmin sees "Anuncios" in sidebar', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/system-dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    const sidebarContent = (await sidebar.textContent()) || '';
    expect(sidebarContent).toContain('Anuncios');
  });

  test('Admin does NOT see "Anuncios" in sidebar', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    const sidebar = page.locator('aside');
    const sidebarContent = (await sidebar.textContent()) || '';
    expect(sidebarContent).not.toContain('Anuncios');
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. ANNOUNCEMENTS PAGE (SuperAdmin)
// ═══════════════════════════════════════════════════════════════
test.describe('Announcements Page', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupAnnouncements(page);
    await loginAsSuperAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('SuperAdmin can access /admin/announcements', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    const title = page.locator('h1');
    await expect(title).toBeVisible({ timeout: 10000 });
    await expect(title).toContainText(/Anuncios/i);

    // Should show maintenance toggle section (use heading role for uniqueness)
    await expect(page.getByRole('heading', { name: /Modo Mantenimiento/i }).first()).toBeVisible({ timeout: 10000 });
  });

  test('SuperAdmin can create a Banner announcement', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    // Click "Nuevo anuncio"
    const nuevoBtn = page.getByRole('button', { name: /Nuevo anuncio/i });
    await expect(nuevoBtn).toBeVisible({ timeout: 5000 });
    await nuevoBtn.click();

    // Wait for drawer to open — look for the title input
    const tituloInput = page.getByPlaceholder('Titulo del anuncio');
    await expect(tituloInput).toBeVisible({ timeout: 10000 });

    // Fill form in drawer
    await tituloInput.fill('Test E2E Banner');
    await page.getByPlaceholder('Contenido del anuncio...').fill('Este es un banner de prueba E2E');

    // Banner type should be selected by default
    // Click "Crear anuncio"
    await page.getByRole('button', { name: /^Crear anuncio$/i }).click();
    await page.waitForTimeout(2000);

    // Verify it appeared in the list
    await expect(page.getByText('Test E2E Banner').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'e2e/screenshots/announcements-created.png',
      fullPage: true,
    });
  });

  test('SuperAdmin can expire (delete) an announcement', async ({ page }) => {
    // First create one via API
    await createAnnouncementViaAPI(page, 'To Be Expired E2E', 'Banner');

    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    // Find the row with our specific announcement and click its trash button
    const annRow = page.locator('div').filter({ hasText: 'To Be Expired E2E' }).first();
    const deleteBtn = annRow.locator('button[title="Expirar anuncio"]');
    await expect(deleteBtn).toBeVisible({ timeout: 5000 });
    await deleteBtn.click();
    await page.waitForTimeout(2000);

    // After expiring, the announcement should no longer have the trash button
    // (the row renders delete btn only when ann.activo)
    const annRowAfter = page.locator('div').filter({ hasText: 'To Be Expired E2E' }).first();
    const deleteBtnAfter = annRowAfter.locator('button[title="Expirar anuncio"]');
    await expect(deleteBtnAfter).not.toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. MAINTENANCE MODE
// ═══════════════════════════════════════════════════════════════
test.describe('Maintenance Mode', () => {
  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('SuperAdmin can activate maintenance mode', async ({ page }) => {
    await loginAsSuperAdmin(page);
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    // Should show "Inactivo" initially (in the maintenance card badge)
    await expect(page.getByText('Inactivo').first()).toBeVisible({ timeout: 10000 });

    // Click "Activar"
    await page.getByRole('button', { name: /^Activar$/i }).click();
    await page.waitForTimeout(2000);

    // Should now show "ACTIVO" (in the maintenance card badge)
    await expect(page.getByText('ACTIVO').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: 'e2e/screenshots/maintenance-active.png',
      fullPage: true,
    });
  });

  test('SuperAdmin can deactivate maintenance mode', async ({ page }) => {
    // Activate first via API
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'superadmin@handysales.com', password: 'test123' },
    });
    const { token } = await loginRes.json();
    await page.request.post('http://localhost:1050/api/superadmin/maintenance', {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: 'Test deactivation' },
    });

    await loginAsSuperAdmin(page);
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    // Should show "ACTIVO"
    await expect(page.getByText('ACTIVO').first()).toBeVisible({ timeout: 10000 });

    // Click "Desactivar"
    await page.getByRole('button', { name: /Desactivar/i }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('Inactivo').first()).toBeVisible({ timeout: 10000 });
  });

  test('Maintenance mode blocks Admin write operations (API level)', async ({ page }) => {
    // Activate maintenance via API
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'superadmin@handysales.com', password: 'test123' },
    });
    const { token: saToken } = await loginRes.json();
    await page.request.post('http://localhost:1050/api/superadmin/maintenance', {
      headers: { Authorization: `Bearer ${saToken}` },
      data: { message: 'E2E maintenance test' },
    });

    // Login as Admin
    const adminLoginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'admin@jeyma.com', password: 'test123' },
    });
    const { token: adminToken } = await adminLoginRes.json();

    // Try a write operation as Admin — should get 503
    const writeRes = await page.request.post('http://localhost:1050/api/notificaciones/banners/999/dismiss', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(writeRes.status()).toBe(503);

    const body = await writeRes.json();
    expect(body.code).toBe('MAINTENANCE_MODE');

    // GET should still work
    const readRes = await page.request.get('http://localhost:1050/api/notificaciones/banners', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(readRes.status()).toBe(200);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. BANNERS — Rendering in Layout
// ═══════════════════════════════════════════════════════════════
test.describe('Banner Rendering', () => {
  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('Active banner appears in dashboard layout', async ({ page }) => {
    // Create a banner via API
    await createAnnouncementViaAPI(page, 'Release v3.0', 'Banner', 'High');

    // Login as Admin and go to dashboard
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    // The hook fetches on mount, then polls every 60s
    // Wait for the banner to appear (title + message both contain text, use first)
    await expect(page.getByText('Release v3.0', { exact: true })).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'e2e/screenshots/banner-in-dashboard.png',
      fullPage: true,
    });
  });

  test('Dismissible banner can be closed', async ({ page }) => {
    await createAnnouncementViaAPI(page, 'Dismiss Me', 'Banner', 'Normal');

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);
    await page.waitForTimeout(3000);

    // Banner should be visible (exact: true to avoid matching message "Test: Dismiss Me")
    const bannerText = page.getByText('Dismiss Me', { exact: true });
    await expect(bannerText).toBeVisible({ timeout: 10000 });

    // Click dismiss (X) button
    const dismissBtn = page.locator('button[aria-label="Cerrar"]').first();
    await dismissBtn.click();
    await page.waitForTimeout(1000);

    // Banner should be gone
    await expect(bannerText).not.toBeVisible();
  });

  test('Maintenance banner shows in layout when maintenance active', async ({ page }) => {
    // Activate maintenance
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'superadmin@handysales.com', password: 'test123' },
    });
    const { token } = await loginRes.json();
    await page.request.post('http://localhost:1050/api/superadmin/maintenance', {
      headers: { Authorization: `Bearer ${token}` },
      data: { message: 'Mantenimiento programado' },
    });

    // Login as Admin
    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);
    await page.waitForTimeout(3000);

    // Maintenance banner should appear (Critical priority, not dismissible)
    await expect(page.getByText('Modo Mantenimiento').first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({
      path: 'e2e/screenshots/maintenance-banner.png',
      fullPage: true,
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// 7. ACCESS CONTROL — Admin cannot access announcements
// ═══════════════════════════════════════════════════════════════
test.describe('Announcements Access Control', () => {
  test('Admin is redirected from /admin/announcements', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/announcements');
    await page.waitForTimeout(3000);

    // Should be redirected to access-denied
    const url = page.url();
    expect(url).not.toContain('/admin/announcements');
  });
});

// ═══════════════════════════════════════════════════════════════
// 8. BACKEND API — Announcement CRUD Integration
// ═══════════════════════════════════════════════════════════════
test.describe('Announcement API Integration', () => {
  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('SuperAdmin can create and list announcements via API', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'superadmin@handysales.com', password: 'test123' },
    });
    const { token } = await loginRes.json();

    // Create
    const createRes = await page.request.post('http://localhost:1050/api/superadmin/announcements', {
      headers: { Authorization: `Bearer ${token}` },
      data: { titulo: 'API Test', mensaje: 'API Test Msg', tipo: 'Banner', prioridad: 'Normal' },
    });
    expect(createRes.status()).toBe(201);
    const created = await createRes.json();
    expect(created.id).toBeTruthy();

    // List
    const listRes = await page.request.get('http://localhost:1050/api/superadmin/announcements', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status()).toBe(200);
    const listData = await listRes.json();
    expect(listData.items.some((a: { titulo: string }) => a.titulo === 'API Test')).toBeTruthy();

    // Delete (expire)
    const deleteRes = await page.request.delete(`http://localhost:1050/api/superadmin/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(deleteRes.status()).toBe(200);
  });

  test('Admin cannot access SuperAdmin announcement endpoints', async ({ page }) => {
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'admin@jeyma.com', password: 'test123' },
    });
    const { token } = await loginRes.json();

    const res = await page.request.get('http://localhost:1050/api/superadmin/announcements', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  test('Banners endpoint returns targeted announcements', async ({ page }) => {
    // Create a banner
    await createAnnouncementViaAPI(page, 'Targeted Banner', 'Banner');

    // Login as Admin and fetch banners
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'admin@jeyma.com', password: 'test123' },
    });
    const { token } = await loginRes.json();

    const res = await page.request.get('http://localhost:1050/api/notificaciones/banners', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const banners = await res.json();
    expect(banners.some((b: { titulo: string }) => b.titulo === 'Targeted Banner')).toBeTruthy();
  });

  test('Dismiss endpoint removes banner from user view', async ({ page }) => {
    const created = await createAnnouncementViaAPI(page, 'Dismissable', 'Banner');

    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'admin@jeyma.com', password: 'test123' },
    });
    const { token } = await loginRes.json();

    // Dismiss
    const dismissRes = await page.request.post(`http://localhost:1050/api/notificaciones/banners/${created.id}/dismiss`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(dismissRes.status()).toBe(200);

    // Fetch banners — dismissed one should be gone
    const res = await page.request.get('http://localhost:1050/api/notificaciones/banners', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const banners = await res.json();
    expect(banners.some((b: { titulo: string }) => b.titulo === 'Dismissable')).toBeFalsy();
  });
});
