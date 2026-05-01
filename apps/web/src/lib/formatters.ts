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
  if (!date) return '';
  const tz = settings?.timezone || 'America/Mexico_City';
  const locale = getLocale(settings);
  // Defensa: backend a veces serializa DateTime sin sufijo 'Z' (Npgsql legacy
  // mode con Kind=Unspecified). new Date() los interpreta como local → la
  // conversión a TZ del tenant queda mal. Forzamos UTC si falta marker.
  const normalized = typeof date === 'string'
    && !/[Zz]$|[+-]\d{2}:?\d{2}$/.test(date)
    ? date + 'Z'
    : date;
  const d = typeof normalized === 'string' ? new Date(normalized) : normalized;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(locale, { timeZone: tz, ...options });
}

/**
 * Format a date-only field (no timezone conversion).
 * Use for fields like route fecha, birthdate, etc. where the date is the same
 * regardless of timezone. Extracts YYYY-MM-DD from the ISO string and formats it.
 */
export function formatDateOnly(
  date: string | Date,
  settings: FormatSettings | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return '';
  // Extract the date part from ISO string to avoid timezone shift
  const iso = typeof date === 'string' ? date : date.toISOString();
  const [datePart] = iso.split('T');
  if (!datePart) return '';
  // Parse as local date (noon to avoid edge cases)
  const [y, m, d] = datePart.split('-').map(Number);
  const local = new Date(y, m - 1, d, 12, 0, 0);
  if (isNaN(local.getTime())) return '';
  const locale = getLocale(settings);
  return local.toLocaleDateString(locale, options ?? { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Convert a date-only string (YYYY-MM-DD) to noon UTC for storage.
 * Prevents timezone shifts from changing the day.
 */
export function dateOnlyToUTC(dateStr: string): string {
  return `${dateStr}T12:00:00.000Z`;
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
  if (amount == null || isNaN(amount)) return '$0';
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
  if (value == null || isNaN(value)) return '0';
  const locale = getLocale(settings);
  return value.toLocaleString(locale);
}
