'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import { DateTimePicker } from '@/components/ui/DateTimePicker';
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
  Pencil,
  Loader2,
  Calendar,
  Clock,
  User,
  MapPinned,
} from 'lucide-react';
import { exportToCsv } from '@/services/api/importExport';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { Path } from '@phosphor-icons/react';
import { useFormatters } from '@/hooks/useFormatters';
import { dateOnlyToUTC } from '@/lib/formatters';

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
  const router = useRouter();
  const { formatDateOnly } = useFormatters();
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

  // Sort state
  const [sortKey, setSortKey] = useState('fecha');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSortChange = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  const sortedRoutes = useMemo(() => {
    const sorted = [...routes];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nombre': cmp = a.nombre.localeCompare(b.nombre); break;
        case 'fecha': cmp = a.fecha.getTime() - b.fecha.getTime(); break;
        case 'usuarioNombre': cmp = a.usuarioNombre.localeCompare(b.usuarioNombre); break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [routes, sortKey, sortDir]);

  // Column definitions for routes
  const routeColumns = useMemo<DataGridColumn<RouteListItem>[]>(() => [
    {
      key: 'nombre',
      label: 'Nombre',
      sortable: true,
      width: 'flex',
      cellRenderer: (route) => (
        <div onClick={(e) => { e.stopPropagation(); router.push(`/routes/${route.id}`); }}>
          <span className="text-[13px] font-medium text-gray-900 hover:underline cursor-pointer truncate block">{route.nombre}</span>
        </div>
      ),
    },
    {
      key: 'zonaNombre',
      label: 'Zona',
      width: 120,
      cellRenderer: (route) => <span className="text-[13px] text-gray-600 truncate block">{route.zonaNombre || '-'}</span>,
    },
    {
      key: 'usuarioNombre',
      label: 'Usuario',
      sortable: true,
      width: 140,
      cellRenderer: (route) => <span className="text-[13px] text-gray-600 truncate block">{route.usuarioNombre}</span>,
    },
    {
      key: 'fecha',
      label: 'Fecha',
      sortable: true,
      width: 100,
      cellRenderer: (route) => <span className="text-[13px] text-gray-900">{formatDateOnly(route.fecha)}</span>,
    },
    {
      key: 'horario',
      label: 'Horario',
      width: 110,
      align: 'center',
      cellRenderer: (route) => (
        <span className="text-[12px] text-gray-500">
          {route.horaInicioEstimada
            ? `${route.horaInicioEstimada.substring(0, 5)} - ${route.horaFinEstimada?.substring(0, 5) || '--:--'}`
            : '--'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      width: 110,
      align: 'center',
      cellRenderer: (route) => {
        const badge = getEstadoBadge(route.estado);
        return <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>{badge.label}</span>;
      },
    },
    {
      key: 'paradas',
      label: 'Paradas',
      width: 80,
      align: 'center',
      cellRenderer: (route) => (
        <span className="text-[13px] text-gray-600">
          <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>
            {route.paradasCompletadas}
          </span>/{route.totalParadas}
        </span>
      ),
    },
    {
      key: 'activo',
      label: 'Activo',
      width: 50,
      align: 'center',
      cellRenderer: (route) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActiveToggle isActive={route.activo} onToggle={() => handleToggleActive(route)} disabled={loading} isLoading={togglingId === route.id} />
        </div>
      ),
    },
    {
      key: 'edit',
      label: '',
      width: 32,
      cellRenderer: (route) => (
        <div onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleOpenEdit(route)} disabled={loading} className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title="Editar">
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      key: 'contextAction',
      label: 'Acción',
      width: 80,
      align: 'center',
      cellRenderer: (route) => (
        <div onClick={(e) => e.stopPropagation()}>
          {(route.estado === 0) && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/load`)} className="text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors">Cargar</button>
          )}
          {(route.estado === 1 || route.estado === 4 || route.estado === 5) && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/load`)} className="text-[11px] font-medium text-gray-600 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-md transition-colors">Ver carga</button>
          )}
          {route.estado === 2 && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/close`)} className="text-[11px] font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors">Cerrar</button>
          )}
          {route.estado === 6 && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/close`)} className="text-[11px] font-medium text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md">Cerrado</button>
          )}
        </div>
      ),
    },
  ], [loading, togglingId, formatDateOnly, router]);

  // Batch operations
  const visibleIds = sortedRoutes.map(r => r.id);
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
      usuarioId: route.usuarioId,
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
        const fmtTimeUpd = (t?: string | null) => t ? (t.length === 5 ? `${t}:00` : t) : null;
        const updateData: RouteUpdateRequest = {
          usuarioId: data.usuarioId || undefined,
          nombre: data.nombre,
          zonaId: data.zonaId,
          fecha: dateOnlyToUTC(data.fecha),
          horaInicioEstimada: fmtTimeUpd(data.horaInicioEstimada),
          horaFinEstimada: fmtTimeUpd(data.horaFinEstimada),
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
        const fmtTime = (t?: string | null) => t ? (t.length === 5 ? `${t}:00` : t) : null;
        const createData: RouteCreateRequest = {
          nombre: data.nombre,
          usuarioId: data.usuarioId,
          zonaId: data.zonaId,
          fecha: dateOnlyToUTC(data.fecha),
          horaInicioEstimada: fmtTime(data.horaInicioEstimada),
          horaFinEstimada: fmtTime(data.horaFinEstimada),
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

        {/* Routes DataGrid */}
        <div data-tour="routes-table">
          <DataGrid<RouteListItem>
            columns={routeColumns}
            data={sortedRoutes}
            keyExtractor={(r) => r.id}
            loading={loading}
            loadingMessage="Cargando rutas..."
            emptyIcon={<MapPin className="w-16 h-16 text-cyan-300" />}
            emptyTitle="No hay rutas"
            emptyMessage={searchTerm || estadoFilter !== 'all' || zonaFilter !== 'all' ? 'No se encontraron resultados con los filtros aplicados' : 'Crea tu primera ruta de venta para comenzar'}
            onRowClick={(route) => handleOpenEdit(route)}
            sort={{
              key: sortKey,
              direction: sortDir,
              onSort: handleSortChange,
            }}
            selection={{
              selectedIds: batch.selectedIds as unknown as Set<string | number>,
              onToggle: (id) => batch.handleToggleSelect(id as number),
              onSelectAll: batch.handleSelectAllVisible,
              onClearAll: batch.handleClearSelection,
            }}
            pagination={(routes.length > 0 || loading) ? {
              currentPage,
              totalPages,
              totalItems,
              pageSize,
              onPageChange: setCurrentPage,
            } : undefined}
            mobileCardRenderer={(route) => {
              const badge = getEstadoBadge(route.estado);
              return (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <Path className="w-5 h-5 text-teal-600" weight="duotone" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{route.nombre}</div>
                      <div className="text-xs text-gray-500 truncate">{route.zonaNombre || 'Sin zona'}</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActiveToggle isActive={route.activo} onToggle={() => handleToggleActive(route)} disabled={loading} isLoading={togglingId === route.id} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs text-gray-600">Paradas: <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>{route.paradasCompletadas}</span>/{route.totalParadas}</span>
                    <span className="text-xs text-gray-500">{route.usuarioNombre}</span>
                    <span className="text-xs text-gray-500">{formatDateOnly(route.fecha)}</span>
                  </div>
                  <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleOpenEdit(route)} disabled={loading} className="px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50">Editar</button>
                  </div>
                </>
              );
            }}
          />
        </div>
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
            <h4 className="text-xs font-semibold text-gray-400">Información general</h4>

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

            {/* Usuario */}
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
            <h4 className="text-xs font-semibold text-gray-400">Programación</h4>

            {/* Fecha */}
            <div data-tour="routes-drawer-fecha">
              <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                Fecha <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                mode="date"
                value={watch('fecha')}
                onChange={(val) => setValue('fecha', val, { shouldValidate: true, shouldDirty: true })}
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
            <h4 className="text-xs font-semibold text-gray-400">Detalles adicionales</h4>

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
