/**
 * Helpers para aritmética de fechas con timezone explícito.
 *
 * Por qué: filtros tipo "Hoy/Esta semana/Este mes" calculados con
 * `new Date().setHours(0,0,0,0)` usan la TZ del DISPOSITIVO. Si el device
 * está en CDMX (UTC-6) pero el tenant opera en Mazatlán (UTC-7), el "hoy"
 * difiere 1 hora — registros entre 23:00 y 00:00 caen en día equivocado.
 * Esto se manifiesta visualmente en filtros que excluyen cobros/visitas
 * legítimos del día.
 *
 * Estos helpers usan Intl.DateTimeFormat con `timeZone` explícito para
 * calcular el offset correcto en cualquier instante (incluyendo DST).
 */

/**
 * Devuelve un `Date` que representa el inicio del día (00:00:00) en la TZ
 * dada, en términos del instante UTC equivalente. Usar como límite inferior
 * en filtros temporales: `cobro.createdAt >= startOfDayInTz(tenantTz)`.
 *
 * @example
 *   // tenantTz = "America/Mazatlan" (UTC-7), now = 2026-04-25 06:30 UTC
 *   // En Mazatlán son 23:30 del 24 abril → start of day = 2026-04-24 07:00 UTC
 *   startOfDayInTz("America/Mazatlan")
 */
export function startOfDayInTz(tz: string, ref: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(ref);
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value || 0);
  const Y = get('year');
  const M = get('month');
  const D = get('day');
  // Offset = diff entre instante real (ref.getTime()) y wall-clock-as-UTC.
  // Con ref dentro del mismo día tz, este offset es correcto incluso en
  // transiciones DST porque viene del Intl que las maneja correctamente.
  const wallClockH = get('hour');
  const wallClockMi = get('minute');
  const wallClockS = get('second');
  const wallClockAsUtc = Date.UTC(Y, M - 1, D, wallClockH, wallClockMi, wallClockS);
  const tzOffsetMs = ref.getTime() - wallClockAsUtc;
  // Inicio del día en wall-clock tz = (Y, M, D, 0, 0, 0) interpretado en tz
  const startWallClockAsUtc = Date.UTC(Y, M - 1, D, 0, 0, 0);
  return new Date(startWallClockAsUtc + tzOffsetMs);
}

/**
 * Inicio de la semana (lunes 00:00:00) en TZ dada. Lunes = primer día semana.
 */
export function startOfWeekInTz(tz: string, ref: Date = new Date()): Date {
  const todayStart = startOfDayInTz(tz, ref);
  // Calcular qué día de la semana es "todayStart" en la TZ
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  }).format(todayStart);
  const dayMap: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const offsetDays = dayMap[dayName] ?? 0;
  // Restar offsetDays * 24h del inicio del día de hoy (en ms UTC)
  return new Date(todayStart.getTime() - offsetDays * 24 * 60 * 60 * 1000);
}

/**
 * Inicio del mes (día 1, 00:00:00) en TZ dada.
 */
export function startOfMonthInTz(tz: string, ref: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(ref);
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value || 0);
  const Y = get('year');
  const M = get('month');
  // Construct a ref date que cae en el día 1 del mes en tz, luego startOfDayInTz
  // del primer día. Pero necesitamos referenciar a instante dentro del primer día tz —
  // truco: usar Date.UTC(Y, M-1, 1, 12, 0, 0) y aplicar startOfDayInTz desde ahí.
  const dayOneInTz = new Date(Date.UTC(Y, M - 1, 1, 12, 0, 0));
  return startOfDayInTz(tz, dayOneInTz);
}
