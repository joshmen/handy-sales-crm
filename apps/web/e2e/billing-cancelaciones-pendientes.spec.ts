import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

/**
 * Fase A — Cancelación bilateral (el tenant como RECEPTOR).
 *
 * El bloque "Solicitudes de cancelación" del dashboard de billing solo se renderiza
 * cuando el endpoint `GET /api/facturas/cancelaciones-pendientes` devuelve UUIDs.
 * Mockeamos esa ruta (y la de responder) para validar el wiring del UI sin depender
 * de un PAC real. La validación SOAP real se hace contra el sandbox de Finkok.
 */

const UUID_A = '11111111-2222-3333-4444-555555555555';
const UUID_B = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

test.use({ navigationTimeout: 60000, actionTimeout: 30000 });

test.describe('Billing — solicitudes de cancelación pendientes', () => {
  test('renderiza pendientes y permite aceptar', async ({ page }) => {
    await loginAsAdmin(page);

    // Mock: dos cancelaciones pendientes
    await page.route('**/api/facturas/cancelaciones-pendientes', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uuids: [UUID_A, UUID_B] }),
      }),
    );
    // Mock: responder (aceptar/rechazar) → éxito
    await page.route('**/api/facturas/cancelaciones/**/responder', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uuid: UUID_A, aceptado: true, estatus: '201' }),
      }),
    );

    await page.goto('/billing');
    await page.waitForLoadState('domcontentloaded');

    // El bloque aparece con el conteo y ambos UUID
    await expect(page.getByText(/Solicitudes de cancelación|Cancellation requests/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(UUID_A)).toBeVisible();
    await expect(page.getByText(UUID_B)).toBeVisible();

    // Aceptar el primero → modal de confirmación → confirmar
    await page.getByTestId(`accept-cancel-${UUID_A}`).click();
    await expect(page.getByText(/Aceptar cancelación|Accept cancellation/i)).toBeVisible();
    await page.getByTestId('confirm-responder').click();

    // El UUID aceptado desaparece de la lista; el otro permanece
    await expect(page.getByText(UUID_A)).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByText(UUID_B)).toBeVisible();
  });

  test('no muestra el bloque cuando no hay pendientes', async ({ page }) => {
    await loginAsAdmin(page);

    await page.route('**/api/facturas/cancelaciones-pendientes', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ uuids: [] }),
      }),
    );

    await page.goto('/billing');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);

    await expect(page.getByText(/Solicitudes de cancelación|Cancellation requests/i)).toHaveCount(0);
  });
});
