'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  routeService,
  RouteDetail,
  ESTADO_RUTA,
  ESTADO_RUTA_KEYS,
  ESTADO_RUTA_COLORS,
} from '@/services/api/routes';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Loader2, AlertTriangle, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { RouteLifecycleStepper } from '@/components/routes/RouteLifecycleStepper';
import { CorteTab } from '../../../[id]/components/CorteTab';

/**
 * Página standalone de cierre de ruta. El cuerpo del corte (conciliación,
 * caja, steppers, drawers, modal de cierre) vive en `<CorteTab />`, compartido
 * con el tab del detalle de ruta. Esta página solo provee el shell
 * (breadcrumb + título + estado + stepper de lifecycle + cancelar).
 */
export default function CloseRoutePage() {
  const ts = useTranslations('routes.status');
  const t = useTranslations('routes.close');
  const tc = useTranslations('common');

  const params = useParams();
  const router = useRouter();
  const rutaId = Number(params.id);

  const [ruta, setRuta] = useState<RouteDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRuta = useCallback(async () => {
    try {
      setLoading(true);
      const rutaData = await routeService.getRuta(rutaId);
      setRuta(rutaData);
    } catch (err) {
      console.error('Error:', err);
      toast.error(t('errorLoadingClose'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rutaId]);

  useEffect(() => {
    fetchRuta();
  }, [fetchRuta]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t('loadingClose')}</span>
        </div>
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  const estadoBadge = ESTADO_RUTA_KEYS[ruta.estado] ? ts(ESTADO_RUTA_KEYS[ruta.estado]) : ts('unknown');
  const estadoColor = ESTADO_RUTA_COLORS[ruta.estado] || 'bg-surface-3 text-foreground';

  return (
    <div className="flex flex-col h-full">
      {/* Header shell */}
      <div className="bg-surface-2 px-8 py-6 border-b border-border-subtle">
        <Breadcrumb
          items={[
            { label: t('breadcrumbRoutes'), href: '/routes' },
            { label: ruta.nombre, href: `/routes/${ruta.id}` },
            { label: t('title') },
          ]}
        />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">{t('title')}</h1>
            <span
              className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${estadoColor}`}
            >
              {estadoBadge}
            </span>
          </div>
          <button
            onClick={() => router.push('/routes')}
            className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1"
          >
            <X className="w-4 h-4" />
            {tc('cancel')}
          </button>
        </div>

        <div data-tour="routes-close-tabs" className="mt-4">
          <RouteLifecycleStepper
            estado={ruta.estado}
            cancelada={ruta.estado === ESTADO_RUTA.Cancelada}
          />
        </div>
      </div>

      {/* Body — delegado a CorteTab */}
      <div className="flex-1 px-8 py-6 overflow-auto">
        {ruta.estado === ESTADO_RUTA.PendienteAceptar && (
          <div className="mb-6 flex items-center gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-300 dark:border-warning-700 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0" />
            <p className="text-sm text-foreground">{t('pendingAcceptAlert')}</p>
          </div>
        )}

        <CorteTab routeId={rutaId} route={ruta} onClosed={fetchRuta} />
      </div>
    </div>
  );
}
