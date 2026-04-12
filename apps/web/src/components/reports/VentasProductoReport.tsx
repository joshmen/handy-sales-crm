'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@tremor/react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasProducto, VentaProducto, VentasProductoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

type Tab = 'masVendidos' | 'mayorVenta' | 'sinVenta';

export function VentasProductoReport() {
  const { formatCurrency } = useFormatters();
  const tr = useTranslations('reports.ventasProducto');
  const tc = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<VentasProductoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('masVendidos');
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'ventas-producto', title: tr('reportTitle'), dateRange: dates,
    kpis: data ? [
      { label: tr('totalSales'), value: fmt(data.totalGeneral) },
      { label: tr('productsSold'), value: data.masVendidos.length },
      { label: tr('noSale'), value: data.sinVenta.length },
    ] : undefined, chartRef,
    table: data ? {
      headers: [tr('product'), tr('quantity'), tr('totalSalesCol'), tr('percentTotal')],
      rows: data.masVendidos.map(p => [p.nombre, p.cantidadVendida, fmt(p.totalVentas), `${p.porcentajeDelTotal}%`]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getVentasProducto({ ...dates, top: 20 })); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { loadData(); }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'masVendidos', label: tr('topSelling') },
    { key: 'mayorVenta', label: tr('topRevenue') },
    { key: 'sinVenta', label: tr('noSale') },
  ];

  const productColumns: ReportColumn<VentaProducto>[] = [
    { key: 'nombre', header: tr('product'), sortable: true },
    { key: 'cantidadVendida', header: tr('quantity'), align: 'right', sortable: true },
    { key: 'totalVentas', header: tr('totalSalesCol'), align: 'right', sortable: true, render: (r) => fmt(r.totalVentas) },
    { key: 'porcentajeDelTotal', header: tr('percentTotal'), align: 'right', sortable: true, render: (r) => `${r.porcentajeDelTotal}%` },
  ];

  const sinVentaColumns: ReportColumn<{ productoId: number; nombre: string }>[] = [
    { key: 'nombre', header: tr('product'), sortable: true },
  ];

  const chartData = data ? data[tab === 'sinVenta' ? 'masVendidos' : tab].slice(0, 10) : [];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: true }, animations: { enabled: true, speed: 700 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '60%' } },
    colors: [tab === 'masVendidos' ? '#3b82f6' : '#10b981'],
    grid: { borderColor: '#f3f4f6', strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v) => tab === 'masVendidos' ? String(v) : fmt(Number(v)), style: { fontSize: '11px', colors: ['#374151'] }, offsetX: 5 },
    xaxis: { labels: { formatter: (v) => tab === 'masVendidos' ? String(v) : `$${(Number(v) / 1000).toFixed(0)}k`, style: { fontSize: '11px', colors: '#9ca3af' } } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#374151' } } },
    tooltip: { y: { formatter: (v) => tab === 'masVendidos' ? `${v} ${tr('quantity').toLowerCase()}` : fmt(v) } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data && data.masVendidos.length > 0 ? exportPDF : undefined} exporting={exporting} />

      {!data && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm">{tc("clickApply")}</p>
        </div>
      )}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {data && data.masVendidos.length === 0 && data.sinVenta.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && (data.masVendidos.length > 0 || data.sinVenta.length > 0) && (
        <>
          <ReportKPICards cards={[
            { label: tr('totalSales'), value: fmt(data.totalGeneral), color: 'green' },
            { label: tr('productsSold'), value: data.masVendidos.length, color: 'blue' },
            { label: tr('noSale'), value: data.sinVenta.length, color: data.sinVenta.length > 0 ? 'red' : 'gray' },
          ]} />

          <div className="flex gap-1 bg-surface-3 rounded-lg p-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${tab === t.key ? 'bg-white text-foreground shadow-sm' : 'text-foreground/70 hover:text-foreground'}`}>
                {t.label}
                {t.key === 'sinVenta' && data.sinVenta.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-full">{data.sinVenta.length}</span>}
              </button>
            ))}
          </div>

          {tab !== 'sinVenta' && chartData.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <Chart type="bar" options={chartOptions} series={[{ name: tab === 'masVendidos' ? tr('quantity') : tr('totalSales'), data: chartData.map(p => ({ x: p.nombre, y: tab === 'masVendidos' ? p.cantidadVendida : p.totalVentas })) }]} height={Math.max(250, chartData.length * 40)} />
            </Card>
          )}

          {tab === 'sinVenta' ? (
            <ReportTable data={data.sinVenta as unknown as Record<string, unknown>[]} columns={sinVentaColumns as unknown as ReportColumn<Record<string, unknown>>[]} showIndex />
          ) : (
            <ReportTable data={(data[tab] || []) as unknown as Record<string, unknown>[]} columns={productColumns as unknown as ReportColumn<Record<string, unknown>>[]} showIndex />
          )}
        </>
      )}
    </div>
  );
}
