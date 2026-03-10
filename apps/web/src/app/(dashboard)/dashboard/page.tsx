'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  MapPin,
  Loader2,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  dashboardService,
  VendedorPerformance,
  ActivityLogEntry,
} from '@/services/dashboardService';
import deliveryService, { DeliveryStats } from '@/services/api/deliveries';
import { metaVendedorService, MetaVendedor } from '@/services/api/metas';
import {
  getDashboardEjecutivo,
  getVentasPeriodo,
  DashboardEjecutivoResponse,
  VentaPeriodo,
} from '@/services/api/reports';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { useSignalR } from '@/contexts/SignalRContext';
import { useFormatters } from '@/hooks/useFormatters';
import { useCompany } from '@/contexts/CompanyContext';
import { useReportExport } from '@/hooks/useReportExport';

// Tipos para métricas
interface MetricCardData {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

// Icon mapping for activity types
const activityIcons: Record<string, React.ElementType> = {
  login: Users,
  logout: Users,
  create: CheckCircle2,
  update: Package,
  delete: AlertCircle,
  error: AlertCircle,
  view: Clock,
  export: Download,
};

function getDateRange(periodo: 'semana' | 'mes' | 'trimestre') {
  const hasta = new Date().toISOString().slice(0, 10);
  const desdeDate = new Date();
  desdeDate.setDate(desdeDate.getDate() - (periodo === 'semana' ? 7 : periodo === 'mes' ? 30 : 90));
  const desde = desdeDate.toISOString().slice(0, 10);
  return { desde, hasta };
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isImpersonating } = useImpersonationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [vendedorPerf, setVendedorPerf] = useState<VendedorPerformance | null>(null);
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats | null>(null);
  const [metaActiva, setMetaActiva] = useState<MetaVendedor | null>(null);
  const [allMetasActivas, setAllMetasActivas] = useState<MetaVendedor[]>([]);

  // Real data state for Admin dashboard
  const [periodo, setPeriodo] = useState<'semana' | 'mes' | 'trimestre'>('semana');
  const [ejecutivo, setEjecutivo] = useState<DashboardEjecutivoResponse | null>(null);
  const [ventasDiarias, setVentasDiarias] = useState<VentaPeriodo[]>([]);
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isVendedor = session?.user?.role === 'VENDEDOR';
  const isSuperAdminDirect = session?.user?.role === 'SUPER_ADMIN' && !isImpersonating;

  const chartRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { on, off } = useSignalR();
  const { formatCurrency, formatNumber, formatDate } = useFormatters();

  // Listen for real-time updates via SignalR (debounced)
  useEffect(() => {
    if (isVendedor || isSuperAdminDirect) return;

    const handleDashboardUpdate = () => {
      // Skip if tab is not visible
      if (document.hidden) return;
      // Debounce: wait 2s after last signal before refreshing
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        setRefreshKey(k => k + 1);
      }, 2000);
    };

    // Listen for direct dashboard update + existing mobile sync signals
    on('DashboardUpdate', handleDashboardUpdate);
    on('PedidoCreated', handleDashboardUpdate);
    on('CobroRegistrado', handleDashboardUpdate);
    on('VisitaCompletada', handleDashboardUpdate);

    return () => {
      off('DashboardUpdate', handleDashboardUpdate);
      off('PedidoCreated', handleDashboardUpdate);
      off('CobroRegistrado', handleDashboardUpdate);
      off('VisitaCompletada', handleDashboardUpdate);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [isVendedor, isSuperAdminDirect, on, off]);

  // SuperAdmin (sin impersonar) va directo a su dashboard de sistema
  useEffect(() => {
    if (isSuperAdminDirect) {
      router.replace('/admin/system-dashboard');
    }
  }, [isSuperAdminDirect, router]);

