'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  isBefore,
  isAfter,
  parseISO,
} from 'date-fns';
import type { Locale } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';
import { Popover, PopoverTrigger, PopoverContent } from './Popover';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DATE_LOCALES: Record<string, Locale> = { es, en: enUS };

// ─── Types ──────────────────────────────────────────────────────────────────

interface DateTimePickerProps {
  /** 'date' = date only, 'datetime' = date + time */
  mode?: 'date' | 'datetime';
  /** ISO string: "2026-03-03" or "2026-03-03T14:30" */
  value?: string;
  /** Called with ISO string on change */
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: React.ReactNode;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  /** ISO date string for minimum selectable date */
  min?: string;
  /** ISO date string for maximum selectable date */
  max?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** Name for form integration */
  name?: string;
  /** Compact mode for inline filter bars (smaller trigger, no label) */
  compact?: boolean;
}

// ─── Day names (Spanish, 1 letter) ─────────────────────────────────────────

const DAY_NAMES_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const DAY_NAMES_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

// ─── Component ──────────────────────────────────────────────────────────────

export function DateTimePicker({
  mode = 'date',
  value,
  onChange,
  placeholder,
  label,
  error,
  hint,
  min,
  max,
  disabled = false,
  id,
  className,
  name,
  compact = false,
}: DateTimePickerProps) {
  const appLocale = useLocale();
  const dateLocale = DATE_LOCALES[appLocale] || es;
  const [open, setOpen] = useState(false);

  // Parse current value
  const selectedDate = useMemo(() => {
    if (!value) return null;
    try {
      // Handle both "2026-03-03" and "2026-03-03T14:30"
      if (value.includes('T')) return parseISO(value);
      return parseISO(value + 'T00:00:00');
    } catch {
      return null;
    }
  }, [value]);

  // Current viewing month (defaults to selected date or today)
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate || new Date());

  // Time state (only for datetime mode)
  const timeValue = useMemo(() => {
    if (mode !== 'datetime' || !value || !value.includes('T')) return '';
    const parts = value.split('T');
    return parts[1]?.substring(0, 5) || '';
  }, [mode, value]);

  // Parse min/max
  const minDate = useMemo(() => (min ? parseISO(min.split('T')[0]) : null), [min]);
  const maxDate = useMemo(() => (max ? parseISO(max.split('T')[0]) : null), [max]);

  // Calendar grid: 6 weeks starting from Monday
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: Date[] = [];
    let day = calStart;
    while (day <= calEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [viewMonth]);

  // Check if day is disabled by min/max
  const isDayDisabled = useCallback(
    (day: Date) => {
      if (minDate && isBefore(day, minDate)) return true;
      if (maxDate && isAfter(day, maxDate)) return true;
      return false;
    },
    [minDate, maxDate]
  );

  // Handle day selection
  const handleDayClick = useCallback(
    (day: Date) => {
      if (isDayDisabled(day)) return;

      const dateStr = format(day, 'yyyy-MM-dd');

      if (mode === 'datetime') {
        const time = timeValue || '09:00';
        onChange?.(`${dateStr}T${time}`);
      } else {
        onChange?.(dateStr);
        setOpen(false);
      }
    },
    [mode, timeValue, onChange, isDayDisabled]
  );

  // Parsed hour/minute from timeValue
  const parsedHour = useMemo(() => {
    if (!timeValue) return 9;
    return parseInt(timeValue.split(':')[0], 10) || 9;
  }, [timeValue]);

  const parsedMinute = useMemo(() => {
    if (!timeValue) return 0;
    return parseInt(timeValue.split(':')[1], 10) || 0;
  }, [timeValue]);

  // Handle time change from custom selects
  const handleTimePartChange = useCallback(
    (hour: number, minute: number) => {
      const hh = String(hour).padStart(2, '0');
      const mm = String(minute).padStart(2, '0');
      const newTime = `${hh}:${mm}`;
      if (selectedDate) {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        onChange?.(`${dateStr}T${newTime}`);
      } else {
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        onChange?.(`${dateStr}T${newTime}`);
      }
    },
    [selectedDate, onChange]
  );

  // Confirm datetime selection
  const handleConfirm = useCallback(() => {
    setOpen(false);
  }, []);

  // Display text for trigger
  const displayText = useMemo(() => {
    if (!value || !selectedDate) return '';

    if (mode === 'datetime' && value.includes('T')) {
      return format(selectedDate, "d 'de' MMM yyyy · HH:mm", { locale: dateLocale });
    }
    return format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: dateLocale });
  }, [value, selectedDate, mode]);

  const defaultPlaceholder = mode === 'datetime'
    ? (appLocale === 'en' ? 'Select date and time...' : 'Seleccionar fecha y hora...')
    : (appLocale === 'en' ? 'Select date...' : 'Seleccionar fecha...');

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && !compact && (
        <label htmlFor={id} className="text-sm font-medium text-foreground/80">
          {label}
        </label>
      )}

      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            className={cn(
              cn('flex w-full items-center rounded-md border bg-white text-left', compact ? 'h-8 px-2 py-1 text-xs' : 'h-10 px-3 py-2 text-sm'),
              'ring-offset-background transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-500 focus-visible:ring-red-500'
                : 'border-border-default hover:border-border-strong',
              !displayText && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="flex-1 truncate">
              {displayText || placeholder || defaultPlaceholder}
            </span>
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-auto p-0"
        >
          <div className="p-3">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="p-1 rounded hover:bg-surface-3 transition-colors text-muted-foreground hover:text-foreground/80"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-foreground capitalize select-none">
                {format(viewMonth, 'MMMM yyyy', { locale: dateLocale })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="p-1 rounded hover:bg-surface-3 transition-colors text-muted-foreground hover:text-foreground/80"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {(appLocale === 'en' ? DAY_NAMES_EN : DAY_NAMES_ES).map((d) => (
                <div
                  key={d}
                  className="h-8 flex items-center justify-center text-[11px] font-medium text-muted-foreground select-none"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const inMonth = isSameMonth(day, viewMonth);
                const selected = selectedDate && isSameDay(day, selectedDate);
                const today = isToday(day);
                const dayDisabled = isDayDisabled(day);

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={dayDisabled}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      'h-8 w-8 mx-auto flex items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                      // Base states
                      !inMonth && 'text-muted-foreground/60',
                      inMonth && !selected && !today && 'text-foreground/80 hover:bg-green-50 hover:text-green-700',
                      // Today ring
                      today && !selected && 'font-semibold text-green-700 ring-1 ring-inset ring-green-300',
                      // Selected
                      selected && 'bg-success text-success-foreground font-semibold hover:bg-success/90',
                      // Disabled
                      dayDisabled && 'text-muted-foreground/40 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Time picker (datetime mode only) */}
            {mode === 'datetime' && (
              <>
                <hr className="border-border-subtle my-3" />
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground flex-shrink-0">
                    Hora
                  </label>
                  {/* Hour select */}
                  <select
                    value={parsedHour}
                    onChange={(e) => handleTimePartChange(Number(e.target.value), parsedMinute)}
                    className="h-8 rounded-md border border-border-default bg-white px-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1 cursor-pointer"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm font-semibold text-muted-foreground">:</span>
                  {/* Minute select */}
                  <select
                    value={parsedMinute}
                    onChange={(e) => handleTimePartChange(parsedHour, Number(e.target.value))}
                    className="h-8 rounded-md border border-border-default bg-white px-1.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-1 cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">hrs</span>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className="h-8 px-3 ml-auto text-xs font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 transition-colors"
                  >
                    Listo
                  </button>
                </div>
              </>
            )}

            {/* Quick action: Today */}
            <div className="mt-2 pt-2 border-t border-border-subtle flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const today = new Date();
                  setViewMonth(today);
                  handleDayClick(today);
                }}
                className="text-xs text-success hover:text-success/80 font-medium hover:underline transition-colors"
              >
                {appLocale === 'en' ? 'Today' : 'Hoy'}
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden input for form submission / name attribute */}
      {name && (
        <input type="hidden" name={name} value={value || ''} />
      )}

      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{typeof error === 'string' ? error : ''}</p>
      )}
    </div>
  );
}
