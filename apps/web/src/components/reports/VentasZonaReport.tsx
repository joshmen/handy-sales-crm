'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getVentasZona, VentaZona, VentasZonaResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const COLORS = ['#16a34a', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#059669'];

export function VentasZonaReport() {
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<VentasZonaResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVentasZona(dates);
      setData(res);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  }, [dates]);

  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<VentaZona>[] = [
    { key: 'nombre', header: 'Zona', sortable: true },
    { key: 'totalClientes', header: 'Clientes', align: 'right', sortable: true },
    { key: 'pedidos', header: 'Pedidos', align: 'right', sortable: true },
    { key: 'ventasTotales', header: 'Ventas Totales', align: 'right', sortable: true, render: (r) => fmt(r.ventasTotales) },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} />

      {data && (
        <>
          <ReportKPICards cards={[
            { label: 'Total Ventas', value: fmt(data.totales.totalVentas), color: 'green' },
            { label: 'Total Pedidos', value: data.totales.totalPedidos, color: 'blue' },
            { label: 'Total Clientes', value: data.totales.totalClientes, color: 'amber' },
          ]} />

          {data.zonas.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.zonas.filter(z => z.ventasTotales > 0)}
                    dataKey="ventasTotales"
                    nameKey="nombre"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ nombre, percent }) => `${nombre} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={{ strokeWidth: 1 }}
                  >
                    {data.zonas.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <ReportTable
            data={data.zonas as unknown as Record<string, unknown>[]}
            columns={columns as ReportColumn<Record<string, unknown>>[]}
            footerRow={{ nombre: 'TOTAL', totalClientes: data.totales.totalClientes, pedidos: data.totales.totalPedidos, ventasTotales: fmt(data.totales.totalVentas) }}
          />
        </>
      )}
    </div>
  );
}
