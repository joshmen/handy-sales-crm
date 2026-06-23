'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { SystemMetrics, SystemTrends } from '@/types/tenant';
import { tenantService } from '@/services/api/tenants';
import { toast } from '@/hooks/useToast';
import {
  Building2,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  ChevronRight,
  Package,
  UserCheck,
  Crown,
  LayoutDashboard
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { useChartTheme } from '@/hooks/useChartTheme';
import { useTranslations } from 'next-intl';
import { PageHeader } from '@/components/layout/PageHeader';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444'];

// Period labels are set dynamically using translations inside the component
const PERIOD_VALUES = [7, 15, 30, 90];

function formatChartDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function formatShortCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export default function SystemDashboardPage() {
  const t = useTranslations('admin.systemDashboard');
  const ta = useTranslations('admin');
  const { formatCurrency: _fmtCur, formatNumber: _fmtNum } = useFormatters();
  const ct = useChartTheme();

  const PERIOD_OPTIONS = PERIOD_VALUES.map(v => ({
    value: v,
    label: t(`days${v}` as 'days7' | 'days15' | 'days30' | 'days90'),
  }));
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [trends, setTrends] = useState<SystemTrends | null>(null);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);

  useEffect(() => {
    loadMetrics();
  }, []);

  useEffect(() => {
    loadTrends();
  }, [trendDays]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getSystemMetrics();
      setMetrics(data);
    } catch {
      toast({
        title: 'Error',
        description: t('loadError'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrends = async () => {
    try {
      const data = await tenantService.getSystemTrends(trendDays);
      setTrends(data);
    } catch {
      // Trends are optional — don't block the page
      console.error('Error loading trends');
    }
  };

  const formatCurrency = (value: number) => _fmtCur(value);
  const formatNumber = (value: number) => _fmtNum(value);

  const breadcrumbs = [
    { label: ta('breadcrumb') },
    { label: t('breadcrumb') },
  ];

  // ── ApexCharts: Revenue by day (area + gradient) ──
  const revenueSeries = useMemo(
    () => [
      {
        name: t('revenue'),
        data: (trends?.revenueByDay ?? []).map((d) => ({ x: d.date, y: d.value })),
      },
    ],
    [trends, t]
  );

  const revenueOptions = useMemo<ApexCharts.ApexOptions>(
    () => ({
      chart: {
        type: 'area',
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 600 },
        zoom: { enabled: false },
      },
      colors: ['#0176D3'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.3,
          opacityTo: 0,
          stops: [5, 95],
        },
      },
      grid: { borderColor: ct.grid, strokeDashArray: 3, padding: { left: 8, right: 8 } },
      xaxis: {
        type: 'category',
        labels: {
          rotate: 0,
          hideOverlappingLabels: true,
          formatter: (value: string) => formatChartDate(String(value)),
          style: { fontSize: '11px', colors: ct.textSecondary },
        },
        axisBorder: { color: ct.grid },
        axisTicks: { color: ct.grid },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          formatter: (value: number) => formatShortCurrency(value),
          style: { fontSize: '11px', colors: ct.textSecondary },
        },
      },
      tooltip: {
        theme: ct.isDark ? 'dark' : 'light',
        x: { formatter: (_v, opts) => formatChartDate(String(revenueSeries[0]?.data[opts?.dataPointIndex ?? 0]?.x ?? '')) },
        y: { formatter: (value: number) => formatCurrency(Number(value)), title: { formatter: () => `${t('revenue')}: ` } },
      },
    }),
    [ct, t, revenueSeries]
  );

  // ── ApexCharts: Tenant & user growth (multi-line) ──
  const growthSeries = useMemo(
    () => [
      {
        name: t('companies'),
        data: (trends?.tenantGrowth ?? []).map((d) => ({ x: d.date, y: d.value })),
      },
      {
        name: t('users'),
        data: (trends?.userGrowth ?? []).map((d) => ({ x: d.date, y: d.value })),
      },
    ],
    [trends, t]
  );

  const growthOptions = useMemo<ApexCharts.ApexOptions>(
    () => ({
      chart: {
        type: 'line',
        toolbar: { show: false },
        fontFamily: 'inherit',
        animations: { enabled: true, speed: 600 },
        zoom: { enabled: false },
      },
      colors: ['#3b82f6', '#8b5cf6'],
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      markers: { size: 0, hover: { size: 4 } },
      grid: { borderColor: ct.grid, strokeDashArray: 3, padding: { left: 8, right: 8 } },
      legend: { show: false },
      xaxis: {
        type: 'category',
        labels: {
          rotate: 0,
          hideOverlappingLabels: true,
          formatter: (value: string) => formatChartDate(String(value)),
          style: { fontSize: '11px', colors: ct.textSecondary },
        },
        axisBorder: { color: ct.grid },
        axisTicks: { color: ct.grid },
        tooltip: { enabled: false },
      },
      yaxis: {
        labels: {
          formatter: (value: number) => String(Math.round(value)),
          style: { fontSize: '11px', colors: ct.textSecondary },
        },
      },
      tooltip: {
        theme: ct.isDark ? 'dark' : 'light',
        shared: true,
        x: { formatter: (_v, opts) => formatChartDate(String(growthSeries[0]?.data[opts?.dataPointIndex ?? 0]?.x ?? '')) },
      },
    }),
    [ct, t, growthSeries]
  );

  // ── ApexCharts: Plan distribution (horizontal bar, per-bar colors) ──
  const planSeries = useMemo(
    () => [
      {
        name: t('colCompany'),
        data: (trends?.planBreakdown ?? []).map((p) => p.count),
      },
    ],
    [trends, t]
  );

  const planOptions = useMemo<ApexCharts.ApexOptions>(
    () => {
      const breakdown = trends?.planBreakdown ?? [];
      return {
        chart: {
          type: 'bar',
          toolbar: { show: false },
          fontFamily: 'inherit',
          animations: { enabled: true, speed: 600 },
        },
        colors: breakdown.map((_p, i) => CHART_COLORS[i % CHART_COLORS.length]),
        plotOptions: {
          bar: {
            horizontal: true,
            borderRadius: 4,
            borderRadiusApplication: 'end',
            barHeight: '60%',
            distributed: true,
          },
        },
        dataLabels: { enabled: false },
        legend: { show: false },
        grid: {
          borderColor: ct.grid,
          strokeDashArray: 3,
          xaxis: { lines: { show: true } },
          yaxis: { lines: { show: false } },
        },
        xaxis: {
          categories: breakdown.map((p) => p.plan),
          labels: { style: { fontSize: '11px', colors: ct.textSecondary } },
          axisBorder: { color: ct.grid },
          axisTicks: { color: ct.grid },
        },
        yaxis: {
          labels: { style: { fontSize: '12px', colors: ct.textPrimary } },
        },
        tooltip: {
          theme: ct.isDark ? 'dark' : 'light',
          y: {
            formatter: (value: number, opts) => {
              const pct = breakdown[opts?.dataPointIndex ?? 0]?.percentage ?? 0;
              return `${Number(value)} ${t('companies')} (${pct}%)`;
            },
            title: { formatter: () => '' },
          },
        },
      };
    },
    [ct, t, trends]
  );

  if (loading) {
    return (
      <PageHeader section="empresa" icon={LayoutDashboard} eyebrow={ta('breadcrumb')} breadcrumbs={breadcrumbs} title={t('title')} subtitle={t('subtitle')}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-surface-3 rounded-md animate-pulse mb-3" />
                    <div className="h-8 w-20 bg-surface-3 rounded-md animate-pulse" />
                  </div>
                  <div className="h-12 w-12 rounded-lg bg-surface-3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card rounded-2xl border border-border p-6 shadow-sm h-80 animate-pulse" />
            ))}
          </div>
        </div>
      </PageHeader>
    );
  }

  if (!metrics) {
    return (
      <PageHeader section="empresa" icon={LayoutDashboard} eyebrow={ta('breadcrumb')} breadcrumbs={breadcrumbs} title={t('title')} subtitle={t('subtitle')}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('loadErrorShort')}</p>
        </div>
      </PageHeader>
    );
  }

  return (
    <PageHeader section="empresa" icon={LayoutDashboard} eyebrow={ta('breadcrumb')} breadcrumbs={breadcrumbs} title={t('title')} subtitle={t('subtitle')}>
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('totalCompanies')}</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {formatNumber(metrics.totalTenants)}
              </p>
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {formatNumber(metrics.activeTenants)} {t('activeCompanies')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('activeUsers')}</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {formatNumber(metrics.totalUsuarios)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatNumber(metrics.totalClientes)} {t('clients')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('totalOrders')}</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {formatNumber(metrics.totalPedidos)}
              </p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Package className="h-3 w-3" />
                {formatNumber(metrics.totalProductos)} {t('products')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('totalSales')}</p>
              <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                {formatCurrency(metrics.totalVentas)}
              </p>
              <p className="text-xs text-primary mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {t('accumulated')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Trends Section */}
      {trends && (
        <>
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('period')}:</span>
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface-1 p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrendDays(opt.value)}
                  aria-pressed={trendDays === opt.value}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    trendDays === opt.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Chart (full width) */}
          {trends.revenueByDay.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-base font-semibold text-foreground mb-4">
                {t('revenueByDay')}
              </h3>
              <Chart
                key={ct.isDark ? 'dark' : 'light'}
                type="area"
                height={280}
                options={revenueOptions}
                series={revenueSeries}
              />
            </div>
          )}

          {/* Growth + Plan Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tenant & User Growth */}
            {(trends.tenantGrowth.length > 0 || trends.userGrowth.length > 0) && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  {t('growth')}
                </h3>
                <Chart
                  key={ct.isDark ? 'dark' : 'light'}
                  type="line"
                  height={250}
                  options={growthOptions}
                  series={growthSeries}
                />
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">{t('companies')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-purple-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">{t('users')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Distribution */}
            {trends.planBreakdown.length > 0 && (
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
                <h3 className="text-base font-semibold text-foreground mb-4">
                  {t('planDistribution')}
                </h3>
                <Chart
                  key={ct.isDark ? 'dark' : 'light'}
                  type="bar"
                  height={250}
                  options={planOptions}
                  series={planSeries}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom Sections — Top Tenants + Recent Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tenants */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-foreground">{t('topCompanies')}</h2>
          </div>

          {metrics.topTenants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noCompanyData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-3">
                      {t('colCompany')}
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-3">
                      {t('colOrders')}
                    </th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-3">
                      {t('colSales')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {metrics.topTenants.map((tenant, index) => (
                    <tr key={tenant.id} className="hover:bg-surface-1 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-foreground">
                            {tenant.nombreEmpresa}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-foreground/70">
                        {formatNumber(tenant.pedidos)}
                      </td>
                      <td className="py-3 text-right font-semibold text-foreground">
                        {formatCurrency(tenant.ventas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Tenants */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t('recentCompanies')}</h2>
          </div>

          {metrics.tenantsRecientes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('noRecentCompanies')}
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.tenantsRecientes.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border-subtle hover:border-border-subtle hover:bg-surface-1 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{tenant.nombreEmpresa}</p>
                      {tenant.activo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/10 text-primary">
                          {t('activeCompanies')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-surface-3 text-foreground">
                          {t('noSubscription')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {tenant.planTipo || t('noPlan')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {formatNumber(tenant.usuarioCount)} {t('users')}
                      </span>
                    </div>
                  </div>

                  {tenant.suscripcionActiva ? (
                    <div className="flex items-center gap-1 text-primary text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      {t('activeSubscription')}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      {t('noSubscription')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </PageHeader>
  );
}
