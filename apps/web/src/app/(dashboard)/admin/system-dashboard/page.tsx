'use client';

import { useEffect, useState } from 'react';
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
  Crown
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 bg-gray-200 rounded-md animate-pulse" />
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded-md animate-pulse mb-2" />
          <div className="h-5 w-96 bg-gray-200 rounded-md animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse mb-3" />
                  <div className="h-8 w-20 bg-gray-200 rounded-md animate-pulse" />
                </div>
                <div className="h-12 w-12 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm h-80 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">{t('loadErrorShort')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <span>{ta('breadcrumb')}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">{t('breadcrumb')}</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('totalCompanies')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(metrics.totalTenants)}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {formatNumber(metrics.activeTenants)} {t('activeCompanies')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('activeUsers')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(metrics.totalUsuarios)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatNumber(metrics.totalClientes)} {t('clients')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('totalOrders')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(metrics.totalPedidos)}
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Package className="h-3 w-3" />
                {formatNumber(metrics.totalProductos)} {t('products')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">{t('totalSales')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.totalVentas)}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {t('accumulated')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Trends Section */}
      {trends && (
        <>
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{t('period')}:</span>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTrendDays(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    trendDays === opt.value
                      ? 'bg-surface-2 text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Revenue Chart (full width) */}
          {trends.revenueByDay.length > 0 && (
            <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-base font-semibold text-gray-900 mb-4">
                {t('revenueByDay')}
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trends.revenueByDay}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatChartDate}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={formatShortCurrency}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), t('revenue')]}
                    labelFormatter={(label) => formatChartDate(String(label))}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#revenueGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Growth + Plan Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tenant & User Growth */}
            {(trends.tenantGrowth.length > 0 || trends.userGrowth.length > 0) && (
              <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  {t('growth')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      allowDuplicatedCategory={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} width={45} />
                    <Tooltip
                      labelFormatter={(label) => formatChartDate(String(label))}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    <Line
                      data={trends.tenantGrowth}
                      type="monotone"
                      dataKey="value"
                      name={t('companies')}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      data={trends.userGrowth}
                      type="monotone"
                      dataKey="value"
                      name={t('users')}
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-2 justify-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
                    <span className="text-xs text-gray-500">{t('companies')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-purple-500 rounded-full" />
                    <span className="text-xs text-gray-500">{t('users')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Distribution */}
            {trends.planBreakdown.length > 0 && (
              <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-base font-semibold text-gray-900 mb-4">
                  {t('planDistribution')}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trends.planBreakdown} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis
                      type="category"
                      dataKey="plan"
                      tick={{ fontSize: 12, fill: '#374151' }}
                      width={100}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${Number(value)} empresas (${((props as unknown as { payload: { percentage: number } }).payload.percentage)}%)`,
                        'Cantidad',
                      ]}
                      contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                      {trends.planBreakdown.map((_entry, index) => (
                        <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bottom Sections — Top Tenants + Recent Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tenants */}
        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">{t('topCompanies')}</h2>
          </div>

          {metrics.topTenants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('noCompanyData')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 pb-3">
                      {t('colCompany')}
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-3">
                      {t('colOrders')}
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 pb-3">
                      {t('colSales')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metrics.topTenants.map((tenant, index) => (
                    <tr key={tenant.id} className="hover:bg-surface-1 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-50 text-amber-600 text-xs font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium text-gray-900">
                            {tenant.nombreEmpresa}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right text-gray-600">
                        {formatNumber(tenant.pedidos)}
                      </td>
                      <td className="py-3 text-right font-semibold text-gray-900">
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
        <div className="bg-surface-2 rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">{t('recentCompanies')}</h2>
          </div>

          {metrics.tenantsRecientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('noRecentCompanies')}
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.tenantsRecientes.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-surface-1 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{tenant.nombreEmpresa}</p>
                      {tenant.activo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                          {t('activeCompanies')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                          {t('noSubscription')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
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
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      {t('activeSubscription')}
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
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
  );
}
