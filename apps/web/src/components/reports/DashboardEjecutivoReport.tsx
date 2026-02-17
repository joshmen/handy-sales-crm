'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getDashboardEjecutivo, DashboardEjecutivoResponse } from '@/services/api/reports';
import { toast } from '@/hooks/useToast';
import { TrendingUp, TrendingDown, ShoppingCart, Eye, UserPlus, Trophy, Star, AlertTriangle, Loader2 } from 'lucide-react';

const fmt = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function DashboardEjecutivoReport() {
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre'>('mes');
  const [data, setData] = useState<DashboardEjecutivoResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getDashboardEjecutivo({ periodo });
      setData(res);
    } catch { toast.error('Error al cargar dashboard'); }
    finally { setLoading(false); }
  }, [periodo]);

  useEffect(() => { fetch(); }, [periodo]);

  const periodoLabel = periodo === 'semana' ? 'esta semana' : periodo === 'trimestre' ? 'este trimestre' : 'este mes';

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Resumen ejecutivo <span className="font-medium text-gray-900">{periodoLabel}</span></p>
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

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}

      {data && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {/* Ventas */}
          <div className="col-span-1 md:col-span-2 xl:col-span-2 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <h3 className="text-sm font-semibold text-green-800">Ventas</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-bold text-green-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{fmt(data.ventas.total)}</p>
                <p className="text-xs text-green-700">Total ventas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.ventas.pedidos}</p>
                <p className="text-xs text-green-700">Pedidos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{fmt(data.ventas.ticketPromedio)}</p>
                <p className="text-xs text-green-700">Ticket promedio</p>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  <p className={`text-2xl font-bold ${data.ventas.crecimientoPct >= 0 ? 'text-green-900' : 'text-red-600'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
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
            <p className="text-3xl font-bold text-blue-900 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.visitas.total}</p>
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
            <p className="text-3xl font-bold text-amber-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{data.nuevosClientes}</p>
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
