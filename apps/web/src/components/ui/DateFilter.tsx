'use client';

import { useState } from 'react';
import { Calendar as CalendarIcon, Info } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { useFormatters } from '@/hooks/useFormatters';
import { cn } from '@/lib/utils';
import { MonthGrid, parseIso, addDaysIso, fmtShortIso } from './dateFilterUtils';

interface DateFilterProps {
  /** Día seleccionado, 'YYYY-MM-DD' en TZ del tenant. */
  value: string;
  onChange: (iso: string) => void;
  /** Días de retención hacia atrás; el calendario bloquea antes de (hoy - N). */
  retentionDays: number;
  /** Nota de retención custom; si se omite usa "Datos disponibles desde …". */
  note?: string;
}

/**
 * Filtro de DÍA ÚNICO — espejo del `DateFilter` del Claude Design.
 * Atajos Hoy / Ayer + botón "Fecha…" que abre un calendario (popover) para
 * elegir un solo día, con guarda de retención (bloquea futuro y pre-retención).
 * Emite siempre un 'YYYY-MM-DD' tenant-aware vía onChange.
 */
export function DateFilter({ value, onChange, retentionDays, note }: DateFilterProps) {
  const t = useTranslations('dateFilters');
  const tc = useTranslations('common');
  const locale = useLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'es-MX';
  const { tenantToday } = useFormatters();

  const today = tenantToday();
  const yesterday = addDaysIso(today, -1);
  const minIso = addDaysIso(today, -retentionDays);

  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => { const { y, m } = parseIso(value || today); return { y, m }; });

  const isHoy = value === today;
  const isAyer = value === yesterday;
  const isCustom = !isHoy && !isAyer;
  const dateLabel = isCustom && value ? fmtShortIso(value, intlLocale) : t('pickDate');

  const seg = (active: boolean) =>
    cn('px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
      active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground');

  const prevMonth = () => setView(v => (v.m === 1 ? { y: v.y - 1, m: 12 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => setView(v => (v.m === 12 ? { y: v.y + 1, m: 1 } : { y: v.y, m: v.m + 1 }));

  return (
    <div className="inline-flex rounded-lg border border-border-subtle bg-surface-1 p-0.5">
      <button type="button" onClick={() => onChange(today)} aria-pressed={isHoy} className={seg(isHoy)}>{tc('today')}</button>
      <button type="button" onClick={() => onChange(yesterday)} aria-pressed={isAyer} className={seg(isAyer)}>{tc('yesterday')}</button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-pressed={isCustom} className={cn(seg(isCustom), 'inline-flex items-center gap-1.5')}>
            <CalendarIcon className="w-3.5 h-3.5" aria-hidden />{dateLabel}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[268px] p-3.5">
          <MonthGrid
            view={view}
            onPrev={prevMonth}
            onNext={nextMonth}
            minIso={minIso}
            maxIso={today}
            intlLocale={intlLocale}
            cellState={(iso) => ({ selected: iso === value })}
            onPick={(iso) => { onChange(iso); setOpen(false); }}
          />
          <div className="flex items-start gap-1.5 mt-3 pt-2.5 border-t border-border-subtle">
            <Info className="w-3 h-3 mt-0.5 text-muted-foreground/60 flex-shrink-0" aria-hidden />
            <span className="text-[10.5px] text-muted-foreground/70 leading-snug">
              {note || t('retentionNote', { date: fmtShortIso(minIso, intlLocale), days: retentionDays })}
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
