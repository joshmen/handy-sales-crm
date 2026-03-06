'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { deliveryService, RouteItem, DeliveryStats } from '@/services/api/deliveries';
import { toast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { ExportButton } from '@/components/shared/ExportButton';
import { SearchBar } from '@/components/common/SearchBar';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ListPagination } from '@/components/ui/ListPagination';
import {
  Truck,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  MapPin,
  User,
  Calendar,
  Route,
  Play,
  Loader2,
} from 'lucide-react';
import { useFormatters } from '@/hooks/useFormatters';

const pageSize = 20;

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function DeliveriesPage() {
  const { formatDate } = useFormatters();
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [totalRoutes, setTotalRoutes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateStr(d);
  });
  const [fechaHasta, setFechaHasta] = useState(() => toDateStr(new Date()));

  const totalPages = Math.ceil(totalRoutes / pageSize);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await deliveryService.getRoutes({
        estado: selectedStatus !== 'all' ? selectedStatus : undefined,
        fechaDesde,
        fechaHasta,
        pagina: currentPage,
        tamanoPagina: pageSize,
      });

      setRoutes(response.items);
      setTotalRoutes(response.totalCount);

      // Stats: separate try/catch so a stats failure doesn't hide the route list
      try {
        const statsData = await deliveryService.getDeliveryStats({
          fechaDesde,
          fechaHasta,
          pagina: 1,
          tamanoPagina: 9999,
        });
        setStats(statsData);
      } catch {
        // Stats are non-critical — keep showing routes even if stats fail
      }
    } catch (err) {
      console.error('Error al cargar rutas:', err);
      setError('Error al cargar las rutas. Intenta de nuevo.');
      toast.error('Error al cargar las rutas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const handleStartRoute = async (rutaId: number) => {
    try {
      await deliveryService.startRoute(rutaId);
      toast.success('Ruta iniciada');
      fetchRoutes();
    } catch {
      toast.error('Error al iniciar la ruta');
    }
  };

  const handleCompleteRoute = async (rutaId: number) => {
    try {
      await deliveryService.completeRoute(rutaId);
      toast.success('Ruta completada');
      fetchRoutes();
    } catch {
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
      } catch {
        toast.error('Error al cancelar la ruta');
      }
    }
  };

  const filteredRoutes = routes.filter((route) => {
    const term = searchTerm.toLowerCase();
    return (
      route.nombre.toLowerCase().includes(term) ||
      route.usuarioNombre.toLowerCase().includes(term) ||
      (route.zonaNombre?.toLowerCase().includes(term) ?? false)
    );
  });
  const getStatusBadge = (estado: string) => {
    const color = deliveryService.getStatusColor(estado);
    const label = deliveryService.getStatusLabel(estado);
    const icons: Record<string, React.ElementType> = {
      Pendiente: Clock,
      Programada: Clock,
      Planificada: Clock,
      PendienteAceptar: Clock,
      CargaAceptada: Clock,
      EnProgreso: Truck,
      Iniciada: Truck,
      Completada: CheckCircle,
      Cerrada: CheckCircle,
      Cancelada: XCircle,
    };
    const Icon = icons[estado] || Clock;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-full whitespace-nowrap ${color}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const progressPercent = (route: RouteItem) =>
    route.totalParadas > 0
      ? (route.paradasCompletadas / route.totalParadas) * 100
      : 0;

  const canStart = (estado: string) =>
    estado === 'Pendiente' || estado === 'Programada' || estado === 'Planificada' || estado === 'PendienteAceptar' || estado === 'CargaAceptada';

  const canComplete = (estado: string) =>
    estado === 'EnProgreso' || estado === 'Iniciada';

  const canCancel = (estado: string) =>
    estado !== 'Completada' && estado !== 'Cancelada' && estado !== 'Cerrada';

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Entregas' },
      ]}
      title="Entregas"
      subtitle={totalRoutes > 0 ? `${totalRoutes} ruta${totalRoutes !== 1 ? 's' : ''}` : undefined}
      actions={
        <ExportButton entity="rutas" params={{ desde: fechaDesde, hasta: fechaHasta }} />
      }
    >
      <div className="space-y-4">
        {/* KPI Row */}
        <div data-tour="deliveries-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {stats ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Truck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">En Progreso</p>
                  <p className="text-sm font-bold text-gray-900">{stats.totalEnRuta}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-green-50">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Completadas</p>
                  <p className="text-sm font-bold text-gray-900">{stats.totalCompletadas}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-gray-50">
                  <Clock className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">Pendientes</p>
                  <p className="text-sm font-bold text-gray-900">{stats.totalPendientes}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Route className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-gray-500">% Completado</p>
                  <p className="text-sm font-bold text-gray-900">{stats.porcentajeCompletado}%</p>
                </div>
              </div>
            </>
          ) : (
            <>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white animate-pulse">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <div className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="h-3 w-20 bg-gray-100 rounded mb-1.5" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Search */}
        <div className="w-full sm:w-1/2 lg:w-1/3" data-tour="deliveries-search">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder="Buscar por nombre, vendedor o zona..."
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-3" data-tour="deliveries-filters">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setCurrentPage(1); }}
              className="px-2 py-2 h-10 text-[13px] text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-500 whitespace-nowrap">Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setCurrentPage(1); }}
              className="px-2 py-2 h-10 text-[13px] text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <div className="min-w-[200px] max-w-[260px]" data-tour="deliveries-status-filter">
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'Planificada', label: 'Planificada' },
                { value: 'PendienteAceptar', label: 'Pendiente de Aceptar' },
                { value: 'CargaAceptada', label: 'Carga Aceptada' },
                { value: 'EnProgreso', label: 'En Progreso' },
                { value: 'Completada', label: 'Completada' },
                { value: 'Cerrada', label: 'Cerrada' },
                { value: 'Cancelada', label: 'Cancelada' },
              ]}
              value={selectedStatus}
              onChange={(val: string | number | null) => {
                setSelectedStatus(val ? String(val) : 'all');
                setCurrentPage(1);
              }}
              placeholder="Todos los estados"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchRoutes}
            data-tour="deliveries-refresh"
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Error */}
        {error && <ErrorBanner error={error} onRetry={fetchRoutes} />}

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
          {!loading && filteredRoutes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Route className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-1">No hay rutas</p>
              <p className="text-xs text-gray-400 text-center px-4">
                {searchTerm || selectedStatus !== 'all'
                  ? 'No se encontraron resultados para los filtros aplicados'
                  : 'No hay rutas programadas en este periodo'}
              </p>
            </div>
          ) : (
            !loading && filteredRoutes.map((route) => (
              <div key={route.id} className="bg-white border border-gray-200 rounded-lg p-4">
                {/* Row 1: Icon + Name + Status */}
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Route className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{route.nombre}</p>
                    <p className="text-xs text-gray-500 truncate">{route.usuarioNombre}</p>
                  </div>
                  {getStatusBadge(route.estado)}
                </div>
                {/* Row 2: Metrics */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2.5">
                  <span>{formatDate(route.fecha)}</span>
                  <span>·</span>
                  <span>{route.zonaNombre || 'Sin zona'}</span>
                  <span>·</span>
                  <span className="font-medium text-green-600">
                    {route.paradasCompletadas}/{route.totalParadas} paradas
                  </span>
                </div>
                {/* Row 3: Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-green-500 h-1.5 rounded-full"
                    style={{ width: `${progressPercent(route)}%` }}
                  />
                </div>
                {/* Row 4: Actions */}
                <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                  {canStart(route.estado) && (
                    <button
                      onClick={() => handleStartRoute(route.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                    >
                      <Play className="w-3.5 h-3.5" /> Iniciar
                    </button>
                  )}
                  {canComplete(route.estado) && (
                    <button
                      onClick={() => handleCompleteRoute(route.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Completar
                    </button>
                  )}
                  {canCancel(route.estado) && (
                    <button
                      onClick={() => handleCancelRoute(route.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto" data-tour="deliveries-table">
          {/* Table Header */}
          <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[900px]">
            <div className="w-[200px] text-xs font-semibold text-gray-700">Ruta</div>
            <div className="w-[140px] text-xs font-semibold text-gray-700">Vendedor</div>
            <div className="w-[120px] text-xs font-semibold text-gray-700">Zona</div>
            <div className="w-[100px] text-xs font-semibold text-gray-700">Fecha</div>
            <div className="w-[120px] text-xs font-semibold text-gray-700 text-center">Paradas</div>
            <div className="w-[120px] text-xs font-semibold text-gray-700">Estado</div>
            <div className="flex-1 text-xs font-semibold text-gray-700 text-center">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando rutas..." />

            {!loading && filteredRoutes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Route className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron rutas</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm || selectedStatus !== 'all'
                    ? 'Cambia los filtros para ver otros resultados'
                    : 'No hay rutas programadas en este periodo. Crea rutas desde Gestión de Rutas.'}
                </p>
              </div>
            ) : (
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {filteredRoutes.map((route) => (
                  <div
                    key={route.id}
                    className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[900px]"
                  >
                    {/* Ruta */}
                    <div className="w-[200px] flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Route className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-gray-900 truncate">{route.nombre}</div>
                        {route.kilometrosEstimados != null && (
                          <div className="text-xs text-gray-500">{route.kilometrosEstimados} km est.</div>
                        )}
                      </div>
                    </div>
                    {/* Vendedor */}
                    <div className="w-[140px] flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-[13px] text-gray-700 truncate">{route.usuarioNombre}</span>
                    </div>
                    {/* Zona */}
                    <div className="w-[120px] flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-[13px] text-gray-700 truncate">{route.zonaNombre || '-'}</span>
                    </div>
                    {/* Fecha */}
                    <div className="w-[100px] flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="text-[13px] text-gray-700">{formatDate(route.fecha)}</span>
                    </div>
                    {/* Paradas */}
                    <div className="w-[120px] text-center">
                      <div className="text-[13px]">
                        <span className="font-medium text-green-600">{route.paradasCompletadas}</span>
                        <span className="text-gray-500"> / {route.totalParadas}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${progressPercent(route)}%` }}
                        />
                      </div>
                    </div>
                    {/* Estado */}
                    <div className="w-[120px]">
                      {getStatusBadge(route.estado)}
                    </div>
                    {/* Acciones */}
                    <div className="flex-1 flex items-center justify-center gap-1">
                      {canStart(route.estado) && (
                        <button
                          onClick={() => handleStartRoute(route.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Iniciar ruta"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {canComplete(route.estado) && (
                        <button
                          onClick={() => handleCompleteRoute(route.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Completar ruta"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {canCancel(route.estado) && (
                        <button
                          onClick={() => handleCancelRoute(route.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Cancelar ruta"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalRoutes}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="rutas"
          loading={loading}
        />
      </div>
    </PageHeader>
  );
}
