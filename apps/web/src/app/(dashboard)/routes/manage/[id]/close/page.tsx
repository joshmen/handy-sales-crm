'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, CierreResumen, RetornoItem, ESTADO_RUTA, ESTADO_RUTA_KEYS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import {
  Loader2,
  User,
  ArrowDown,
  ArrowUp,
  Minus as MinusIcon,
  Plus as PlusIcon,
  Lock,
  AlertTriangle,
  X,
  Package,
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

export default function CloseRoutePage() {
  const { formatCurrency, formatDate } = useFormatters();
  const ts = useTranslations('routes.status');
  const tl = useTranslations('routes.detail');

  // Lifecycle steps for route status timeline
  const LIFECYCLE_STEPS = [
    { estado: ESTADO_RUTA.PendienteAceptar, label: tl('lifecyclePending') },
    { estado: ESTADO_RUTA.CargaAceptada, label: tl('lifecycleLoadAccepted') },
    { estado: ESTADO_RUTA.EnProgreso, label: tl('lifecycleInProgress') },
    { estado: ESTADO_RUTA.Completada, label: tl('lifecycleCompleted') },
    { estado: ESTADO_RUTA.Cerrada, label: tl('lifecycleClosed') },
  ];
  const params = useParams();
  const router = useRouter();
  const rutaId = Number(params.id);

  const [ruta, setRuta] = useState<RouteDetail | null>(null);
  const [resumen, setResumen] = useState<CierreResumen | null>(null);
  const [retorno, setRetorno] = useState<RetornoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
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
    } catch (_err) {
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
    Promise.all(
      updated.map((item) =>
        routeService.updateRetorno(rutaId, item.productoId, {
          mermas: item.mermas,
          recAlmacen: item.recAlmacen,
          cargaVehiculo: item.cargaVehiculo,
        }).catch(() => { /* silent */ })
      )
    );
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
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || 'Error al cerrar ruta');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-sm text-muted-foreground">Cargando cierre...</span>
        </div>
      </div>
    );
  }

  if (!ruta || !resumen) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Ruta no encontrada</p>
      </div>
    );
  }

  const estadoBadge = ESTADO_RUTA_KEYS[ruta.estado] ? ts(ESTADO_RUTA_KEYS[ruta.estado]) : ts('unknown');
  const estadoColor = ESTADO_RUTA_COLORS[ruta.estado] || 'bg-surface-3 text-foreground';
  const diferencia = montoRecibido ? parseFloat(montoRecibido) - resumen.aRecibir : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-surface-2 px-8 py-6 border-b border-border-subtle">
        <Breadcrumb items={[
          { label: 'Rutas', href: '/routes' },
          { label: ruta.nombre, href: `/routes/${ruta.id}` },
          { label: 'Cierre de ruta' },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
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
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Cerrar ruta
              </button>
            )}
            <button
              onClick={() => router.push('/routes')}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1"
            >
              <X className="w-4 h-4" />
              Cancelar
            </button>
          </div>
        </div>

        {/* Status Timeline */}
        <div data-tour="routes-close-tabs" className="flex items-center mt-4 -mb-6">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const stepOrder = LIFECYCLE_STEPS.findIndex(s => s.estado === ruta.estado);
            const currentIdx = LIFECYCLE_STEPS.findIndex(s => s.estado === step.estado);
            const isCompleted = currentIdx < stepOrder;
            const isCurrent = step.estado === ruta.estado;
            return (
              <React.Fragment key={step.estado}>
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isCompleted ? 'bg-success text-success-foreground' :
                    isCurrent ? 'bg-green-100 border-2 border-green-600 text-green-700' :
                    'bg-surface-3 text-muted-foreground'
                  }`}>
                    {isCompleted ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${
                    isCurrent ? 'text-green-700' : isCompleted ? 'text-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </span>
                </div>
                {idx < LIFECYCLE_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${isCompleted ? 'bg-green-400' : 'bg-surface-3'}`} />
                )}
              </React.Fragment>
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
        <div data-tour="routes-close-details" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Detalles de la ruta</h2>
          <div className="flex items-center gap-4 p-3 bg-surface-1 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{ruta.usuarioNombre}</p>
              <p className="text-xs text-muted-foreground">
                Ruta: {ruta.nombre} | Zona: {ruta.zonaNombre || 'Sin zona'} | Creado: {formatDate(ruta.creadoEn)}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div data-tour="routes-close-financial" className="grid grid-cols-3 gap-4">
          {/* Efectivo entrante */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowDown className="w-4 h-4 text-green-600" />
              <h3 className="text-xs font-semibold text-foreground/80">Efectivo entrante</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ventas contado ({resumen.ventasContadoCount})</span>
                <span className="font-medium">{formatCurrency(resumen.ventasContado)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Entregas cobradas ({resumen.entregasCobradasCount})</span>
                <span className="font-medium">{formatCurrency(resumen.entregasCobradas)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Cobranza adeudos ({resumen.cobranzaAdeudosCount})</span>
                <span className="font-medium">{formatCurrency(resumen.cobranzaAdeudos)}</span>
              </div>
            </div>
          </div>

          {/* Movimientos a saldo */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold text-foreground/80">Movimientos a saldo</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ventas crédito ({resumen.ventasCreditoCount})</span>
                <span className="font-medium">{formatCurrency(resumen.ventasCredito)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Entregas crédito ({resumen.entregasCreditoCount})</span>
                <span className="font-medium">{formatCurrency(resumen.entregasCredito)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Saldo a favor ({resumen.entregasContadoSaldoFavorCount})</span>
                <span className="font-medium">{formatCurrency(resumen.entregasContadoSaldoFavor)}</span>
              </div>
            </div>
          </div>

          {/* Otros movimientos */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-foreground/70" />
              <h3 className="text-xs font-semibold text-foreground/80">Otros movimientos</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Pedidos preventa ({resumen.pedidosPreventaCount})</span>
                <span className="font-medium">{formatCurrency(resumen.pedidosPreventa)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Devoluciones ({resumen.devolucionesCount})</span>
                <span className="font-medium text-red-600">{formatCurrency(resumen.devoluciones)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Al inicio vs Al cierre */}
        <div className="grid grid-cols-2 gap-4">
          {/* Al inicio */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <h3 className="text-xs font-semibold text-foreground/80 mb-3">Al inicio</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Valor de la ruta</span>
                <span className="font-medium text-lg">{formatCurrency(resumen.valorRuta)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Efectivo inicial</span>
                <span className="font-medium">{formatCurrency(resumen.efectivoInicial)}</span>
              </div>
            </div>
          </div>

          {/* Al cierre */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <h3 className="text-xs font-semibold text-foreground/80 mb-3">Al cierre</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">A recibir</span>
                <span className="font-medium text-lg">{formatCurrency(resumen.aRecibir)}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground">Recibido</span>
                {isReadonly ? (
                  <span className="font-medium">{formatCurrency(resumen.recibido ?? 0)}</span>
                ) : (
                  <input
                    type="number"
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                    step="0.01"
                    className="w-32 px-2 py-1 text-right text-sm border border-border-default rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                   
                  />
                )}
              </div>
              {diferencia !== null && (
                <div className="flex justify-between text-xs pt-1 border-t">
                  <span className="text-muted-foreground">Diferencia</span>
                  <span className={`font-bold text-lg ${diferencia < 0 ? 'text-red-600' : diferencia > 0 ? 'text-green-600' : 'text-foreground'}`}>
                    {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inventario de retorno */}
        <div data-tour="routes-close-inventory" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Inventario de retorno</h2>
            {!isReadonly && (
              <div data-tour="routes-close-actions" className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Diferencia a:</span>
                <button
                  onClick={() => handleSetAllDiferencia('recAlmacen')}
                  className="px-3 py-1 text-xs font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
                >
                  Almacén
                </button>
                <button
                  onClick={() => handleSetAllDiferencia('cargaVehiculo')}
                  className="px-3 py-1 text-xs font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
                >
                  Carga
                </button>
              </div>
            )}
          </div>

          {retorno.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No hay inventario de retorno</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-foreground/70">Producto</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground/70">Ventas($)</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Inicial</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Vendidos</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Entregados</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Devueltos</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Mermas</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Rec. almacén</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Carga veh.</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">Dif.</th>
                  </tr>
                </thead>
                <tbody>
                  {retorno.map((item) => (
                    <tr key={item.id} className="border-b border-border-subtle hover:bg-surface-1">
                      <td className="py-2 px-2">
                        <span className="text-[12px] text-foreground">{item.productoNombre}</span>
                      </td>
                      <td className="py-2 px-2 text-right text-[12px] text-foreground/70">
                        {formatCurrency(item.ventasMonto)}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-foreground font-medium">
                        {item.cantidadInicial}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-foreground/70">
                        {item.vendidos}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-foreground/70">
                        {item.entregados}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-foreground/70">
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
        className="w-5 h-5 flex items-center justify-center rounded bg-surface-3 hover:bg-surface-3 text-foreground/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <MinusIcon className="w-3 h-3" />
      </button>
      <span className="w-6 text-center text-[12px] font-medium">
        {value}
      </span>
      <button
        onClick={onIncrement}
        disabled={disabled}
        className="w-5 h-5 flex items-center justify-center rounded bg-surface-3 hover:bg-surface-3 text-foreground/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <PlusIcon className="w-3 h-3" />
      </button>
    </div>
  );
}
