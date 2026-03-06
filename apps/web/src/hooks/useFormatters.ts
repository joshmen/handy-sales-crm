import { useCallback } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { formatDate, formatCurrency, formatNumber } from '@/lib/formatters';

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
    formatCurrency: fmtCurrency,
    formatNumber: fmtNumber,
  };
}
