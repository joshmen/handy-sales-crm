'use client';

import React, { useEffect } from 'react';
import { Search, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { DateRangeFilter, type DateRangeValue } from '@/components/ui/DateRangeFilter';
import { startOfMonthIso, startOfQuarterIso } from '@/components/ui/dateFilterUtils';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

interface ReportFiltersProps {
  desde: string;
  hasta: string;
  onDesdeChange: (val: string) => void;
  onHastaChange: (val: string) => void;
  onApply: () => void;
  loading?: boolean;
  children?: React.ReactNode;
  /** Show export PDF button */
  onExportPDF?: () => void;
  /** Show export Excel (.xlsx) button */
  onExportExcel?: () => void;
  exporting?: boolean;
}

export function ReportFilters({ desde, hasta, onDesdeChange, onHastaChange, onApply, loading, children, onExportPDF, onExportExcel, exporting }: ReportFiltersProps) {
  const t = useTranslations('reports.filters');
  const { tenantToday, tenantStartOfWeek } = useFormatters();
  const today = tenantToday();
  const defaultFrom = startOfMonthIso(today);

  // Valor derivado de props. Si no hay fechas -> default "Este mes". Si las hay,
  // inferimos el modo: cuando el rango coincide con un atajo calendario-alineado
  // (semana/mes/trimestre hasta hoy) se resalta ese atajo; si no, "Personalizado".
  const rango: DateRangeValue = (() => {
    if (!desde || !hasta) return { mode: 'mes', from: defaultFrom, to: today };
    if (hasta === today && desde === tenantStartOfWeek()) return { mode: 'semana', from: desde, to: hasta };
    if (hasta === today && desde === defaultFrom) return { mode: 'mes', from: desde, to: hasta };
    if (hasta === today && desde === startOfQuarterIso(today)) return { mode: 'trimestre', from: desde, to: hasta };
    return { mode: 'custom', from: desde, to: hasta };
  })();

  // Sembrar el padre una sola vez si llega sin fechas, para que el reporte
  // cargue este mes por defecto.
  useEffect(() => {
    if (!desde || !hasta) {
      onDesdeChange(defaultFrom);
      onHastaChange(today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRangeChange = (v: DateRangeValue) => {
    onDesdeChange(v.from);
    onHastaChange(v.to);
  };

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-surface-1 rounded-lg border border-border-subtle" data-tour="report-filters">
      <DateRangeFilter value={rango} onChange={handleRangeChange} retentionDays={730} />
      {children}
      <button
        onClick={onApply}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50"
      >
        <Search className="w-3.5 h-3.5" />
        {loading ? t('loading') : t('apply')}
      </button>
      {(onExportPDF || onExportExcel) && (
        <div className="flex items-center gap-2 ml-auto">
          {onExportExcel && (
            <button
              onClick={onExportExcel}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
              title="Excel"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              Excel
            </button>
          )}
          {onExportPDF && (
            <button
              onClick={onExportPDF}
              disabled={exporting}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
              title={t('exportPDF')}
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exporting ? t('exporting') : 'PDF'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
