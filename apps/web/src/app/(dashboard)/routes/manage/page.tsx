'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { routeService, RouteListItem, ESTADO_RUTA, ESTADO_RUTA_LABELS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ClipboardList,
  Loader2,
  Calendar,
  Filter,
} from 'lucide-react';
import { Path, CaretRight } from '@phosphor-icons/react';

interface UsuarioOption {
  id: number;
  nombre: string;
}

export default function ManageRoutesPage() {
  const router = useRouter();
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [usuarioFilter, setUsuarioFilter] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);

  const pageSize = 20;

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await routeService.getRutas({
        page: currentPage,
        limit: pageSize,
        estado: estadoFilter !== 'all' ? parseInt(estadoFilter) : undefined,
        usuarioId: usuarioFilter !== 'all' ? parseInt(usuarioFilter) : undefined,
        fechaDesde: fechaDesde || undefined,
        fechaHasta: fechaHasta || undefined,
        mostrarInactivos: true,
      });
      setRoutes(response.items);
      setTotalItems(response.total);
      setTotalPages(Math.ceil(response.total / pageSize) || 1);
    } catch (err) {
      console.error('Error al cargar rutas:', err);
      setError('Error al cargar las rutas.');
      toast.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, estadoFilter, usuarioFilter, fechaDesde, fechaHasta]);

  const fetchUsuarios = async () => {
    try {
      const response = await api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/usuarios?pagina=1&tamanoPagina=500');
      const data = response.data;
      const items = Array.isArray(data) ? data : data.items || [];
      setUsuarios(items);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleRowClick = (route: RouteListItem) => {
    if (route.estado === ESTADO_RUTA.Completada || route.estado === ESTADO_RUTA.Cerrada) {
      router.push(`/routes/manage/${route.id}/close`);
    } else {
      router.push(`/routes/manage/${route.id}/load`);
    }
  };

  const getActionForEstado = (estado: number) => {
    switch (estado) {
      case ESTADO_RUTA.Planificada:
        return { label: 'Cargar', cls: 'text-green-700 bg-green-50 border-green-200 hover:bg-green-100' };
      case ESTADO_RUTA.EnProgreso:
        return { label: 'Ver', cls: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' };
      case ESTADO_RUTA.Completada:
        return { label: 'Cerrar', cls: 'text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100' };
      case ESTADO_RUTA.Cancelada:
        return null;
      case ESTADO_RUTA.PendienteAceptar:
      case ESTADO_RUTA.CargaAceptada:
        return { label: 'Ver carga', cls: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' };
      case ESTADO_RUTA.Cerrada:
        return { label: 'Ver cierre', cls: 'text-gray-700 bg-gray-50 border-gray-200 hover:bg-gray-100' };
      default:
        return null;
    }
  };

  const getEstadoBadge = (estado: number) => {
    const label = ESTADO_RUTA_LABELS[estado] || 'Desconocido';
    const colorCls = ESTADO_RUTA_COLORS[estado] || 'bg-gray-100 text-gray-800';
    return { label, cls: colorCls };
  };

  const getProgreso = (route: RouteListItem) => {
    if (route.totalParadas === 0) return null;
    const pct = Math.round((route.paradasCompletadas / route.totalParadas) * 100);
    return { pct, text: `${route.paradasCompletadas}/${route.totalParadas}` };
  };

  const estadoOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: '0', label: 'Planificada' },
    { value: '1', label: 'En progreso' },
    { value: '2', label: 'Terminada' },
    { value: '3', label: 'Cancelada' },
    { value: '4', label: 'Pend. aceptar' },
    { value: '5', label: 'Carga aceptada' },
    { value: '6', label: 'Cerrada' },
  ];

  const usuarioOptions = [
    { value: 'all', label: 'Todos los usuarios' },
    ...usuarios.map(u => ({ value: u.id.toString(), label: u.nombre })),
  ];

  // Pagination
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Administrar rutas' },
        ]} />

        <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
          Administrar rutas de venta y entrega
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Selecciona una ruta para cargar inventario o cerrarla
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Date range */}
          <div data-tour="routes-manage-date-filter" className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => { setFechaDesde(e.target.value); setCurrentPage(1); }}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Desde"
            />
            <span className="text-xs text-gray-400">-</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => { setFechaHasta(e.target.value); setCurrentPage(1); }}
              className="px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Hasta"
            />
          </div>

          {/* Usuario filter */}
          <div data-tour="routes-manage-user-filter" className="min-w-[160px]">
            <SearchableSelect
              options={usuarioOptions}
              value={usuarioFilter}
              onChange={(val) => { setUsuarioFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder="Todos los usuarios"
            />
          </div>

          {/* Estado filter */}
          {showMoreFilters && (
            <div className="min-w-[160px]">
              <SearchableSelect
                options={estadoOptions}
                value={estadoFilter}
                onChange={(val) => { setEstadoFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
                placeholder="Todos los estados"
              />
            </div>
          )}

          <button
            data-tour="routes-manage-estado-filter"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{showMoreFilters ? 'Menos filtros' : '+ Más filtros'}</span>
          </button>

          <button
            data-tour="routes-manage-refresh"
            onClick={() => { fetchRoutes(); toast.success('Actualizado'); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
            <button onClick={fetchRoutes} className="ml-4 underline hover:no-underline">Reintentar</button>
          </div>
        )}

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
          {!loading && routes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No hay rutas</p>
            </div>
          ) : (
            !loading && routes.map((route) => {
              const badge = getEstadoBadge(route.estado);
              const action = getActionForEstado(route.estado);
              const progreso = getProgreso(route);
              return (
                <div
                  key={route.id}
                  onClick={() => handleRowClick(route)}
                  className="border border-gray-200 rounded-lg p-3 bg-white active:bg-green-50 transition-colors cursor-pointer"
                >
                  {/* Row 1: Icon + Name/Subtitle + Chevron */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Path className="w-5 h-5 text-teal-600" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {route.nombre}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {route.zonaNombre || 'Sin zona'} &middot; {route.usuarioNombre}
                      </div>
                    </div>
                    <CaretRight className="w-5 h-5 text-gray-300 flex-shrink-0" weight="bold" />
                  </div>
                  {/* Row 2: Badges + Info */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {route.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                    {progreso && (
                      <span className="text-xs text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        Paradas: <span className={progreso.pct === 100 ? 'text-green-600 font-medium' : ''}>
                          {progreso.text}
                        </span>
                      </span>
                    )}
                  </div>
                  {/* Row 3: Action button */}
                  {action && (
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRowClick(route); }}
                        className={`px-3 py-1.5 text-xs font-medium border rounded-full transition-colors ${action.cls}`}
                      >
                        {action.label}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Table */}
        <div data-tour="routes-manage-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
            <div className="flex-1 min-w-[160px] text-xs font-semibold text-gray-600">Nombre</div>
            <div className="w-[140px] text-xs font-semibold text-gray-600">Usuario</div>
            <div className="w-[120px] text-xs font-semibold text-gray-600">Zona</div>
            <div className="w-[100px] text-xs font-semibold text-gray-600">Fecha</div>
            <div className="w-[120px] text-xs font-semibold text-gray-600 text-center">Estado</div>
            <div className="w-[100px] text-xs font-semibold text-gray-600 text-center">Progreso</div>
            <div className="w-[110px] text-xs font-semibold text-gray-600 text-center">Acción</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="text-sm text-gray-500">Cargando rutas...</span>
                </div>
              </div>
            )}

            {!loading && routes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <ClipboardList className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay rutas</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  No se encontraron rutas con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {routes.map((route) => {
                  const badge = getEstadoBadge(route.estado);
                  const progreso = getProgreso(route);
                  const action = getActionForEstado(route.estado);
                  return (
                    <div
                      key={route.id}
                      onClick={() => handleRowClick(route)}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-green-50 cursor-pointer transition-colors group"
                    >
                      {/* Nombre */}
                      <div className="flex-1 min-w-[160px]">
                        <span className="text-[13px] font-medium text-gray-900 truncate block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {route.nombre}
                        </span>
                      </div>

                      {/* Usuario */}
                      <div className="w-[140px]">
                        <span className="text-[13px] text-gray-600 truncate block">
                          {route.usuarioNombre}
                        </span>
                      </div>

                      {/* Zona */}
                      <div className="w-[120px]">
                        <span className="text-[13px] text-gray-600 truncate block">
                          {route.zonaNombre || '-'}
                        </span>
                      </div>

                      {/* Fecha */}
                      <div className="w-[100px]">
                        <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {route.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Estado */}
                      <div className="w-[120px] text-center">
                        <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Progreso */}
                      <div className="w-[100px] text-center">
                        {progreso ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${progreso.pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-gray-500 whitespace-nowrap" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                              {progreso.text}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400">-</span>
                        )}
                      </div>

                      {/* Acción */}
                      <div className="w-[110px] flex items-center justify-center gap-1.5">
                        {action && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRowClick(route); }}
                            className={`px-2.5 py-1 text-[11px] font-medium border rounded-full transition-colors ${action.cls}`}
                          >
                            {action.label}
                          </button>
                        )}
                        <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-green-500 transition-colors" weight="bold" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalItems > 0 && (
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Mostrando {startItem}-{endItem} de {totalItems} rutas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600 px-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
