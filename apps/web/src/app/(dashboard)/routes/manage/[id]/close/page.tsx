'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, CierreResumen, RetornoItem, ESTADO_RUTA, ESTADO_RUTA_KEYS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
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
  X,
  Package,
  Info,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';
import { gastosService, type GastoListItem, TIPO_GASTO_LABEL, TIPO_GASTO_ICON, TIPO_GASTO_COLOR } from '@/services/api/gastos';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { RouteLifecycleStepper } from '@/components/routes/RouteLifecycleStepper';

export default function CloseRoutePage() {
  const { formatCurrency, formatDate } = useFormatters();
  const ts = useTranslations('routes.status');
  const tl = useTranslations('routes.detail');
  const t = useTranslations('routes.close');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();

  // Bug #4-web (audit 2026-05-07): la definición inline de LIFECYCLE_STEPS
  // se reemplazó por el componente <RouteLifecycleStepper /> con icons
  // dedicados, padding correcto y design system. Ver
  // `apps/web/src/components/routes/RouteLifecycleStepper.tsx`.
  const params = useParams();
  const router = useRouter();
  const rutaId = Number(params.id);

  const [ruta, setRuta] = useState<RouteDetail | null>(null);
  const [resumen, setResumen] = useState<CierreResumen | null>(null);
  const [retorno, setRetorno] = useState<RetornoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [montoRecibido, setMontoRecibido] = useState<string>('');

  // Expansible inline para ver detalle + foto de gastos imputados a esta ruta.
  const [gastosExpanded, setGastosExpanded] = useState(false);
  const [rutaGastos, setRutaGastos] = useState<GastoListItem[]>([]);
  const [loadingGastos, setLoadingGastos] = useState(false);
  const [photoLightbox, setPhotoLightbox] = useState<string | null>(null);

  const toggleGastosExpanded = useCallback(async () => {
    const next = !gastosExpanded;
    setGastosExpanded(next);
    if (next && rutaGastos.length === 0 && !loadingGastos) {
      setLoadingGastos(true);
      try {
        const data = await gastosService.list({ rutaId, pagina: 1, tamanoPagina: 50, soloActivos: false });
        setRutaGastos(data.items);
      } catch (err) {
        showApiError(err, 'No se pudieron cargar los gastos');
      } finally {
        setLoadingGastos(false);
      }
    }
  }, [gastosExpanded, rutaGastos.length, loadingGastos, rutaId, showApiError]);

  // ESC cierra el lightbox del comprobante.
  useEffect(() => {
    if (!photoLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhotoLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoLightbox]);

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
      toast.error(t('errorLoading'));
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
      showApiError(err, t('errorUpdatingReturn'));
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

  const [showCloseModal, setShowCloseModal] = useState(false);

  const handleCerrarRuta = () => {
    if (!montoRecibido) {
      toast.error(t('enterAmountReceived'));
      return;
    }
    // Reemplaza confirm() nativo por Modal (feedback del user).
    setShowCloseModal(true);
  };

  const submitCerrarRuta = async () => {
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
      toast.success(t('closedSuccess'));
      setShowCloseModal(false);
      fetchData();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || t('errorClosing'));
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-sm text-muted-foreground">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!ruta || !resumen) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('notFound')}</p>
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
          { label: t('breadcrumbRoutes'), href: '/routes' },
          { label: ruta.nombre, href: `/routes/${ruta.id}` },
          { label: t('title') },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {t('title')}
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
                {t('closeRoute')}
              </button>
            )}
            <button
              onClick={() => router.push('/routes')}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1"
            >
              <X className="w-4 h-4" />
              {tc('cancel')}
            </button>
          </div>
        </div>

        {/* Bug #4-web: nuevo stepper con padding propio, iconos lucide,
            tamaño aumentado, sin negative margin hack. */}
        <div data-tour="routes-close-tabs" className="mt-4">
          <RouteLifecycleStepper
            estado={ruta.estado}
            cancelada={ruta.estado === ESTADO_RUTA.Cancelada}
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 overflow-auto">
        {/* Alert if not in correct state */}
        {ruta.estado === ESTADO_RUTA.PendienteAceptar && (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">{t('pendingInventoryAlert')}</p>
          </div>
        )}

        {/* Section: Route Details */}
        <div data-tour="routes-close-details" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('routeDetails')}</h2>
          <div className="flex items-center gap-4 p-3 bg-surface-1 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{ruta.usuarioNombre}</p>
              <p className="text-xs text-muted-foreground">
                {t('routeLabel')}: {ruta.nombre} | {t('zoneLabel')}: {ruta.zonaNombre || t('noZone')} | {t('created')}: {formatDate(ruta.creadoEn)}
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
              <h3 className="text-xs font-semibold text-foreground/80">{t('incomingCash')}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('cashSales')} ({resumen.ventasContadoCount})</span>
                <span className="font-medium">{formatCurrency(resumen.ventasContado)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('paidDeliveries')} ({resumen.entregasCobradasCount})</span>
                <span className="font-medium">{formatCurrency(resumen.entregasCobradas)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('debtCollection')} ({resumen.cobranzaAdeudosCount})</span>
                <span className="font-medium">{formatCurrency(resumen.cobranzaAdeudos)}</span>
              </div>
            </div>
          </div>

          {/* Movimientos a saldo */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUp className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-semibold text-foreground/80">{t('balanceMovements')}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('creditSales')} ({resumen.ventasCreditoCount})</span>
                <span className="font-medium">{formatCurrency(resumen.ventasCredito)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('creditDeliveries')} ({resumen.entregasCreditoCount})</span>
                <span className="font-medium">{formatCurrency(resumen.entregasCredito)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('creditBalance')} ({resumen.entregasContadoSaldoFavorCount})</span>
                <span className="font-medium">{formatCurrency(resumen.entregasContadoSaldoFavor)}</span>
              </div>
            </div>
          </div>

          {/* Otros movimientos */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-4 h-4 text-foreground/70" />
              <h3 className="text-xs font-semibold text-foreground/80">{t('otherMovements')}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('presaleOrders')} ({resumen.pedidosPreventaCount})</span>
                <span className="font-medium">{formatCurrency(resumen.pedidosPreventa)}</span>
              </div>
              {/* v23 (2026-05-29): Devoluciones a saldo a favor (informativo, no resta de aRecibir) */}
              {(resumen.devolucionesSaldoFavorCount ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground inline-flex items-center gap-1">
                    Devoluciones a saldo favor ({resumen.devolucionesSaldoFavorCount})
                  </span>
                  <span className="font-medium text-foreground/70">{formatCurrency(resumen.devolucionesSaldoFavor ?? 0)}</span>
                </div>
              )}
              {/* v23: Devoluciones efectivo (restan de aRecibir) */}
              {(resumen.devolucionesEfectivoCount ?? 0) > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Devoluciones en efectivo ({resumen.devolucionesEfectivoCount})</span>
                  <span className="font-medium text-red-600">-{formatCurrency(resumen.devolucionesEfectivo ?? 0)}</span>
                </div>
              )}
              {/* v23: Gastos del vendedor imputados a la ruta (restan de aRecibir).
                  Click expande mini-tabla con concepto + thumbnail clickeable.
                  Sizing tuneado post feedback usuario 30/5 (gastos se veian pequeños):
                  text-sm + thumbnail w-14 + icono Tipo + overflow scroll. */}
              {(resumen.gastosCount ?? 0) > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={toggleGastosExpanded}
                    aria-expanded={gastosExpanded}
                    aria-controls="gastos-detalle-cierre"
                    className="w-full flex justify-between items-center text-xs hover:bg-surface-3 px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-muted-foreground inline-flex items-center gap-1">
                      {gastosExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      Gastos de ruta ({resumen.gastosCount})
                    </span>
                    <span className="font-medium text-red-600">-{formatCurrency(resumen.gastos ?? 0)}</span>
                  </button>
                  {gastosExpanded && (
                    <div id="gastos-detalle-cierre" className="mt-2 rounded-lg border border-border-subtle bg-surface-1 overflow-hidden">
                      {loadingGastos ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin inline-block mr-1.5" />
                          Cargando gastos...
                        </div>
                      ) : rutaGastos.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Sin gastos para mostrar</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[420px]">
                            <thead className="bg-surface-2">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">Tipo</th>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Concepto</th>
                                <th className="px-3 py-2 text-center font-medium text-muted-foreground" style={{ minWidth: 72 }}>Comprobante</th>
                                <th className="px-3 py-2 text-right font-medium text-muted-foreground whitespace-nowrap">Monto</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rutaGastos.map(g => {
                                const isInvalidado = g.estado === 1;
                                const Icon = TIPO_GASTO_ICON[g.tipoGasto] ?? TIPO_GASTO_ICON[99];
                                const tipoColor = TIPO_GASTO_COLOR[g.tipoGasto] ?? TIPO_GASTO_COLOR[99];
                                return (
                                  <tr key={g.id} className={`border-t border-border-subtle ${isInvalidado ? 'opacity-40 line-through' : ''}`}>
                                    <td className="px-3 py-2 text-foreground/80">
                                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                        <Icon className={`w-4 h-4 ${tipoColor}`} />
                                        {TIPO_GASTO_LABEL[g.tipoGasto] ?? 'Otro'}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-foreground">{g.concepto}</td>
                                    <td className="px-3 py-2 text-center">
                                      {g.comprobanteUrl ? (
                                        <button
                                          type="button"
                                          onClick={() => setPhotoLightbox(g.comprobanteUrl)}
                                          className="inline-block hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded transition-opacity"
                                          title="Ver foto"
                                          aria-label={`Ver foto de ${g.concepto}`}
                                        >
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={g.comprobanteUrl}
                                            alt={`Comprobante ${g.concepto}`}
                                            className="w-14 h-14 object-cover rounded border border-border-subtle"
                                          />
                                        </button>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-amber-600">
                                          <ImageIcon className="w-4 h-4" />
                                          Sin foto
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-red-600 whitespace-nowrap">
                                      -{formatCurrency(g.monto)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lightbox foto comprobante — fade-in, ESC para cerrar, focus ring en X */}
        {photoLightbox && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-150"
            onClick={() => setPhotoLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Visor de comprobante"
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setPhotoLightbox(null); }}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white text-white"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoLightbox}
              alt="Comprobante gasto"
              className="max-w-full max-h-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {/* Al inicio vs Al cierre */}
        <div className="grid grid-cols-2 gap-4">
          {/* Al inicio */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <h3 className="text-xs font-semibold text-foreground/80 mb-3">{t('atStart')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('routeValue')}</span>
                <span className="font-medium text-lg">{formatCurrency(resumen.valorRuta)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('initialCash')}</span>
                <span className="font-medium">{formatCurrency(resumen.efectivoInicial)}</span>
              </div>
            </div>
          </div>

          {/* Al cierre */}
          <div className="bg-surface-2 border border-border-subtle rounded-lg p-4">
            <h3 className="text-xs font-semibold text-foreground/80 mb-3">{t('atClose')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{t('toReceive')}</span>
                <span className="font-medium text-lg">{formatCurrency(resumen.aRecibir)}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-muted-foreground">{t('received')}</span>
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
                  <span className="text-muted-foreground">{t('difference')}</span>
                  <span className={`font-bold text-lg ${diferencia < 0 ? 'text-red-600' : diferencia > 0 ? 'text-green-600' : 'text-foreground'}`}>
                    {diferencia >= 0 ? '+' : ''}{formatCurrency(diferencia)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overage banner — al menos un producto con vendidos+entregados > cantidadInicial.
            Reportado prod 2026-05-26: vendedor empieza a vender pre-ruta y al sumar las
            ventas previas a la ruta la cantidad consumida puede exceder lo cargado. Esto
            no es error: significa que hubo stock externo (carga extra durante el día,
            vehículo con inventario previo, etc.). El usuario lo reconcilia con los
            steppers Mermas / Rec. almacén / Carga vehículo de la tabla. */}
        {!loading && retorno.some(r => (r.vendidos + r.entregados) > r.cantidadInicial) && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 dark:text-amber-200">
              <p className="font-semibold mb-1">Hay productos con más unidades vendidas que las cargadas inicialmente.</p>
              <p className="text-xs leading-relaxed">
                Esto suele ocurrir cuando el vendedor empezó a vender antes de aceptar la ruta, o cuando hubo recarga
                externa durante el día. Revisa cada fila marcada y ajusta con los steppers de Mermas, Rec. almacén
                o Carga vehículo según corresponda para cuadrar el cierre.
              </p>
            </div>
          </div>
        )}

        {/* Inventario de retorno */}
        <div data-tour="routes-close-inventory" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t('returnInventory')}</h2>
            {!isReadonly && (
              <div data-tour="routes-close-actions" className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t('differenceTo')}:</span>
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
                      {/* Diferencia badge — si vendidos+entregados > inicial, marca overage explícito */}
                      <td className="py-2 px-2 text-center">
                        {(() => {
                          const excedente = item.vendidos + item.entregados - item.cantidadInicial;
                          if (excedente > 0) {
                            return (
                              <span
                                title={`Vendido ${excedente} unidades más de lo cargado. Ajusta con Mermas o Carga vehículo si aplica.`}
                                className="inline-flex items-center gap-1 min-w-[28px] justify-center px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-red-100 text-red-700"
                              >
                                {item.diferencia}
                              </span>
                            );
                          }
                          return (
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
      </div>

      {/* Modal: confirmar cierre de ruta (reemplaza confirm() nativo). */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => { if (!closing) setShowCloseModal(false); }}
        title={t('closeRouteTitle', { defaultValue: 'Cerrar ruta' })}
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
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitCerrarRuta}
              disabled={closing}
              className="px-4 py-2 text-sm font-medium text-white bg-success rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
              {closing && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('closeAction', { defaultValue: 'Cerrar ruta' })}
            </button>
          </div>
        </div>
      </Modal>
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
