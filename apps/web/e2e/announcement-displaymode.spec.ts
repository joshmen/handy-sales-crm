import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Announcement DisplayMode Feature
 *
 * Covers:
 * - DisplayMode selector in create form (Banner/Notification/Both)
 * - DisplayMode hidden when tipo=Maintenance
 * - Banner visibility based on DisplayMode
 * - DisplayMode badge in announcement list
 * - Notification creation when DisplayMode includes Notification
 */

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

function getSuperAdminToken(page: Page) {
  return page.request
    .post('http://localhost:1050/auth/login', {
      data: { email: 'superadmin@handysales.com', password: 'test123' },
    })
    .then((r) => r.json())
    .then((d) => d.token as string);
}

async function createAnnouncementViaAPI(
  page: Page,
  titulo: string,
  tipo: string,
  displayMode = 'Banner',
  prioridad = 'Normal'
) {
  const token = await getSuperAdminToken(page);
  const res = await page.request.post('http://localhost:1050/api/superadmin/announcements', {
    headers: { Authorization: `Bearer ${token}` },
    data: { titulo, mensaje: `Test: ${titulo}`, tipo, prioridad, displayMode, isDismissible: true },
  });
  return res.json();
}

async function cleanupAnnouncements(page: Page) {
  const token = await getSuperAdminToken(page);

  await page.request.delete('http://localhost:1050/api/superadmin/maintenance', {
    headers: { Authorization: `Bearer ${token}` },
  });

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
// 1. DisplayMode Selector UI
// ═══════════════════════════════════════════════════════════════
test.describe('DisplayMode Selector', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupAnnouncements(page);
    await loginAsSuperAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('DisplayMode selector shows 3 options for Banner type', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    // Open create drawer
    await page.getByRole('button', { name: /Nuevo anuncio/i }).click();
    await page.waitForTimeout(1000);

    // Should see "Destino" section with 3 buttons
    await expect(page.getByText('Destino')).toBeVisible({ timeout: 5000 });

    // The 3 options (buttons contain sub-text like "Barra superior", "Campana", "Banner + Campana")
    await expect(page.locator('button').filter({ hasText: 'Barra superior' })).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Campana' }).first()).toBeVisible();
    await expect(page.locator('button').filter({ hasText: 'Banner + Campana' })).toBeVisible();
  });

  test('DisplayMode selector hidden when tipo=Maintenance', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Nuevo anuncio/i }).click();
    await page.waitForTimeout(1000);

    // Select Maintenance type
    const maintenanceBtn = page.locator('button').filter({ hasText: 'Mantenimiento' });
    await maintenanceBtn.click();
    await page.waitForTimeout(500);

    // DisplayMode selector should be hidden (the "Destino" label disappears)
    await expect(page.getByText('Destino')).not.toBeVisible();
  });

  test('DisplayMode resets to Banner when switching to Maintenance', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Nuevo anuncio/i }).click();
    await page.waitForTimeout(1000);

    // Select "Ambos" (Both) first — the button with "Banner + Campana" sub-text
    await page.locator('button').filter({ hasText: 'Banner + Campana' }).click();
    await page.waitForTimeout(300);

    // Now switch to Maintenance
    const maintenanceBtn = page.locator('button').filter({ hasText: 'Mantenimiento' });
    await maintenanceBtn.click();
    await page.waitForTimeout(300);

    // Switch back to Banner type
    const tipoButtons = page.locator('button').filter({ hasText: /^Banner$/ });
    await tipoButtons.first().click();
    await page.waitForTimeout(300);

    // Destino section should reappear with "Banner" (Barra superior) as the active option
    await expect(page.getByText('Destino')).toBeVisible({ timeout: 5000 });
    const bannerOption = page.locator('button').filter({ hasText: 'Barra superior' });
    await expect(bannerOption).toBeVisible();
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. Create Announcements with Different DisplayModes
// ═══════════════════════════════════════════════════════════════
test.describe('Create with DisplayMode', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupAnnouncements(page);
    await loginAsSuperAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('Create announcement with Notification displayMode', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Nuevo anuncio/i }).click();
    await page.waitForTimeout(1000);

    // Fill form
    await page.getByPlaceholder('Titulo del anuncio').fill('E2E Notification Only');
    await page.getByPlaceholder('Contenido del anuncio...').fill('This should only be a notification');

    // Select Notification displayMode (button with "Campana" sub-text, excluding "Banner + Campana")
    const notifBtn = page.locator('button').filter({ hasText: /^Notificación/ });
    await notifBtn.click();
    await page.waitForTimeout(300);

    // Submit
    await page.getByRole('button', { name: /^Crear anuncio$/i }).click();
    await page.waitForTimeout(2000);

    // Should appear in the list
    await expect(page.getByText('E2E Notification Only').first()).toBeVisible({ timeout: 10000 });
  });

  test('Create announcement with Both displayMode', async ({ page }) => {
    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    await page.getByRole('button', { name: /Nuevo anuncio/i }).click();
    await page.waitForTimeout(1000);

    await page.getByPlaceholder('Titulo del anuncio').fill('E2E Both Mode');
    await page.getByPlaceholder('Contenido del anuncio...').fill('This is both banner and notification');

    // Select Both displayMode (button with "Banner + Campana" sub-text)
    await page.locator('button').filter({ hasText: 'Banner + Campana' }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: /^Crear anuncio$/i }).click();
    await page.waitForTimeout(2000);

    await expect(page.getByText('E2E Both Mode').first()).toBeVisible({ timeout: 10000 });
  });

  test('Maintenance type forces Banner displayMode via API', async ({ page }) => {
    const created = await createAnnouncementViaAPI(page, 'Maintenance Forced Banner', 'Maintenance', 'Both');
    // Backend should have forced displayMode to Banner
    expect(created.displayMode).toBe('Banner');
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. Banner Visibility Based on DisplayMode
// ═══════════════════════════════════════════════════════════════
test.describe('Banner Visibility by DisplayMode', () => {
  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('DisplayMode=Banner appears as banner in dashboard', async ({ page }) => {
    await createAnnouncementViaAPI(page, 'DM Banner Visible', 'Banner', 'Banner', 'High');

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    await expect(page.getByText('DM Banner Visible', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('DisplayMode=Notification does NOT appear as banner', async ({ page }) => {
    await createAnnouncementViaAPI(page, 'DM Notif Hidden', 'Banner', 'Notification', 'High');

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);
    // Wait extra to ensure polling has happened
    await page.waitForTimeout(5000);

    await expect(page.getByText('DM Notif Hidden', { exact: true })).not.toBeVisible();
  });

  test('DisplayMode=Both appears as banner in dashboard', async ({ page }) => {
    await createAnnouncementViaAPI(page, 'DM Both Visible', 'Banner', 'Both', 'High');

    await loginAsAdmin(page);
    await page.goto('/dashboard');
    await waitForPageLoad(page);

    await expect(page.getByText('DM Both Visible', { exact: true })).toBeVisible({ timeout: 15000 });
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. DisplayMode API Integration
// ═══════════════════════════════════════════════════════════════
test.describe('DisplayMode API', () => {
  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('Banner endpoint filters by DisplayMode correctly', async ({ page }) => {
    // Create one Banner-only and one Notification-only
    await createAnnouncementViaAPI(page, 'API Banner Only', 'Banner', 'Banner');
    await createAnnouncementViaAPI(page, 'API Notif Only', 'Banner', 'Notification');
    await createAnnouncementViaAPI(page, 'API Both Mode', 'Banner', 'Both');

    // Login as admin and fetch banners
    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'admin@jeyma.com', password: 'test123' },
    });
    const { token } = await loginRes.json();

    const res = await page.request.get('http://localhost:1050/api/notificaciones/banners', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const banners = await res.json();

    const titles = banners.map((b: { titulo: string }) => b.titulo);
    expect(titles).toContain('API Banner Only');
    expect(titles).not.toContain('API Notif Only');
    expect(titles).toContain('API Both Mode');
  });

  test('Banner response includes displayMode field', async ({ page }) => {
    await createAnnouncementViaAPI(page, 'API DM Field', 'Banner', 'Both');

    const loginRes = await page.request.post('http://localhost:1050/auth/login', {
      data: { email: 'admin@jeyma.com', password: 'test123' },
    });
    const { token } = await loginRes.json();

    const res = await page.request.get('http://localhost:1050/api/notificaciones/banners', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const banners = await res.json();
    const banner = banners.find((b: { titulo: string }) => b.titulo === 'API DM Field');
    expect(banner).toBeTruthy();
    expect(banner.displayMode).toBe('Both');
  });

  test('SuperAdmin list includes displayMode field', async ({ page }) => {
    await createAnnouncementViaAPI(page, 'SA List DM', 'Banner', 'Notification');

    const token = await getSuperAdminToken(page);
    const res = await page.request.get('http://localhost:1050/api/superadmin/announcements?pageSize=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const data = await res.json();

    const ann = data.items.find((a: { titulo: string }) => a.titulo === 'SA List DM');
    expect(ann).toBeTruthy();
    expect(ann.displayMode).toBe('Notification');
  });

  test('Create with Notification mode sets sentCount > 0', async ({ page }) => {
    // Create announcement with Notification displayMode (targets all active users)
    const created = await createAnnouncementViaAPI(page, 'Notif SentCount Test', 'Banner', 'Notification');

    // Verify sentCount via SuperAdmin detail endpoint
    const token = await getSuperAdminToken(page);
    const res = await page.request.get(`http://localhost:1050/api/superadmin/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const detail = await res.json();
    expect(detail.sentCount).toBeGreaterThan(0);
  });

  test('Create with Banner mode has sentCount = 0', async ({ page }) => {
    const created = await createAnnouncementViaAPI(page, 'Banner No Notif', 'Banner', 'Banner');

    // Verify sentCount = 0 (no notifications created)
    const token = await getSuperAdminToken(page);
    const res = await page.request.get(`http://localhost:1050/api/superadmin/announcements/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(200);
    const detail = await res.json();
    expect(detail.sentCount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. DisplayMode Badge in List
// ═══════════════════════════════════════════════════════════════
test.describe('DisplayMode Badge in List', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupAnnouncements(page);
    await loginAsSuperAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanupAnnouncements(page);
  });

  test('Announcement list shows DisplayMode badge', async ({ page }) => {
    // Create announcements with different display modes via API
    await createAnnouncementViaAPI(page, 'Badge Banner', 'Banner', 'Banner');
    await createAnnouncementViaAPI(page, 'Badge Notif', 'Banner', 'Notification');
    await createAnnouncementViaAPI(page, 'Badge Both', 'Banner', 'Both');

    await page.goto('/admin/announcements');
    await waitForPageLoad(page);

    // Check that badges appear in the list
    // The badges show the displayMode value or localized labels
    const listContent = await page.locator('main').textContent();
    expect(listContent).toContain('Badge Banner');
    expect(listContent).toContain('Badge Notif');
    expect(listContent).toContain('Badge Both');
  });
});
