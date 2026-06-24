'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ImageOff, Loader2, Receipt, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import {
  gastosService,
  type GastoListItem,
  TIPO_GASTO_LABEL,
  TIPO_GASTO_ICON,
  TIPO_GASTO_COLOR,
} from '@/services/api/gastos';
import { toast } from '@/hooks/useToast';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

/**
 * Componente compartido para listar gastos de una ruta + lightbox foto +
 * Modal de invalidación accesible (reemplaza window.prompt — feedback specialist).
 *
 * Usado por:
 * - RutaGastosDrawer (close screen)
 * - GastosTab (route detail)
 *
 * Encapsula fetch, invalidación, refs de focus return y dialogs anidados.
 */
interface GastoCardListProps {
  rutaId: number;
  /** Si presente, muestra header con total de activos. */
  showHeader?: boolean;
  /** Llamado tras invalidar un gasto para que el padre pueda refetchear totales. */
  onGastoInvalidated?: (gastoId: number) => void;
  /** Empty state copy variant — "tab" muestra texto explicativo más largo. */
  variant?: 'drawer' | 'tab';
}

export function GastoCardList({
  rutaId,
  showHeader = false,
  onGastoInvalidated,
  variant = 'drawer',
}: GastoCardListProps) {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations('gastos');
  const [gastos, setGastos] = useState<GastoListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [invalidatingId, setInvalidatingId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoConcepto, setPhotoConcepto] = useState<string>('');
  // Modal invalidación con textarea — reemplaza window.prompt por accesibilidad
  // y consistencia con design system.
  const [invalidarTarget, setInvalidarTarget] = useState<GastoListItem | null>(null);
  const [invalidarMotivo, setInvalidarMotivo] = useState('');
  const thumbnailRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const invalidarTriggerRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const lastPhotoGastoId = useRef<number | null>(null);
  const lastInvalidarGastoId = useRef<number | null>(null);

  const fetchGastos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gastosService.list({
        rutaId,
        pagina: 1,
        tamanoPagina: 100,
        soloActivos: false,
      });
      setGastos(data.items);
    } catch (err) {
      console.error(err);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [rutaId, t]);

  useEffect(() => {
    fetchGastos();
  }, [fetchGastos]);

  // Cleanup stale refs cuando la lista cambia — evita .focus() sobre nodos detached.
  useEffect(() => {
    const validIds = new Set(gastos.map((g) => g.id));
    Object.keys(thumbnailRefs.current).forEach((key) => {
      if (!validIds.has(Number(key))) delete thumbnailRefs.current[Number(key)];
    });
    Object.keys(invalidarTriggerRefs.current).forEach((key) => {
      if (!validIds.has(Number(key))) delete invalidarTriggerRefs.current[Number(key)];
    });
  }, [gastos]);

  const openInvalidar = useCallback((gasto: GastoListItem) => {
    lastInvalidarGastoId.current = gasto.id;
    setInvalidarTarget(gasto);
    setInvalidarMotivo('');
  }, []);

  const closeInvalidar = useCallback(() => {
    setInvalidarTarget(null);
    setInvalidarMotivo('');
    const id = lastInvalidarGastoId.current;
    if (id != null) {
      invalidarTriggerRefs.current[id]?.focus();
    }
  }, []);

  const submitInvalidar = useCallback(async () => {
    if (!invalidarTarget) return;
    setInvalidatingId(invalidarTarget.id);
    try {
      await gastosService.invalidar(invalidarTarget.id, invalidarMotivo.trim() || undefined);
      toast.success(t('invalidated'));
      onGastoInvalidated?.(invalidarTarget.id);
      setInvalidarTarget(null);
      setInvalidarMotivo('');
      await fetchGastos();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      toast.error(t('cantInvalidate', { message }));
    } finally {
      setInvalidatingId(null);
    }
  }, [invalidarTarget, invalidarMotivo, fetchGastos, onGastoInvalidated, t]);

  const openLightbox = useCallback((gasto: GastoListItem) => {
    if (!gasto.comprobanteUrl) return;
    lastPhotoGastoId.current = gasto.id;
    setPhotoUrl(gasto.comprobanteUrl);
    setPhotoConcepto(gasto.concepto);
  }, []);

  const closeLightbox = useCallback(() => {
    setPhotoUrl(null);
    const gastoId = lastPhotoGastoId.current;
    if (gastoId != null) {
      thumbnailRefs.current[gastoId]?.focus();
    }
  }, []);

  const activos = gastos.filter((g) => g.estado === 0);
  const totalActivos = activos.reduce((sum, g) => sum + g.monto, 0);

  return (
    <>
      {/* Header optional (tab usage) */}
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground inline-flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Gastos imputados a la ruta
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Los gastos los reportan los vendedores desde la app móvil. El admin puede invalidarlos si detecta irregularidades.
            </p>
          </div>
          {activos.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total activos</p>
              <p className="text-lg font-bold text-red-600">-{formatCurrency(totalActivos)}</p>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Cargando gastos...
        </div>
      ) : gastos.length === 0 ? (
        variant === 'tab' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border-subtle rounded-lg">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Esta ruta aún no tiene gastos registrados</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Los gastos aparecerán aquí cuando el vendedor los reporte desde la app móvil durante la ruta.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Sin gastos en esta ruta</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Los gastos los reportan los vendedores desde la app móvil durante su ruta.
            </p>
          </div>
        )
      ) : (
        <div className="space-y-3 pb-2">
          {!showHeader && (
            <div className="text-xs text-muted-foreground mb-1">
              {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'} en esta ruta
            </div>
          )}
          {gastos.map((g) => {
            const Icon = TIPO_GASTO_ICON[g.tipoGasto] ?? TIPO_GASTO_ICON[99];
            const tipoColor = TIPO_GASTO_COLOR[g.tipoGasto] ?? TIPO_GASTO_COLOR[99];
            const isInvalidado = g.estado === 1;
            return (
              <div
                key={g.id}
                className="flex gap-3 items-start p-3 rounded-lg border border-border-subtle bg-surface-2"
              >
                {/* Thumbnail / placeholder */}
                <div className="flex-shrink-0">
                  {g.comprobanteUrl ? (
                    <button
                      ref={(el) => {
                        thumbnailRefs.current[g.id] = el;
                      }}
                      type="button"
                      onClick={() => openLightbox(g)}
                      className="block w-20 h-20 rounded-lg overflow-hidden border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 hover:opacity-80 transition-opacity"
                      aria-label={`Ver comprobante de ${g.concepto}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.comprobanteUrl} alt={g.concepto} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div
                      className="w-20 h-20 rounded-lg border border-dashed border-border bg-surface-1 flex flex-col items-center justify-center text-muted-foreground"
                      title="Sin comprobante"
                    >
                      <ImageOff className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px] font-medium">Sin foto</span>
                    </div>
                  )}
                </div>

                {/* Detalle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`min-w-0 ${isInvalidado ? 'opacity-60' : ''}`}>
                      <p className={`font-medium text-sm text-foreground truncate ${isInvalidado ? 'line-through' : ''}`}>
                        {g.concepto}
                      </p>
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                        <Icon className={`w-3.5 h-3.5 ${tipoColor}`} />
                        {TIPO_GASTO_LABEL[g.tipoGasto] ?? 'Otro'}
                        <span className="mx-1">·</span>
                        {formatDate(g.fechaGasto)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{g.usuarioNombre}</p>
                    </div>
                    <span className={`font-semibold text-sm whitespace-nowrap ${isInvalidado ? 'text-muted-foreground' : 'text-red-600'}`}>
                      -{formatCurrency(g.monto)}
                    </span>
                  </div>

                  {g.notas && !isInvalidado && (
                    <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">“{g.notas}”</p>
                  )}

                  {isInvalidado && (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
                      <div>
                        <span className="font-medium">Invalidado</span>
                        {g.motivoInvalidacion && (
                          <span className="block text-amber-600 mt-0.5">{g.motivoInvalidacion}</span>
                        )}
                        {g.invalidadoEn && (
                          <span className="block text-amber-600/80 text-[11px] mt-0.5">{formatDate(g.invalidadoEn)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {!isInvalidado && (
                    <div className="mt-3">
                      <button
                        ref={(el) => {
                          invalidarTriggerRefs.current[g.id] = el;
                        }}
                        type="button"
                        onClick={() => openInvalidar(g)}
                        disabled={invalidatingId === g.id}
                        aria-label={`Invalidar gasto: ${g.concepto}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                      >
                        {invalidatingId === g.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                        {invalidatingId === g.id ? 'Invalidando...' : 'Invalidar'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal lightbox para foto del comprobante */}
      <Modal isOpen={photoUrl !== null} onClose={closeLightbox} size="xl" title={photoConcepto || 'Comprobante'}>
        {photoUrl && (
          <div className="flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={photoConcepto || 'Comprobante de gasto'}
              className="w-full object-contain max-h-[75vh] rounded"
            />
          </div>
        )}
      </Modal>

      {/* Modal de invalidación — reemplaza window.prompt por a11y + design system */}
      <Modal
        isOpen={invalidarTarget !== null}
        onClose={() => {
          if (invalidatingId === null) closeInvalidar();
        }}
        size="sm"
        title="Invalidar gasto"
      >
        {invalidarTarget && (
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-lg p-3">
              <p className="text-sm text-muted-foreground">
                Estás por invalidar el gasto de
              </p>
              <p className="text-sm font-medium text-foreground mt-1">
                {invalidarTarget.usuarioNombre} · <span className="text-red-600 font-semibold">-{formatCurrency(invalidarTarget.monto)}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{invalidarTarget.concepto}</p>
            </div>

            <div>
              <label htmlFor="motivo-invalidar" className="block text-xs font-medium text-foreground mb-1">
                Motivo (opcional)
              </label>
              <textarea
                id="motivo-invalidar"
                value={invalidarMotivo}
                onChange={(e) => setInvalidarMotivo(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Ej: comprobante ilegible, monto duplicado..."
                className="w-full text-sm bg-surface-1 border border-border-subtle rounded-md p-2 resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={invalidatingId !== null}
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-right">
                {invalidarMotivo.length} / 500
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeInvalidar}
                disabled={invalidatingId !== null}
                className="px-3 py-1.5 text-sm font-medium text-foreground/70 border border-border-subtle rounded-md hover:bg-surface-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitInvalidar}
                disabled={invalidatingId !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                {invalidatingId !== null && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {invalidatingId !== null ? 'Invalidando...' : 'Invalidar gasto'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
