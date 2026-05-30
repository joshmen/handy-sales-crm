'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Receipt, X, AlertTriangle, ImageOff } from 'lucide-react';
import { Drawer } from '@/components/ui/Drawer';
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

interface RutaGastosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  rutaId: number;
  rutaCodigo?: string;
  /** Fired when a gasto is invalidated so the parent can refetch totals. */
  onGastoInvalidated?: (gastoId: number) => void;
}

/**
 * Drawer lateral derecho que muestra los gastos imputados a una ruta.
 * - Read-only excepto por la accion "Invalidar" (auditoria admin)
 * - Thumbnails 80x80; click abre Modal con foto en grande
 * - Modal anidado: ESC cierra solo el Modal gracias al patch capture+stopImmediate
 *   en Modal.tsx (resuelve race ESC con Drawer)
 *
 * Patron reusable: tambien se usa en GastosTab del route detail page.
 */
export function RutaGastosDrawer({
  isOpen,
  onClose,
  rutaId,
  rutaCodigo,
  onGastoInvalidated,
}: RutaGastosDrawerProps) {
  const { formatCurrency, formatDate } = useFormatters();
  const [gastos, setGastos] = useState<GastoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [invalidatingId, setInvalidatingId] = useState<number | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoConcepto, setPhotoConcepto] = useState<string>('');
  // refs para retornar focus al thumbnail cuando se cierra el lightbox
  const thumbnailRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const lastPhotoGastoId = useRef<number | null>(null);

  const fetchGastos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await gastosService.list({
        rutaId,
        pagina: 1,
        tamanoPagina: 100,
        soloActivos: false, // mostramos invalidados tambien para auditoria
      });
      setGastos(data.items);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar los gastos de la ruta');
    } finally {
      setLoading(false);
    }
  }, [rutaId]);

  useEffect(() => {
    if (isOpen) fetchGastos();
  }, [isOpen, fetchGastos]);

  const handleInvalidar = useCallback(
    async (gasto: GastoListItem) => {
      const motivo = window.prompt(
        `Invalidar gasto de ${gasto.usuarioNombre} (${formatCurrency(gasto.monto)})?\n\nMotivo (opcional):`,
      );
      if (motivo === null) return; // cancelado
      setInvalidatingId(gasto.id);
      try {
        await gastosService.invalidar(gasto.id, motivo || undefined);
        toast.success('Gasto invalidado');
        await fetchGastos();
        onGastoInvalidated?.(gasto.id);
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Error desconocido';
        toast.error(`No se pudo invalidar: ${message}`);
      } finally {
        setInvalidatingId(null);
      }
    },
    [fetchGastos, formatCurrency, onGastoInvalidated],
  );

  const openLightbox = useCallback((gasto: GastoListItem) => {
    if (!gasto.comprobanteUrl) return;
    lastPhotoGastoId.current = gasto.id;
    setPhotoUrl(gasto.comprobanteUrl);
    setPhotoConcepto(gasto.concepto);
  }, []);

  const closeLightbox = useCallback(() => {
    setPhotoUrl(null);
    // Restore focus al thumbnail que abrio el lightbox.
    const gastoId = lastPhotoGastoId.current;
    if (gastoId != null) {
      const btn = thumbnailRefs.current[gastoId];
      btn?.focus();
    }
  }, []);

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title={`Gastos${rutaCodigo ? ` · ${rutaCodigo}` : ''}`}
        icon={<Receipt className="w-5 h-5 text-muted-foreground" />}
        width="xl"
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Cargando gastos...
          </div>
        ) : gastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Sin gastos en esta ruta</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs">
              Los gastos los reportan los vendedores desde la app móvil durante su ruta.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-2">
            <div className="text-xs text-muted-foreground mb-1">
              {gastos.length} {gastos.length === 1 ? 'gasto' : 'gastos'} en esta ruta
            </div>
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
                        <img
                          src={g.comprobanteUrl}
                          alt={g.concepto}
                          className="w-full h-full object-cover"
                        />
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {g.usuarioNombre}
                        </p>
                      </div>
                      <span className={`font-semibold text-sm whitespace-nowrap ${isInvalidado ? 'text-muted-foreground' : 'text-red-600'}`}>
                        -{formatCurrency(g.monto)}
                      </span>
                    </div>

                    {/* Notas opcionales */}
                    {g.notas && !isInvalidado && (
                      <p className="text-xs text-muted-foreground mt-2 italic line-clamp-2">
                        “{g.notas}”
                      </p>
                    )}

                    {/* Estado invalidado */}
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

                    {/* Accion invalidar (solo si activo) */}
                    {!isInvalidado && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => handleInvalidar(g)}
                          disabled={invalidatingId === g.id}
                          aria-label={`Invalidar gasto: ${g.concepto}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                        >
                          {invalidatingId === g.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
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
      </Drawer>

      {/* Lightbox de foto. Modal lleva el patch capture+stopImmediate para ESC. */}
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
    </>
  );
}
