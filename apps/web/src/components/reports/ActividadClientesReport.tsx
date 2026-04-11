'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getActividadClientes, ActividadCliente } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

export function ActividadClientesReport() {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations('reports.actividadClientes');
  const tc = useTranslations('reports.common');
  const fmt = (n: number) => formatCurrency(n);
  const fmtDate = (d: string | null) => d ? formatDate(d, { day: '2-digit', month: 'short' }) : '-';
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<ActividadCliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 30;
  const datesRef = useRef(dates);
  datesRef.current = dates;
  const { exportPDF, exporting } = useReportExport({
    fileName: 'actividad-clientes',
    title: t('client'),
    dateRange: dates,
    kpis: data.length > 0 ? [
      { label: tc('clients'), value: total },
      { label: t('totalSales'), value: fmt(data.reduce((s, c) => s + c.ventasTotales, 0)) },
      { label: t('totalOrders'), value: data.reduce((s, c) => s + c.pedidos, 0) },
    ] : undefined,
    table: data.length > 0 ? {
      headers: [t('client'), t('zone'), t('orders'), t('sales'), t('visits'), t('lastVisit'), t('lastOrder')],
      rows: data.map(c => [c.nombre, c.zona || '-', c.pedidos, fmt(c.ventasTotales), c.visitas, fmtDate(c.ultimaVisita), fmtDate(c.ultimoPedido)]),
    } : undefined,
  });

  const fetchData = async (p: number) => {
    try {
      setLoading(true);
      const res = await getActividadClientes({ ...datesRef.current, page: p, limit });
      setData(res.clientes);
      setTotal(res.total);
    } catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(1); }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    fetchData(page);
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  const columns: ReportColumn<ActividadCliente>[] = [
    { key: 'nombre', header: t('client'), sortable: true },
    { key: 'zona', header: t('zone'), sortable: true },
    { key: 'pedidos', header: t('orders'), align: 'right', sortable: true },
    { key: 'ventasTotales', header: t('sales'), align: 'right', sortable: true, render: (r) => fmt(r.ventasTotales) },
    { key: 'visitas', header: t('visits'), align: 'right', sortable: true },
    { key: 'ultimaVisita', header: t('lastVisit'), sortable: true, render: (r) => fmtDate(r.ultimaVisita) },
    { key: 'ultimoPedido', header: t('lastOrder'), sortable: true, render: (r) => fmtDate(r.ultimoPedido) },
  ];

  const totalVentas = data.reduce((s, c) => s + c.ventasTotales, 0);
  const totalPedidos = data.reduce((s, c) => s + c.pedidos, 0);

  const handleApply = () => { setPage(1); fetchData(1); };

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={handleApply} loading={loading} onExportPDF={data.length > 0 ? exportPDF : undefined} exporting={exporting} />

      <ReportKPICards cards={[
        { label: tc('clients'), value: total, color: 'blue' },
        { label: t('totalSales'), value: fmt(totalVentas), color: 'green' },
        { label: t('totalOrders'), value: totalPedidos, color: 'amber' },
      ]} />

      <ReportTable
        data={data as unknown as Record<string, unknown>[]}
        columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
        showIndex
        maxHeight="600px"
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {tc('showing', { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 px-2">{tc('page', { page, totalPages })}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
