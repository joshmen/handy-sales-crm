'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@tremor/react';
import { ReportFilters } from './ReportFilters';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasVendedor, VentaVendedor } from '@/services/api/reports';
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

export function VentasVendedorReport() {
  const { formatCurrency } = useFormatters();
  const t = useTranslations('reports.ventasVendedor');
  const tc = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<VentaVendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'ventas-vendedor',
    title: t('reportTitle'),
    dateRange: dates,
    kpis: data.length > 0 ? data.slice(0, 3).map((v, i) => ({ label: `#${i + 1} ${v.nombre}`, value: fmt(v.totalVentas) })) : undefined,
    chartRef,
    table: data.length > 0 ? {
      headers: [t('vendor'), t('totalSales'), t('orders'), t('avgTicket'), t('visits'), t('withSale'), t('effectiveness')],
      rows: data.map(v => [v.nombre, fmt(v.totalVentas), v.cantidadPedidos, fmt(v.ticketPromedio), v.totalVisitas, v.visitasConVenta, `${v.efectividadVisitas}%`]),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); const res = await getVentasVendedor(dates); setData(res.vendedores); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { loadData(); }, []);

  const columns: ReportColumn<VentaVendedor>[] = [
    { key: 'nombre', header: t('vendor'), sortable: true },
    { key: 'totalVentas', header: t('totalSales'), align: 'right', sortable: true, render: (r) => fmt(r.totalVentas) },
    { key: 'cantidadPedidos', header: t('orders'), align: 'right', sortable: true },
    { key: 'ticketPromedio', header: t('avgTicket'), align: 'right', sortable: true, render: (r) => fmt(r.ticketPromedio) },
    { key: 'totalVisitas', header: t('visits'), align: 'right', sortable: true },
    { key: 'visitasConVenta', header: t('withSale'), align: 'right', sortable: true },
    { key: 'efectividadVisitas', header: t('effectiveness'), align: 'right', sortable: true, render: (r) => `${r.efectividadVisitas}%` },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: true }, animations: { enabled: true, speed: 800 } },
    plotOptions: { bar: { horizontal: true, borderRadius: 6, barHeight: '65%' } },
    colors: ['#10b981'],
    grid: { borderColor: '#f3f4f6', strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v) => fmt(Number(v)), style: { fontSize: '11px', colors: ['#374151'] }, offsetX: 5 },
    xaxis: { labels: { formatter: (v) => `$${(Number(v) / 1000).toFixed(0)}k`, style: { fontSize: '11px', colors: '#9ca3af' } } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#374151' } } },
    tooltip: { y: { formatter: (v) => fmt(v) } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data.length > 0 ? exportPDF : undefined} exporting={exporting} />

      {data.length > 0 && (
        <>
          <Card ref={chartRef as React.RefObject<HTMLDivElement>}>
            <Chart
              type="bar"
              options={chartOptions}
              series={[{ name: t('salesLabel'), data: data.map(v => ({ x: v.nombre, y: v.totalVentas })) }]}
              height={Math.max(250, data.length * 45)}
            />
          </Card>

          <ReportTable
            data={data as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            showIndex
          />
        </>
      )}

      {!loading && data.length === 0 && (
        <div className="text-center py-12 text-sm text-muted-foreground">{tc('noData')}</div>
      )}
    </div>
  );
}
