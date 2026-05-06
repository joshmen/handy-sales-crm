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

/**
 * Returns the current calendar date *in the tenant's timezone* as YYYY-MM-DD.
 * Antes muchos pages usaban `new Date()` (TZ del browser) lo que generaba
 * inconsistencias entre clientes en diferentes zonas vs el tenant configurado.
 */
export function tenantToday(settings: FormatSettings | null): string {
  const tz = settings?.timezone || 'America/Mexico_City';
  // sv-SE → ISO 8601 (YYYY-MM-DD HH:mm:ss). Tomamos la parte de fecha.
  const formatted = new Date().toLocaleString('sv-SE', { timeZone: tz });
  return formatted.split(' ')[0] ?? '';
}

/**
 * Returns the UTC instant corresponding to the start of a tenant calendar day.
 * Day param can be a Date or YYYY-MM-DD string. If undefined, uses tenant today.
 */
export function tenantStartOfDayUtc(
  day: Date | string | undefined,
  settings: FormatSettings | null
): Date {
  const tz = settings?.timezone || 'America/Mexico_City';
  const dayStr = typeof day === 'string'
    ? day
    : day
      ? day.toLocaleString('sv-SE', { timeZone: tz }).split(' ')[0]
      : tenantToday(settings);

  // Estrategia: construye una fecha "en la TZ del tenant a las 00:00" usando
  // un offset calculado para esa fecha (DST-aware). `Intl.DateTimeFormat` con
  // `timeZoneName: 'shortOffset'` da el offset GMT±HH:MM exacto.
  const probe = new Date(`${dayStr}T00:00:00Z`);
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
  });
  const parts = dtf.formatToParts(probe);
  const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+0';
  // shortOffset format: "GMT-7" or "GMT-07:00" or "GMT"
  const m = offsetPart.match(/GMT(?:([+-])(\d{1,2})(?::?(\d{2}))?)?/);
  let offsetMinutes = 0;
  if (m && m[1]) {
    const sign = m[1] === '-' ? -1 : 1;
    const hh = parseInt(m[2] ?? '0', 10);
    const mm = parseInt(m[3] ?? '0', 10);
    offsetMinutes = sign * (hh * 60 + mm);
  }
  // local 00:00 in tenant TZ → UTC = local - offsetMinutes
  return new Date(probe.getTime() - offsetMinutes * 60_000);
}

/**
 * Returns YYYY-MM-DD for the Monday-aligned start of the tenant's current week.
 * Lunes como inicio de semana (es-MX/MX común). Cambiar a domingo = día 0
 * si tu app usa esa convención.
 */
export function tenantStartOfWeek(settings: FormatSettings | null): string {
  const today = tenantToday(settings);
  const [y, m, d] = today.split('-').map(Number);
  if (!y || !m || !d) return today;
  const noon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // 0 = Sunday … 6 = Saturday → lunes-aligned: (dow + 6) % 7
  const dow = noon.getUTCDay();
  const diff = (dow + 6) % 7;
  noon.setUTCDate(noon.getUTCDate() - diff);
  return noon.toISOString().slice(0, 10);
}
