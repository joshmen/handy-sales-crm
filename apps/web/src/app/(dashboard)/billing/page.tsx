'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Loader2, Plus } from 'lucide-react';
import {
  SbDollarSign,
  SbCheckCircle,
  SbClock,
  SbBilling,
} from '@/components/layout/DashboardIcons';
import { PageHeader } from '@/components/layout/PageHeader';
import { PendingCancellationsCard } from '@/components/billing/PendingCancellationsCard';
import { Button } from '@/components/ui/Button';
import { StatCard, type StatTone } from '@/components/dashboard/StatCard';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import { getDashboard, getTimbres, getVentasPorPeriodo } from '@/services/api/billing';
import type { BillingDashboard, TimbresBalance } from '@/types/billing';

/** Una barra mensual de la gráfica de facturación. */
interface MonthBar {
  label: string;
  total: number;
  top: string;
  current: boolean;
}

interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: StatTone;
}

/** Barras mensuales (fiel al mock): mes actual azul, resto gris; top = monto compacto. */
function MonthlyBarChart({ bars }: { bars: MonthBar[] }) {
  const max = Math.max(1, ...bars.map(b => b.total));
  return (
    <div className="flex items-end justify-between gap-2.5 h-44">
      {bars.map((b, i) => {
        const pct = Math.round((b.total / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
            <span className="text-[11px] font-bold tabular-nums text-muted-foreground">{b.total > 0 ? b.top : ''}</span>
            <div
              className={`w-full max-w-[46px] rounded-lg transition-all duration-500 ${b.current ? 'bg-primary' : 'bg-muted'}`}
              style={{ height: `${Math.max(4, pct)}%` }}
              title={`${b.label}: ${b.top}`}
            />
            <span className="text-[11px] font-semibold text-muted-foreground">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Donut consumo de timbres (fiel al mock): anillo azul/gris + columna derecha con número + leyenda. */
function StampsDonut({ used, max, available, usedLabel, freeLabel }: {
  used: number; max: number; available: number; usedLabel: string; freeLabel: string;
}) {
  const size = 130, thickness = 20;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, used / max) : 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} className="flex-shrink-0" style={{ transform: 'rotate(-90deg)' }} role="img" aria-label={`${used} de ${max}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-muted" strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-primary transition-all duration-700"
          strokeWidth={thickness}
          strokeDasharray={`${frac * circ} ${circ}`}
        />
      </svg>
      <div>
        <div className="text-[22px] font-extrabold tracking-tight tabular-nums text-foreground leading-none">{used}</div>
        <div className="text-xs text-muted-foreground mb-3">de {max}</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
            <span className="text-muted-foreground flex-1">{usedLabel}</span>
            <span className="font-bold tabular-nums text-foreground">{used}</span>
          </div>
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" aria-hidden="true" />
            <span className="text-muted-foreground flex-1">{freeLabel}</span>
            <span className="font-bold tabular-nums text-foreground">{available}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Construye el eje de 6 meses (actual + 5 previos) y mapea la facturación mensual real. */
function buildMonthBars(ventas: { periodo: string; total: number }[], locale: string, compact: (v: number) => string): MonthBar[] {
  const now = new Date();
  const bars: MonthBar[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const ml = d.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
    const total = ventas.find(v => v.periodo === key)?.total ?? 0;
    bars.push({
      label: ml.charAt(0).toUpperCase() + ml.slice(1),
      total,
      top: compact(total),
      current: i === 0,
    });
  }
  return bars;
}

export default function BillingDashboardPage() {
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [timbres, setTimbres] = useState<TimbresBalance | null>(null);
  const [monthBars, setMonthBars] = useState<MonthBar[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useFormatters();

  useEffect(() => {
    // Monto compacto para el top de las barras ("$842K"), fiel al mock.
    const compact = (v: number) => (v >= 1000 ? `$${Math.round(v / 1000)}K` : `$${Math.round(v)}`);
    async function load() {
      try {
        const now = new Date();
        const fechaFin = now.toISOString();
        const fechaInicio = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();
        const [dashData, timbresData, ventasData] = await Promise.allSettled([
          getDashboard(),
          getTimbres(),
          getVentasPorPeriodo({ fechaInicio, fechaFin, agrupacion: 'mes' }),
        ]);
        if (dashData.status === 'fulfilled') setDashboard(dashData.value);
        if (timbresData.status === 'fulfilled') setTimbres(timbresData.value);
        if (ventasData.status === 'fulfilled') setMonthBars(buildMonthBars(ventasData.value, locale, compact));
        if (dashData.status === 'rejected') {
          toast({ title: t('errorLoadingDashboard'), variant: 'destructive' });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locale]);

  if (loading) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">{t('loadingScreenReader')}</span>
    </div>
  );

  const d = dashboard;
  const kpis: KpiCard[] = [
    {
      label: t('kpis.stampedMonth'),
      value: String(d?.facturasTimbradas ?? 0),
      icon: SbCheckCircle,
      tone: 'primary',
    },
    {
      label: t('kpis.amountInvoiced'),
      value: formatCurrency(d?.montoTotal ?? 0),
      icon: SbDollarSign,
      tone: 'primary',
    },
    {
      label: t('kpis.availableStamps'),
      value: String(timbres?.disponibles ?? 0),
      sub: timbres ? t('ofMax', { max: timbres.maximo }) : undefined,
      icon: SbBilling,
      tone: 'default',
    },
    {
      label: t('kpis.toStamp'),
      value: String(d?.facturasPendientes ?? 0),
      icon: SbClock,
      tone: 'warning',
    },
  ];

  const hasMonthData = monthBars.some(b => b.total > 0);

  return (
    <PageHeader
      section="empresa"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title'), href: '/billing' },
        { label: t('summary') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <Link href="/billing/invoices/select-order">
          <Button variant="wbPrimary">
            <Plus className="w-4 h-4 mr-2" />
            {t('selectOrder.title')}
          </Button>
        </Link>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => (
          <StatCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            sub={kpi.sub}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Facturación mensual (barras) */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight text-foreground mb-5">{t('monthlyInvoicing')}</h2>
          {hasMonthData ? (
            <MonthlyBarChart bars={monthBars} />
          ) : (
            <p className="text-sm text-muted-foreground py-12 text-center">{t('noDataInPeriod')}</p>
          )}
        </div>

        {/* Consumo de timbres (donut) */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold tracking-tight text-foreground mb-4">{t('stampsConsumption')}</h2>
          <div className="flex-1 flex items-center justify-center">
            <StampsDonut
              used={timbres?.usados ?? 0}
              max={timbres?.maximo ?? 0}
              available={timbres?.disponibles ?? 0}
              usedLabel={t('stampsUsed')}
              freeLabel={t('stampsFree')}
            />
          </div>
          <Link href="/subscription/buy-timbres" className="mt-4">
            <Button variant="wbOutline" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {t('buyStampsShort')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Solicitudes de cancelación pendientes (tenant como receptor) — funcionalidad real */}
      <PendingCancellationsCard />
    </PageHeader>
  );
}
