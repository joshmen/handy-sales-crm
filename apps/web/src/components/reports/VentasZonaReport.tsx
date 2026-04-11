'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasZona, VentaZona, VentasZonaResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#059669'];

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
    fileName: 'ventas-zona',
    title: t('totalSales'),
    dateRange: dates,
    kpis: data ? [
      { label: t('totalSales'), value: fmt(data.totales.totalVentas) },
      { label: t('totalOrders'), value: data.totales.totalPedidos },
      { label: t('totalClients'), value: data.totales.totalClientes },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: [t('zone'), t('clients'), t('orders'), t('totalSalesCol')],
      rows: data.zonas.map(z => [z.nombre, z.totalClientes, z.pedidos, fmt(z.ventasTotales)]),
      footerRow: [tc('total'), data.totales.totalClientes, data.totales.totalPedidos, fmt(data.totales.totalVentas)],
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVentasZona(dates);
      setData(res);
    } catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<VentaZona>[] = [
    { key: 'nombre', header: t('zone'), sortable: true },
    { key: 'totalClientes', header: t('clients'), align: 'right', sortable: true },
    { key: 'pedidos', header: t('orders'), align: 'right', sortable: true },
    { key: 'ventasTotales', header: t('totalSalesCol'), align: 'right', sortable: true, render: (r) => fmt(r.ventasTotales) },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting} />

      {data && (
        <>
          <ReportKPICards cards={[
            { label: t('totalSales'), value: fmt(data.totales.totalVentas), color: 'green' },
            { label: t('totalOrders'), value: data.totales.totalPedidos, color: 'blue' },
            { label: t('totalClients'), value: data.totales.totalClientes, color: 'amber' },
          ]} />

          {data.zonas.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.zonas.filter(z => z.ventasTotales > 0)}
                    dataKey="ventasTotales"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(entry: PieLabelRenderProps) => `${entry.name} (${((entry.percent ?? 0) * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {data.zonas.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
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
