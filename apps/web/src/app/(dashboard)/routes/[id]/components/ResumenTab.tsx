'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { User, MapPin, Calendar, Clock, Truck, Package, DollarSign, Save, Loader2 } from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { routeService, RutaCargaItem } from '@/services/api/routes';
import type { RouteTabPropsWithPedidos } from './types';

/**
 * Tab Resumen: información general de la ruta + stats consolidados +
 * efectivo inicial / comentarios (movido del load page para concentrar la
 * "preparación general" en un solo lugar).
 *
 * El editar info detallada (nombre/zona/fecha/hora) se hace vía Edit Drawer
 * del shell — este tab solo muestra info y permite ajustar efectivo+comentarios.
 */
interface ResumenTabProps extends RouteTabPropsWithPedidos {
  /** Productos cargados — para calcular total asignado en stats. */
  carga: RutaCargaItem[];
  /** Trigger para abrir el Edit Drawer del shell. */
  onEditClick: () => void;
}

export function ResumenTab({ route, isEditable, onRefetch, pedidos, carga, onEditClick }: ResumenTabProps) {
  const t = useTranslations('routes');
  const tc = useTranslations('common');
  const tl = useTranslations('routes.load');
  const { formatDateOnly, formatCurrency } = useFormatters();
  const showApiError = useApiErrorToast();

  const [efectivoInicial, setEfectivoInicial] = useState<string>(route.efectivoInicial?.toString() || '');
  const [comentarios, setComentarios] = useState<string>(route.comentariosCarga || '');
  const [savingCash, setSavingCash] = useState(false);

  const handleSaveEfectivo = async () => {
    try {
      setSavingCash(true);
      await routeService.updateEfectivoInicial(
        route.id,
        parseFloat(efectivoInicial) || 0,
        comentarios || undefined
      );
      toast.success(tl('cashUpdated'));
      await onRefetch();
    } catch (err) {
      showApiError(err, tl('errorSavingCash'));
    } finally {
      setSavingCash(false);
    }
  };

  const totalAsignado = carga.reduce((sum, c) => sum + c.cantidadTotal * c.precioUnitario, 0);

  return (
    <div className="space-y-6">
      {/* Stats horizontal */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-foreground/70">
            {tl('deliveries')} <strong>{pedidos.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-foreground/70">
            {tl('products')} <strong>{carga.length}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-foreground/70">
            {tl('totalAssigned')} <strong>{formatCurrency(totalAsignado)}</strong>
          </span>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-surface-2 border border-border-subtle rounded-lg p-5">
        {isEditable && (
          <div className="flex justify-end mb-3">
            <button
              onClick={onEditClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground/70 border border-border-subtle rounded-md hover:bg-surface-1 transition-colors"
            >
              {tc('edit')}
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-2">
            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground">{t('columns.user')}</p>
              <p className="text-[13px] font-medium text-foreground">{route.usuarioNombre}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground">{t('columns.zone')}</p>
              <p className="text-[13px] font-medium text-foreground">{route.zonaNombre || t('noZone')}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground">{t('columns.date')}</p>
              <p className="text-[13px] font-medium text-foreground">{formatDateOnly(route.fecha)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-[11px] text-muted-foreground">{t('columns.schedule')}</p>
              <p className="text-[13px] font-medium text-foreground">
                {route.horaInicioEstimada || '--:--'} - {route.horaFinEstimada || '--:--'}
              </p>
            </div>
          </div>
        </div>
        {route.notas && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <p className="text-[11px] text-muted-foreground mb-1">{tc('notes')}</p>
            <p className="text-[13px] text-foreground/80">{route.notas}</p>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-6">
          <div>
            <span className="text-[11px] text-muted-foreground">{t('columns.stops')}: </span>
            <span className="text-[13px] font-medium">
              <span
                className={
                  route.paradasCompletadas === route.totalParadas && route.totalParadas > 0
                    ? 'text-green-600'
                    : ''
                }
              >
                {route.paradasCompletadas}
              </span>
              /{route.totalParadas}
            </span>
          </div>
          {route.kilometrosEstimados && (
            <div>
              <span className="text-[11px] text-muted-foreground">{t('detail.estimatedKm')}: </span>
              <span className="text-[13px] font-medium">{route.kilometrosEstimados}</span>
            </div>
          )}
        </div>
      </div>

      {/* Efectivo + Comentarios (movido del /load) */}
      <div className="bg-surface-2 border border-border-subtle rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">{tl('assignRouteToUser')}</h2>
          {isEditable && (
            <button
              onClick={handleSaveEfectivo}
              disabled={savingCash}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              {savingCash ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {tc('save')}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-4 p-3 bg-surface-1 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <User className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{route.usuarioNombre}</p>
            <p className="text-xs text-muted-foreground">{tl('assignedVendor')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">{tl('initialCash')}</label>
            <input
              type="number"
              value={efectivoInicial}
              onChange={(e) => setEfectivoInicial(e.target.value)}
              placeholder="0.00"
              disabled={!isEditable}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-surface-3 disabled:text-muted-foreground"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">{tl('comments')}</label>
            <input
              type="text"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder={tl('commentsPlaceholder')}
              disabled={!isEditable}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-surface-3 disabled:text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
