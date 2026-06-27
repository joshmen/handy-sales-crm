'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Banknote,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Percent,
  RotateCw,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/common/EmptyState';
import {
  dunningAdminService,
  CobranzaDto,
  CobranzaResumenDto,
  EtapaCobranza,
  EstadoCobranza,
} from '@/services/api/dunningAdmin';

// ============ MAPEOS DE ENUMS (number -> etiqueta es) ============

const ETAPA_LABEL: Record<EtapaCobranza, string> = {
  [EtapaCobranza.Reintento1]: 'Reintento 1',
  [EtapaCobranza.Reintento2]: 'Reintento 2',
  [EtapaCobranza.AvisoFinal]: 'Aviso final',
  [EtapaCobranza.Suspension]: 'Suspension',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

const ETAPA_BADGE: Record<EtapaCobranza, BadgeVariant> = {
  [EtapaCobranza.Reintento1]: 'info',
  [EtapaCobranza.Reintento2]: 'warning',
  [EtapaCobranza.AvisoFinal]: 'warning',
  [EtapaCobranza.Suspension]: 'destructive',
};

const ESTADO_LABEL: Record<EstadoCobranza, string> = {
  [EstadoCobranza.Activo]: 'Activo',
  [EstadoCobranza.Recuperado]: 'Recuperado',
  [EstadoCobranza.Perdido]: 'Perdido',
};

const ESTADO_BADGE: Record<EstadoCobranza, BadgeVariant> = {
  [EstadoCobranza.Activo]: 'warning',
  [EstadoCobranza.Recuperado]: 'success',
  [EstadoCobranza.Perdido]: 'destructive',
};

/** Orden de la tira de etapas (stage strip). */
const STAGE_STRIP: EtapaCobranza[] = [
  EtapaCobranza.Reintento1,
  EtapaCobranza.Reintento2,
  EtapaCobranza.AvisoFinal,
  EtapaCobranza.Suspension,
];

// ============ HELPERS ============

function formatMoney(value: number | null | undefined): string {
  if (value == null) return 'Sin datos';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return 'Sin datos';
  return `${(value * 100).toFixed(1)}%`;
}

function formatDate(value: string | null): string {
  if (!value) return 'Sin datos';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Sin datos';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export default function DunningPage() {
  const [resumen, setResumen] = useState<CobranzaResumenDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchResumen = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await dunningAdminService.getResumen();
      setResumen(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResumen();
  }, [fetchResumen]);

  const runAction = useCallback(
    async (id: number, fn: (id: number) => Promise<void>) => {
      setActionId(id);
      try {
        await fn(id);
        await fetchResumen();
      } catch {
        setError(true);
      } finally {
        setActionId(null);
      }
    },
    [fetchResumen]
  );

  const items: CobranzaDto[] = resumen?.items ?? [];

  // Conteo de casos activos por etapa para la tira de etapas.
  const stageCounts: Record<EtapaCobranza, number> = {
    [EtapaCobranza.Reintento1]: 0,
    [EtapaCobranza.Reintento2]: 0,
    [EtapaCobranza.AvisoFinal]: 0,
    [EtapaCobranza.Suspension]: 0,
  };
  for (const item of items) {
    if (item.estado === EstadoCobranza.Activo) {
      stageCounts[item.etapa] = (stageCounts[item.etapa] ?? 0) + 1;
    }
  }

  return (
    <PageHeader
      section="superadmin"
      icon={Banknote}
      title="Cobros"
      subtitle="Cobros fallidos y recuperacion de pagos de suscripciones."
      actions={
        <Button variant="wbOutline" size="sm" onClick={fetchResumen} loading={loading}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Actualizar
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Fallidos"
            value={loading ? 0 : resumen?.fallidos ?? 'Sin datos'}
            tone="danger"
            icon={AlertTriangle}
            loading={loading}
          />
          <StatCard
            label="Monto en riesgo"
            value={loading ? 0 : formatMoney(resumen?.montoEnRiesgo)}
            tone="warning"
            icon={DollarSign}
            loading={loading}
          />
          <StatCard
            label="Recuperado este mes"
            value={loading ? 0 : formatMoney(resumen?.recuperadoMes)}
            tone="success"
            icon={TrendingUp}
            loading={loading}
          />
          <StatCard
            label="Tasa de recuperacion"
            value={loading ? 0 : formatPercent(resumen?.tasa)}
            tone="primary"
            icon={Percent}
            loading={loading}
          />
        </div>

        {error && !loading ? (
          <div className="rounded-2xl border border-border bg-card shadow-sm">
            <ErrorState
              title="No se pudo cargar la cobranza"
              description="Ocurrio un error al consultar los casos de cobranza. Intenta de nuevo."
              onRetry={fetchResumen}
            />
          </div>
        ) : (
          <>
            {/* Stage strip */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground mb-4">Etapas del flujo de cobranza</h2>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                {STAGE_STRIP.map((etapa, idx) => (
                  <div key={etapa} className="flex flex-1 items-center gap-3">
                    <div className="flex-1 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold text-muted-foreground">
                          {ETAPA_LABEL[etapa]}
                        </span>
                        <Badge variant={ETAPA_BADGE[etapa]}>{stageCounts[etapa]}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stageCounts[etapa] === 1 ? '1 caso activo' : `${stageCounts[etapa]} casos activos`}
                      </p>
                    </div>
                    {idx < STAGE_STRIP.length - 1 && (
                      <ChevronRight
                        className="hidden h-5 w-5 flex-shrink-0 text-muted-foreground/50 sm:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabla de casos */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              {loading ? (
                <div className="divide-y divide-border-subtle">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-4">
                      <div className="h-4 w-40 rounded-md bg-muted animate-pulse" />
                      <div className="h-4 w-20 rounded-md bg-muted animate-pulse" />
                      <div className="ml-auto h-8 w-48 rounded-md bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Banknote className="h-12 w-12 text-muted-foreground/50" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold text-foreground">Sin casos de cobranza</h3>
                  <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                    No hay cobros fallidos en seguimiento. Cuando un pago de suscripcion falle, aparecera aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border-subtle bg-surface-1 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">Monto</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Motivo</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-center">Intentos</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground">Proximo paso</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-center">Etapa</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-center">Estado</th>
                        <th className="px-4 py-3 font-medium text-muted-foreground text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {items.map((item) => {
                        const busy = actionId === item.id;
                        const cerrado = item.estado !== EstadoCobranza.Activo;
                        return (
                          <tr key={item.id} className="hover:bg-surface-1">
                            <td className="px-4 py-3 font-medium text-foreground">{item.empresa}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground/80">
                              {formatMoney(item.monto)}
                            </td>
                            <td className="px-4 py-3 text-foreground/70">{item.motivo || 'Sin datos'}</td>
                            <td className="px-4 py-3 text-center tabular-nums text-foreground/70">
                              {item.intentos}
                            </td>
                            <td className="px-4 py-3 text-foreground/70">{formatDate(item.proximoPasoEn)}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={ETAPA_BADGE[item.etapa]}>{ETAPA_LABEL[item.etapa]}</Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant={ESTADO_BADGE[item.estado]}>{ESTADO_LABEL[item.estado]}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="wbSoft"
                                  size="sm"
                                  disabled={busy || cerrado}
                                  loading={busy}
                                  onClick={() => runAction(item.id, (id) => dunningAdminService.reintento(id))}
                                  title="Registrar reintento y avanzar etapa"
                                >
                                  <RotateCw className="h-3.5 w-3.5 mr-1" />
                                  Reintentar
                                </Button>
                                <Button
                                  variant="wbSoft"
                                  size="sm"
                                  disabled={busy || cerrado}
                                  onClick={() => runAction(item.id, (id) => dunningAdminService.contactado(id))}
                                  title="Marcar como contactado y reprogramar proximo paso"
                                >
                                  <PhoneCall className="h-3.5 w-3.5 mr-1" />
                                  Contactar
                                </Button>
                                <Button
                                  variant="wbPrimary"
                                  size="sm"
                                  disabled={busy || cerrado}
                                  onClick={() => runAction(item.id, (id) => dunningAdminService.recuperado(id))}
                                  title="Marcar el caso como recuperado"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                  Recuperado
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PageHeader>
  );
}
