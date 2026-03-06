'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
// import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { routeService, RouteListItem, RouteCreateRequest, RouteUpdateRequest } from '@/services/api/routes';
import { zoneService } from '@/services/api/zones';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import {
  Plus,
  Download,
  RefreshCw,
  MapPin,
  Map,
  Check,
  Minus,
  Pencil,
  Loader2,
  Calendar,
  Clock,
  User,
  MapPinned,
} from 'lucide-react';
import { exportToCsv } from '@/services/api/importExport';
import { ListPagination } from '@/components/ui/ListPagination';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Path } from '@phosphor-icons/react';
import { useFormatters } from '@/hooks/useFormatters';

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
  const { formatDate } = useFormatters();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';

  const [routes, setRoutes] = useState<RouteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState<string>('all');
  const [zonaFilter, setZonaFilter] = useState<string>('all');
  const [usuarioFilter, setUsuarioFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [zones, setZones] = useState<ZoneOption[]>([]);

  // Toggle state
  const [togglingId, setTogglingId] = useState<number | null>(null);

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
        usuarioId: usuarioFilter !== 'all' ? parseInt(usuarioFilter) : undefined,
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
  }, [currentPage, searchTerm, estadoFilter, zonaFilter, usuarioFilter, showInactive]);

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
      const response = await api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/api/usuarios?pagina=1&tamanoPagina=500');
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

  const handleRefresh = () => {
    fetchRoutes();
    toast.success('Las rutas se han actualizado correctamente');
  };

  // Batch operations
  const visibleIds = routes.map(r => r.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, estadoFilter, zonaFilter, usuarioFilter, showInactive],
  });

  const handleBatchToggle = async () => {
    const ids = Array.from(batch.selectedIds);
    const activo = batch.batchAction === 'activate';
    try {
      batch.setBatchLoading(true);
      await routeService.batchToggleActivo(ids, activo);
      toast.success(`${ids.length} ruta${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''}`);
      batch.completeBatch();
      fetchRoutes();
    } catch {
      toast.error('Error al actualizar rutas');
      batch.setBatchLoading(false);
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
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Error al guardar ruta';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
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
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Rutas' },
      ]}
      title="Rutas"
      subtitle={totalItems > 0 ? `${totalItems} ruta${totalItems !== 1 ? 's' : ''}` : undefined}
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            data-tour="routes-export-btn"
            onClick={async () => { try { await exportToCsv('rutas'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            data-tour="routes-new-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva ruta</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Filter Row */}
        <div data-tour="routes-filters" className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder="Buscar ruta..."
            dataTour="routes-search"
          />

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

          {isAdmin && (
          <div className="min-w-[160px]">
            <SearchableSelect
              options={[
                { value: 'all', label: 'Todos los vendedores' },
                ...usuarios.map(u => ({ value: u.id.toString(), label: u.nombre })),
              ]}
              value={usuarioFilter}
              onChange={(val) => { setUsuarioFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder="Todos los vendedores"
            />
          </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div data-tour="routes-toggle-inactive" className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalItems}
          entityLabel="rutas"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* Error */}
        <ErrorBanner error={error} onRetry={fetchRoutes} />

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
                      onClick={() => batch.handleToggleSelect(route.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        batch.selectedIds.has(route.id)
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {batch.selectedIds.has(route.id) && <Check className="w-3 h-3" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Path className="w-5 h-5 text-teal-600" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {route.nombre}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {route.zonaNombre || 'Sin zona'}
                      </div>
                    </div>
                    <ActiveToggle
                      isActive={route.activo}
                      onToggle={() => handleToggleActive(route)}
                      disabled={loading}
                      isLoading={togglingId === route.id}
                    />
                  </div>
                  {/* Row 2: Badges */}
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-gray-600">
                      Paradas: <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>
                        {route.paradasCompletadas}
                      </span>/{route.totalParadas}
                    </span>
                    <span className="text-xs text-gray-500">
                      {route.usuarioNombre}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(route.fecha, { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
          <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[900px]">
            <div className="w-[28px] flex items-center justify-center">
              <button
                onClick={batch.handleSelectAllVisible}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  batch.allVisibleSelected
                    ? 'bg-green-600 border-green-600 text-white'
                    : batch.someVisibleSelected
                    ? 'bg-green-100 border-green-600'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {batch.allVisibleSelected ? (
                  <Check className="w-3 h-3" />
                ) : batch.someVisibleSelected ? (
                  <Minus className="w-3 h-3 text-green-600" />
                ) : null}
              </button>
            </div>
            <div className="flex-1 min-w-[160px] text-[11px] font-medium text-gray-500 uppercase">Nombre</div>
            <div className="w-[120px] text-[11px] font-medium text-gray-500 uppercase">Zona</div>
            <div className="w-[140px] text-[11px] font-medium text-gray-500 uppercase">Usuario</div>
            <div className="w-[100px] text-[11px] font-medium text-gray-500 uppercase">Fecha</div>
            <div className="w-[110px] text-[11px] font-medium text-gray-500 uppercase text-center">Estado</div>
            <div className="w-[80px] text-[11px] font-medium text-gray-500 uppercase text-center">Paradas</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
            <div className="w-8"></div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando rutas..." />

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
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
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
                      className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[900px] ${
                        !route.activo ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="w-[28px] flex items-center justify-center">
                        <button
                          onClick={() => batch.handleToggleSelect(route.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            batch.selectedIds.has(route.id)
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {batch.selectedIds.has(route.id) && <Check className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Nombre */}
                      <div className="flex-1 min-w-[160px]">
                        <span className="text-[13px] font-medium text-gray-900 truncate block">
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
                        <span className="text-[13px] text-gray-900">
                          {formatDate(route.fecha, { day: '2-digit', month: '2-digit', year: 'numeric' })}
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
                        <span className="text-[13px] text-gray-600">
                          <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>
                            {route.paradasCompletadas}
                          </span>
                          /{route.totalParadas}
                        </span>
                      </div>

                      {/* Toggle Activo */}
                      <div className="w-[50px] flex items-center justify-center">
                        <ActiveToggle
                          isActive={route.activo}
                          onToggle={() => handleToggleActive(route)}
                          disabled={loading}
                          isLoading={togglingId === route.id}
                        />
                      </div>

                      {/* Editar */}
                      <div className="w-8 flex items-center justify-center">
                        <button
                          onClick={() => handleOpenEdit(route)}
                          disabled={loading}
                          className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
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
        {(routes.length > 0 || loading) && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="rutas"
            loading={loading}
          />
        )}
      </div>

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="ruta"
        loading={batch.batchLoading}
        consequenceActivate="Las rutas activadas volverán a estar disponibles."
        consequenceDeactivate="Las rutas desactivadas no estarán disponibles."
      />

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
          <div data-tour="routes-drawer-actions" className="flex justify-end gap-3">
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
        <form onSubmit={rhfSubmit(handleSubmit)} className="p-6 space-y-5">
          {/* ── Información general ── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información general</h4>

            {/* Nombre */}
            <div data-tour="routes-drawer-nombre">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <Map className="w-3.5 h-3.5 text-teal-500" />
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('nombre')}
                maxLength={100}
                placeholder="Ej: Ruta Centro - Lunes"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
            </div>

            {/* Usuario (solo crear) */}
            {!editingRoute && (
              <div data-tour="routes-drawer-vendedor">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                  <User className="w-3.5 h-3.5 text-blue-500" />
                  Vendedor <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={usuarios.map(u => ({ value: u.id.toString(), label: u.nombre }))}
                  value={watch('usuarioId') ? watch('usuarioId').toString() : ''}
                  onChange={(val) => setValue('usuarioId', val ? parseInt(String(val)) : 0, { shouldDirty: true })}
                  placeholder="Seleccionar vendedor..."
                />
              </div>
            )}

            {/* Zona */}
            <div data-tour="routes-drawer-zona">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <MapPinned className="w-3.5 h-3.5 text-violet-500" />
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
          </div>

          <hr className="border-gray-100" />

          {/* ── Programación ── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Programación</h4>

            {/* Fecha */}
            <div data-tour="routes-drawer-fecha">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('fecha')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {errors.fecha && <p className="text-xs text-red-500 mt-1">{errors.fecha.message}</p>}
            </div>

            {/* Hora inicio / Hora fin (2 columnas) */}
            <div data-tour="routes-drawer-horario" className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  Hora inicio
                </label>
                <input
                  type="time"
                  {...register('horaInicioEstimada')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  Hora fin
                </label>
                <input
                  type="time"
                  {...register('horaFinEstimada')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* ── Detalles adicionales ── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detalles adicionales</h4>

            {/* Descripción */}
            <div data-tour="routes-drawer-descripcion">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Descripción
              </label>
              <textarea
                {...register('descripcion')}
                rows={2}
                placeholder="Descripción de la ruta..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Notas */}
            <div data-tour="routes-drawer-notas">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Notas
              </label>
              <textarea
                {...register('notas')}
                rows={2}
                placeholder="Notas adicionales..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
