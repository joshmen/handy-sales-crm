'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getInventarioValorizado, InvValorizadoProducto, InvValorizadoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

export function InvValorizadoReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('reports.invValorizado');
  const tc = useTranslations('reports.common');
  const tf = useTranslations('reports.filters');
  const fmt = (n: number) => formatCurrency(n);

  const [data, setData] = useState<InvValorizadoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const { exportPDF, exportExcel, exporting } = useReportExport({
    fileName: 'inventario-valorizado',
    title: t('reportTitle'),
    kpis: data ? [
      { label: t('inventoryValue'), value: fmt(data.totalValorizado) },
      { label: t('skus'), value: data.totalSkus },
      { label: t('units'), value: data.totalUnidades },
    ] : undefined,
    table: data ? {
      headers: [t('product'), t('stock'), t('avgCost'), t('value')],
      rows: data.productos.map(p => [p.nombre, p.existencia, fmt(p.costo), fmt(p.valor)]),
      footerRow: [t('inventoryValue'), '', '', fmt(data.totalValorizado)],
    } : undefined,
  });

  const canExport = !!data && data.productos.length > 0;

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getInventarioValorizado()); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  const columns: ReportColumn<InvValorizadoProducto>[] = [
    { key: 'nombre', header: t('product'), sortable: true },
    { key: 'existencia', header: t('stock'), align: 'right', sortable: true },
    { key: 'costo', header: t('avgCost'), align: 'right', sortable: true, render: r => fmt(r.costo) },
    { key: 'valor', header: t('value'), align: 'right', sortable: true, render: r => <span className="font-semibold text-foreground">{fmt(r.valor)}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <div className="flex items-center gap-2">
          {canExport && (
            <>
              <button
                onClick={exportExcel}
                disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
                title="Excel"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                Excel
              </button>
              <button
                onClick={exportPDF}
                disabled={exporting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
                title={tf('exportPDF')}
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {exporting ? tf('exporting') : 'PDF'}
              </button>
            </>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {tc('refresh')}
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {data && data.productos.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc('noData')}</p>
        </div>
      )}
      {data && data.productos.length > 0 && !loading && (
        <>
          <ReportKPICards cards={[
            { label: t('inventoryValue'), value: fmt(data.totalValorizado), color: 'blue' },
            { label: t('skus'), value: data.totalSkus, color: 'gray' },
            { label: t('units'), value: data.totalUnidades, color: 'gray' },
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
