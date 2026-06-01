/**
 * Retry helper con exponential backoff para fases del syncEngine.
 *
 * Reliability Sprint Fase 2 — antes el syncEngine no reintentaba ante 5xx ni
 * network timeouts. Throw bubbleaba a setState('error') y el vendedor tenia
 * que reiniciar la app o esperar al proximo trigger (debounce 2s + foreground
 * change). Con esto, una falla transitoria se recupera transparente sin
 * intervencion del usuario.
 */

import type { AxiosError } from 'axios';

export interface RetryConfig {
  /** Numero total de intentos incluyendo el primero. Default 3. */
  maxAttempts?: number;
  /** Backoff base en ms (2x cada intento). Default 2000ms. */
  baseDelayMs?: number;
  /** Cap del delay total. Default 30000ms. */
  maxDelayMs?: number;
}

/**
 * Determina si un error vale la pena reintentar.
 * - true: network errors (sin response), 5xx server, 408 timeout, 429 throttle.
 * - false: 4xx client errors (validation, auth, not found) — re-intentar no
 *   los va a arreglar; el row queda como pending hasta intervencion manual.
 */
export function isRetryableError(err: unknown): boolean {
  if (!err) return false;
  // Axios network error (sin response del server)
  const axErr = err as AxiosError & { isNetworkError?: boolean };
  if (axErr.isNetworkError === true || !axErr.response) {
    // Sin response = timeout, DNS, conexion abortada, etc.
    return true;
  }
  const status = axErr.response.status;
  if (status >= 500) return true;     // 5xx server fault
  if (status === 408) return true;    // request timeout
  if (status === 429) return true;    // rate limit (idealmente respetar Retry-After)
  return false;                        // 4xx client error: no vale la pena
}

export async function withRetry<T>(
  name: string,
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const maxAttempts = config.maxAttempts ?? 3;
  const baseDelayMs = config.baseDelayMs ?? 2000;
  const maxDelayMs = config.maxDelayMs ?? 30000;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = isRetryableError(err);
      if (!retryable || attempt === maxAttempts) {
        if (__DEV__ && attempt > 1) {
          console.warn(`[Sync.${name}] giving up after ${attempt} attempts:`, err);
        }
        throw err;
      }
      // Exponential backoff con jitter pequeño para evitar thundering herd
      const exp = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitter = Math.floor(exp * 0.1 * Math.random()); // 0-10% jitter
      const delay = exp + jitter;
      if (__DEV__) {
        console.warn(`[Sync.${name}] attempt ${attempt}/${maxAttempts} failed (retryable), waiting ${delay}ms`);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Unreachable but TS needs it
  throw lastError;
}
