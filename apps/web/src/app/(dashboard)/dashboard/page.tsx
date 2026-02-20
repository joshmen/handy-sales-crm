'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  dashboardService,
  DashboardMetrics,
  VendedorPerformance,
  getFallbackMetrics,
} from '@/services/dashboardService';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { MapPin } from 'lucide-react';


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

// Tipos para actividad
interface ActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
  status: 'success' | 'pending' | 'warning';
  icon: React.ElementType;
}

// Datos mock para actividad reciente
const mockActivity: ActivityItem[] = [
  {
    id: '1',
    title: 'Pedido #547 completado',
    description: 'Cliente: Farmacia Central',
    time: 'Hace 5 min',
    status: 'success',
    icon: CheckCircle2,
  },
  {
    id: '2',
    title: 'Nuevo cliente registrado',
    description: 'Papelería Escolar',
    time: 'Hace 15 min',
    status: 'success',
    icon: Users,
  },
  {
    id: '3',
    title: 'Inventario bajo: Producto A',
    description: 'Stock mínimo alcanzado',
    time: 'Hace 30 min',
    status: 'warning',
    icon: AlertCircle,
  },
  {
    id: '4',
    title: 'Factura #123 emitida',
    description: 'Total: $2,450.00',
    time: 'Hace 1 hora',
    status: 'success',
    icon: DollarSign,
  },
  {
    id: '5',
    title: 'Ruta Zona 1 completada',
    description: '8 de 10 visitas realizadas',
    time: 'Hace 2 horas',
    status: 'pending',
    icon: Clock,
  },
];

