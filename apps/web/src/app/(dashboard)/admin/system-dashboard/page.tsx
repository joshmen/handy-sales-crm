'use client';

import { useEffect, useState } from 'react';
import { SystemMetrics } from '@/types/tenant';
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

export default function SystemDashboardPage() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await tenantService.getSystemMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Error loading system metrics:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las métricas del sistema',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('es-MX');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb Skeleton */}
        <div className="h-6 w-64 bg-gray-200 rounded animate-pulse" />

        {/* Header Skeleton */}
        <div>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-96 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-3" />
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-12 w-12 rounded-lg bg-gray-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Sections Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No se pudieron cargar las métricas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500">
        <span>Administración</span>
        <ChevronRight className="h-4 w-4" />
        <span className="text-gray-900 font-medium">Dashboard Sistema</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard del Sistema</h1>
        <p className="text-gray-500 mt-1">
          Vista general del sistema y métricas de todas las empresas
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Empresas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Empresas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(metrics.totalTenants)}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                {formatNumber(metrics.activeTenants)} activas
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Usuarios Activos */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Usuarios Activos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(metrics.totalUsuarios)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatNumber(metrics.totalClientes)} clientes
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Pedidos Totales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pedidos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatNumber(metrics.totalPedidos)}
              </p>
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                <Package className="h-3 w-3" />
                {formatNumber(metrics.totalProductos)} productos
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Ventas Totales */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.totalVentas)}
              </p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Total acumulado
              </p>
            </div>
            <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tenants */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold text-gray-900">Top Empresas</h2>
          </div>

          {metrics.topTenants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay datos de empresas disponibles
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                      Empresa
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                      Pedidos
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">
                      Ventas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {metrics.topTenants.map((tenant, index) => (
                    <tr key={tenant.id} className="hover:bg-gray-50 transition-colors">
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

        {/* Últimas Empresas Registradas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Últimas Empresas Registradas</h2>
          </div>

          {metrics.tenantsRecientes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay empresas registradas recientemente
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.tenantsRecientes.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900">{tenant.nombreEmpresa}</p>
                      {tenant.activo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {tenant.planTipo || 'Sin plan'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {formatNumber(tenant.usuarioCount)} usuarios
                      </span>
                    </div>
                  </div>

                  {tenant.suscripcionActiva ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      Suscripción activa
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      Sin suscripción
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
