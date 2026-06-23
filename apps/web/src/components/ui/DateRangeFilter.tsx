'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { useFormatters } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';
import { MonthGrid, parseIso, addDaysIso, fmtShortIso, cmpIso, startOfMonthIso, startOfQuarterIso } from './dateFilterUtils';

export type DateRangeMode = 'semana' | 'mes' | 'trimestre' | 'custom';

export interface DateRangeValue {
  mode: DateRangeMode;
  /** 'YYYY-MM-DD' tenant-aware. */
  from: string;
  to: string;
}

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  retentionDays: number;
}

/**
 * Filtro de RANGO — espejo del `DateRangeFilter` del Claude Design.
 * Atajos Esta semana / Este mes / Este trimestre (calendario-alineados,
 * tenant-aware) + "Personalizado" que abre un calendario de rango (clic inicio
 * → clic fin, con resaltado). Guarda de retención. Emite {mode, from, to}.
 */
export function DateRangeFilter({ value, onChange, retentionDays }: DateRangeFilterProps) {
  const t = useTranslations('dateFilters');
  const locale = useLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'es-MX';
  const { tenantToday, tenantStartOfWeek } = useFormatters();

  const today = tenantToday();
  const minIso = addDaysIso(today, -retentionDays);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const { y, m } = parseIso(value.to || today); return { y, m }; });
  const [pick, setPick] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });

  const shortcut = (mode: 'semana' | 'mes' | 'trimestre') => {
    const from = mode === 'semana' ? tenantStartOfWeek() : mode === 'mes' ? startOfMonthIso(today) : startOfQuarterIso(today);
    onChange({ mode, from, to: today });
    setOpen(false);
  };

  const seg = (active: boolean) =>
    cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
      active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground');

  const customLabel = value.mode === 'custom' && value.from && value.to
    ? `${fmtShortIso(value.from, intlLocale)} – ${fmtShortIso(value.to, intlLocale)}`
    : t('custom');

  const prevMonth = () => setView(v => (v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => setView(v => (v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 }));

  const clickDay = (iso: string) => {
    if (!pick.from || pick.to) { setPick({ from: iso, to: null }); return; }
    let from = pick.from, to = iso;
    if (cmpIso(to, from) < 0) { const tmp = from; from = to; to = tmp; }
    setPick({ from, to });
    onChange({ mode: 'custom', from, to });
    setOpen(false);
  };

  const cellState = (iso: string) => {
    const f = pick.from, tt = pick.to;
    // Resalta los extremos del rango en progreso, o el rango custom ya aplicado.
    const isEnd = iso === f || iso === tt || (!f && value.mode === 'custom' && (iso === value.from || iso === value.to));
    const inRange = f && tt
      ? cmpIso(iso, f) > 0 && cmpIso(iso, tt) < 0
      : (!f && value.mode === 'custom' && value.from && value.to ? cmpIso(iso, value.from) > 0 && cmpIso(iso, value.to) < 0 : false);
    return { selected: !!isEnd, inRange: !!inRange };
  };

  const pickHint = !pick.from ? t('pickStart') : !pick.to ? t('pickEnd') : `${fmtShortIso(pick.from, intlLocale)} – ${fmtShortIso(pick.to, intlLocale)}`;

  return (
    <div className="inline-flex rounded-lg border border-border-subtle bg-surface-1 p-0.5">
      <button type="button" onClick={() => shortcut('semana')} aria-pressed={value.mode === 'semana'} className={seg(value.mode === 'semana')}>{t('week')}</button>
      <button type="button" onClick={() => shortcut('mes')} aria-pressed={value.mode === 'mes'} className={seg(value.mode === 'mes')}>{t('month')}</button>
      <button type="button" onClick={() => shortcut('trimestre')} aria-pressed={value.mode === 'trimestre'} className={seg(value.mode === 'trimestre')}>{t('quarter')}</button>
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setPick({ from: null, to: null }); }}>
        <PopoverTrigger asChild>
          <button type="button" aria-pressed={value.mode === 'custom'} className={cn(seg(value.mode === 'custom'), 'inline-flex items-center gap-1.5')}>
            <CalendarIcon className="w-3.5 h-3.5" aria-hidden />{customLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[280px] p-3.5">
          <div className="text-[11.5px] text-muted-foreground mb-2.5 font-medium">{pickHint}</div>
          <MonthGrid
            view={view}
            onPrev={prevMonth}
            onNext={nextMonth}
            minIso={minIso}
            maxIso={today}
            intlLocale={intlLocale}
            cellState={cellState}
            onPick={clickDay}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
