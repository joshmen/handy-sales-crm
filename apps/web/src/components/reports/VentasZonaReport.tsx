'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@tremor/react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasZona, VentaZona, VentasZonaResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function VentasZonaReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('reports.ventasZona');
  const tc = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<VentasZonaResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'ventas-zona', title: t('totalSales'), dateRange: dates,
    kpis: data ? [
      { label: t('totalSales'), value: fmt(data.totales.totalVentas) },
      { label: t('totalOrders'), value: data.totales.totalPedidos },
      { label: t('totalClients'), value: data.totales.totalClientes },
    ] : undefined, chartRef,
    table: data ? {
      headers: [t('zone'), t('clients'), t('orders'), t('totalSalesCol')],
      rows: data.zonas.map(z => [z.nombre, z.totalClientes, z.pedidos, fmt(z.ventasTotales)]),
      footerRow: [tc('total'), data.totales.totalClientes, data.totales.totalPedidos, fmt(data.totales.totalVentas)],
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getVentasZona(dates)); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { loadData(); }, []);

  const columns: ReportColumn<VentaZona>[] = [
    { key: 'nombre', header: t('zone'), sortable: true },
    { key: 'totalClientes', header: t('clients'), align: 'right', sortable: true },
    { key: 'pedidos', header: t('orders'), align: 'right', sortable: true },
    { key: 'ventasTotales', header: t('totalSalesCol'), align: 'right', sortable: true, render: (r) => fmt(r.ventasTotales) },
  ];

  const zonesWithSales = data?.zonas.filter(z => z.ventasTotales > 0) || [];

  const donutOptions: ApexCharts.ApexOptions = {
    chart: { type: 'donut', animations: { enabled: true, speed: 800 } },
    labels: zonesWithSales.map(z => z.nombre),
    colors: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'],
    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: tc('total'), fontSize: '12px', color: '#6b7280', formatter: () => fmt(data?.totales.totalVentas || 0) } } } } },
    legend: { position: 'bottom', fontSize: '12px' },
    dataLabels: { enabled: true, formatter: (val) => `${Number(val).toFixed(0)}%` },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />

      {data && (
        <>
          <ReportKPICards cards={[
            { label: t('totalSales'), value: fmt(data.totales.totalVentas), color: 'green' },
            { label: t('totalOrders'), value: data.totales.totalPedidos, color: 'blue' },
            { label: t('totalClients'), value: data.totales.totalClientes, color: 'amber' },
          ]} />

          {zonesWithSales.length > 0 && (
            <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
              <Chart type="donut" options={donutOptions} series={zonesWithSales.map(z => z.ventasTotales)} height={350} />
            </Card>
          )}

          <ReportTable
            data={data.zonas as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            footerRow={{ nombre: tc('total'), totalClientes: data.totales.totalClientes, pedidos: data.totales.totalPedidos, ventasTotales: fmt(data.totales.totalVentas) }}
          />
        </>
      )}
    </div>
  );
}
