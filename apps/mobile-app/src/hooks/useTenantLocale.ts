import { useMemo } from 'react';
import { useEmpresa } from './useEmpresa';
import {
  formatCurrency as fmtCurrency,
  formatDate as fmtDate,
  formatDateTime as fmtDateTime,
  formatTime as fmtTime,
  formatNumber as fmtNumber,
} from '@/utils/format';

/**
 * Formatters localizados al tenant (timezone + currency + language).
 *
 * Toda config viene de `CompanySetting` del tenant (tabla) expuesta via
 * `/api/mobile/empresa`. Nada hardcodeado — si el query aún no cargó, los
 * formatters pasan `undefined` a Intl (que usa el locale/TZ del runtime).
 * En cuanto carga, se re-renderizan con la config del tenant.
 *
 * Uso:
 *   const { time, date, money } = useTenantLocale();
 *   <Text>{time(parada.horaLlegada)}</Text>
 */
export function useTenantLocale() {
  const { data } = useEmpresa();

  return useMemo(() => {
    const tz = data?.timezone;
    const currency = data?.currency;
    const lang = data?.language;
    const locale = lang && data?.country ? `${lang}-${data.country}` : lang;

    return {
      tz,
      currency,
      locale,
      isReady: !!data,
      time:     (d: string | Date | number) => fmtTime(toDate(d), tz, locale),
      date:     (d: string | Date | number) => fmtDate(toDate(d), tz, locale),
      dateTime: (d: string | Date | number) => fmtDateTime(toDate(d), tz, locale),
      money:    (n: number) => fmtCurrency(n, currency, locale),
      number:   (n: number) => fmtNumber(n, locale),
    };
  }, [data]);
}

function toDate(d: string | Date | number): Date {
  if (d instanceof Date) return d;
  if (typeof d === 'number') return new Date(d);
  return new Date(d);
}
