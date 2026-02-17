'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasProducto, VentasProductoResponse, VentaProducto } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

type Tab = 'masVendidos' | 'mayorVenta' | 'sinVenta';

export function VentasProductoReport() {
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<VentasProductoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('masVendidos');

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVentasProducto({ ...dates, top: 20 });
      setData(res);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { fetch(); }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'masVendidos', label: 'Más Vendidos' },
    { key: 'mayorVenta', label: 'Mayor Venta' },
    { key: 'sinVenta', label: 'Sin Venta' },
  ];

  const productColumns: ReportColumn<VentaProducto>[] = [
    { key: 'nombre', header: 'Producto', sortable: true },
    { key: 'cantidadVendida', header: 'Cantidad', align: 'right', sortable: true },
    { key: 'totalVentas', header: 'Total Ventas', align: 'right', sortable: true, render: (r) => fmt(r.totalVentas) },
    { key: 'porcentajeDelTotal', header: '% del Total', align: 'right', sortable: true, render: (r) => `${r.porcentajeDelTotal}%` },
  ];

  const sinVentaColumns: ReportColumn<{ productoId: number; nombre: string }>[] = [
    { key: 'nombre', header: 'Producto', sortable: true },
  ];

  const currentData = data ? (tab === 'sinVenta' ? data.sinVenta : data[tab]) : [];
  const chartData = data ? data[tab === 'sinVenta' ? 'masVendidos' : tab].slice(0, 10) : [];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} />

      {data && (
        <>
          <ReportKPICards cards={[
            { label: 'Total Ventas', value: fmt(data.totalGeneral), color: 'green' },
            { label: 'Productos Vendidos', value: data.masVendidos.length, color: 'blue' },
            { label: 'Sin Venta', value: data.sinVenta.length, color: data.sinVenta.length > 0 ? 'red' : 'gray' },
          ]} />

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t.label}
                {t.key === 'sinVenta' && data.sinVenta.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-100 text-red-700 rounded-full">{data.sinVenta.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Chart for product tabs */}
          {tab !== 'sinVenta' && chartData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => tab === 'masVendidos' ? String(v) : `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10 }} width={150} />
                  <Tooltip formatter={(v: number) => [tab === 'masVendidos' ? v : fmt(v), tab === 'masVendidos' ? 'Cantidad' : 'Ventas']} />
                  <Bar dataKey={tab === 'masVendidos' ? 'cantidadVendida' : 'totalVentas'} fill={tab === 'masVendidos' ? '#2563eb' : '#16a34a'} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tab === 'sinVenta' ? (
            <ReportTable
              data={data.sinVenta as unknown as Record<string, unknown>[]}
              columns={sinVentaColumns as ReportColumn<Record<string, unknown>>[]}
              showIndex
            />
          ) : (
            <ReportTable
              data={(currentData as VentaProducto[]) as unknown as Record<string, unknown>[]}
              columns={productColumns as ReportColumn<Record<string, unknown>>[]}
              showIndex
            />
          )}
        </>
      )}
    </div>
  );
}
