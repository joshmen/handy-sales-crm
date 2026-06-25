'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  routeService,
  RouteDetail,
  CierreResumen,
  RetornoItem,
  ESTADO_RUTA,
} from '@/services/api/routes';
import { toast } from '@/hooks/useToast';
import { Modal } from '@/components/ui/Modal';
import {
  Loader2,
  User,
  ArrowDown,
  ArrowUp,
  Minus as MinusIcon,
  Plus as PlusIcon,
  Lock,
  AlertTriangle,
  Package,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { RutaGastosDrawer } from '@/components/gastos/RutaGastosDrawer';
import { RutaDevolucionesDrawer } from '@/components/devoluciones/RutaDevolucionesDrawer';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';

interface CorteTabProps {
  routeId: number;
  route: RouteDetail;
  onClosed?: () => void;
}

/**
 * Cuerpo reutilizable del corte/cierre de ruta. Se renderiza tanto dentro de un
 * tab del detalle de ruta como en la página standalone `routes/manage/[id]/close`.
 *
 * Hace su propio fetch de getResumenCierre + getRetornoInventario a partir de `routeId`.
 * Gating por `route.estado`:
 *   - < Completada (2): estado bloqueado (lo cierra el vendedor en su app).
 *   - === Completada (2): corte activo y editable; botón "Cerrar corte".
 *   - === Cerrada (6): solo lectura, conciliado.
 *
 * Toda la lógica de reconciliación de inventario (steppers mermas/recAlmacen/
 * cargaVehiculo/recargaExterna), drawers de gastos/devoluciones y el modal de
 * confirmación viven aquí. El shell de la página (PageHeader/breadcrumb/back)
 * permanece en la página contenedora.
 */
export function CorteTab({ routeId, route, onClosed }: CorteTabProps) {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations('routes.close');
  const tk = useTranslations('routes.corte');
  const showApiError = useApiErrorToast();

  const [resumen, setResumen] = useState<CierreResumen | null>(null);
  const [retorno, setRetorno] = useState<RetornoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [showCloseModal, setShowCloseModal] = useState(false);

  // Drawer de gastos: trigger desde la linea "Ver gastos" en card Otros movimientos.
  const [gastosDrawerOpen, setGastosDrawerOpen] = useState(false);
  // Drawer de devoluciones: igual patron que gastos.
  const [devolucionesDrawerOpen, setDevolucionesDrawerOpen] = useState(false);

  const isLocked = route.estado < ESTADO_RUTA.Completada;
  const isReadonly = route.estado === ESTADO_RUTA.Cerrada;
  const isActive = route.estado === ESTADO_RUTA.Completada;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resumenData, retornoData] = await Promise.all([
        routeService.getResumenCierre(routeId),
        routeService.getRetornoInventario(routeId),
      ]);
      setResumen(resumenData);
      setRetorno(retornoData);
      setMontoRecibido(route.montoRecibido?.toString() || '');
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('errorLoadingClose'));
    } finally {
      setLoading(false);
    }
    // route.montoRecibido se lee del prop; routeId es el driver del fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId]);

  useEffect(() => {
    // Solo cargamos datos cuando hay corte disponible (>= Completada).
    if (isLocked) {
      setLoading(false);
      return;
    }
    fetchData();
  }, [fetchData, isLocked]);

  const handleRetornoChange = async (
    productoId: number,
    field: 'mermas' | 'recAlmacen' | 'cargaVehiculo' | 'recargaExterna',
    delta: number,
  ) => {
    const item = retorno.find((r) => r.productoId === productoId);
    if (!item || isReadonly) return;

    const newValue = Math.max(0, item[field] + delta);
    const updated = retorno.map((r) =>
      r.productoId === productoId
        ? {
            ...r,
            [field]: newValue,
            // Recarga SUMA al inicial efectivo; resto de campos restan.
            diferencia:
              r.cantidadInicial +
              (field === 'recargaExterna' ? newValue : r.recargaExterna) -
              r.vendidos -
              r.entregados -
              r.devueltos -
              (field === 'mermas' ? newValue : r.mermas) -
              (field === 'recAlmacen' ? newValue : r.recAlmacen) -
              (field === 'cargaVehiculo' ? newValue : r.cargaVehiculo),
          }
        : r,
    );
    setRetorno(updated);

    try {
      const updatedItem = updated.find((r) => r.productoId === productoId)!;
      await routeService.updateRetorno(routeId, productoId, {
        mermas: updatedItem.mermas,
        recAlmacen: updatedItem.recAlmacen,
        cargaVehiculo: updatedItem.cargaVehiculo,
        recargaExterna: updatedItem.recargaExterna,
      });
    } catch (err) {
      showApiError(err, t('errorUpdatingReturn'));
      fetchData();
    }
  };

  /**
   * Quick-action que cuadra todas las filas pendientes:
   * - Sobrante (Diferencia > 0): asigna el sobrante a recAlmacen/cargaVehiculo (resta del inicial).
   * - Overage (Diferencia < 0): asigna |diferencia| a recargaExterna (SUMA al inicial).
   */
  const handleSetAllDiferencia = (target: 'recAlmacen' | 'cargaVehiculo' | 'recargaExterna') => {
    if (isReadonly) return;
    const updated = retorno.map((r) => {
      if (target === 'recargaExterna') {
        if (r.diferencia >= 0) return r;
        const newVal = r.recargaExterna + Math.abs(r.diferencia);
        return { ...r, recargaExterna: newVal, diferencia: 0 };
      }
      if (r.diferencia <= 0) return r;
      const newVal = r[target] + r.diferencia;
      return { ...r, [target]: newVal, diferencia: 0 };
    });
    setRetorno(updated);

    // Batch update — solo filas modificadas
    Promise.all(
      updated.map((item) =>
        routeService
          .updateRetorno(routeId, item.productoId, {
            mermas: item.mermas,
            recAlmacen: item.recAlmacen,
            cargaVehiculo: item.cargaVehiculo,
            recargaExterna: item.recargaExterna,
          })
          .catch(() => {
            /* silent */
          }),
      ),
    );
  };

  const handleCerrarRuta = () => {
    if (!montoRecibido) {
      toast.error(t('enterAmountReceived'));
      return;
    }
    setShowCloseModal(true);
  };

  const submitCerrarRuta = async () => {
    try {
      setClosing(true);
      await routeService.cerrarRuta(routeId, {
        montoRecibido: parseFloat(montoRecibido),
        retornos: retorno.map((r) => ({
          productoId: r.productoId,
          mermas: r.mermas,
          recAlmacen: r.recAlmacen,
          cargaVehiculo: r.cargaVehiculo,
          recargaExterna: r.recargaExterna,
        })),
      });
      toast.success(t('routeClosed'));
      setShowCloseModal(false);
      onClosed?.();
      fetchData();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || t('errorClosing'));
    } finally {
      setClosing(false);
    }
  };

  // === LOCKED state: corte no disponible hasta que el vendedor cierre la ruta ===
  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 bg-card border border-border rounded-2xl shadow-sm text-center">
        <div className="w-14 h-14 rounded-full bg-surface-2 flex items-center justify-center">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold text-foreground">{tk('locked')}</p>
        <p className="text-xs text-muted-foreground max-w-md">{tk('lockedDesc')}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t('loadingClose')}</span>
        </div>
      </div>
    );
  }

  if (!resumen) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  // === Cash semantics (VanCorteForm) ===
  // A entregar = aRecibir (efectivoInicial + cobrado - gastos - devolucionesEfectivo, calculado en backend).
  const entregadoNum = montoRecibido ? parseFloat(montoRecibido) : null;
  const diferencia = entregadoNum !== null ? entregadoNum - resumen.aRecibir : null;
  const cuadrado = diferencia !== null && Math.abs(diferencia) < 1;
  const faltante = diferencia !== null && diferencia < 0;

  const horaInicio = route.horaInicioReal || route.horaInicioEstimada;
  const horaFin = route.horaFinReal || route.horaFinEstimada;
  const hasRealWindow = Boolean(route.horaInicioReal || route.horaFinReal);
  const hasOverage = retorno.some(
    (r) => r.vendidos + r.entregados > r.cantidadInicial + r.recargaExterna,
  );

  // Totales de conciliación de producto (Cargó / Vendió / Entregó / Devolvió)
  const totals = retorno.reduce(
    (acc, r) => ({
      cargo: acc.cargo + r.cantidadInicial + r.recargaExterna,
      vendio: acc.vendio + r.vendidos,
      entrego: acc.entrego + r.entregados,
      devolvio: acc.devolvio + r.devueltos,
    }),
    { cargo: 0, vendio: 0, entrego: 0, devolvio: 0 },
  );

  return (
    <div className="space-y-6">
      {/* Header strip: codigo + nombre + zona, ventana de tiempo, km */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            {route.codigo && (
              <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-surface-2 text-foreground/80">
                {route.codigo}
              </span>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">{route.nombre}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {(route.zonas && route.zonas.length > 0
                  ? route.zonas.map((z) => z.nombre)
                  : route.zonaNombre
                  ? [route.zonaNombre]
                  : []
                ).map((zona, i) => (
                  <span
                    key={i}
                    className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary"
                  >
                    {zona}
                  </span>
                ))}
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <User className="w-3 h-3" />
                  {route.usuarioNombre}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs lg:justify-end">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {tk('fecha')}
              </span>
              <span className="font-medium text-foreground">{formatDate(route.fecha)}</span>
            </div>
            {(route.horaInicioEstimada || route.horaFinEstimada) && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tk('estimado')}
                </span>
                <span className="font-medium text-foreground">
                  {route.horaInicioEstimada || '--'} {'-'} {route.horaFinEstimada || '--'}
                </span>
              </div>
            )}
            {hasRealWindow && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tk('real')}
                </span>
                <span className="font-medium text-success">
                  {horaInicio || '--'} {'-'} {horaFin || '--'}
                </span>
              </div>
            )}
            {route.kilometrosReales != null && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {tk('recorrido')}
                </span>
                <span className="font-medium text-foreground">{route.kilometrosReales} km</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Banner de solo lectura cuando la ruta ya esta cerrada */}
      {isReadonly && (
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/30 rounded-lg">
          <Lock className="w-5 h-5 text-success flex-shrink-0" />
          <p className="text-sm text-success">{tk('closedBanner')}</p>
        </div>
      )}

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Efectivo entrante */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDown className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-semibold text-foreground/80">{t('incomingCash')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('cashSales')} ({resumen.ventasContadoCount})
              </span>
              <span className="font-medium">{formatCurrency(resumen.ventasContado)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('paidDeliveries')} ({resumen.entregasCobradasCount})
              </span>
              <span className="font-medium">{formatCurrency(resumen.entregasCobradas)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('debtCollection')} ({resumen.cobranzaAdeudosCount})
              </span>
              <span className="font-medium">{formatCurrency(resumen.cobranzaAdeudos)}</span>
            </div>
          </div>
        </div>

        {/* Movimientos a saldo */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUp className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold text-foreground/80">{t('balanceMovements')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('creditSales')} ({resumen.ventasCreditoCount})
              </span>
              <span className="font-medium">{formatCurrency(resumen.ventasCredito)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('creditDeliveries')} ({resumen.entregasCreditoCount})
              </span>
              <span className="font-medium">{formatCurrency(resumen.entregasCredito)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('creditBalance')} ({resumen.entregasContadoSaldoFavorCount})
              </span>
              <span className="font-medium">
                {formatCurrency(resumen.entregasContadoSaldoFavor)}
              </span>
            </div>
          </div>
        </div>

        {/* Otros movimientos */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-foreground/70" />
            <h3 className="text-xs font-semibold text-foreground/80">{t('otherMovements')}</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {t('presaleOrders')} ({resumen.pedidosPreventaCount})
              </span>
              <span className="font-medium">{formatCurrency(resumen.pedidosPreventa)}</span>
            </div>
            {(resumen.devolucionesSaldoFavorCount ?? 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  {tk('devolucionesSaldoFavor')} ({resumen.devolucionesSaldoFavorCount})
                </span>
                <span className="font-medium text-foreground/70">
                  {formatCurrency(resumen.devolucionesSaldoFavor ?? 0)}
                </span>
              </div>
            )}
            {(resumen.devolucionesEfectivoCount ?? 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {tk('devolucionesEfectivo')} ({resumen.devolucionesEfectivoCount})
                </span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(resumen.devolucionesEfectivo ?? 0)}
                </span>
              </div>
            )}
            {(resumen.gastosCount ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setGastosDrawerOpen(true)}
                className="w-full flex justify-between items-center text-xs hover:bg-surface-3 px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={tk('verGastosAria', { count: resumen.gastosCount ?? 0 })}
              >
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  {tk('verGastos')} ({resumen.gastosCount})
                </span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(resumen.gastos ?? 0)}
                </span>
              </button>
            )}
            {(resumen.devolucionesCount ?? 0) > 0 && (
              <button
                type="button"
                onClick={() => setDevolucionesDrawerOpen(true)}
                className="w-full flex justify-between items-center text-xs hover:bg-surface-3 px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={tk('verDevolucionesAria', { count: resumen.devolucionesCount ?? 0 })}
              >
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {tk('verDevoluciones')} ({resumen.devolucionesCount})
                </span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(resumen.devoluciones ?? 0)}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drawer compartido — gastos */}
      <RutaGastosDrawer
        isOpen={gastosDrawerOpen}
        onClose={() => setGastosDrawerOpen(false)}
        rutaId={routeId}
        rutaCodigo={route.codigo}
        onGastoInvalidated={() => fetchData()}
      />

      {/* Drawer de devoluciones */}
      <RutaDevolucionesDrawer
        isOpen={devolucionesDrawerOpen}
        onClose={() => setDevolucionesDrawerOpen(false)}
        rutaId={routeId}
        rutaCodigo={route.codigo}
        onDevolucionAnulada={() => fetchData()}
      />

      {/* Conciliacion de producto + Caja (A entregar / Entregado / Diferencia) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conciliacion de producto — Cargo / Vendio / Entrego / Devolvio */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">{tk('conciliacion')}</h3>
          {retorno.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">
              {t('noReturnInventory')}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-foreground/70">
                      {t('product')}
                    </th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                      {tk('cargo')}
                    </th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                      {tk('vendio')}
                    </th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                      {tk('entrego')}
                    </th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                      {tk('devolvio')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {retorno.map((item) => (
                    <tr key={item.id} className="border-b border-border-subtle hover:bg-surface-1">
                      <td className="py-2 px-2">
                        <span className="text-[12px] text-foreground">{item.productoNombre}</span>
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-foreground font-medium">
                        {item.cantidadInicial + item.recargaExterna}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-success font-medium">
                        {item.vendidos}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-foreground/70">
                        {item.entregados}
                      </td>
                      <td className="py-2 px-2 text-center text-[12px] text-warning-600 font-medium">
                        {item.devueltos}
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="border-t-2 border-border font-bold">
                    <td className="py-2 px-2 text-[11px] text-foreground">{tk('total')}</td>
                    <td className="py-2 px-2 text-center text-[12px] text-foreground">
                      {totals.cargo}
                    </td>
                    <td className="py-2 px-2 text-center text-[12px] text-success">
                      {totals.vendio}
                    </td>
                    <td className="py-2 px-2 text-center text-[12px] text-foreground">
                      {totals.entrego}
                    </td>
                    <td className="py-2 px-2 text-center text-[12px] text-warning-600">
                      {totals.devolvio}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Caja: A entregar / Entregado / Diferencia */}
        <div className="bg-card border border-border rounded-2xl shadow-sm p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t('atClose')}</h3>
          <div className="space-y-2 flex-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{tk('fondo')}</span>
              <span className="font-medium">{formatCurrency(resumen.efectivoInicial)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{tk('cobrado')}</span>
              <span className="font-medium">
                {formatCurrency(
                  resumen.ventasContado + resumen.entregasCobradas + resumen.cobranzaAdeudos,
                )}
              </span>
            </div>
            {(resumen.gastos ?? 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tk('gastos')}</span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(resumen.gastos ?? 0)}
                </span>
              </div>
            )}
            {(resumen.devolucionesEfectivo ?? 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{tk('devoluciones')}</span>
                <span className="font-medium text-destructive">
                  -{formatCurrency(resumen.devolucionesEfectivo ?? 0)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-border-subtle">
              <span className="font-semibold text-foreground">{tk('aEntregar')}</span>
              <span className="font-bold text-foreground">{formatCurrency(resumen.aRecibir)}</span>
            </div>
            <div className="flex justify-between text-xs items-center pt-1">
              <span className="text-muted-foreground">{tk('entregado')}</span>
              {isReadonly ? (
                <span className="font-medium">{formatCurrency(resumen.recibido ?? 0)}</span>
              ) : (
                <input
                  type="number"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  step="0.01"
                  disabled={!isActive}
                  className="w-32 px-2 py-1 text-right text-sm border border-border-default rounded focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                />
              )}
            </div>
            {diferencia !== null && (
              <div className="flex justify-between items-center text-xs pt-2 border-t border-border-subtle">
                <span className="text-muted-foreground">{tk('diferencia')}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-[11px] font-bold rounded-full ${
                    cuadrado
                      ? 'bg-success/15 text-success'
                      : faltante
                      ? 'bg-destructive/15 text-destructive'
                      : 'bg-warning-100 text-warning-700'
                  }`}
                >
                  {cuadrado
                    ? tk('cuadrado')
                    : faltante
                    ? tk('faltante', { monto: formatCurrency(Math.abs(diferencia)) })
                    : tk('sobrante', { monto: formatCurrency(diferencia) })}
                </span>
              </div>
            )}
          </div>

          {/* Boton primario "Cerrar corte" — solo en estado activo */}
          {isActive && (
            <button
              data-tour="routes-close-btn"
              onClick={handleCerrarRuta}
              disabled={closing}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {closing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {cuadrado ? tk('cerrarCorte') : tk('cerrarConDiferencia')}
            </button>
          )}
        </div>
      </div>

      {/* Overage banner */}
      {hasOverage && (
        <div className="rounded-lg bg-warning-50 dark:bg-warning-900/20 border border-warning-300 dark:border-warning-700 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-warning-600 shrink-0 mt-0.5" />
          <div className="text-sm text-foreground flex-1">
            <p className="font-semibold mb-1">{tk('overageTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{tk('overageDesc')}</p>
          </div>
          {!isReadonly && (
            <button
              onClick={() => handleSetAllDiferencia('recargaExterna')}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-warning-600 hover:bg-warning-700 rounded transition-colors"
              title={tk('overageBtnTitle')}
            >
              {tk('overageBtn')}
            </button>
          )}
        </div>
      )}

      {/* Inventario de retorno — reconciliacion detallada con steppers */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{t('returnInventory')}</h2>
          {!isReadonly && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('differenceTo')}</span>
              <button
                onClick={() => handleSetAllDiferencia('recAlmacen')}
                className="px-3 py-1 text-xs font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
              >
                {t('warehouse')}
              </button>
              <button
                onClick={() => handleSetAllDiferencia('cargaVehiculo')}
                className="px-3 py-1 text-xs font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
              >
                {t('vehicleLoad')}
              </button>
            </div>
          )}
        </div>

        {retorno.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">{t('noReturnInventory')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('product')}
                  </th>
                  <th className="text-right py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('salesAmount')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('initial')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('sold')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('delivered')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('returned')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('losses')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('warehouseReturn')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('vehicleLoadShort')}
                  </th>
                  <th
                    className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70"
                    title={tk('recargaTooltip')}
                  >
                    {tk('recarga')}
                  </th>
                  <th className="text-center py-2 px-2 text-[10px] font-semibold text-foreground/70">
                    {t('diff')}
                  </th>
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
                    {/* Recarga externa stepper — SUMA al inicial efectivo (overage). */}
                    <td className="py-1 px-1 text-center">
                      <Stepper
                        value={item.recargaExterna}
                        onDecrement={() =>
                          handleRetornoChange(item.productoId, 'recargaExterna', -1)
                        }
                        onIncrement={() => handleRetornoChange(item.productoId, 'recargaExterna', 1)}
                        disabled={isReadonly}
                      />
                    </td>
                    {/* Diferencia badge */}
                    <td className="py-2 px-2 text-center">
                      {(() => {
                        const inicialEfectivo = item.cantidadInicial + item.recargaExterna;
                        const excedente = item.vendidos + item.entregados - inicialEfectivo;
                        if (excedente > 0) {
                          return (
                            <span
                              title={tk('excedenteTooltip', {
                                excedente,
                                inicial: item.cantidadInicial,
                                recarga: item.recargaExterna,
                              })}
                              className="inline-flex items-center gap-1 min-w-[28px] justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-destructive/15 text-destructive"
                            >
                              {item.diferencia}
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`inline-flex min-w-[28px] justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full ${
                              item.diferencia > 0
                                ? 'bg-destructive/15 text-destructive'
                                : item.diferencia < 0
                                ? 'bg-warning-100 text-warning-700'
                                : 'bg-primary/10 text-primary'
                            }`}
                          >
                            {item.diferencia}
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: confirmar cierre de corte */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => {
          if (!closing) setShowCloseModal(false);
        }}
        title={t('closeRouteTitle')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">{t('confirmClose')}</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCloseModal(false)}
              disabled={closing}
              className="px-4 py-2 text-sm font-medium text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 disabled:opacity-50"
            >
              {tk('cancelar')}
            </button>
            <button
              type="button"
              onClick={submitCerrarRuta}
              disabled={closing}
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {closing && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('closeAction')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Stepper component
function Stepper({
  value,
  onDecrement,
  onIncrement,
  disabled,
}: {
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
      <span className="w-6 text-center text-[12px] font-medium">{value}</span>
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
