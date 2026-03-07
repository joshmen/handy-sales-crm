'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { useChartTheme } from '@/hooks/useChartTheme';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasVendedor, VentaVendedor } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}


export function VentasVendedorReport() {
  const { formatCurrency } = useFormatters();
  const fmt = (n: number) => formatCurrency(n);
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<VentaVendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'ventas-vendedor',
    title: 'Ventas por Vendedor',
    dateRange: dates,
    kpis: data.length > 0 ? data.slice(0, 3).map((v, i) => ({
      label: `#${i + 1} ${v.nombre}`,
      value: fmt(v.totalVentas),
    })) : undefined,
    chartRef,
    table: data.length > 0 ? {
      headers: ['Vendedor', 'Total Ventas', 'Pedidos', 'Ticket Prom.', 'Visitas', 'Con Venta', 'Efectividad'],
      rows: data.map(v => [v.nombre, fmt(v.totalVentas), v.cantidadPedidos, fmt(v.ticketPromedio), v.totalVisitas, v.visitasConVenta, `${v.efectividadVisitas}%`]),
    } : undefined,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVentasVendedor(dates);
      setData(res.vendedores);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  }, [dates]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<VentaVendedor>[] = [
    { key: 'nombre', header: 'Vendedor', sortable: true },
    { key: 'totalVentas', header: 'Total Ventas', align: 'right', sortable: true, render: (r) => fmt(r.totalVentas) },
    { key: 'cantidadPedidos', header: 'Pedidos', align: 'right', sortable: true },
    { key: 'ticketPromedio', header: 'Ticket Prom.', align: 'right', sortable: true, render: (r) => fmt(r.ticketPromedio) },
    { key: 'totalVisitas', header: 'Visitas', align: 'right', sortable: true },
    { key: 'visitasConVenta', header: 'Con Venta', align: 'right', sortable: true },
    { key: 'efectividadVisitas', header: 'Efectividad', align: 'right', sortable: true, render: (r) => `${r.efectividadVisitas}%` },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} onExportPDF={data.length > 0 ? exportPDF : undefined} exporting={exporting} />

      {data.length > 0 && (
        <>
          {/* Cards by vendor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((v, i) => (
              <div key={v.usuarioId} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{v.nombre}</p>
                      <p className="text-xs text-gray-500">{v.email}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-lg font-bold text-green-700">{fmt(v.totalVentas)}</p>
                    <p className="text-[10px] text-green-600">Ventas</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <p className="text-lg font-bold text-blue-700">{v.cantidadPedidos}</p>
                    <p className="text-[10px] text-blue-600">Pedidos</p>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded">
                    <p className="text-lg font-bold text-amber-700">{v.totalVisitas}</p>
                    <p className="text-[10px] text-amber-600">Visitas</p>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <p className="text-lg font-bold text-purple-700">{v.efectividadVisitas}%</p>
                    <p className="text-[10px] text-purple-600">Efectividad</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          <div ref={chartRef} className="bg-white border border-gray-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(v) => [fmt(Number(v)), 'Ventas']} />
                <Bar dataKey="totalVentas" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ReportTable
            data={data as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            showIndex
          />
        </>
      )}

      {!loading && data.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-500">Sin datos para el período seleccionado</div>
      )}
    </div>
  );
}
