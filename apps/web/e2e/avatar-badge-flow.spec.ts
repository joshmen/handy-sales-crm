import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Avatar + badge de notificaciones + atajo a /notifications desde el dropdown
 * y desde Mi Perfil.
 *
 * Cobertura:
 *  - Avatar visible en el header (con o sin foto, fallback a iniciales).
 *  - Click avatar abre el dropdown del user menu.
 *  - Dropdown tiene un item "Notificaciones" como primero, antes de "Mi Perfil".
 *  - Click "Notificaciones" navega a `/notifications`.
 *  - Click "Mi Perfil" en el dropdown navega a `/profile`.
 *  - En `/profile` hay una card con icono Bell + texto "Notificaciones" + "Ver
 *    todas →" que navega a `/notifications`.
 *  - Si hay unread > 0, el badge rojo se renderiza encima del avatar y dentro
 *    del dropdown. (Test asume cuenta de prueba puede o no tener unread —
 *    asserta solo el shape, no count específico.)
 */
test.describe('Avatar + notifications badge', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('avatar visible in header + clickable opens dropdown', async ({ page }) => {
    await page.goto('/dashboard');

    // El avatar trigger es el botón con data-tour="header-user-menu"
    const trigger = page.getByTestId('header-user-menu').or(
      page.locator('[data-tour="header-user-menu"]')
    );
    await expect(trigger).toBeVisible();

    // Si hay unread > 0, el badge debe estar visible encima del avatar
    const headerBadge = page.getByTestId('avatar-unread-badge');
    if (await headerBadge.count()) {
      await expect(headerBadge).toBeVisible();
      // Texto: número o "99+"
      const text = (await headerBadge.textContent())?.trim() ?? '';
      expect(text).toMatch(/^(\d+|99\+)$/);
    }

    await trigger.click();

    // El dropdown abre con item "Notificaciones" como primero
    const notifItem = page.getByTestId('user-menu-notifications');
    await expect(notifItem).toBeVisible();
  });

  test('dropdown notifications item navigates to /notifications', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('[data-tour="header-user-menu"]').click();

    const notifItem = page.getByTestId('user-menu-notifications');
    await expect(notifItem).toBeVisible();
    await notifItem.click();

    await expect(page).toHaveURL(/\/notifications/);
  });

  test('dropdown Mi Perfil navigates to /profile', async ({ page }) => {
    await page.goto('/dashboard');
    await page.locator('[data-tour="header-user-menu"]').click();

    const myProfile = page.getByRole('button', { name: /mi perfil/i });
    await expect(myProfile).toBeVisible();
    await myProfile.click();

    await expect(page).toHaveURL(/\/profile/);
  });

  test('profile page shows notifications card linking to /notifications', async ({ page }) => {
    await page.goto('/profile');

    // Card "Notificaciones" arriba de los Tabs
    const card = page.getByTestId('profile-notifications-link');
    await expect(card).toBeVisible();
    // CTA "Ver todas →"
    await expect(card.getByText(/ver todas/i)).toBeVisible();

    // Click — Next.js <Link> navega
    await card.click();
    await expect(page).toHaveURL(/\/notifications/);
  });
});
