'use client';

import React from 'react';
import { Search, Download, Loader2 } from 'lucide-react';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
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
  exporting?: boolean;
}

export function ReportFilters({ desde, hasta, onDesdeChange, onHastaChange, onApply, loading, children, onExportPDF, exporting }: ReportFiltersProps) {
  const t = useTranslations('reports.filters');
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200" data-tour="report-filters">
      <DateTimePicker
        mode="date"
        label={t('from')}
        value={desde}
        onChange={onDesdeChange}
        placeholder={t('fromPlaceholder')}
      />
      <DateTimePicker
        mode="date"
        label={t('to')}
        value={hasta}
        onChange={onHastaChange}
        placeholder={t('toPlaceholder')}
      />
      {children}
      <button
        onClick={onApply}
        disabled={loading}
        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50"
      >
        <Search className="w-3.5 h-3.5" />
        {loading ? t('loading') : t('apply')}
      </button>
      {onExportPDF && (
        <button
          onClick={onExportPDF}
          disabled={exporting}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 ml-auto"
          title={t('exportPDF')}
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {exporting ? t('exporting') : 'PDF'}
        </button>
      )}
    </div>
  );
}
