'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
// import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { routeService, RouteListItem, RouteCreateRequest, RouteUpdateRequest } from '@/services/api/routes';
import { zoneService } from '@/services/api/zones';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MapPin,
  Map,
  Power,
  PowerOff,
  Check,
  Minus,
  X,
  Pencil,
  Search,
  Loader2,
} from 'lucide-react';
import { Path } from '@phosphor-icons/react';

interface ZoneOption {
  id: number;
  name: string;
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

const routeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(100),
  usuarioId: z.number(),
  zonaId: z.number().nullable(),
  fecha: z.string().min(1, 'La fecha es requerida'),
  horaInicioEstimada: z.string(),
  horaFinEstimada: z.string(),
  descripcion: z.string(),
  notas: z.string(),
});

type RouteFormData = z.infer<typeof routeSchema>;

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [zonaFilter, setZonaFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);

  // Toggle state
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Create/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);

  const drawerRef = useRef<DrawerHandle>(null);

  // React Hook Form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      nombre: '',
      usuarioId: 0,
      zonaId: null,
      fecha: '',
      horaInicioEstimada: '',
      horaFinEstimada: '',
      descripcion: '',
      notas: '',
    },
  });

  const pageSize = 20;

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await routeService.getRutas({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        estado: estadoFilter !== 'all' ? parseInt(estadoFilter) : undefined,
        zonaId: zonaFilter !== 'all' ? parseInt(zonaFilter) : undefined,
        mostrarInactivos: showInactive,
      });
      setRoutes(response.items);
      setTotalItems(response.total);
      setTotalPages(Math.ceil(response.total / pageSize) || 1);
    } catch (err) {
      console.error('Error al cargar rutas:', err);
      setError('Error al cargar las rutas. Intenta de nuevo.');
      toast.error('Error al cargar rutas');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, estadoFilter, zonaFilter, showInactive]);

  const fetchZones = async () => {
    try {
      const response = await zoneService.getZones();
      setZones(response.zones.map(z => ({ id: parseInt(z.id), name: z.name })));
    } catch (err) {
      console.error('Error al cargar zonas:', err);
    }
  };

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
    fetchZones();
    fetchUsuarios();
  }, []);

  // Clear selection on filter/page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, estadoFilter, zonaFilter, showInactive]);

  const handleRefresh = () => {
    fetchRoutes();
    toast.success('Las rutas se han actualizado correctamente');
  };

  // Multi-select handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = routes.map(r => r.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  const handleOpenBatchAction = (action: 'activate' | 'deactivate') => {
    setBatchAction(action);
    setIsBatchConfirmOpen(true);
  };

  const handleBatchToggle = async () => {
    const ids = Array.from(selectedIds);
    const activo = batchAction === 'activate';
    try {
      setBatchLoading(true);
      await routeService.batchToggleActivo(ids, activo);
      toast.success(`${ids.length} ruta${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''}`);
      setSelectedIds(new Set());
      setIsBatchConfirmOpen(false);
      fetchRoutes();
    } catch {
      toast.error('Error al actualizar rutas');
    } finally {
      setBatchLoading(false);
    }
  };

  // Individual toggle
  const handleToggleActive = async (route: RouteListItem) => {
    const newActivo = !route.activo;
    setTogglingId(route.id);
    setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, activo: newActivo } : r));
    try {
      await routeService.toggleActivo(route.id, newActivo);
      toast.success(`Ruta ${newActivo ? 'activada' : 'desactivada'}`);
      if (!showInactive && !newActivo) {
        setRoutes(prev => prev.filter(r => r.id !== route.id));
        setTotalItems(prev => prev - 1);
      }
    } catch {
      setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, activo: !newActivo } : r));
      toast.error('Error al cambiar estado');
    } finally {
      setTogglingId(null);
    }
  };

  // Create/Edit handlers
  const handleOpenCreate = () => {
    setEditingRoute(null);
    const todayString = new Date().toISOString().split('T')[0];
    resetForm({
      nombre: '',
      usuarioId: 0,
      zonaId: null,
      fecha: todayString,
      horaInicioEstimada: '',
      horaFinEstimada: '',
      descripcion: '',
      notas: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (route: RouteListItem) => {
    setEditingRoute(route);
    resetForm({
      nombre: route.nombre,
      usuarioId: 0,
      zonaId: zones.find(z => z.name === route.zonaNombre)?.id ?? null,
      fecha: route.fecha.toISOString().split('T')[0],
      horaInicioEstimada: '',
      horaFinEstimada: '',
      descripcion: '',
      notas: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: RouteFormData) => {
    try {
      setActionLoading(true);
      if (editingRoute) {
        const updateData: RouteUpdateRequest = {
          nombre: data.nombre,
          zonaId: data.zonaId,
          fecha: data.fecha,
          horaInicioEstimada: data.horaInicioEstimada || null,
          horaFinEstimada: data.horaFinEstimada || null,
          descripcion: data.descripcion || undefined,
          notas: data.notas || undefined,
        };
        await routeService.updateRuta(editingRoute.id, updateData);
        toast.success('Ruta actualizada exitosamente');
      } else {
        if (!data.usuarioId) {
          toast.error('Selecciona un usuario');
          setActionLoading(false);
          return;
        }
        const createData: RouteCreateRequest = {
          nombre: data.nombre,
          usuarioId: data.usuarioId,
          zonaId: data.zonaId,
          fecha: data.fecha,
          horaInicioEstimada: data.horaInicioEstimada || null,
          horaFinEstimada: data.horaFinEstimada || null,
          descripcion: data.descripcion || undefined,
          notas: data.notas || undefined,
        };
        await routeService.createRuta(createData);
        toast.success('Ruta creada exitosamente');
      }
      setIsModalOpen(false);
      fetchRoutes();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Error al guardar ruta';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Computed
  const visibleIds = routes.map(r => r.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  // Pagination
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  // Estado badge
  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: 'Planificada', cls: 'bg-gray-100 text-gray-600' };
      case 1: return { label: 'En progreso', cls: 'bg-cyan-100 text-cyan-700' };
      case 2: return { label: 'Completada', cls: 'bg-green-100 text-green-600' };
      case 3: return { label: 'Cancelada', cls: 'bg-red-100 text-red-600' };
      case 4: return { label: 'Pend. aceptar', cls: 'bg-yellow-100 text-yellow-700' };
      case 5: return { label: 'Carga aceptada', cls: 'bg-blue-100 text-blue-700' };
      case 6: return { label: 'Cerrada', cls: 'bg-emerald-100 text-emerald-700' };
      default: return { label: 'Desconocido', cls: 'bg-gray-100 text-gray-600' };
    }
  };

  const estadoOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: '0', label: 'Planificada' },
    { value: '1', label: 'En progreso' },
    { value: '2', label: 'Completada' },
    { value: '3', label: 'Cancelada' },
    { value: '4', label: 'Pend. aceptar' },
    { value: '5', label: 'Carga aceptada' },
    { value: '6', label: 'Cerrada' },
  ];

  const zonaOptions = [
    { value: 'all', label: 'Todas las zonas' },
    ...zones.map(z => ({ value: z.id.toString(), label: z.name })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Rutas' },
        ]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Rutas
          </h1>
          <div className="flex items-center gap-2">
            <button
              data-tour="routes-new-btn"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva ruta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Buscar ruta..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div className="min-w-[160px]">
            <SearchableSelect
              options={estadoOptions}
              value={estadoFilter}
              onChange={(val) => { setEstadoFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder="Todos los estados"
            />
          </div>

          <div className="min-w-[160px]">
            <SearchableSelect
              options={zonaOptions}
              value={zonaFilter}
              onChange={(val) => { setZonaFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder="Todas las zonas"
            />
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-600">Mostrar inactivos</span>
            <button
              onClick={() => { setShowInactive(!showInactive); setCurrentPage(1); }}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                showInactive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={showInactive ? 'Mostrando todas las rutas' : 'Solo rutas activas'}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                showInactive ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Selection Action Bar */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-700">
                {selectedCount} seleccionada{selectedCount > 1 ? 's' : ''}
              </span>
              {selectedCount < totalItems && (
                <span className="text-xs text-blue-500">de {totalItems} rutas</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenBatchAction('deactivate')}
                disabled={batchLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <PowerOff className="w-3 h-3" />
                <span>Desactivar</span>
              </button>
              <button
                onClick={() => handleOpenBatchAction('activate')}
                disabled={batchLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-600 bg-white border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                <Power className="w-3 h-3" />
                <span>Activar</span>
              </button>
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        )}

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
              <MapPin className="w-12 h-12 text-cyan-300 mb-3" />
              <p className="text-sm text-gray-500">No hay rutas</p>
            </div>
          ) : (
            routes.map((route) => {
              const badge = getEstadoBadge(route.estado);
              return (
                <div key={route.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                  {/* Row 1: Checkbox + Icon + Name/Subtitle + Toggle */}
                  <div className="flex items-center gap-3 mb-2">
                    <button
                      onClick={() => handleToggleSelect(route.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedIds.has(route.id)
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {selectedIds.has(route.id) && <Check className="w-3 h-3" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Path className="w-5 h-5 text-teal-600" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {route.nombre}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {route.zonaNombre || 'Sin zona'}
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggleActive(route)}
                      disabled={togglingId === route.id || loading}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                        route.activo ? 'bg-green-500' : 'bg-gray-300'
                      } ${togglingId === route.id ? 'opacity-50' : ''}`}
                      title={route.activo ? 'Desactivar' : 'Activar'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                        route.activo ? 'translate-x-4' : 'translate-x-0'
                      }`}>
                        {route.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                      </span>
                    </button>
                  </div>
                  {/* Row 2: Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      Paradas: <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>
                        {route.paradasCompletadas}
                      </span>/{route.totalParadas}
                    </span>
                    <span className="text-xs text-gray-500">
                      {route.usuarioNombre}
                    </span>
                    <span className="text-xs text-gray-500">
                      {route.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  </div>
                  {/* Row 3: Actions */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleOpenEdit(route)}
                      disabled={loading}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Table */}
        <div data-tour="routes-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[900px]">
            <div className="w-[28px] flex items-center justify-center">
              <button
                onClick={handleSelectAllVisible}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  allVisibleSelected
                    ? 'bg-green-600 border-green-600 text-white'
                    : someVisibleSelected
                    ? 'bg-green-100 border-green-600'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {allVisibleSelected ? (
                  <Check className="w-3 h-3" />
                ) : someVisibleSelected ? (
                  <Minus className="w-3 h-3 text-green-600" />
                ) : null}
              </button>
            </div>
            <div className="flex-1 min-w-[160px] text-xs font-semibold text-gray-600">Nombre</div>
            <div className="w-[120px] text-xs font-semibold text-gray-600">Zona</div>
            <div className="w-[140px] text-xs font-semibold text-gray-600">Usuario</div>
            <div className="w-[100px] text-xs font-semibold text-gray-600">Fecha</div>
            <div className="w-[110px] text-xs font-semibold text-gray-600 text-center">Estado</div>
            <div className="w-[80px] text-xs font-semibold text-gray-600 text-center">Paradas</div>
            <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
            <div className="w-[70px] text-xs font-semibold text-gray-600 text-center">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="text-sm text-gray-500">Cargando rutas...</span>
                </div>
              </div>
            )}

            {!loading && routes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <MapPin className="w-16 h-16 text-cyan-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay rutas</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  {searchTerm || estadoFilter !== 'all' || zonaFilter !== 'all'
                    ? 'No se encontraron resultados con los filtros aplicados'
                    : 'Crea tu primera ruta de venta para comenzar'}
                </p>
                {!searchTerm && estadoFilter === 'all' && zonaFilter === 'all' && (
                  <button
                    onClick={handleOpenCreate}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva ruta
                  </button>
                )}
              </div>
            ) : (
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {routes.map((route) => {
                  const badge = getEstadoBadge(route.estado);
                  return (
                    <div
                      key={route.id}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[900px] ${
                        !route.activo ? 'bg-gray-50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="w-[28px] flex items-center justify-center">
                        <button
                          onClick={() => handleToggleSelect(route.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selectedIds.has(route.id)
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {selectedIds.has(route.id) && <Check className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Nombre */}
                      <div className="flex-1 min-w-[160px]">
                        <span className="text-[13px] font-medium text-gray-900 truncate block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {route.nombre}
                        </span>
                      </div>

                      {/* Zona */}
                      <div className="w-[120px]">
                        <span className="text-[13px] text-gray-600 truncate block">
                          {route.zonaNombre || '-'}
                        </span>
                      </div>

                      {/* Usuario */}
                      <div className="w-[140px]">
                        <span className="text-[13px] text-gray-600 truncate block">
                          {route.usuarioNombre}
                        </span>
                      </div>

                      {/* Fecha */}
                      <div className="w-[100px]">
                        <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {route.fecha.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Estado */}
                      <div className="w-[110px] text-center">
                        <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>

                      {/* Paradas */}
                      <div className="w-[80px] text-center">
                        <span className="text-[13px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>
                            {route.paradasCompletadas}
                          </span>
                          /{route.totalParadas}
                        </span>
                      </div>

                      {/* Toggle Activo */}
                      <div className="w-[50px] flex items-center justify-center">
                        <button
                          onClick={() => handleToggleActive(route)}
                          disabled={togglingId === route.id || loading}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                            route.activo ? 'bg-green-500' : 'bg-gray-300'
                          } ${togglingId === route.id ? 'opacity-50' : ''}`}
                          title={route.activo ? 'Desactivar' : 'Activar'}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                            route.activo ? 'translate-x-4' : 'translate-x-0'
                          }`}>
                            {route.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                          </span>
                        </button>
                      </div>

                      {/* Acciones */}
                      <div className="w-[70px] flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(route)}
                          disabled={loading}
                          className="p-1 text-amber-400 hover:text-amber-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pagination - Always visible when there are routes */}
        {(routes.length > 0 || loading) && totalItems > 0 && (
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Mostrando {startItem}-{endItem} de {totalItems} rutas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && !loading && setCurrentPage(page)}
                    disabled={page === '...' || loading}
                    className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white'
                        : page === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Confirm Modal */}
      {isBatchConfirmOpen && (
        <Modal
          isOpen={isBatchConfirmOpen}
          onClose={() => setIsBatchConfirmOpen(false)}
          title={`${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} ruta${selectedCount > 1 ? 's' : ''}?`}
        >
          <div className="py-4">
            <p className="text-gray-500">
              ¿Estas seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
              <strong>{selectedCount}</strong> ruta{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}?
              {batchAction === 'deactivate' && ' Las rutas desactivadas no estaran disponibles.'}
              {batchAction === 'activate' && ' Las rutas activadas volveran a estar disponibles.'}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsBatchConfirmOpen(false)}
              disabled={batchLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleBatchToggle}
              disabled={batchLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                batchAction === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {batchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
            </button>
          </div>
        </Modal>
      )}

      {/* Create/Edit Route Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => !actionLoading && setIsModalOpen(false)}
        title={editingRoute ? 'Editar Ruta' : 'Nueva Ruta'}
        icon={<Map className="w-5 h-5 text-teal-500" />}
        width="lg"
        isDirty={isDirty}
        onSave={rhfSubmit(handleSubmit)}
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => drawerRef.current?.requestClose()}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={rhfSubmit(handleSubmit)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingRoute ? 'Guardar cambios' : 'Crear ruta'}
            </button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('nombre')}
              maxLength={100}
              placeholder="Ej: Ruta Centro - Lunes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
          </div>

          {/* Usuario (solo crear) */}
          {!editingRoute && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuario <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={usuarios.map(u => ({ value: u.id.toString(), label: u.nombre }))}
                value={watch('usuarioId') ? watch('usuarioId').toString() : ''}
                onChange={(val) => setValue('usuarioId', val ? parseInt(String(val)) : 0, { shouldDirty: true })}
                placeholder="Seleccionar usuario..."
              />
            </div>
          )}

          {/* Zona */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zona
            </label>
            <SearchableSelect
              options={[
                { value: '', label: 'Sin zona' },
                ...zones.map(z => ({ value: z.id.toString(), label: z.name })),
              ]}
              value={watch('zonaId') ? watch('zonaId')!.toString() : ''}
              onChange={(val) => setValue('zonaId', val ? parseInt(String(val)) : null, { shouldDirty: true })}
              placeholder="Seleccionar zona..."
            />
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('fecha')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha.message}</p>}
          </div>

          {/* Hora inicio / Hora fin (2 columnas) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora inicio
              </label>
              <input
                type="time"
                {...register('horaInicioEstimada')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hora fin
              </label>
              <input
                type="time"
                {...register('horaFinEstimada')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripcion
            </label>
            <textarea
              {...register('descripcion')}
              rows={2}
              placeholder="Descripcion de la ruta..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              {...register('notas')}
              rows={2}
              placeholder="Notas adicionales..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
