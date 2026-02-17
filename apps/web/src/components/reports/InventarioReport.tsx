'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getInventario, InventarioProducto } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { RefreshCw } from 'lucide-react';

const estadoColors: Record<string, { bg: string; text: string; label: string; pie: string }> = {
  sin_stock: { bg: 'bg-red-100', text: 'text-red-700', label: 'Sin Stock', pie: '#dc2626' },
  bajo: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Stock Bajo', pie: '#d97706' },
  normal: { bg: 'bg-green-100', text: 'text-green-700', label: 'Normal', pie: '#16a34a' },
  exceso: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Exceso', pie: '#2563eb' },
};

export function InventarioReport() {
  const [data, setData] = useState<{ productos: InventarioProducto[]; resumen: { total: number; sinStock: number; bajo: number; normal: number; exceso: number } } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getInventario();
      setData(res);
    } catch { toast.error('Error al cargar inventario'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<InventarioProducto>[] = [
    { key: 'nombre', header: 'Producto', sortable: true },
    { key: 'codigoBarra', header: 'Código' },
    { key: 'stockActual', header: 'Actual', align: 'right', sortable: true },
    { key: 'stockMinimo', header: 'Mínimo', align: 'right' },
    { key: 'stockMaximo', header: 'Máximo', align: 'right' },
    {
      key: 'estado', header: 'Estado', align: 'center', sortable: true,
      render: (r) => {
        const c = estadoColors[r.estado];
        return <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${c.bg} ${c.text}`}>{c.label}</span>;
      }
    },
  ];

  const pieData = data ? [
    { name: 'Sin Stock', value: data.resumen.sinStock },
    { name: 'Stock Bajo', value: data.resumen.bajo },
    { name: 'Normal', value: data.resumen.normal },
    { name: 'Exceso', value: data.resumen.exceso },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button onClick={fetch} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {data && (
        <>
          <ReportKPICards cards={[
            { label: 'Total Productos', value: data.resumen.total, color: 'gray' },
            { label: 'Sin Stock', value: data.resumen.sinStock, color: data.resumen.sinStock > 0 ? 'red' : 'gray' },
            { label: 'Stock Bajo', value: data.resumen.bajo, color: data.resumen.bajo > 0 ? 'amber' : 'gray' },
            { label: 'Normal', value: data.resumen.normal, color: 'green' },
          ]} />

          {pieData.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((d, i) => (
                      <Cell key={i} fill={estadoColors[Object.keys(estadoColors)[['Sin Stock', 'Stock Bajo', 'Normal', 'Exceso'].indexOf(d.name)]]?.pie || '#999'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <ReportTable
            data={data.productos as unknown as Record<string, unknown>[]}
            columns={columns as ReportColumn<Record<string, unknown>>[]}
            maxHeight="600px"
          />
        </>
      )}
    </div>
  );
}
