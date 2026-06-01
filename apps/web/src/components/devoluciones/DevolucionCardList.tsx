'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImageOff, Loader2, RotateCcw, X, Package } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  devolucionesService,
  type DevolucionListItem,
  MOTIVO_DEVOLUCION_LABEL,
  MOTIVO_DEVOLUCION_ICON,
  MOTIVO_DEVOLUCION_COLOR,
  TIPO_REEMBOLSO_LABEL,
  TIPO_REEMBOLSO_COLOR,
} from '@/services/api/devoluciones';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';

/**
 * Componente compartido para listar devoluciones de pedidos de una ruta + lightbox foto +
 * Modal de anulación accesible. Mirror estructural de GastoCardList (PR #134).
 *
 * Usado por:
 * - RutaDevolucionesDrawer (close screen)
 * - DevolucionesTab (route detail)
 *
 * Diferencias clave vs gastos:
 * - Cada card tiene badge "Saldo a favor" (azul) o "Efectivo" (ámbar) — TipoReembolso
 * - Cada card incluye lista de productos devueltos (children Detalles)
 * - Cliente + Pedido visibles (a diferencia de gasto que solo es del vendedor)
 * - Warning al anular: explica que revierte saldo cliente o corte de caja según TipoReembolso
 */
interface DevolucionCardListProps {
  rutaId: number;
  showHeader?: boolean;
  onDevolucionAnulada?: (devolucionId: number) => void;
  variant?: 'drawer' | 'tab';
}