// Datos mock para el gráfico de barras
const weeklyData = [
  { day: 'Lun', value: 65 },
  { day: 'Mar', value: 45 },
  { day: 'Mié', value: 80 },
  { day: 'Jue', value: 55 },
  { day: 'Vie', value: 90 },
  { day: 'Sáb', value: 70 },
  { day: 'Dom', value: 40 },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { isImpersonating } = useImpersonationStore();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>(getFallbackMetrics());
  const [vendedorPerf, setVendedorPerf] = useState<VendedorPerformance | null>(null);

  const isVendedor = session?.user?.role === 'VENDEDOR';
  const isSuperAdminDirect = session?.user?.role === 'SUPER_ADMIN' && !isImpersonating;

  // SuperAdmin (sin impersonar) va directo a su dashboard de sistema
  useEffect(() => {
    if (isSuperAdminDirect) {
      router.replace('/admin/system-dashboard');
    }
  }, [isSuperAdminDirect, router]);

  // Métricas para mostrar (basadas en el diseño de Pencil)
  const metricCards: MetricCardData[] = [
    {
      title: 'Ventas Totales',
      value: '$48,250',
      change: 14.2,
      changeLabel: 'vs semana anterior',
      icon: DollarSign,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Pedidos',
      value: '124',
      change: 8.3,
      changeLabel: 'vs semana anterior',
      icon: ShoppingCart,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Visitas',
      value: '87',
      change: 12.5,
      changeLabel: 'vs semana anterior',
      icon: Users,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      title: 'Clientes Activos',
      value: '342',
      change: 5.2,
      changeLabel: 'vs mes anterior',
      icon: Package,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
    },
  ];

  // Meta semanal
  const weeklyGoal = {
    target: 100000,
    current: 48250,
    percentage: 48.2,
    zone: 'Zona 1',
  };

  useEffect(() => {
    // SuperAdmin sin impersonar será redirigido, no cargar datos de tenant
    if (isSuperAdminDirect) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        if (isVendedor) {
          const perf = await dashboardService.getMyPerformance();
          setVendedorPerf(perf);
        } else {
          const data = await dashboardService.getMetrics();
          setMetrics(data);
        }
      } catch (error) {
        console.error('Error loading metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isVendedor, isSuperAdminDirect]);

  if (isLoading) {
    return <BrandedLoadingScreen message="Cargando dashboard..." />;
  }

  // Vista para vendedores con datos reales
  if (isVendedor && vendedorPerf) {
    const vendedorCards: MetricCardData[] = [
      {
        title: 'Mis Ventas',
        value: `$${vendedorPerf.totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`,
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
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Inicio</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Mi Rendimiento</span>
        </div>

        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Mi Rendimiento</h1>
          <p className="text-gray-500 mt-1">Hola {session?.user?.name}, aquí están tus métricas</p>
        </div>

        {/* Métricas del vendedor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {vendedorCards.map((card, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{card.title}</span>
                <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-2">{card.value}</div>
              <div className="flex items-center gap-2">
                {card.change > 0 && <TrendingUp className="w-4 h-4 text-green-500" />}
                <span className="text-sm text-gray-500">
                  {card.change > 0 ? `${card.change}% ` : ''}{card.changeLabel}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle de actividad */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Pedidos</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Pendientes</span>
                <span className="font-medium">{vendedorPerf.pedidosPendientes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Entregados</span>
                <span className="font-medium text-green-600">{vendedorPerf.pedidosEntregados}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">{vendedorPerf.pedidosCount}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Visitas</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completadas</span>
                <span className="font-medium">{vendedorPerf.visitasCompletadas}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Con venta</span>
                <span className="font-medium text-green-600">{vendedorPerf.visitasConVenta}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Efectividad</span>
                <span className="font-medium">{vendedorPerf.efectividadVisitas}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Rutas</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Hoy</span>
                <span className="font-medium">{vendedorPerf.rutasHoy}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Completadas</span>
                <span className="font-medium text-green-600">{vendedorPerf.rutasCompletadas}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-medium">{vendedorPerf.rutasTotal}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Inicio</span>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 font-medium">Tablero</span>
        </div>

        {/* Title Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Tablero</h1>
            <p className="text-gray-500 mt-1">Resumen de ventas y actividad</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Period Button */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Calendar className="w-4 h-4 text-violet-500" />
              <span>Ene 18 - Ene 24</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {/* Export Button */}
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Exportar</span>
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" data-tour="dashboard-metrics">
          {metricCards.map((card, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">{card.title}</span>
                <div className={`w-8 h-8 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${card.iconColor}`} />
                </div>
              </div>
              <div className="text-3xl font-semibold text-gray-900 mb-2">{card.value}</div>
              <div className="flex items-center gap-2">
                {card.change > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
                <span className={card.change > 0 ? 'text-green-600 text-sm' : 'text-red-600 text-sm'}>
                  {card.change > 0 ? '+' : ''}{card.change}%
                </span>
                <span className="text-gray-400 text-sm">{card.changeLabel}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Content Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart Card */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6" data-tour="dashboard-chart">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ventas Semanales</h3>
                <p className="text-sm text-gray-500">Ingresos en el día seleccionado</p>
              </div>
              <button className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <span>Ene 18 - Ene 24</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            {/* Simple Bar Chart */}
            <div className="flex items-end justify-around h-48 border-b border-gray-100 pb-4">
              {weeklyData.map((item, index) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div
                    className="w-10 sm:w-12 bg-red-500 rounded-t transition-all hover:bg-red-600 cursor-pointer"
                    style={{ height: `${item.value * 1.5}px` }}
                    title={`${item.day}: $${(item.value * 100).toLocaleString()}`}
                  />
                  <span className="text-xs text-gray-500">{item.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Card */}
          <div className="bg-white border border-gray-200 rounded-lg" data-tour="dashboard-activity">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Actividad Reciente</h3>
              <button className="text-sm text-red-500 hover:text-red-600 font-medium">
                Ver más
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {mockActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.status === 'success' ? 'bg-green-100' :
                    activity.status === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <activity.icon className={`w-4 h-4 ${
                      activity.status === 'success' ? 'text-green-600' :
                      activity.status === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Goal Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6" data-tour="dashboard-goal">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Meta de Venta Semanal</h3>
            <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-600 w-fit">
              {weeklyGoal.zone}
            </span>
          </div>

          {/* Goal Metrics */}
          <div className="flex flex-wrap items-center gap-6 sm:gap-10 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Meta</p>
              <p className="text-2xl font-semibold text-gray-900">
                ${weeklyGoal.target.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Logrado</p>
              <p className="text-2xl font-semibold text-red-500">
                ${weeklyGoal.current.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Porcentaje</p>
              <p className="text-2xl font-semibold text-gray-900">
                {weeklyGoal.percentage}%
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full transition-all"
                style={{ width: `${weeklyGoal.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>$0</span>
              <span>${weeklyGoal.target.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
  );
}
