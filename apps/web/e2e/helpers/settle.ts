import { Page } from '@playwright/test';

/**
 * Helpers de espera DETERMINISTA para reemplazar `page.waitForTimeout(N)` fijos
 * (fuente de flakiness — fallan bajo carga, desperdician tiempo sin carga).
 *
 * Filosofia:
 * - NO usar `waitForLoadState('networkidle')` como settle general: la app abre
 *   un WebSocket SignalR (auto-reconnect) que mantiene la red "activa", asi que
 *   networkidle casi nunca dispara y colgaria hasta el timeout.
 * - La senal determinista de "pagina lista" es el spinner global `.animate-spin`
 *   desapareciendo. Para esperar datos concretos, usar en el spec
 *   `expect(locator).toBeVisible()` (categoria a) o `page.waitForResponse()`
 *   (categoria c) directamente — son mas precisos que cualquier settle.
 */

/**
 * Espera a que el spinner global (`.animate-spin`) desaparezca. No-op si no hay
 * spinner (la pagina ya estaba lista). Reemplaza el waitForTimeout usado para
 * "esperar a que termine de cargar".
 */
export async function waitForSpinnerGone(page: Page, timeout = 15000): Promise<void> {
  const spinner = page.locator('.animate-spin');
  if ((await spinner.count()) > 0) {
    await spinner.first().waitFor({ state: 'hidden', timeout }).catch(() => { /* ya oculto */ });
  }
}

/**
 * Settle de pagina: DOM cargado + spinner global desaparecido. Reemplazo del
 * patron `waitForPageLoad()` / `settle()` inline repetido en varios specs (que
 * mezclaba waitForTimeout fijos con la espera del spinner).
 */
export async function settle(page: Page, timeout = 15000): Promise<void> {
  await page.waitForLoadState('domcontentloaded').catch(() => { /* ya cargado */ });
  await waitForSpinnerGone(page, timeout);
}

/**
 * Espera a que un drawer/modal (Radix `[role="dialog"]`) termine de cerrarse.
 * Reemplaza el waitForTimeout tras cerrar/cancelar un drawer.
 */
export async function waitForDrawerClosed(page: Page, timeout = 8000): Promise<void> {
  await page
    .locator('[role="dialog"]')
    .first()
    .waitFor({ state: 'hidden', timeout })
    .catch(() => { /* ya cerrado */ });
}
