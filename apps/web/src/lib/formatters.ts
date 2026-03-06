/**
 * Tenant-aware formatting utilities for dates, currencies, and numbers.
 * Uses the tenant's configured timezone, currency, and language from CompanySetting.
 */

interface FormatSettings {
  timezone?: string;
  language?: string;
  currency?: string;
}

function getLocale(settings: FormatSettings | null): string {
  const lang = settings?.language ?? 'es';
  switch (lang) {
    case 'en': return 'en-US';
    case 'pt': return 'pt-BR';
    default: return 'es-MX';
  }
}

/**
 * Format a date using the tenant's timezone and locale.
 */
export function formatDate(
  date: string | Date,
  settings: FormatSettings | null,
  options?: Intl.DateTimeFormatOptions
): string {
  const tz = settings?.timezone || 'America/Mexico_City';
  const locale = getLocale(settings);
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, { timeZone: tz, ...options });
}

/**
 * Format a currency amount using the tenant's currency and locale.
 */
export function formatCurrency(
  amount: number,
  settings: FormatSettings | null
): string {
  const currency = settings?.currency || 'MXN';
  const locale = getLocale(settings);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a number using the tenant's locale (thousand separators, decimal marks).
 */
export function formatNumber(
  value: number,
  settings: FormatSettings | null
): string {
  const locale = getLocale(settings);
  return value.toLocaleString(locale);
}
