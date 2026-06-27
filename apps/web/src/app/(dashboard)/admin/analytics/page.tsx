'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Banknote,
  Target,
  TrendingDown,
  Percent,
  Users,
  Layers,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { ErrorState } from '@/components/common/EmptyState';
import { saasAnalyticsService, type AnaliticaDto } from '@/services/api/saasAnalytics';

const SIN_DATOS = 'Sin datos';

/** Formatea un monto MXN. */
function formatMoney(value: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/** Convierte una fraccion 0..1 a porcentaje legible, ej. 0.1234 -> "12.3%". */
function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

/** Etiqueta de un monto MRR que puede venir null -> "Sin datos". */
function formatMoneyOrSinDatos(value: number | null): string {
  return value === null ? SIN_DATOS : formatMoney(value);
}

/** Etiqueta de mes "2026-06" -> "jun 2026". */
function formatMes(mes: string): string {
  const parts = mes.split('-');
  if (parts.length !== 2) return mes;
  const year = parts[0];
  const monthIndex = Number(parts[1]) - 1;
  const meses = [
    'ene', 'feb', 'mar', 'abr', 'may', 'jun',
    'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
  ];
  const label = meses[monthIndex] ?? mes;
  return `${label} ${year}`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnaliticaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await saasAnalyticsService.getAnalytics();
      setData(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Subtitulo con el MRR/ARR actual cuando hay datos.
  const subtitle = data
    ? `MRR ${formatMoney(data.mrr)} : ARR ${formatMoney(data.arr)}`
    : 'Metricas de negocio de la plataforma.';

  // ----- Estado de error -----
  if (error) {
    return (
      <PageHeader
        section="superadmin"
        icon={BarChart3}
        title="Analitica"
        subtitle="Metricas de negocio de la plataforma."
      >
        <ErrorState
          title="No se pudieron cargar las metricas"
          description="Ocurrio un problema al obtener la analitica de la plataforma."
          onRetry={load}
        />
      </PageHeader>
    );
  }

  return (
    <PageHeader section="superadmin" icon={BarChart3} title="Analitica" subtitle={subtitle}>
      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="LTV (valor de vida)"
          value={loading ? '' : formatMoneyOrSinDatos(data?.ltv ?? null)}
          tone="primary"
          icon={Banknote}
          sub="Ingreso estimado por cliente"
          loading={loading}
        />
        <StatCard
          label="CAC (costo de adquisicion)"
          value={loading ? '' : formatMoneyOrSinDatos(data?.cac ?? null)}
          tone="default"
          icon={Target}
          sub="Sin fuente de datos conectada"
          loading={loading}
        />
        <StatCard
          label="Churn mensual"
          value={loading ? '' : formatPercent(data?.churn ?? 0)}
          tone="danger"
          icon={TrendingDown}
          sub="Cancelaciones del mes actual"
          loading={loading}
        />
        <StatCard
          label="Conversion de prueba"
          value={loading ? '' : formatPercent(data?.conversion ?? 0)}
          tone="success"
          icon={Percent}
          sub="Pruebas con tarjeta que pagan"
          loading={loading}
        />
      </div>

      {loading ? (
        <SkeletonBlocks />
      ) : data ? (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <EmbudoCard data={data} />
          <MovimientoMrrCard data={data} />
          <CohortesCard data={data} />
          <ChurnPorPlanCard data={data} />
        </div>
      ) : null}
    </PageHeader>
  );
}

// ============ BLOQUE EMBUDO ============

function EmbudoCard({ data }: { data: AnaliticaDto }) {
  const filas: { label: string; valor: number }[] = [
    { label: 'Pruebas', valor: data.embudo.pruebas },
    { label: 'Activaron', valor: data.embudo.activaron },
    { label: 'Pago', valor: data.embudo.pago },
    { label: 'Retenidas', valor: data.embudo.retenidas },
  ];
  // El ancho es proporcional al maximo del embudo (las pruebas suelen ser el tope).
  const max = Math.max(1, ...filas.map((f) => f.valor));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-primary" />
          <CardTitle className="text-lg">Embudo de conversion</CardTitle>
        </div>
        <CardDescription>Del registro de prueba a la retencion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {filas.map((fila) => {
          const pct = (fila.valor / max) * 100;
          return (
            <div key={fila.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{fila.label}</span>
                <span className="tabular-nums font-semibold text-muted-foreground">
                  {fila.valor.toLocaleString('es-MX')}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ============ BLOQUE MOVIMIENTO MRR ============

function MovimientoMrrCard({ data }: { data: AnaliticaDto }) {
  const m = data.movimientoMrr;
  const filas: { label: string; valor: string; tone: 'positive' | 'negative' | 'neutral' }[] = [
    { label: 'Nuevas', valor: `${m.nuevas.toLocaleString('es-MX')} suscripciones`, tone: 'positive' },
    { label: 'Expansion', valor: formatMoneyOrSinDatos(m.expansion), tone: 'positive' },
    { label: 'Contraccion', valor: formatMoneyOrSinDatos(m.contraccion), tone: 'negative' },
    { label: 'Churn', valor: formatMoney(m.churn), tone: 'negative' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Banknote size={18} className="text-primary" />
          <CardTitle className="text-lg">Movimiento de MRR</CardTitle>
        </div>
        <CardDescription>Como evoluciono el ingreso recurrente este mes.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {filas.map((fila) => (
            <li key={fila.label} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium text-foreground">{fila.label}</span>
              <span
                className={`tabular-nums font-semibold ${
                  fila.valor === SIN_DATOS
                    ? 'text-muted-foreground'
                    : fila.tone === 'positive'
                      ? 'text-primary'
                      : fila.tone === 'negative'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-foreground'
                }`}
              >
                {fila.valor}
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between pt-3 text-sm">
            <span className="font-bold text-foreground">MRR final</span>
            <span className="tabular-nums text-base font-extrabold text-primary">
              {formatMoney(m.final)}
            </span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}

// ============ BLOQUE COHORTES (HEATMAP) ============

function CohortesCard({ data }: { data: AnaliticaDto }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <CardTitle className="text-lg">Cohortes</CardTitle>
        </div>
        <CardDescription>Retencion por mes de registro (ultimos 6 meses).</CardDescription>
      </CardHeader>
      <CardContent>
        {data.cohortes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{SIN_DATOS}</p>
        ) : (
          <div className="space-y-2">
            {data.cohortes.map((cohorte) => {
              // porcentajeActivo viene como fraccion 0..1 -> intensidad del color.
              const fraction = cohorte.porcentajeActivo;
              // Opacidad minima visible para que la celda no quede invisible.
              const opacity = 0.12 + fraction * 0.88;
              const textOnPrimary = fraction >= 0.45;
              return (
                <div key={cohorte.mes} className="flex items-center gap-3">
                  <span className="w-20 flex-shrink-0 text-sm font-medium text-muted-foreground">
                    {formatMes(cohorte.mes)}
                  </span>
                  <div
                    className="flex h-9 flex-1 items-center justify-between rounded-lg px-3"
                    style={{ backgroundColor: `hsl(var(--primary) / ${opacity})` }}
                  >
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        textOnPrimary ? 'text-white' : 'text-foreground'
                      }`}
                    >
                      {formatPercent(fraction)}
                    </span>
                    <span
                      className={`text-xs ${
                        textOnPrimary ? 'text-white/80' : 'text-muted-foreground'
                      }`}
                    >
                      {cohorte.totalInicial.toLocaleString('es-MX')} registros
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ BLOQUE CHURN POR PLAN ============

function ChurnPorPlanCard({ data }: { data: AnaliticaDto }) {
  const max = Math.max(0.0001, ...data.churnPorPlan.map((c) => c.churn));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown size={18} className="text-primary" />
          <CardTitle className="text-lg">Churn por plan</CardTitle>
        </div>
        <CardDescription>Tasa de cancelacion del mes por plan.</CardDescription>
      </CardHeader>
      <CardContent>
        {data.churnPorPlan.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{SIN_DATOS}</p>
        ) : (
          <div className="space-y-3.5">
            {data.churnPorPlan.map((item) => {
              const pct = (item.churn / max) * 100;
              return (
                <div key={item.plan}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-foreground">{item.plan}</span>
                    <span className="tabular-nums font-semibold text-muted-foreground">
                      {formatPercent(item.churn)}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-red-500 transition-all duration-300 dark:bg-red-400"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ SKELETONS ============

function SkeletonBlocks() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-5 w-40 animate-pulse rounded-md bg-muted" />
            <div className="mt-1 h-3.5 w-56 animate-pulse rounded-md bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((__, j) => (
              <div key={j} className="h-8 w-full animate-pulse rounded-lg bg-muted" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