export function DevolucionCardList({
  rutaId,
  showHeader = false,
  onDevolucionAnulada,
  variant = 'drawer',
}: DevolucionCardListProps) {
  const { formatCurrency, formatDate } = useFormatters();
  const [devoluciones, setDevoluciones] = useState<DevolucionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [anulandoId, setAnulandoId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoCaption, setPhotoCaption] = useState<string>('');
  const [anularTarget, setAnularTarget] = useState<DevolucionListItem | null>(null);
  const [anularMotivo, setAnularMotivo] = useState('');
  const thumbnailRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const anularTriggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const lastPhotoDevId = useRef<number | null>(null);
  const lastAnularDevId = useRef<number | null>(null);

  const fetchDevoluciones = useCallback(async () => {
    setLoading(true);
    try {
      const data = await devolucionesService.list({
        rutaId,
        pagina: 1,
        tamanoPagina: 100,
        soloActivas: false,
      });
      setDevoluciones(data.items);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  }, [rutaId]);

  useEffect(() => {
    fetchDevoluciones();
  }, [fetchDevoluciones]);

  // Cleanup stale refs cuando la lista cambia.
  useEffect(() => {
    const validIds = new Set(devoluciones.map((d) => d.id));
    Object.keys(thumbnailRefs.current).forEach((key) => {
      if (!validIds.has(Number(key))) delete thumbnailRefs.current[Number(key)];
    });
    Object.keys(anularTriggerRefs.current).forEach((key) => {
      if (!validIds.has(Number(key))) delete anularTriggerRefs.current[Number(key)];
    });
  }, [devoluciones]);

  const openAnular = useCallback((dev: DevolucionListItem) => {
    lastAnularDevId.current = dev.id;
    setAnularTarget(dev);
    setAnularMotivo('');
  }, []);

  const closeAnular = useCallback(() => {
    setAnularTarget(null);
    setAnularMotivo('');
    const id = lastAnularDevId.current;
    if (id != null) {
      anularTriggerRefs.current[id]?.focus();
    }
  }, []);

  const submitAnular = useCallback(async () => {
    if (!anularTarget) return;
    setAnulandoId(anularTarget.id);
    try {
      await devolucionesService.anular(anularTarget.id, anularMotivo.trim() || undefined);
      toast.success('Devolución anulada');
      onDevolucionAnulada?.(anularTarget.id);
      setAnularTarget(null);
      setAnularMotivo('');
      await fetchDevoluciones();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(`No se pudo anular: ${message}`);
    } finally {
      setAnulandoId(null);
    }
  }, [anularTarget, anularMotivo, fetchDevoluciones, onDevolucionAnulada]);

  const openLightbox = useCallback((dev: DevolucionListItem) => {
    if (!dev.fotoEvidenciaUrl) return;
    lastPhotoDevId.current = dev.id;
    setPhotoUrl(dev.fotoEvidenciaUrl);
    setPhotoCaption(`Devolución · ${dev.clienteNombre}`);
  }, []);

  const closeLightbox = useCallback(() => {
    setPhotoUrl(null);
    const devId = lastPhotoDevId.current;
    if (devId != null) {
      thumbnailRefs.current[devId]?.focus();
    }
  }, []);

  const activas = devoluciones.filter((d) => d.estado === 0);
  const totalActivas = activas.reduce((sum, d) => sum + d.montoTotal, 0);

  return (
    <>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-muted-foreground" />
              Devoluciones de la ruta
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Las devoluciones las registran los vendedores desde la app móvil cuando el cliente regresa producto. El admin puede anularlas si detecta error.
            </p>
          </div>
          {activas.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total devuelto</p>
              <p className="text-lg font-bold text-red-600">-{formatCurrency(totalActivas)}</p>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando devoluciones...
        </div>
      ) : devoluciones.length === 0 ? (
        variant === 'tab' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border-subtle rounded-lg">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <RotateCcw className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Esta ruta aún no tiene devoluciones</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Las devoluciones aparecerán aquí cuando el vendedor las reporte desde la app móvil al recibir producto de regreso del cliente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <RotateCcw className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Sin devoluciones en esta ruta</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              El vendedor las registra desde la app móvil al recibir productos del cliente.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3 pb-2">
          {!showHeader && (
            <div className="text-xs text-muted-foreground mb-1">
              {devoluciones.length} {devoluciones.length === 1 ? 'devolución' : 'devoluciones'} en esta ruta
            </div>
          )}
          {devoluciones.map((d) => {
            const Icon = MOTIVO_DEVOLUCION_ICON[d.motivo] ?? MOTIVO_DEVOLUCION_ICON[99];
            const motivoColor = MOTIVO_DEVOLUCION_COLOR[d.motivo] ?? MOTIVO_DEVOLUCION_COLOR[99];
            const isAnulada = d.estado === 1;
            const tipoLabel = TIPO_REEMBOLSO_LABEL[d.tipoReembolso] ?? '';
            const tipoBadge = TIPO_REEMBOLSO_COLOR[d.tipoReembolso] ?? '';
            return (
              <div
                key={d.id}
                className="flex gap-3 items-start p-3 rounded-lg border border-border-subtle bg-surface-2"
              >
                {/* Thumbnail / placeholder */}
                <div className="flex-shrink-0">
                  {d.fotoEvidenciaUrl ? (
                    <button
                      ref={(el) => {
                        thumbnailRefs.current[d.id] = el;
                      }}
                      type="button"
                      onClick={() => openLightbox(d)}
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:opacity-80 transition-opacity"
                      aria-label={`Ver foto evidencia de devolución de ${d.clienteNombre}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.fotoEvidenciaUrl} alt={d.clienteNombre} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div
                      className="w-20 h-20 rounded-lg border border-dashed border-border bg-surface-1 flex flex-col items-center justify-center text-muted-foreground"
                      title="Sin foto evidencia"
                    >
                      <ImageOff className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-medium">Sin foto</span>
                    </div>
                  )}
                </div>

                {/* Detalle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`min-w-0 ${isAnulada ? 'opacity-60' : ''}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-medium text-sm text-foreground truncate ${isAnulada ? 'line-through' : ''}`}>
                          {d.clienteNombre}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-full border ${tipoBadge}`}>
                          {tipoLabel}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <Icon className={`w-3.5 h-3.5 ${motivoColor}`} />
                        {MOTIVO_DEVOLUCION_LABEL[d.motivo] ?? 'Otro'}
                        <span className="mx-1">·</span>
                        Pedido {d.pedidoNumero}
                        <span className="mx-1">·</span>
                        {formatDate(d.fechaDevolucion)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.usuarioNombre}</p>
                    </div>
                    <span className={`font-semibold text-sm whitespace-nowrap ${isAnulada ? 'text-muted-foreground' : 'text-red-600'}`}>
                      -{formatCurrency(d.montoTotal)}
                    </span>
                  </div>

                  {/* Lista de productos devueltos */}
                  {d.detalles.length > 0 && !isAnulada && (
                    <div className="mt-2 pl-3 border-l-2 border-border-subtle space-y-1">
                      {d.detalles.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 truncate">
                            <Package className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{item.productoNombre}</span>
                            <span className="font-medium text-foreground/70">× {item.cantidad}</span>
                          </span>
                          <span className="ml-2 whitespace-nowrap">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {d.notas && !isAnulada && (
                    <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">&ldquo;{d.notas}&rdquo;</p>
                  )}

                  {isAnulada && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                      <div>
                        <span className="font-medium">Anulada</span>
                        {d.motivoAnulacion && (
                          <span className="block text-amber-600 mt-0.5">{d.motivoAnulacion}</span>
                        )}
                        {d.anuladaEn && (
                          <span className="block text-amber-600/80 text-[11px] mt-0.5">{formatDate(d.anuladaEn)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {!isAnulada && (
                    <div className="mt-3">
                      <button
                        ref={(el) => {
                          anularTriggerRefs.current[d.id] = el;
                        }}
                        type="button"
                        onClick={() => openAnular(d)}
                        disabled={anulandoId === d.id}
                        aria-label={`Anular devolución de ${d.clienteNombre}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      >
                        {anulandoId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        {anulandoId === d.id ? 'Anulando...' : 'Anular'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal lightbox para foto evidencia */}
      <Modal isOpen={photoUrl !== null} onClose={closeLightbox} size="xl" title={photoCaption || 'Foto evidencia'}>
        {photoUrl && (
          <div className="flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={photoCaption || 'Foto evidencia devolución'}
              className="w-full object-contain max-h-[75vh] rounded"
            />
          </div>
        )}
      </Modal>

      {/* Modal anulación — patrón a11y igual que invalidar gasto, con warning específico */}
      <Modal
        isOpen={anularTarget !== null}
        onClose={() => {
          if (anulandoId === null) closeAnular();
        }}
        size="sm"
        title="Anular devolución"
      >
        {anularTarget && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                Estás por anular la devolución de
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {anularTarget.clienteNombre} · <span className="text-red-600 font-semibold">-{formatCurrency(anularTarget.montoTotal)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pedido {anularTarget.pedidoNumero} · {anularTarget.usuarioNombre}
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-px" />
              <div className="text-xs text-amber-900">
                <p className="font-medium">Esto revertirá los movimientos:</p>
                {anularTarget.tipoReembolso === 0 && (
                  <p className="mt-1">
                    Regresará <strong>{formatCurrency(anularTarget.montoTotal)}</strong> al saldo del cliente (que actualmente tenía a su favor por esta devolución).
                  </p>
                )}
                {anularTarget.tipoReembolso === 1 && (
                  <p className="mt-1">
                    El monto dejará de restar de <strong>aRecibir</strong> en el cierre de ruta. Verifica que cuadre el efectivo entregado por el vendedor.
                  </p>
                )}
                {anularTarget.tipoReembolso === 2 && (
                  <p className="mt-1">
                    Sin movimiento monetario (fue reposición de producto). Solo se removerá del registro auditable de la ruta. El inventario del vendedor ya fue afectado en campo y debe reconciliarse manualmente en el cierre si aplica.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="motivo-anular" className="block text-xs font-medium text-foreground mb-1">
                Motivo (opcional)
              </label>
              <textarea
                id="motivo-anular"
                value={anularMotivo}
                onChange={(e) => setAnularMotivo(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ej: vendedor reportó por error, cliente recibió producto de vuelta..."
                className="w-full text-sm bg-surface-1 border border-border-subtle rounded-md p-2 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={anulandoId !== null}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {anularMotivo.length} / 500
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeAnular}
                disabled={anulandoId !== null}
                className="px-3 py-1.5 text-sm font-medium text-foreground/70 border border-border-subtle rounded-md hover:bg-surface-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitAnular}
                disabled={anulandoId !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                {anulandoId !== null && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {anulandoId !== null ? 'Anulando...' : 'Anular devolución'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
