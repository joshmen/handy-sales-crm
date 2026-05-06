import { useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import {
  formatDate,
  formatDateOnly,
  formatCurrency,
  formatNumber,
  tenantToday,
  tenantStartOfDayUtc,
  tenantStartOfWeek,
} from '@/lib/formatters';

/**
 * Hook that provides tenant-aware formatting functions.
 * Reads timezone, currency, and language from CompanyContext.
 */
export function useFormatters() {
  const { settings } = useCompany();

  const fmtDate = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDate(date, settings, options),
    [settings]
  );

  /** For date-only fields (route fecha, birthdate) — no timezone shift */
  const fmtDateOnly = useCallback(
    (date: string | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateOnly(date, settings, options),
    [settings]
  );

  const fmtCurrency = useCallback(
    (amount: number) => formatCurrency(amount, settings),
    [settings]
  );

  const fmtNumber = useCallback(
    (value: number) => formatNumber(value, settings),
    [settings]
  );

  /** YYYY-MM-DD del día calendario en TZ tenant. */
  const today = useCallback(() => tenantToday(settings), [settings]);

  /** Date (UTC instant) que representa la medianoche del día tenant. */
  const startOfDayUtc = useCallback(
    (day?: Date | string) => tenantStartOfDayUtc(day, settings),
    [settings]
  );

  /** YYYY-MM-DD del lunes que abre la semana del tenant. */
  const startOfWeek = useCallback(() => tenantStartOfWeek(settings), [settings]);

  return {
    formatDate: fmtDate,
    formatDateOnly: fmtDateOnly,
    formatCurrency: fmtCurrency,
    formatNumber: fmtNumber,
    tenantToday: today,
    tenantStartOfDayUtc: startOfDayUtc,
    tenantStartOfWeek: startOfWeek,
  };
}
