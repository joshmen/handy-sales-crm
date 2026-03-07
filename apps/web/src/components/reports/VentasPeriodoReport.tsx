'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { useChartTheme } from '@/hooks/useChartTheme';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasPeriodo, VentaPeriodo, VentasPeriodoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}


export function VentasPeriodoReport() {
  const { formatCurrency } = useFormatters();
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [agrupacion, setAgrupacion] = useState<'dia' | 'semana' | 'mes'>('dia');
  const [data, setData] = useState<VentasPeriodoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'ventas-periodo',
    title: 'Ventas por Período',
    dateRange: dates,
    kpis: data ? [
      { label: 'Total Ventas', value: fmt(data.totales.totalVentas) },
      { label: 'Pedidos', value: data.totales.cantidadPedidos },
      { label: 'Ticket Promedio', value: fmt(data.totales.ticketPromedio) },
    ] : undefined,
    chartRef,
    table: data ? {
      headers: ['Período', 'Pedidos', 'Total Ventas', 'Ticket Promedio'],
      rows: data.periodos.map(p => [p.fecha, p.cantidadPedidos, fmt(p.totalVentas), fmt(p.ticketPromedio)]),
      footerRow: ['TOTAL', data.totales.cantidadPedidos, fmt(data.totales.totalVentas), fmt(data.totales.ticketPromedio)],
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVentasPeriodo({ ...dates, agrupacion });
      setData(res);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  }, [dates, agrupacion]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<VentaPeriodo>[] = [
    { key: 'fecha', header: 'Período', sortable: true },
    { key: 'cantidadPedidos', header: 'Pedidos', align: 'right', sortable: true },
    { key: 'totalVentas', header: 'Total Ventas', align: 'right', sortable: true, render: (r) => fmt(r.totalVentas) },
    { key: 'ticketPromedio', header: 'Ticket Promedio', align: 'right', sortable: true, render: (r) => fmt(r.ticketPromedio) },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data ? exportPDF : undefined} exporting={exporting}>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Agrupar por</label>
          <select value={agrupacion} onChange={e => setAgrupacion(e.target.value as 'dia' | 'semana' | 'mes')} className="px-3 py-2 text-sm border border-gray-300 rounded-md">
            <option value="dia">Día</option>
            <option value="semana">Semana</option>
            <option value="mes">Mes</option>
          </select>
        </div>
      </ReportFilters>

      {data && (
        <>
          <ReportKPICards cards={[
            { label: 'Total Ventas', value: fmt(data.totales.totalVentas), color: 'green' },
            { label: 'Pedidos', value: data.totales.cantidadPedidos, color: 'blue' },
            { label: 'Ticket Promedio', value: fmt(data.totales.ticketPromedio), color: 'amber' },
          ]} />

          {data.periodos.length > 0 && (
            <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                {agrupacion === 'dia' ? (
                  <LineChart data={data.periodos}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [fmt(Number(v)), 'Ventas']} />
                    <Line type="monotone" dataKey="totalVentas" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                ) : (
                  <BarChart data={data.periodos}>
                    <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                    <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => [fmt(Number(v)), 'Ventas']} />
                    <Bar dataKey="totalVentas" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          <ReportTable
            data={data.periodos as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            footerRow={{ fecha: 'TOTAL', cantidadPedidos: data.totales.cantidadPedidos, totalVentas: fmt(data.totales.totalVentas), ticketPromedio: fmt(data.totales.ticketPromedio) }}
          />
        </>
      )}
    </div>
  );
}
