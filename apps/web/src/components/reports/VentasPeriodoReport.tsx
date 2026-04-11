'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@tremor/react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasPeriodo, VentaPeriodo, VentasPeriodoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function VentasPeriodoReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('reports.ventasPeriodo');
  const tc = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [agrupacion, setAgrupacion] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [data, setData] = useState<VentasPeriodoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'ventas-periodo',
    title: t('totalSales'),
    dateRange: dates,
    kpis: data ? [
      { label: t('totalSales'), value: fmt(data.totales.totalVentas) },
      { label: t('orders'), value: data.totales.cantidadPedidos },
      { label: t('avgTicket'), value: fmt(data.totales.ticketPromedio) },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t('periodCol'), t('orders'), t('totalSales'), t('avgTicket')],
      rows: data.periodos.map(p => [p.fecha, p.cantidadPedidos, fmt(p.totalVentas), fmt(p.ticketPromedio)]),
      footerRow: [tc('total'), data.totales.cantidadPedidos, fmt(data.totales.totalVentas), fmt(data.totales.ticketPromedio)],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getVentasPeriodo({ ...dates, agrupacion })); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates, agrupacion]);

  useEffect(() => { loadData(); }, []);

  const columns: ReportColumn<VentaPeriodo>[] = [
    { key: 'fecha', header: t('periodCol'), sortable: true },
    { key: 'cantidadPedidos', header: t('orders'), align: 'right', sortable: true },
    { key: 'totalVentas', header: t('totalSales'), align: 'right', sortable: true, render: (r) => fmt(r.totalVentas) },
    { key: 'ticketPromedio', header: t('avgTicket'), align: 'right', sortable: true, render: (r) => fmt(r.ticketPromedio) },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: {
      type: agrupacion === 'dia' ? 'area' : 'bar',
      toolbar: { show: true, tools: { download: true, zoom: true, pan: true, reset: true } },
      animations: { enabled: true, speed: 800 },
      zoom: { enabled: agrupacion === 'dia' },
    },
    colors: ['#10b981'],
    stroke: { curve: 'smooth', width: agrupacion === 'dia' ? 2.5 : 0 },
    fill: agrupacion === 'dia'
      ? { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 100] } }
      : { type: 'solid' },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '55%' } },
    dataLabels: { enabled: false },
    grid: { borderColor: '#f3f4f6', strokeDashArray: 3 },
    xaxis: {
      categories: data?.periodos.map(p => p.fecha) || [],
      labels: { style: { fontSize: '11px', colors: '#9ca3af' }, rotate: -30 },
    },
    yaxis: {
      labels: { style: { fontSize: '11px', colors: '#9ca3af' }, formatter: (v) => `$${(v / 1000).toFixed(0)}k` },
    },
    tooltip: { theme: 'light', y: { formatter: (v) => fmt(v) } },
  };

  const chartSeries = data ? [{ name: t('salesLabel'), data: data.periodos.map(p => p.totalVentas) }] : [];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground/70">{t('groupBy')}</label>
          <select value={agrupacion} onChange={e => setAgrupacion(e.target.value as 'dia' | 'semana' | 'mes')} className="px-3 py-2 text-sm border border-border-default rounded-md">
            <option value="dia">{t('day')}</option>
            <option value="semana">{t('week')}</option>
            <option value="mes">{t('month')}</option>
          </select>
        </div>
      </ReportFilters>

      {data && (
        <>
          <ReportKPICards cards={[
            { label: t('totalSales'), value: fmt(data.totales.totalVentas), color: 'green' },
            { label: t('orders'), value: data.totales.cantidadPedidos, color: 'blue' },
            { label: t('avgTicket'), value: fmt(data.totales.ticketPromedio), color: 'amber' },
          ]} />

          {data.periodos.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <Chart
                type={agrupacion === 'dia' ? 'area' : 'bar'}
                options={chartOptions}
                series={chartSeries}
                height={320}
              />
            </Card>
          )}

          <ReportTable
            data={data.periodos as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            footerRow={{ fecha: tc('total'), cantidadPedidos: data.totales.cantidadPedidos, totalVentas: fmt(data.totales.totalVentas), ticketPromedio: fmt(data.totales.ticketPromedio) }}
          />
        </>
      )}
    </div>
  );
}
