'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Helpers internos para DateFilter / DateRangeFilter.
 * Toda la aritmética de fechas opera sobre strings 'YYYY-MM-DD' usando
 * mediodía UTC como ancla — mismo patrón que el resto del app (formatters.ts)
 * para evitar drift por TZ del browser. El "hoy" tenant-aware lo inyecta el
 * componente vía useFormatters().tenantToday().
 */

export function parseIso(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = (iso || '').split('-').map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

export function toIso(y: number, m: number, d: number): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${y}-${p(m)}-${p(d)}`;
}

function noon(iso: string): Date {
  const { y, m, d } = parseIso(iso);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function isoFromUtc(dt: Date): string {
  return toIso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDaysIso(iso: string, n: number): string {
  const dt = noon(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return isoFromUtc(dt);
}

export function startOfMonthIso(iso: string): string {
  const { y, m } = parseIso(iso);
  return toIso(y, m, 1);
}

export function startOfQuarterIso(iso: string): string {
  const { y, m } = parseIso(iso);
  const qm = Math.floor((m - 1) / 3) * 3 + 1;
  return toIso(y, qm, 1);
}

/** -1 si a<b, 1 si a>b, 0 si igual (orden lexicográfico = cronológico en ISO). */
export function cmpIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "12 jun" — día + mes corto (sin punto), en el locale dado. */
export function fmtShortIso(iso: string, intlLocale: string): string {
  const { y, m, d } = parseIso(iso);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const mon = dt.toLocaleString(intlLocale, { month: 'short', timeZone: 'UTC' }).replace('.', '');
  return `${d} ${mon}`;
}

/**
 * Etiqueta del día seleccionado para subtítulos: "Hoy" / "Ayer" / "12 jun".
 * Los textos "Hoy"/"Ayer" los inyecta el caller con i18n (common.today/yesterday).
 */
export function dayFilterLabel(
  iso: string,
  opts: { todayIso: string; yesterdayIso: string; todayLabel: string; yesterdayLabel: string; locale: string },
): string {
  if (iso === opts.todayIso) return opts.todayLabel;
  if (iso === opts.yesterdayIso) return opts.yesterdayLabel;
  return fmtShortIso(iso, opts.locale);
}

/**
 * Etiqueta del rango seleccionado para subtítulos: "Esta semana" / "Este mes" /
 * "Este trimestre" / "1 jun a 30 jun". Los textos de atajo los inyecta el caller
 * con i18n (dateFilters.week/month/quarter). Sin guiones largos/medios en UI.
 */
export function rangeFilterLabel(
  range: { mode: string; from: string; to: string },
  opts: { locale: string; weekLabel: string; monthLabel: string; quarterLabel: string },
): string {
  if (range.mode === 'semana') return opts.weekLabel;
  if (range.mode === 'mes') return opts.monthLabel;
  if (range.mode === 'trimestre') return opts.quarterLabel;
  return `${fmtShortIso(range.from, opts.locale)} a ${fmtShortIso(range.to, opts.locale)}`;
}

/** "Junio 2026" — encabezado del calendario. */
export function monthLabel(y: number, m: number, intlLocale: string): string {
  const dt = new Date(Date.UTC(y, m - 1, 1, 12));
  const s = dt.toLocaleString(intlLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Iniciales de los 7 días, domingo primero (espejo del prototipo: D L M M J V S). */
export function weekdayInitials(intlLocale: string): string[] {
  const out: string[] = [];
  // 2024-01-07 es domingo.
  for (let i = 0; i < 7; i++) {
    const dt = new Date(Date.UTC(2024, 0, 7 + i, 12));
    out.push(dt.toLocaleString(intlLocale, { weekday: 'narrow', timeZone: 'UTC' }).toUpperCase());
  }
  return out;
}

const navBtn = 'w-7 h-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-surface-2 transition-colors';

export interface MonthGridProps {
  view: { y: number; m: number }; // m es 1-12
  onPrev: () => void;
  onNext: () => void;
  minIso: string;
  maxIso: string;
  intlLocale: string;
  /** Estado visual de cada celda (día seleccionado / dentro de un rango). */
  cellState: (iso: string) => { selected?: boolean; inRange?: boolean };
  onPick: (iso: string) => void;
}

/**
 * Rejilla de un mes con navegación, bloqueo de futuro / pre-retención y estilos
 * por celda. Compartida por DateFilter (día único) y DateRangeFilter (rango).
 */
export function MonthGrid({ view, onPrev, onNext, minIso, maxIso, intlLocale, cellState, onPick }: MonthGridProps) {
  const firstDow = new Date(Date.UTC(view.y, view.m - 1, 1, 12)).getUTCDay(); // 0=domingo
  const daysIn = new Date(Date.UTC(view.y, view.m, 0, 12)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(toIso(view.y, view.m, d));
  const wd = weekdayInitials(intlLocale);

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <button type="button" aria-label="Mes anterior" onClick={onPrev} className={navBtn}><ChevronLeft className="w-4 h-4" /></button>
        <b className="text-[13.5px] font-semibold text-foreground">{monthLabel(view.y, view.m, intlLocale)}</b>
        <button type="button" aria-label="Mes siguiente" onClick={onNext} className={navBtn}><ChevronRight className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {wd.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-muted-foreground/70 py-1">{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((iso, i) => {
          if (!iso) return <div key={i} />;
          const disabled = cmpIso(iso, minIso) < 0 || cmpIso(iso, maxIso) > 0;
          const st = cellState(iso);
          const day = parseIso(iso).d;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onPick(iso)}
              className={cn(
                'aspect-square text-xs font-medium transition-colors',
                st.inRange ? 'rounded-none' : 'rounded-md',
                disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : st.selected
                    ? 'bg-primary text-primary-foreground font-bold'
                    : st.inRange
                      ? 'bg-primary/15 text-primary'
                      : 'text-foreground hover:bg-surface-2'
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
