'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { deliveryService, RouteItem, DeliveryStats } from '@/services/api/deliveries';
import { toast } from '@/hooks/useToast';
import {
  Search,
  Truck,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  MapPin,
  User,
  Calendar,
  Route,
  Play,
  Square,
  SkipForward,
} from 'lucide-react';

export default function DeliveriesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [stats, setStats] = useState<DeliveryStats>({
    totalPendientes: 0,
    totalEnRuta: 0,
    totalCompletadas: 0,
    totalCanceladas: 0,
    porcentajeCompletado: 0,
  });
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await deliveryService.getRoutes({
        estado: selectedStatus !== 'all' ? selectedStatus : undefined,
        pagina: currentPage,
        tamanoPagina: 20,
      });

      setRoutes(response.items);
      setTotalRoutes(response.totalCount);

      // Calcular estadísticas
      const statsData = await deliveryService.getDeliveryStats();
      setStats(statsData);
    } catch (err) {
      console.error('Error al cargar rutas:', err);
      setError('Error al cargar las rutas. Intenta de nuevo.');
      toast.error('Error al cargar las rutas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStartRoute = async (rutaId: number) => {
    try {
      await deliveryService.startRoute(rutaId);
      toast.success('Ruta iniciada');
      fetchRoutes();
    } catch (err) {
      console.error('Error al iniciar ruta:', err);
      toast.error('Error al iniciar la ruta');
    }
  };

  const handleCompleteRoute = async (rutaId: number) => {
    try {
      await deliveryService.completeRoute(rutaId);
      toast.success('Ruta completada');
      fetchRoutes();
    } catch (err) {
      console.error('Error al completar ruta:', err);
      toast.error('Error al completar la ruta');
    }
  };

  const handleCancelRoute = async (rutaId: number) => {
    const motivo = prompt('Motivo de cancelación:');
    if (motivo) {
      try {
        await deliveryService.cancelRoute(rutaId, motivo);
        toast.success('Ruta cancelada');
        fetchRoutes();
      } catch (err) {
        console.error('Error al cancelar ruta:', err);
        toast.error('Error al cancelar la ruta');
      }
    }
  };

  const filteredRoutes = routes.filter((route) => {
    const matchesSearch =
      route.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.usuarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (route.zonaNombre?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    return matchesSearch;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  };

  const getStatusBadge = (estado: string) => {
    const color = deliveryService.getStatusColor(estado);
    const label = deliveryService.getStatusLabel(estado);

    const icons: Record<string, React.ElementType> = {
      Pendiente: Clock,
      Programada: Clock,
      EnProgreso: Truck,
      Iniciada: Truck,
      Completada: CheckCircle,
      Cancelada: XCircle,
    };

    const Icon = icons[estado] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  return (
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Entregas y Rutas</h1>
            <p className="text-muted-foreground">
              Gestiona las rutas de vendedores ({totalRoutes} rutas)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchRoutes}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              data-tour="deliveries-refresh"
            >
              <RefreshCw className="w-4 h-4" />
              Actualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6" data-tour="deliveries-stats">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">En Progreso</p>
                  <p className="text-2xl font-bold">{stats.totalEnRuta}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completadas</p>
                  <p className="text-2xl font-bold">{stats.totalCompletadas}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold">{stats.totalPendientes}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">% Completado</p>
                  <p className="text-2xl font-bold">{stats.porcentajeCompletado}%</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Route className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, vendedor o zona..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              data-tour="deliveries-search"
            />
          </div>
          <div className="flex items-center gap-2" data-tour="deliveries-status-filter">
            <Filter className="w-4 h-4 text-gray-400" />
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'Pendiente', label: 'Pendiente' },
                { value: 'EnProgreso', label: 'En Progreso' },
                { value: 'Completada', label: 'Completada' },
                { value: 'Cancelada', label: 'Cancelada' },
              ]}
              value={selectedStatus}
              onChange={(val) => {
                setSelectedStatus(val ? String(val) : 'all');
                setCurrentPage(1);
              }}
              placeholder="Todos los estados"
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button
              onClick={fetchRoutes}
              className="ml-4 underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Routes Table */}
        <Card data-tour="deliveries-table">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRoutes.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                <div className="text-center">
                  <Route className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No hay rutas</p>
                  <p className="text-sm">
                    {searchTerm || selectedStatus !== 'all'
                      ? 'No se encontraron resultados para los filtros aplicados'
                      : 'No hay rutas programadas'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ruta
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Zona
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paradas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRoutes.map((route) => (
                      <tr key={route.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Route className="w-5 h-5 text-primary" />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {route.nombre}
                              </div>
                              {route.kilometrosEstimados && (
                                <div className="text-sm text-gray-500">
                                  {route.kilometrosEstimados} km estimados
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{route.usuarioNombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{route.zonaNombre || '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">{formatDate(route.fecha)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm">
                            <span className="font-medium text-green-600">{route.paradasCompletadas}</span>
                            <span className="text-gray-500"> / {route.totalParadas}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-green-500 h-1.5 rounded-full"
                              style={{
                                width: `${route.totalParadas > 0 ? (route.paradasCompletadas / route.totalParadas) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(route.estado)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-1">
                            {(route.estado === 'Pendiente' || route.estado === 'Programada') && (
                              <button
                                onClick={() => handleStartRoute(route.id)}
                                className="p-1 text-gray-400 hover:text-green-600"
                                title="Iniciar ruta"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            )}
                            {(route.estado === 'EnProgreso' || route.estado === 'Iniciada') && (
                              <button
                                onClick={() => handleCompleteRoute(route.id)}
                                className="p-1 text-gray-400 hover:text-green-600"
                                title="Completar ruta"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                            {route.estado !== 'Completada' && route.estado !== 'Cancelada' && (
                              <button
                                onClick={() => handleCancelRoute(route.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                                title="Cancelar ruta"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalRoutes > 20 && (
              <div className="px-6 py-3 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {filteredRoutes.length} de {totalRoutes} rutas
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={filteredRoutes.length < 20}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
