'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getNuevosClientes, NuevoCliente } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const fmtDate = (d: string) => libFmtDate(d, null, { day: '2-digit', month: 'short', year: 'numeric' });

export function NuevosClientesReport() {
  const { formatDate } = useFormatters();
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<{ clientes: NuevoCliente[]; total: number; porMes: { mes: string; cantidad: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNuevosClientes(dates);
      setData(res);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  }, [dates]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<NuevoCliente>[] = [
    { key: 'nombre', header: 'Cliente', sortable: true },
    { key: 'zona', header: 'Zona', sortable: true },
    { key: 'correo', header: 'Correo' },
    { key: 'telefono', header: 'Teléfono' },
    { key: 'fechaCreacion', header: 'Fecha', sortable: true, render: (r) => fmtDate(r.fechaCreacion) },
    { key: 'creadoPor', header: 'Creado por' },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} />

      {data && (
        <>
          <ReportKPICards cards={[
            { label: 'Nuevos Clientes', value: data.total, color: 'green' },
          ]} />

          {data.porMes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 mb-3">Nuevos clientes por mes</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#16a34a" radius={[4, 4, 0, 0]} name="Clientes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <ReportTable
            data={data.clientes as unknown as Record<string, unknown>[]}
            columns={columns as unknown as ReportColumn<Record<string, unknown>>[]}
            showIndex
          />
        </>
      )}
    </div>
  );
}