  // Build metric cards dynamically from ejecutivo data
  const metricCards: MetricCardData[] = ejecutivo ? [
    {
      title: 'Ventas Totales',
      value: `${formatCurrency(ejecutivo.ventas.total)}`,
      change: ejecutivo.ventas.crecimientoPct,
      changeLabel: `vs ${periodo === 'semana' ? 'semana' : periodo === 'mes' ? 'mes' : 'trimestre'} anterior`,
      icon: DollarSign,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Pedidos',
      value: formatNumber(ejecutivo.ventas.pedidos),
      change: 0,
      changeLabel: periodo === 'semana' ? 'esta semana' : periodo === 'mes' ? 'este mes' : 'este trimestre',
      icon: ShoppingCart,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Visitas',
      value: formatNumber(ejecutivo.visitas.total),
      change: ejecutivo.visitas.efectividadPct,
      changeLabel: 'efectividad',
      icon: Users,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Clientes Activos',
      value: formatNumber(ejecutivo.clientesActivos),
      change: 0,
      changeLabel: `${ejecutivo.nuevosClientes} nuevos`,
      icon: Package,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ] : [];

  // Meta activa (vendedor con progreso, admin solo info)
  const goalData = (() => {
    if (!metaActiva) return null;
    const target = metaActiva.monto;
    const current = vendedorPerf
      ? (metaActiva.tipo === 'ventas' ? vendedorPerf.totalVentas :
         metaActiva.tipo === 'pedidos' ? vendedorPerf.pedidosCount :
         vendedorPerf.visitasCompletadas)
      : 0;
    const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    return { target, current, percentage, tipo: metaActiva.tipo, periodo: metaActiva.periodo, vendedor: metaActiva.usuarioNombre };
  })();

  // Chart data from real API — fill missing days with 0
  const chartData = (() => {
    if (periodo === 'trimestre') {
      // Trimestre: API returns weekly data, use as-is
      return ventasDiarias.map(p => ({
        day: formatDate(p.fecha + 'T12:00:00', { day: 'numeric', month: 'short' }),
        value: Number(p.totalVentas),
      }));
    }
    // Semana (7 days) or Mes (30 days): fill missing days
    const days = periodo === 'semana' ? 7 : 30;
    const salesMap = new Map(ventasDiarias.map(p => [p.fecha, Number(p.totalVentas)]));
    const result: { day: string; value: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = periodo === 'semana'
        ? formatDate(d, { weekday: 'short' })
        : formatDate(d, { day: 'numeric' });
      result.push({ day: label, value: salesMap.get(key) ?? 0 });
    }
    return result;
  })();
  const maxChartValue = Math.max(...chartData.map(d => d.value), 1);

  // Date range for display
  const { desde, hasta } = getDateRange(periodo);

  // Export hook
  const { exportPDF, exporting } = useReportExport({
    fileName: 'dashboard-resumen',
    title: 'Resumen del Tablero',
    dateRange: { desde, hasta },
    kpis: metricCards.map(c => ({ label: c.title, value: c.value })),
    chartRef,
  });

  useEffect(() => {
    // SuperAdmin sin impersonar será redirigido, no cargar datos de tenant
    if (isSuperAdminDirect) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      if (!isLoading) setIsRefreshing(true);
      try {
        if (isVendedor) {
          const perf = await dashboardService.getMyPerformance();
          setVendedorPerf(perf);
          try {
            const userId = parseInt(session?.user?.id ?? '0');
            if (userId) {
              const today = new Date().toISOString().slice(0, 10);
              const metas = await metaVendedorService.getAll(userId);
              const activa = metas.find(m => m.activo && m.fechaInicio <= today && m.fechaFin >= today) ?? null;
              setMetaActiva(activa);
            }
          } catch {
            // Non-critical — dashboard works without meta
          }
        } else {
          // Admin/Supervisor: load real data from APIs
          const { desde: d, hasta: h } = getDateRange(periodo);

          const [ejResult, vpResult, actResult] = await Promise.allSettled([
            getDashboardEjecutivo({ periodo }),
            getVentasPeriodo({ desde: d, hasta: h, agrupacion: periodo === 'semana' ? 'dia' : periodo === 'mes' ? 'dia' : 'semana' }),
            dashboardService.getRecentActivity(5),
          ]);

          if (ejResult.status === 'fulfilled') setEjecutivo(ejResult.value);
          if (vpResult.status === 'fulfilled') setVentasDiarias(vpResult.value.periodos);
          if (actResult.status === 'fulfilled') setActivities(actResult.value.activities);

          // Load ALL active metas for Admin/Supervisor
          try {
            const today = new Date().toISOString().slice(0, 10);
            const metas = await metaVendedorService.getAll();
            const activas = metas.filter(m => m.activo && m.fechaInicio <= today && m.fechaFin >= today);
            setAllMetasActivas(activas);
          } catch {
            // Non-critical
          }
          // Load delivery stats for Admin/Supervisor
          try {
            const today = new Date().toISOString().split('T')[0];
            const stats = await deliveryService.getDeliveryStats({
              fechaDesde: today,
              fechaHasta: today,
              pagina: 1,
              tamanoPagina: 9999,
            });
            setDeliveryStats(stats);
          } catch {
            // Non-critical — dashboard works without delivery stats
          }
        }
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };
    loadData();
  }, [isVendedor, isSuperAdminDirect, periodo, refreshKey]);

  if (isLoading) {
    return <BrandedLoadingScreen message="Cargando dashboard..." />;
  }

  // Vista para vendedores con datos reales
  if (isVendedor && vendedorPerf) {
    const vendedorCards: MetricCardData[] = [
      {
        title: 'Mis Ventas',
        value: `${formatCurrency(vendedorPerf.totalVentas)}`,
        change: 0,
        changeLabel: 'últimos 30 días',
        icon: DollarSign,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Mis Pedidos',
        value: String(vendedorPerf.pedidosCount),
        change: 0,
        changeLabel: `${vendedorPerf.pedidosEntregados} entregados`,
        icon: ShoppingCart,
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Mis Visitas',
        value: String(vendedorPerf.visitasTotal),
        change: vendedorPerf.efectividadVisitas,
        changeLabel: 'efectividad',
        icon: Users,
        iconBg: 'bg-violet-100',
        iconColor: 'text-violet-600',
      },
      {
        title: 'Mis Clientes',
        value: String(vendedorPerf.clientesAsignados),
        change: 0,
        changeLabel: 'asignados',
        icon: Package,
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
      },
    ];

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-2 text-sm page-animate">
          <span className="text-gray-500">Inicio</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Mi Rendimiento</span>
        </div>

        <div className="page-animate page-animate-delay-1">
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Mi Rendimiento</h1>
          <p className="text-gray-500 mt-1">Hola {session?.user?.name}, aquí están tus métricas</p>
        </div>

        {/* Métricas del vendedor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 page-animate page-animate-delay-2">
          {vendedorCards.map((card, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{card.title}</span>
                <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-2">{card.value}</div>
              <div className="flex items-center gap-2">
                {card.change !== 0 ? (
                  <>
                    {card.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={card.change > 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                      {card.change > 0 ? '+' : ''}{card.change}%
                    </span>
                  </>
                ) : null}
                <span className="text-gray-400 text-sm">{card.changeLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Goal Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 page-animate page-animate-delay-4" data-tour="dashboard-goal">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              {goalData
                ? `Meta ${goalData.tipo === 'ventas' ? 'de Ventas' : goalData.tipo === 'pedidos' ? 'de Pedidos' : 'de Visitas'} ${goalData.periodo === 'semanal' ? 'Semanal' : 'Mensual'}`
                : 'Meta del Período'}
            </h3>
            {goalData && (
              <span className={`px-3 py-1 rounded-lg text-sm font-medium w-fit ${
                goalData.percentage >= 100 ? 'bg-green-100 text-green-700' :
                goalData.percentage >= 75 ? 'bg-blue-100 text-blue-700' :
                goalData.percentage >= 50 ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {goalData.percentage}%
              </span>
            )}
          </div>
          {goalData ? (
            <>
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Meta</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {goalData.tipo === 'ventas'
                      ? `${formatCurrency(goalData.target)}`
                      : formatNumber(goalData.target)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Logrado</p>
                  <p className="text-2xl font-semibold" style={{ color: 'var(--company-primary-color, #16a34a)' }}>
                    {goalData.tipo === 'ventas'
                      ? `${formatCurrency(goalData.current)}`
                      : formatNumber(goalData.current)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Restante</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {goalData.tipo === 'ventas'
                      ? `${formatCurrency(Math.max(0, goalData.target - goalData.current))}`
                      : formatNumber(Math.max(0, goalData.target - goalData.current))}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${goalData.percentage}%`, backgroundColor: 'var(--company-primary-color, #16a34a)' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>0</span>
                  <span>
                    {goalData.tipo === 'ventas'
                      ? `${formatCurrency(goalData.target)}`
                      : formatNumber(goalData.target)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
              <AlertCircle className="w-8 h-8 text-gray-300" />
              <p className="text-sm">Sin meta activa para el período actual</p>
              <a href="/metas" className="text-xs text-blue-500 hover:underline">Configurar metas →</a>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Admin / Supervisor Dashboard ──────────────────────────

  return (
      <div className="space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm page-animate">
          <span className="text-gray-500">Inicio</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Tablero</span>
        </div>

        {/* Welcome Banner (dismissible, shows for 7 days after onboarding) */}
        <WelcomeBanner userName={session?.user?.name} />

        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-animate page-animate-delay-1">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Tablero</h1>
            <p className="text-gray-500 mt-1">Resumen de ventas y actividad</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Selector */}
            <div className="relative">
              <select
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value as 'semana' | 'mes' | 'trimestre')}
                className="appearance-none flex items-center gap-2 px-4 py-2 pr-8 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white cursor-pointer transition-colors"
              >
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mes</option>
                <option value="trimestre">Este Trimestre</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {/* Export Button */}
            <button
              onClick={exportPDF}
              disabled={exporting || metricCards.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
              ) : (
                <Download className="w-4 h-4 text-emerald-500" />
              )}
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 page-animate page-animate-delay-2" data-tour="dashboard-metrics">
          {metricCards.length > 0 ? metricCards.map((card, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{card.title}</span>
                <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className={`text-3xl font-semibold text-gray-900 mb-2 ${isRefreshing ? 'animate-pulse' : ''}`}>{card.value}</div>
              <div className="flex items-center gap-2">
                {card.change !== 0 ? (
                  <>
                    {card.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={card.change > 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                      {card.change > 0 ? '+' : ''}{card.change}%
                    </span>
                  </>
                ) : null}
                <span className="text-gray-400 text-sm">{card.changeLabel}</span>
              </div>
            </div>
          )) : (
            // Skeleton cards while loading
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="w-8 h-8 bg-gray-200 rounded-lg" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-32 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-40" />
              </div>
            ))
          )}
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 page-animate page-animate-delay-3">
          {/* Chart Card */}
          <div ref={chartRef} className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6" data-tour="dashboard-chart">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Ventas {periodo === 'semana' ? 'Semanales' : periodo === 'mes' ? 'del Mes' : 'del Trimestre'}
                </h3>
                <p className="text-sm text-gray-500">Ingresos por día</p>
              </div>
            </div>
            {/* Bar Chart */}
            <div className={`flex items-end justify-around h-48 border-b border-gray-100 pb-4 ${isRefreshing ? 'opacity-50' : ''}`}>
              {chartData.length > 0 ? chartData.map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div
                    className={`${chartData.length <= 7 ? "w-10 sm:w-12" : chartData.length <= 14 ? "w-6 sm:w-8" : "w-3 sm:w-4"} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                    style={{
                      height: `${Math.max((item.value / maxChartValue) * 160, 4)}px`,
                      backgroundColor: 'var(--company-primary-color, #16a34a)',
                    }}
                    title={`${item.day}: ${formatCurrency(item.value)}`}
                  />
                  <span className="text-xs text-gray-500">{item.day}</span>
                </div>
              )) : (
                <div className="flex items-center justify-center w-full h-full text-sm text-gray-400">
                  Sin datos en este período
                </div>
              )}
            </div>
          </div>

          {/* Activity Card */}
          <div className="bg-white border border-gray-200 rounded-xl" data-tour="dashboard-activity">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {activities.length > 0 ? activities.map((a) => {
                const IconComp = activityIcons[a.type] || Clock;
                return (
                  <div key={a.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      a.status === 'success' ? 'bg-green-100' :
                      a.status === 'failed' ? 'bg-yellow-100' : 'bg-blue-100'
                    }`}>
                      <IconComp className={`w-4 h-4 ${
                        a.status === 'success' ? 'text-green-600' :
                        a.status === 'failed' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.description}</p>
                      <p className="text-xs text-gray-500">{a.userName}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{a.timeAgo}</span>
                  </div>
                );
              }) : (
                <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                  Sin actividad reciente
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goal Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 page-animate page-animate-delay-4" data-tour="dashboard-goal">
          {isVendedor ? (
            <>
              {/* Vendedor: single meta with progress */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {goalData
                    ? `Meta ${goalData.tipo === 'ventas' ? 'de Ventas' : goalData.tipo === 'pedidos' ? 'de Pedidos' : 'de Visitas'} ${goalData.periodo === 'semanal' ? 'Semanal' : 'Mensual'}`
                    : 'Meta del Período'}
                </h3>
                {goalData && (
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium w-fit ${
                    goalData.percentage >= 100 ? 'bg-green-100 text-green-700' :
                    goalData.percentage >= 75 ? 'bg-blue-100 text-blue-700' :
                    goalData.percentage >= 50 ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {goalData.percentage}%
                  </span>
                )}
              </div>
              {goalData ? (
                <>
                  <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Meta</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {goalData.tipo === 'ventas'
                          ? `${formatCurrency(goalData.target)}`
                          : formatNumber(goalData.target)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Logrado</p>
                      <p className="text-2xl font-semibold" style={{ color: 'var(--company-primary-color, #16a34a)' }}>
                        {goalData.tipo === 'ventas'
                          ? `${formatCurrency(goalData.current)}`
                          : formatNumber(goalData.current)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Restante</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {goalData.tipo === 'ventas'
                          ? `${formatCurrency(Math.max(0, goalData.target - goalData.current))}`
                          : formatNumber(Math.max(0, goalData.target - goalData.current))}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${goalData.percentage}%`, backgroundColor: 'var(--company-primary-color, #16a34a)' }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>0</span>
                      <span>
                        {goalData.tipo === 'ventas'
                          ? `${formatCurrency(goalData.target)}`
                          : formatNumber(goalData.target)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                  <p className="text-sm">Sin meta activa para el período actual</p>
                  <a href="/metas" className="text-xs text-blue-500 hover:underline">Configurar metas →</a>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Admin: all active metas summary */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Metas del Período</h3>
                <a href="/metas" className="text-xs text-blue-500 hover:underline">Ver todas →</a>
              </div>
              {allMetasActivas.length > 0 ? (
                <div className="space-y-3">
                  {allMetasActivas.map(meta => {
                    const tipoLabel = meta.tipo === 'ventas' ? 'Ventas' : meta.tipo === 'pedidos' ? 'Pedidos' : 'Visitas';
                    const tipoColor = meta.tipo === 'ventas' ? 'bg-emerald-100 text-emerald-700' : meta.tipo === 'pedidos' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700';
                    const periodoLabel = meta.periodo === 'semanal' ? 'Semanal' : 'Mensual';
                    const fmtVal = meta.tipo === 'ventas' ? `${formatCurrency(meta.monto)}` : formatNumber(meta.monto);
                    return (
                      <div key={meta.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{meta.usuarioNombre}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${tipoColor}`}>{tipoLabel}</span>
                            <span className="text-xs text-gray-400">{periodoLabel}</span>
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 whitespace-nowrap">{fmtVal}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <AlertCircle className="w-8 h-8 text-gray-300" />
                  <p className="text-sm">Sin metas activas para el período actual</p>
                  <a href="/metas" className="text-xs text-blue-500 hover:underline">Configurar metas →</a>
                </div>
              )}
            </>
          )}
        </div>

        {/* Delivery Stats — only shown when data is available */}
        {deliveryStats && (
          <div className="page-animate page-animate-delay-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Entregas de Hoy</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <span className="text-xs text-gray-500">En Ruta</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{deliveryStats.totalEnRuta}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-xs text-gray-500">Completadas</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{deliveryStats.totalCompletadas}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="text-xs text-gray-500">Pendientes</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{deliveryStats.totalPendientes}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-violet-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
                  </div>
                  <span className="text-xs text-gray-500">% Completado</span>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{deliveryStats.porcentajeCompletado}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

// ─── Welcome Banner ───

function WelcomeBanner({ userName }: { userName?: string | null }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const dismissedAt = localStorage.getItem('welcome-banner-dismissed');
    if (!dismissedAt) {
      setDismissed(false);
      return;
    }
    setDismissed(true);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('welcome-banner-dismissed', new Date().toISOString());
    setDismissed(true);
  };

  if (dismissed) return null;

  const firstName = userName?.split(' ')[0] || '';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-600 via-green-600 to-emerald-500 dark:from-green-700 dark:via-green-800 dark:to-emerald-700 p-5 sm:p-6 page-animate">
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.07] rounded-full -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/[0.05] rounded-full translate-y-1/2" />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Cerrar banner"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-white tracking-tight">
            {firstName ? `${firstName}, tu espacio está listo` : 'Tu espacio está listo'}
          </h3>
          <p className="text-sm text-white/75 mt-0.5">
            Completa la configuración inicial para sacar el máximo provecho de Handy Suites.
          </p>
        </div>
        <a
          href="/getting-started"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-green-700 text-sm font-semibold hover:bg-white/90 transition-colors shadow-sm flex-shrink-0 w-fit"
        >
          Comenzar
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
