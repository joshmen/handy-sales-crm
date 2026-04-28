/**
 * Formatters de bajo nivel. `tz`, `locale` y `currency` son opcionales:
 * cuando no se pasan, `Intl` usa los defaults del runtime (device locale/TZ).
 *
 * NO hardcodear fallbacks por país — la fuente de verdad es
 * `CompanySetting.Timezone/Currency/Language` del tenant, expuesta vía
 * `/api/mobile/empresa`. Los componentes deben usar `useTenantLocale()`
 * que conecta estos helpers con el query de empresa.
 */

export function formatCurrency(amount: number, currency?: string, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency ?? 'USD',  // solo si falta, para que Intl no explote
  }).format(amount);
}

export function formatDate(date: string | Date, tz?: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz,
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date, tz?: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(new Date(date));
}

export function formatTime(date: string | Date, tz?: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(new Date(date));
}

export function formatNumber(num: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(num);
}
