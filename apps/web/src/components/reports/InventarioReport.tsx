'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card as TremorCard } from '@tremor/react';
import dynamic from 'next/dynamic';
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getInventario, InventarioProducto } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { RefreshCw, Download, Loader2 } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useTranslations } from 'next-intl';

const estadoColorMap: Record<string, { bg: string; text: string; key: string; pie: string }> = {
  sin_stock: { bg: 'bg-red-100', text: 'text-red-700', key: 'outOfStock', pie: '#dc2626' },
  bajo: { bg: 'bg-amber-100', text: 'text-amber-700', key: 'lowStock', pie: '#d97706' },
  normal: { bg: 'bg-green-100', text: 'text-green-700', key: 'normal', pie: '#16a34a' },
  exceso: { bg: 'bg-blue-100', text: 'text-blue-700', key: 'excess', pie: '#2563eb' },
};

export function InventarioReport() {
  const t = useTranslations('reports.inventario');
  const tCommon = useTranslations('reports.common');
  const tFilters = useTranslations('reports.filters');
  const [data, setData] = useState<{ productos: InventarioProducto[]; resumen: { total: number; sinStock: number; bajo: number; normal: number; exceso: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'inventario',
    title: t('reportTitle'),
    kpis: data ? [
      { label: t('totalProducts'), value: data.resumen.total },
      { label: t('outOfStock'), value: data.resumen.sinStock },
      { label: t('lowStock'), value: data.resumen.bajo },
      { label: t('normal'), value: data.resumen.normal },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t('product'), t('code'), t('current'), t('minimum'), t('maximum'), t('status')],
      rows: data.productos.map(p => [p.nombre, p.codigoBarra || '-', p.stockActual, p.stockMinimo, p.stockMaximo, estadoColorMap[p.estado] ? t(estadoColorMap[p.estado].key) : p.estado]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInventario();
      setData(res);
    } catch { toast.error(tCommon('errorLoadingInventory')); }
    finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<InventarioProducto>[] = [
    { key: 'nombre', header: t('product'), sortable: true },
    { key: 'codigoBarra', header: t('code') },
    { key: 'stockActual', header: t('current'), align: 'right', sortable: true },
    { key: 'stockMinimo', header: t('minimum'), align: 'right' },
    { key: 'stockMaximo', header: t('maximum'), align: 'right' },
    {
      key: 'estado', header: t('status'), align: 'center', sortable: true,
      render: (r) => {
        const c = estadoColorMap[r.estado];
        return <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${c.bg} ${c.text}`}>{t(c.key)}</span>;
      }
    },
  ];

  const pieData = data ? [
    { name: t('outOfStock'), value: data.resumen.sinStock, key: 'sin_stock' },
    { name: t('lowStock'), value: data.resumen.bajo, key: 'bajo' },
    { name: t('normal'), value: data.resumen.normal, key: 'normal' },
    { name: t('excess'), value: data.resumen.exceso, key: 'exceso' },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        {data && (
          <button onClick={exportPDF} disabled={exporting} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 bg-white border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50" title={tFilters('exportPDF')}>
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {exporting ? tFilters('exporting') : 'PDF'}
          </button>
        )}
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {tCommon('refresh')}
        </button>
      </div>

      {data && (
        <>
          <ReportKPICards cards={[
            { label: t('totalProducts'), value: data.resumen.total, color: 'gray' },
            { label: t('outOfStock'), value: data.resumen.sinStock, color: data.resumen.sinStock > 0 ? 'red' : 'gray' },
            { label: t('lowStock'), value: data.resumen.bajo, color: data.resumen.bajo > 0 ? 'amber' : 'gray' },
            { label: t('normal'), value: data.resumen.normal, color: 'green' },
          ]} />

          {pieData.length > 0 && (
            <TremorCard ref={chartRef as React.RefObject<HTMLDivElement>}>
              <Chart
                type="donut"
                options={{
                  chart: { type: 'donut', animations: { enabled: true, speed: 800 } },
                  labels: pieData.map(d => d.name),
                  colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6'],
                  plotOptions: { pie: { donut: { size: '65%' } } },
                  legend: { position: 'bottom', fontSize: '12px' },
                  dataLabels: { enabled: true, formatter: (val: number) => `${val.toFixed(0)}%` },
                }}
                series={pieData.map(d => d.value)}
                height={280}
              />
            </TremorCard>
          )}

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
