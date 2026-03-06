'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getDashboardEjecutivo, DashboardEjecutivoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { TrendingUp, TrendingDown, ShoppingCart, Eye, UserPlus, Trophy, Star, AlertTriangle, Loader2, Download } from 'lucide-react';
import { useReportExport } from '@/hooks/useReportExport';
import { useFormatters } from '@/hooks/useFormatters';


export function DashboardEjecutivoReport() {
  const { formatCurrency } = useFormatters();
  const fmt = (n: number) => formatCurrency(n);
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre'>('mes');
  const [data, setData] = useState<DashboardEjecutivoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const { exportPDF, exporting } = useReportExport({
    fileName: 'dashboard-ejecutivo',
    title: 'Dashboard Ejecutivo',
    kpis: data ? [
      { label: 'Ventas', value: fmt(data.ventas.total) },
      { label: 'Pedidos', value: data.ventas.pedidos },
      { label: 'Visitas', value: data.visitas.total },
      { label: 'Nuevos Clientes', value: data.nuevosClientes },
    ] : undefined,
    fallbackRef: contentRef,
  });

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboardEjecutivo({ periodo });
      setData(res);
    } catch { toast.error('Error al cargar dashboard'); }
    finally { setLoading(false); }
  }, [periodo]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetch(); }, [periodo]);

  const periodoLabel = periodo === 'semana' ? 'esta semana' : periodo === 'trimestre' ? 'este trimestre' : 'este mes';

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Resumen ejecutivo <span className="font-medium text-gray-900">{periodoLabel}</span></p>
        <div className="flex items-center gap-2">
          {data && !loading && (
            <button onClick={exportPDF} disabled={exporting} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50" title="Exportar a PDF">
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              PDF
            </button>
          )}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['semana', 'mes', 'trimestre'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodo === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {p === 'semana' ? 'Semana' : p === 'mes' ? 'Mes' : 'Trimestre'}
            </button>
          ))}
        </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {data && !loading && (
        <div ref={contentRef} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Ventas */}
          <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-semibold text-green-800">Ventas</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-green-900">{fmt(data.ventas.total)}</p>
                <p className="text-xs text-green-700">Total ventas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{data.ventas.pedidos}</p>
                <p className="text-xs text-green-700">Pedidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{fmt(data.ventas.ticketPromedio)}</p>
                <p className="text-xs text-green-700">Ticket promedio</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={`text-2xl font-bold ${data.ventas.crecimientoPct >= 0 ? 'text-green-900' : 'text-red-600'}`}>
                    {data.ventas.crecimientoPct > 0 ? '+' : ''}{data.ventas.crecimientoPct}%
                  </p>
                  {data.ventas.crecimientoPct >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-500" />}
                </div>
                <p className="text-xs text-green-700">vs período anterior</p>
              </div>
            </div>
          </div>

          {/* Visitas */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-blue-800">Visitas</h3>
            </div>
            <p className="text-3xl font-bold text-blue-900 mb-1">{data.visitas.total}</p>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-green-700">{data.visitas.conVenta} con venta</span>
              <span className="text-gray-500">{data.visitas.sinVenta} sin venta</span>
            </div>
            <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${data.visitas.efectividadPct}%` }} />
            </div>
            <p className="text-xs text-blue-700 mt-1">{data.visitas.efectividadPct}% efectividad</p>
          </div>

          {/* Nuevos Clientes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-semibold text-amber-800">Nuevos Clientes</h3>
            </div>
            <p className="text-3xl font-bold text-amber-900">{data.nuevosClientes}</p>
            <p className="text-xs text-amber-700 mt-1">{periodoLabel}</p>
          </div>

          {/* Top Vendedor */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-purple-600" />
              <h3 className="text-sm font-semibold text-purple-800">Top Vendedor</h3>
            </div>
            {data.topVendedor ? (
              <>
                <p className="text-lg font-bold text-purple-900">{data.topVendedor.nombre}</p>
                <p className="text-sm text-purple-700">{fmt(data.topVendedor.totalVentas)}</p>
              </>
            ) : (
              <p className="text-sm text-purple-600">Sin datos</p>
            )}
          </div>

          {/* Top Producto */}
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-pink-600" />
              <h3 className="text-sm font-semibold text-pink-800">Producto Estrella</h3>
            </div>
            {data.topProducto ? (
              <>
                <p className="text-lg font-bold text-pink-900">{data.topProducto.nombre}</p>
                <p className="text-sm text-pink-700">{fmt(data.topProducto.totalVentas)} ({data.topProducto.cantidadVendida} uds)</p>
              </>
            ) : (
              <p className="text-sm text-pink-600">Sin datos</p>
            )}
          </div>

          {/* Alertas */}
          {data.alertas.inventarioBajo > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-semibold text-red-800">Alertas</h3>
              </div>
              <p className="text-sm text-red-700">
                <span className="font-bold">{data.alertas.inventarioBajo}</span> productos con stock bajo o sin stock
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
