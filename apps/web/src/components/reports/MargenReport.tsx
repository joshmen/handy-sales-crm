'use client';

import React, { useState, useCallback } from 'react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { SoftBadge } from '@/components/ui/SoftBadge';
import { getMargen, MargenProducto, MargenResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function MargenReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('reports.margen');
  const tc = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);

  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<MargenResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: 'margen',
    title: t('reportTitle'),
    dateRange: dates,
    kpis: data ? [
      { label: t('grossProfit'), value: fmt(data.utilidadBruta) },
      { label: t('avgMargin'), value: `${data.margenPromedio.toFixed(1)}%` },
    ] : undefined,
    table: data ? {
      headers: [t('product'), t('price'), t('cost'), t('marginAmount'), t('marginPct'), t('profit')],
      rows: data.productos.map(p => [p.nombre, fmt(p.precio), fmt(p.costo), fmt(p.margenUnitario), `${p.margenPct.toFixed(1)}%`, fmt(p.utilidad)]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getMargen(dates)); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates]);

  const columns: ReportColumn<MargenProducto>[] = [
    { key: 'nombre', header: t('product'), sortable: true },
    { key: 'precio', header: t('price'), align: 'right', sortable: true, render: r => fmt(r.precio) },
    { key: 'costo', header: t('cost'), align: 'right', sortable: true, render: r => fmt(r.costo) },
    { key: 'margenUnitario', header: t('marginAmount'), align: 'right', sortable: true, render: r => fmt(r.margenUnitario) },
    {
      key: 'margenPct', header: t('marginPct'), align: 'center', sortable: true,
      render: r => <SoftBadge tone={r.margenPct < 30 ? 'warning' : 'success'}>{`${r.margenPct.toFixed(1)}%`}</SoftBadge>,
    },
    { key: 'utilidad', header: t('profit'), align: 'right', sortable: true, render: r => <span className="font-semibold text-foreground">{fmt(r.utilidad)}</span> },
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
        <>
          <ReportKPICards cards={[
            { label: t('grossProfit'), value: fmt(data.utilidadBruta), color: 'green' },
            { label: t('avgMargin'), value: `${data.margenPromedio.toFixed(1)}%`, color: 'blue' },
          ]} />
          <ReportTable
            data={data.productos as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            maxHeight="600px"
          />
        </>
      )}
    </div>
  );
}
