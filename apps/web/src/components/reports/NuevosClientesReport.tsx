'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Card } from '@tremor/react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getNuevosClientes, NuevoCliente } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

function defaultDates() {
  const h = new Date(); const d = new Date(h); d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const fmtDate = (d: string) => libFmtDate(d, null, { day: '2-digit', month: 'short', year: 'numeric' });

export function NuevosClientesReport() {
  const t = useTranslations('reports.nuevosClientes');
  const tc = useTranslations('reports.common');
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<{ clientes: NuevoCliente[]; total: number; porMes: { mes: string; cantidad: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'nuevos-clientes',
    title: t('reportTitle'),
    dateRange: dates,
    kpis: data ? [{ label: t('newClients'), value: data.total }] : undefined,
    table: data ? {
      headers: [t('client'), t('zone'), t('email'), t('phone'), tc('date'), t('createdBy')],
      rows: data.clientes.map(c => [c.nombre, c.zona || '', c.correo || '', c.telefono || '', fmtDate(c.fechaCreacion), c.creadoPor || '']),
    } : undefined,
  });

  const loadData = useCallback(async () => {
    try { setLoading(true); setData(await getNuevosClientes(dates)); }
    catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { loadData(); }, []);

  const columns: ReportColumn<NuevoCliente>[] = [
    { key: 'nombre', header: t('client'), sortable: true },
    { key: 'zona', header: t('zone'), sortable: true },
    { key: 'correo', header: t('email') },
    { key: 'telefono', header: t('phone') },
    { key: 'fechaCreacion', header: tc('date'), sortable: true, render: (r) => fmtDate(r.fechaCreacion) },
    { key: 'creadoPor', header: t('createdBy') },
  ];

  const chartOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false }, animations: { enabled: true, speed: 700 } },
    plotOptions: { bar: { borderRadius: 6, columnWidth: '50%' } },
    colors: ['#10b981'],
    grid: { borderColor: '#f3f4f6', strokeDashArray: 3 },
    dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#374151'] } },
    xaxis: { categories: data?.porMes.map(m => m.mes) || [], labels: { style: { fontSize: '11px', colors: '#9ca3af' } } },
    yaxis: { labels: { style: { fontSize: '11px', colors: '#9ca3af' } }, forceNiceScale: true },
    tooltip: { y: { formatter: (v) => `${v} ${tc('clients').toLowerCase()}` } },
  };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={loadData} loading={loading} onExportPDF={data && data.clientes.length > 0 ? exportPDF : undefined} exporting={exporting} />
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
      {data && data.clientes.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <p className="text-sm font-medium">{tc("noData")}</p>
          <p className="text-xs mt-1">{tc("tryDifferentDates")}</p>
        </div>
      )}
      {data && data.clientes.length > 0 && (
        <>
          <ReportKPICards cards={[{ label: t('newClients'), value: data.total, color: 'green' }]} />
          {data.porMes.length > 0 && (
            <Card>
              <p className="text-xs font-medium text-foreground/70 mb-3">{t('perMonth')}</p>
              <Chart type="bar" options={chartOptions} series={[{ name: tc('clients'), data: data.porMes.map(m => m.cantidad) }]} height={260} />
            </Card>
          )}
          <ReportTable data={data.clientes as unknown as Record<string, unknown>[]} columns={columns as unknown as ReportColumn<Record<string, unknown>>[]} showIndex />
        </>
      )}
    </div>
  );
}
