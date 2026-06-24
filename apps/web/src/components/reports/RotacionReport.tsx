'use client';

import React, { useState, useCallback } from 'react';
import { ReportFilters } from './ReportFilters';
import { ReportTable, ReportColumn } from './ReportTable';
import { SoftBadge, SoftBadgeTone } from '@/components/ui/SoftBadge';
import { getRotacion, RotacionProducto, RotacionResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useTranslations } from 'next-intl';

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

// Estado del backend → tono SoftBadge + clave i18n.
const ESTADO_MAP: Record<string, { tone: SoftBadgeTone; key: string }> = {
  Reordenar: { tone: 'danger', key: 'reorder' },
  Exceso: { tone: 'warning', key: 'excess' },
  OK: { tone: 'success', key: 'ok' },
};

export function RotacionReport() {
  const t = useTranslations('reports.rotacion');
  const tc = useTranslations('reports.common');

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<RotacionResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const estadoLabel = (estado: string) => {
    const m = ESTADO_MAP[estado];
    return m && m.key ? t(m.key) : estado;
  };

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: 'rotacion',
    title: t('reportTitle'),
    dateRange: dates,
    table: data ? {
      headers: [t('product'), t('stock'), t('minimum'), t('turnover'), t('invDays'), t('status')],
      rows: data.productos.map(p => [p.nombre, p.existencia, p.minimo, t('turnoverValue', { n: p.rotacion }), p.diasInv, estadoLabel(p.estado)]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getRotacion(dates)); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const columns: ReportColumn<RotacionProducto>[] = [
    { key: 'nombre', header: t('product'), sortable: true },
    { key: 'existencia', header: t('stock'), align: 'right', sortable: true },
    { key: 'minimo', header: t('minimum'), align: 'right', sortable: true },
    { key: 'rotacion', header: t('turnover'), align: 'right', sortable: true, render: r => t('turnoverValue', { n: r.rotacion }) },
    { key: 'diasInv', header: t('invDays'), align: 'right', sortable: true },
    {
      key: 'estado', header: t('status'), align: 'center', sortable: true,
      render: r => {
        const m = ESTADO_MAP[r.estado] ?? { tone: 'default' as SoftBadgeTone, key: '' };
        return <SoftBadge tone={m.tone}>{m.key ? t(m.key) : r.estado}</SoftBadge>;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters
        desde={dates.desde}
        hasta={dates.hasta}
        onDesdeChange={v => setDates(d => ({ ...d, desde: v }))}
        onHastaChange={v => setDates(d => ({ ...d, hasta: v }))}
        onApply={loadData}
        loading={loading}
        onExportPDF={data && data.productos.length > 0 ? exportPDF : undefined}
        onExportExcel={data && data.productos.length > 0 ? exportExcel : undefined}
        exporting={exporting}
      />
      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">{tc('clickApply')}</p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {data && data.productos.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc('noData')}</p>
          <p className="text-xs mt-1">{tc('tryDifferentDates')}</p>
        </div>
      )}
      {data && data.productos.length > 0 && !loading && (
        <ReportTable
          data={data.productos as unknown as Record<string, unknown>[]}
          columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
          maxHeight="600px"
        />
      )}
    </div>
  );
}
