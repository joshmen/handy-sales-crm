'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, CierreResumen, RetornoItem, ESTADO_RUTA, ESTADO_RUTA_LABELS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  Loader2,
  User,
  DollarSign,
  ArrowDown,
  ArrowUp,
  Minus as MinusIcon,
  Plus as PlusIcon,
  Lock,
  AlertTriangle,
  X,
  Package,
} from 'lucide-react';

type TabKey = 'pendiente' | 'aceptada' | 'terminada' | 'cerrada';

const TABS: { key: TabKey; label: string; estados: number[] }[] = [
  { key: 'pendiente', label: 'Pendiente de aceptar', estados: [ESTADO_RUTA.PendienteAceptar] },
  { key: 'aceptada', label: 'Carga aceptada', estados: [ESTADO_RUTA.CargaAceptada, ESTADO_RUTA.EnProgreso] },
  { key: 'terminada', label: 'Terminada', estados: [ESTADO_RUTA.Completada] },
  { key: 'cerrada', label: 'Cerrada', estados: [ESTADO_RUTA.Cerrada] },
];

export default function CloseRoutePage() {
  const params = useParams();
  const router = useRouter();
  const rutaId = Number(params.id);

  const [ruta, setRuta] = useState<RouteDetail | null>(null);
  const [resumen, setResumen] = useState<CierreResumen | null>(null);
  const [retorno, setRetorno] = useState<RetornoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('terminada');
  const [montoRecibido, setMontoRecibido] = useState<string>('');

  const isReadonly = ruta?.estado === ESTADO_RUTA.Cerrada;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rutaData, resumenData, retornoData] = await Promise.all([
        routeService.getRuta(rutaId),
        routeService.getResumenCierre(rutaId),
        routeService.getRetornoInventario(rutaId),
      ]);
      setRuta(rutaData);
      setResumen(resumenData);
      setRetorno(retornoData);
      setMontoRecibido(rutaData.montoRecibido?.toString() || '');

      // Set active tab based on estado
      const tab = TABS.find(t => t.estados.includes(rutaData.estado));
      if (tab) setActiveTab(tab.key);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al cargar datos del cierre');
    } finally {
      setLoading(false);
    }
  }, [rutaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetornoChange = async (productoId: number, field: 'mermas' | 'recAlmacen' | 'cargaVehiculo', delta: number) => {
    const item = retorno.find(r => r.productoId === productoId);
    if (!item || isReadonly) return;

    const newValue = Math.max(0, item[field] + delta);
    const updated = retorno.map(r =>
      r.productoId === productoId
        ? {
            ...r,
            [field]: newValue,
            diferencia: r.cantidadInicial - r.vendidos - r.entregados - r.devueltos -
              (field === 'mermas' ? newValue : r.mermas) -
              (field === 'recAlmacen' ? newValue : r.recAlmacen) -
              (field === 'cargaVehiculo' ? newValue : r.cargaVehiculo),
          }
        : r
    );
    setRetorno(updated);

    try {
      const updatedItem = updated.find(r => r.productoId === productoId)!;
      await routeService.updateRetorno(rutaId, productoId, {
        mermas: updatedItem.mermas,
        recAlmacen: updatedItem.recAlmacen,
        cargaVehiculo: updatedItem.cargaVehiculo,
      });
    } catch (err) {
      toast.error('Error al actualizar retorno');
      fetchData();
    }
  };

  const handleSetAllDiferencia = (target: 'recAlmacen' | 'cargaVehiculo') => {
    if (isReadonly) return;
    const updated = retorno.map(r => {
      if (r.diferencia <= 0) return r;
      const newVal = r[target] + r.diferencia;
      return {
        ...r,
        [target]: newVal,
        diferencia: 0,
      };
    });
    setRetorno(updated);

    // Batch update
    updated.forEach(async (item) => {
      try {
        await routeService.updateRetorno(rutaId, item.productoId, {
          mermas: item.mermas,
          recAlmacen: item.recAlmacen,
          cargaVehiculo: item.cargaVehiculo,
        });
      } catch { /* silent */ }
    });
  };

  const handleCerrarRuta = async () => {
    if (!montoRecibido) {
      toast.error('Ingresa el monto recibido');
      return;
    }
    if (!confirm('¿Cerrar esta ruta? Esta acción no se puede deshacer.')) return;

    try {
      setClosing(true);
      await routeService.cerrarRuta(rutaId, {
        montoRecibido: parseFloat(montoRecibido),
        retornos: retorno.map(r => ({
          productoId: r.productoId,
          mermas: r.mermas,
          recAlmacen: r.recAlmacen,
          cargaVehiculo: r.cargaVehiculo,
        })),
      });
      toast.success('Ruta cerrada exitosamente');
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Error al cerrar ruta');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-sm text-gray-500">Cargando cierre...</span>
        </div>
      </div>
    );
  }

  if (!ruta || !resumen) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Ruta no encontrada</p>
      </div>
    );
  }

  const estadoBadge = ESTADO_RUTA_LABELS[ruta.estado] || 'Desconocido';
  const estadoColor = ESTADO_RUTA_COLORS[ruta.estado] || 'bg-gray-100 text-gray-800';
  const diferencia = montoRecibido ? parseFloat(montoRecibido) - resumen.aRecibir : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Rutas', href: '/routes/manage' },
          { label: 'Admin. rutas', href: '/routes/manage' },
          { label: 'Cierre de ruta' },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Cierre de ruta
            </h1>
            <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${estadoColor}`}>
              {estadoBadge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {ruta.estado === ESTADO_RUTA.Completada && (
              <button
                data-tour="routes-close-btn"
                onClick={handleCerrarRuta}
                disabled={closing}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Cerrar ruta
              </button>
            )}
            <button
              onClick={() => router.push('/routes/manage')}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div data-tour="routes-close-tabs" className="flex mt-4 border-b border-gray-200 -mb-6">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 overflow-auto">
        {/* Alert if not in correct state */}
        {ruta.estado === ESTADO_RUTA.PendienteAceptar && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">Inventario pendiente de aceptar por el vendedor</p>
          </div>
        )}

        {/* Section: Route Details */}
        <div data-tour="routes-close-details" className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Detalles de la ruta</h2>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{ruta.usuarioNombre}</p>
              <p className="text-xs text-gray-500">
                Ruta: {ruta.nombre} | Zona: {ruta.zonaNombre || 'Sin zona'} | Creado: {new Date(ruta.creadoEn).toLocaleDateString('es-MX')}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div data-tour="routes-close-financial" className="grid grid-cols-3 gap-4">
          {/* Efectivo entrante */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDown className="w-4 h-4 text-green-600" />
              <h3 className="text-xs font-semibold text-gray-700">Efectivo entrante</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Ventas contado ({resumen.ventasContadoCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.ventasContado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Entregas cobradas ({resumen.entregasCobradasCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.entregasCobradas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Cobranza adeudos ({resumen.cobranzaAdeudosCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.cobranzaAdeudos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Movimientos a saldo */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold text-gray-700">Movimientos a saldo</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Ventas crédito ({resumen.ventasCreditoCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.ventasCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Entregas crédito ({resumen.entregasCreditoCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.entregasCredito.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Saldo a favor ({resumen.entregasContadoSaldoFavorCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.entregasContadoSaldoFavor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Otros movimientos */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-gray-600" />
              <h3 className="text-xs font-semibold text-gray-700">Otros movimientos</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Pedidos preventa ({resumen.pedidosPreventaCount})</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.pedidosPreventa.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Devoluciones ({resumen.devolucionesCount})</span>
                <span className="font-medium text-red-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.devoluciones.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Al inicio vs Al cierre */}
        <div className="grid grid-cols-2 gap-4">
          {/* Al inicio */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Al inicio</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Valor de la ruta</span>
                <span className="font-medium text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.valorRuta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Efectivo inicial</span>
                <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.efectivoInicial.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Al cierre */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-3">Al cierre</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">A recibir</span>
                <span className="font-medium text-lg" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${resumen.aRecibir.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-gray-500">Recibido</span>
                {isReadonly ? (
                  <span className="font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>${(resumen.recibido ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                ) : (
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    step="0.01"
                    className="w-32 px-2 py-1 text-right text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                    style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                  />
                )}
              </div>
              {diferencia !== null && (
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span className="text-gray-500">Diferencia</span>
                  <span className={`font-bold text-lg ${diferencia < 0 ? 'text-red-600' : diferencia > 0 ? 'text-green-600' : 'text-gray-900'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    {diferencia >= 0 ? '+' : ''}${diferencia.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventario de retorno */}
        <div data-tour="routes-close-inventory" className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Inventario de retorno</h2>
            {!isReadonly && (
              <div data-tour="routes-close-actions" className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Diferencia a:</span>
                <button
                  onClick={() => handleSetAllDiferencia('recAlmacen')}
                  className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  Almacén
                </button>
                <button
                  onClick={() => handleSetAllDiferencia('cargaVehiculo')}
                  className="px-3 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  Carga
                </button>
              </div>
            )}
          </div>

          {retorno.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No hay inventario de retorno</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-600">Producto</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-600">Ventas($)</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Inicial</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Vendidos</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Entregados</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Devueltos</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Mermas</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Rec. almacén</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Carga veh.</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600">Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {retorno.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <span className="text-[12px] text-gray-900">{item.productoNombre}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-[12px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        ${item.ventasMonto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-gray-900 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.cantidadInicial}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.vendidos}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.entregados}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.devueltos}
                      </td>
                      {/* Mermas stepper */}
                      <td className="py-1 px-1 text-center">
                        <Stepper
                          value={item.mermas}
                          onDecrement={() => handleRetornoChange(item.productoId, 'mermas', -1)}
                          onIncrement={() => handleRetornoChange(item.productoId, 'mermas', 1)}
                          disabled={isReadonly}
                        />
                      </td>
                      {/* Rec almacen stepper */}
                      <td className="py-1 px-1 text-center">
                        <Stepper
                          value={item.recAlmacen}
                          onDecrement={() => handleRetornoChange(item.productoId, 'recAlmacen', -1)}
                          onIncrement={() => handleRetornoChange(item.productoId, 'recAlmacen', 1)}
                          disabled={isReadonly}
                        />
                      </td>
                      {/* Carga vehiculo stepper */}
                      <td className="py-1 px-1 text-center">
                        <Stepper
                          value={item.cargaVehiculo}
                          onDecrement={() => handleRetornoChange(item.productoId, 'cargaVehiculo', -1)}
                          onIncrement={() => handleRetornoChange(item.productoId, 'cargaVehiculo', 1)}
                          disabled={isReadonly}
                        />
                      </td>
                      {/* Diferencia badge */}
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`inline-flex min-w-[28px] justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full ${
                            item.diferencia > 0
                              ? 'bg-red-100 text-red-700'
                              : item.diferencia < 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                          style={{ fontFamily: 'Space Grotesk, sans-serif' }}
                        >
                          {item.diferencia}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stepper component
function Stepper({ value, onDecrement, onIncrement, disabled }: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <button
        onClick={onDecrement}
        disabled={disabled || value <= 0}
        className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <MinusIcon className="w-3 h-3" />
      </button>
      <span className="w-6 text-center text-[12px] font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
        {value}
      </span>
      <button
        onClick={onIncrement}
        disabled={disabled}
        className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <PlusIcon className="w-3 h-3" />
      </button>
    </div>
  );
}
