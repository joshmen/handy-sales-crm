'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ReportFilters } from './ReportFilters';
import { ReportKPICards } from './ReportKPICards';
import { ReportTable, ReportColumn } from './ReportTable';
import { getActividadClientes, ActividadCliente } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

function defaultDates() {
  const h = new Date();
  const d = new Date(h);
  d.setMonth(d.getMonth() - 1);
  return { desde: d.toISOString().slice(0, 10), hasta: h.toISOString().slice(0, 10) };
}

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '-';

export function ActividadClientesReport() {
  const [dates, setDates] = useState(defaultDates);
  const [data, setData] = useState<ActividadCliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const limit = 30;

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getActividadClientes({ ...dates, page, limit });
      setData(res.clientes);
      setTotal(res.total);
    } catch { toast.error('Error al cargar reporte'); }
    finally { setLoading(false); }
  }, [dates, page]);

  useEffect(() => { fetch(); }, []);

  const totalPages = Math.ceil(total / limit);

  const columns: ReportColumn<ActividadCliente>[] = [
    { key: 'nombre', header: 'Cliente', sortable: true },
    { key: 'zona', header: 'Zona', sortable: true },
    { key: 'pedidos', header: 'Pedidos', align: 'right', sortable: true },
    { key: 'ventasTotales', header: 'Ventas', align: 'right', sortable: true, render: (r) => fmt(r.ventasTotales) },
    { key: 'visitas', header: 'Visitas', align: 'right', sortable: true },
    { key: 'ultimaVisita', header: 'Últ. Visita', sortable: true, render: (r) => fmtDate(r.ultimaVisita) },
    { key: 'ultimoPedido', header: 'Últ. Pedido', sortable: true, render: (r) => fmtDate(r.ultimoPedido) },
  ];

  const totalVentas = data.reduce((s, c) => s + c.ventasTotales, 0);
  const totalPedidos = data.reduce((s, c) => s + c.pedidos, 0);

  return (
    <div className="space-y-4">
      <ReportFilters desde={dates.desde} hasta={dates.hasta} onDesdeChange={v => setDates(d => ({ ...d, desde: v }))} onHastaChange={v => setDates(d => ({ ...d, hasta: v }))} onApply={() => { setPage(1); fetch(); }} loading={loading} />

      <ReportKPICards cards={[
        { label: 'Clientes', value: total, color: 'blue' },
        { label: 'Total Ventas', value: fmt(totalVentas), color: 'green' },
        { label: 'Total Pedidos', value: totalPedidos, color: 'amber' },
      ]} />

      <ReportTable
        data={data as unknown as Record<string, unknown>[]}
        columns={columns as ReportColumn<Record<string, unknown>>[]}
        showIndex
        maxHeight="600px"
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => { setPage(p => p - 1); fetch(); }} disabled={page <= 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-600 px-2">Pág. {page}/{totalPages}</span>
            <button onClick={() => { setPage(p => p + 1); fetch(); }} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
