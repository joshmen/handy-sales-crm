'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportFilters } from './ReportFilters';
import { useChartTheme } from '@/hooks/useChartTheme';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getNuevosClientes, NuevoCliente } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';
import { formatDate as libFmtDate } from '@/lib/formatters';
import { useTranslations } from 'next-intl';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 3);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const fmtDate = (d: string) => libFmtDate(d, null, { day: '2-digit', month: 'short', year: 'numeric' });

export function NuevosClientesReport() {
  const { formatDate } = useFormatters();
  const t = useTranslations('reports.nuevosClientes');
  const tc = useTranslations('reports.common');
  const [dates, setDates] = useState(defaultDates);
  const ct = useChartTheme();
  const [data, setData] = useState<{ clientes: NuevoCliente[]; total: number; porMes: { mes: string; cantidad: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getNuevosClientes(dates);
      setData(res);
    } catch { toast.error(tc('errorLoading')); }
    finally { setLoading(false); }
  }, [dates]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, []);

  const columns: ReportColumn<NuevoCliente>[] = [
    { key: 'nombre', header: t('client'), sortable: true },
    { key: 'zona', header: t('zone'), sortable: true },
    { key: 'correo', header: t('email') },
    { key: 'telefono', header: t('phone') },
    { key: 'fechaCreacion', header: tc('date'), sortable: true, render: (r) => fmtDate(r.fechaCreacion) },
    { key: 'creadoPor', header: t('createdBy') },
  ];

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={fetch} loading={loading} />

      {data && (
        <>
          <ReportKPICards cards={[
            { label: t('newClients'), value: data.total, color: 'green' },
          ]} />

          {data.porMes.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-medium text-gray-600 mb-3">{t('perMonth')}</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.porMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#16a34a" radius={[4, 4, 0, 0]} name={tc('clients')} />
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
