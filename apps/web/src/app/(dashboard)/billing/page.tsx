'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Plus, ArrowRight, Loader2 } from 'lucide-react';
import {
  SbBilling,
  SbDollarSign,
  SbCheckCircle,
  SbClock,
  SbAlert,
} from '@/components/layout/DashboardIcons';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import { getDashboard, getTimbres } from '@/services/api/billing';
import type { BillingDashboard, TimbresBalance, FacturasPorDia, ClienteFacturacion } from '@/types/billing';

interface KpiCard {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}

export default function BillingDashboardPage() {
  const t = useTranslations('billing');
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [timbres, setTimbres] = useState<TimbresBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const { formatCurrency } = useFormatters();

  useEffect(() => {
    async function load() {
      try {
        const [dashData, timbresData] = await Promise.allSettled([
          getDashboard(),
          getTimbres(),
        ]);
        if (dashData.status === 'fulfilled') setDashboard(dashData.value);
        if (timbresData.status === 'fulfilled') setTimbres(timbresData.value);
        if (dashData.status === 'rejected') {
          toast({ title: t('errorLoadingDashboard'), variant: 'destructive' });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
      <span className="sr-only">Loading...</span>
    </div>
  );

  const d = dashboard;
  const kpis: KpiCard[] = [
    {
      label: t('kpis.totalInvoiced'),
      value: formatCurrency(d?.montoTotal ?? 0),
      icon: SbDollarSign,
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: t('kpis.stampedInvoices'),
      value: String(d?.facturasTimbradas ?? 0),
      icon: SbCheckCircle,
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: t('kpis.pending'),
      value: String(d?.facturasPendientes ?? 0),
      icon: SbClock,
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: t('kpis.cancelled'),
      value: String(d?.facturasCanceladas ?? 0),
      icon: SbAlert,
      color: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <PageHeader
      breadcrumbs={[
        { label: t('title'), href: '/billing' },
        { label: t('summary') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <Link href="/billing/invoices/new">
          <Button className="bg-success hover:bg-success/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            {t('newInvoice')}
          </Button>
        </Link>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(kpi => (
          <div
            key={kpi.label}
            className="bg-card border border-border rounded-xl p-4 flex items-start gap-3"
          >
            <div className="mt-0.5">
              <kpi.icon size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
              <p className={`text-xl font-bold tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Timbres Balance */}
      {timbres && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">{t('stampsThisMonth')}</h2>
            <span className="text-sm font-medium tabular-nums text-muted-foreground">
              {timbres.usados} / {timbres.maximo}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={timbres.usados}
            aria-valuemin={0}
            aria-valuemax={timbres.maximo}
            aria-label={t('stampsUsedLabel', { used: timbres.usados, max: timbres.maximo })}
            className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2"
          >
            <div
              aria-hidden="true"
              className={`h-full rounded-full transition-all duration-500 ${
                timbres.maximo > 0 && timbres.usados / timbres.maximo > 0.9
                  ? 'bg-red-500'
                  : timbres.maximo > 0 && timbres.usados / timbres.maximo > 0.7
                    ? 'bg-amber-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${timbres.maximo > 0 ? Math.min(100, (timbres.usados / timbres.maximo) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('stampsAvailable', { count: timbres.disponibles })}
            {!timbres.allowed && timbres.message && (
              <span className="text-red-500 ml-2">— {timbres.message}</span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Facturación por día */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t('invoicingByDay')}</h2>
          </div>
          {d?.facturasPorDia && d.facturasPorDia.length > 0 ? (
            <div className="space-y-2">
              {d.facturasPorDia.slice(0, 7).map((item: FacturasPorDia) => (
                <div key={item.fecha} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(item.fecha).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{t('invoicesCount', { count: item.cantidad })}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(item.monto)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noDataInPeriod')}</p>
          )}
        </div>

        {/* Top Clientes */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">{t('topClients')}</h2>
          </div>
          {d?.topClientes && d.topClientes.length > 0 ? (
            <div className="space-y-3">
              {d.topClientes.slice(0, 5).map((c: ClienteFacturacion) => (
                <div key={c.rfc} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[140px]">{c.nombre}</span>
                    <span className="font-medium tabular-nums">{formatCurrency(c.montoTotal)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{c.rfc} · {t('invoicesCount', { count: c.totalFacturas })}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noInvoicedClients')}</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/billing/invoices"
          className="group flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-green-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SbBilling size={22} />
            <span className="text-sm font-medium">{t('viewAllInvoices')}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-green-600 transition-colors" aria-hidden="true" />
        </Link>
        <Link
          href="/billing/invoices/new"
          className="group flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-green-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium">{t('createNewInvoice')}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-green-600 transition-colors" aria-hidden="true" />
        </Link>
        <Link
          href="/billing/settings"
          className="group flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-green-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <SbBilling size={22} />
            <span className="text-sm font-medium">{t('fiscalSettings')}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-green-600 transition-colors" aria-hidden="true" />
        </Link>
      </div>
    </PageHeader>
  );
}
