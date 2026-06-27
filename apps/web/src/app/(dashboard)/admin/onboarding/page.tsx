'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Inbox,
  Clock,
  FileText,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/common/EmptyState';
import {
  onboardingAdminService,
  type CasoOnboardingResumenDto,
  type CasoOnboardingDto,
  type EtapaOnboarding,
} from '@/services/api/onboardingAdmin';

// Etiquetas en espanol para cada etapa (mapea el number del enum del backend).
const ETAPA_LABELS: Record<EtapaOnboarding, string> = {
  0: 'Solicitud',
  1: 'Datos fiscales',
  2: 'CSD/Finkok',
  3: 'Plan y pago',
  4: 'Activa',
};

const ETAPAS_ORDEN: EtapaOnboarding[] = [0, 1, 2, 3, 4];

// Variante del Badge segun la etapa.
function etapaBadgeVariant(
  etapa: EtapaOnboarding
): 'secondary' | 'info' | 'warning' | 'success' {
  if (etapa === 4) return 'success';
  if (etapa === 3) return 'info';
  if (etapa === 0) return 'secondary';
  return 'warning';
}

// Etapa siguiente, tope en 4 (Activa).
function siguienteEtapa(etapa: EtapaOnboarding): EtapaOnboarding {
  return Math.min(etapa + 1, 4) as EtapaOnboarding;
}

export default function OnboardingPage() {
  const [data, setData] = useState<CasoOnboardingResumenDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avanzandoId, setAvanzandoId] = useState<number | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resumen = await onboardingAdminService.getResumen();
      setData(resumen);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el onboarding.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const continuar = useCallback(
    async (caso: CasoOnboardingDto) => {
      const proxima = siguienteEtapa(caso.etapa);
      if (proxima === caso.etapa) return; // ya esta en Activa
      setAvanzandoId(caso.id);
      setError(null);
      try {
        await onboardingAdminService.cambiarEtapa(caso.id, proxima);
        await cargar();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo avanzar la etapa.');
      } finally {
        setAvanzandoId(null);
      }
    },
    [cargar]
  );

  // Conteo de casos por etapa para el stage strip.
  const conteoPorEtapa: Record<EtapaOnboarding, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
  };
  if (data) {
    for (const caso of data.items) {
      conteoPorEtapa[caso.etapa] = (conteoPorEtapa[caso.etapa] ?? 0) + 1;
    }
  }

  return (
    <PageHeader
      section="superadmin"
      icon={Inbox}
      title="Onboarding"
      subtitle="Pipeline de activacion de nuevas empresas."
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="En proceso"
          value={loading ? 0 : data?.enProceso ?? 0}
          tone="primary"
          icon={Clock}
          loading={loading}
        />
        <StatCard
          label="Esperando docs"
          value={loading ? 0 : data?.esperandoDocs ?? 0}
          tone="warning"
          icon={FileText}
          loading={loading}
        />
        <StatCard
          label="Listas"
          value={loading ? 0 : data?.listas ?? 0}
          tone="success"
          icon={CheckCircle2}
          loading={loading}
        />
        <StatCard
          label="Activadas mes"
          value={loading ? 0 : data?.activadasMes ?? 0}
          tone="success"
          icon={Sparkles}
          loading={loading}
        />
      </div>

      {/* Stage strip: las 5 etapas con conteo de casos en cada una */}
      <div className="mt-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {ETAPAS_ORDEN.map((etapa, idx) => {
            const conteo = conteoPorEtapa[etapa];
            const activa = !loading && conteo > 0;
            return (
              <div key={etapa} className="flex items-center gap-2 sm:gap-3 flex-1">
                <div
                  className={`flex-1 rounded-xl border p-3 transition-colors ${
                    activa
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Etapa {etapa + 1}
                    </span>
                    <span
                      className={`text-lg font-extrabold tabular-nums leading-none ${
                        activa ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {loading ? '-' : conteo}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-foreground">
                    {ETAPA_LABELS[etapa]}
                  </p>
                </div>
                {idx < ETAPAS_ORDEN.length - 1 && (
                  <ChevronRight
                    className="hidden sm:block w-4 h-4 text-muted-foreground/50 flex-shrink-0"
                    aria-hidden="true"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabla / estados */}
      <div className="mt-6">
        {error ? (
          <Card>
            <CardContent className="pt-6">
              <ErrorState
                title="No se pudo cargar"
                description={error}
                onRetry={() => void cargar()}
              />
            </CardContent>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="h-4 w-40 rounded bg-muted animate-pulse" />
                    <div className="h-5 w-24 rounded-full bg-muted animate-pulse" />
                    <div className="h-4 w-28 rounded bg-muted animate-pulse" />
                    <div className="ml-auto h-9 w-28 rounded-full bg-muted animate-pulse" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : !data || data.items.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={Inbox}
                title="Sin casos de onboarding"
                description="Aun no hay empresas en el pipeline de activacion."
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3">Empresa</th>
                      <th className="px-5 py-3">Etapa</th>
                      <th className="px-5 py-3">Responsable</th>
                      <th className="px-5 py-3">Dias en etapa</th>
                      <th className="px-5 py-3">Plan tentativo</th>
                      <th className="px-5 py-3 text-right">Accion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.items.map(caso => {
                      const esActiva = caso.etapa === 4;
                      return (
                        <tr key={caso.id} className="hover:bg-muted/40 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-foreground">
                            {caso.empresa}
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={etapaBadgeVariant(caso.etapa)}>
                              {ETAPA_LABELS[caso.etapa]}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {caso.responsableUsuarioId != null
                              ? `Usuario #${caso.responsableUsuarioId}`
                              : 'Sin asignar'}
                          </td>
                          <td className="px-5 py-3.5 tabular-nums text-foreground">
                            {caso.diasEnEtapa}
                          </td>
                          <td className="px-5 py-3.5 text-muted-foreground">
                            {caso.planTentativo ?? 'Sin datos'}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              variant="wbOutline"
                              size="sm"
                              loading={avanzandoId === caso.id}
                              disabled={esActiva || avanzandoId === caso.id}
                              onClick={() => void continuar(caso)}
                            >
                              {esActiva ? 'Completado' : 'Continuar'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageHeader>
  );
}
