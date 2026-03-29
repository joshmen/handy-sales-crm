import { useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { formatDate, formatDateOnly, formatCurrency, formatNumber } from '@/lib/formatters';

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

  return {
    formatDate: fmtDate,
    formatDateOnly: fmtDateOnly,
    formatCurrency: fmtCurrency,
    formatNumber: fmtNumber,
  };
}
