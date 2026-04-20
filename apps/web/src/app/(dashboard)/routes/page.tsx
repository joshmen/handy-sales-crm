'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { routeService, RouteListItem, RouteCreateRequest } from '@/services/api/routes';
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
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';

interface ZoneOption {
  id: number;
  name: string;
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

const routeSchema = z.object({
  nombre: z.string().min(1, 'nameRequired').max(100),
  usuarioId: z.number(),
  zonaId: z.number().nullable(),
  fecha: z.string().min(1, 'dateRequired'),
  horaInicioEstimada: z.string(),
  horaFinEstimada: z.string(),
  descripcion: z.string(),
  notas: z.string(),
});

type RouteFormData = z.infer<typeof routeSchema>;

export default function RoutesPage() {
  const t = useTranslations('routes');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();
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

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
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
    toast.success(t('routesUpdated'));
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
      label: t('columns.name'),
      sortable: true,
      width: 'flex',
      cellRenderer: (route) => (
        <span className="text-[13px] font-medium text-green-600 truncate block">{route.nombre}</span>
      ),
    },
    {
      key: 'zonaNombre',
      label: t('columns.zone'),
      width: 120,
      cellRenderer: (route) => <span className="text-[13px] text-foreground/70 truncate block">{route.zonaNombre || '-'}</span>,
    },
    {
      key: 'usuarioNombre',
      label: t('columns.user'),
      sortable: true,
      width: 140,
      cellRenderer: (route) => <span className="text-[13px] text-foreground/70 truncate block">{route.usuarioNombre}</span>,
    },
    {
      key: 'fecha',
      label: t('columns.date'),
      sortable: true,
      width: 100,
      cellRenderer: (route) => <span className="text-[13px] text-foreground">{formatDateOnly(route.fecha)}</span>,
    },
    {
      key: 'horario',
      label: t('columns.schedule'),
      width: 110,
      align: 'center',
      cellRenderer: (route) => (
        <span className="text-[12px] text-muted-foreground">
          {route.horaInicioEstimada
            ? `${route.horaInicioEstimada.substring(0, 5)} - ${route.horaFinEstimada?.substring(0, 5) || '--:--'}`
            : '--'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: t('columns.status'),
      width: 110,
      align: 'center',
      cellRenderer: (route) => {
        const badge = getEstadoBadge(route.estado);
        return <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>{badge.label}</span>;
      },
    },
    {
      key: 'paradas',
      label: t('columns.stops'),
      width: 80,
      align: 'center',
      cellRenderer: (route) => (
        <span className="text-[13px] text-foreground/70">
          <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>
            {route.paradasCompletadas}
          </span>/{route.totalParadas}
        </span>
      ),
    },
    {
      key: 'activo',
      label: t('columns.active'),
      width: 50,
      align: 'center',
      cellRenderer: (route) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActiveToggle isActive={route.activo} onToggle={() => handleToggleActive(route)} disabled={loading} isLoading={togglingId === route.id} />
        </div>
      ),
    },
    {
      key: 'contextAction',
      label: t('columns.action'),
      width: 80,
      align: 'center',
      cellRenderer: (route) => (
        <div onClick={(e) => e.stopPropagation()}>
          {(route.estado === 0) && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/load`)} className="text-[11px] font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors">{t('actions.load')}</button>
          )}
          {(route.estado === 1 || route.estado === 4 || route.estado === 5) && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/load`)} className="text-[11px] font-medium text-foreground/70 hover:text-foreground bg-surface-1 hover:bg-surface-3 px-2.5 py-1 rounded-md transition-colors">{t('actions.viewLoad')}</button>
          )}
          {route.estado === 2 && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/close`)} className="text-[11px] font-medium text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md transition-colors">{t('actions.close')}</button>
          )}
          {route.estado === 6 && (
            <button onClick={() => router.push(`/routes/manage/${route.id}/close`)} className="text-[11px] font-medium text-muted-foreground bg-surface-1 px-2.5 py-1 rounded-md">{t('actions.closed')}</button>
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
      toast.success(t('batchSuccess', { count: ids.length, action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() }));
      batch.completeBatch();
      fetchRoutes();
    } catch (err) {
      showApiError(err, t('errorUpdating'));
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
      toast.success(newActivo ? t('routeActivated') : t('routeDeactivated'));
      if (!showInactive && !newActivo) {
        setRoutes(prev => prev.filter(r => r.id !== route.id));
        setTotalItems(prev => prev - 1);
      }
    } catch (err) {
      setRoutes(prev => prev.map(r => r.id === route.id ? { ...r, activo: !newActivo } : r));
      showApiError(err, t('errorUpdating'));
    } finally {
      setTogglingId(null);
    }
  };

  // Create/Edit handlers
  const handleOpenCreate = () => {
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

  const handleSubmit = async (data: RouteFormData) => {
    try {
      setActionLoading(true);
      if (!data.usuarioId) {
        toast.error(t('selectUser'));
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
      toast.success(t('routeCreated'));
      setIsModalOpen(false);
      fetchRoutes();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || t('errorSaving');
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // Estado badge
  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: t('status.planned'), cls: 'bg-surface-3 text-foreground/70' };
      case 1: return { label: t('status.inProgress'), cls: 'bg-cyan-100 text-cyan-700' };
      case 2: return { label: t('status.completed'), cls: 'bg-green-100 text-green-600' };
      case 3: return { label: t('status.cancelled'), cls: 'bg-red-100 text-red-600' };
      case 4: return { label: t('status.pendingAccept'), cls: 'bg-yellow-100 text-yellow-700' };
      case 5: return { label: t('status.loadAccepted'), cls: 'bg-blue-100 text-blue-700' };
      case 6: return { label: t('status.closed'), cls: 'bg-emerald-100 text-emerald-700' };
      default: return { label: t('status.unknown'), cls: 'bg-surface-3 text-foreground/70' };
    }
  };

  const estadoOptions = [
    { value: 'all', label: t('filters.allStatuses') },
    { value: '0', label: t('status.planned') },
    { value: '1', label: t('status.inProgress') },
    { value: '2', label: t('status.completed') },
    { value: '3', label: t('status.cancelled') },
    { value: '4', label: t('status.pendingAccept') },
    { value: '5', label: t('status.loadAccepted') },
    { value: '6', label: t('status.closed') },
  ];

  const zonaOptions = [
    { value: 'all', label: t('filters.allZones') },
    ...zones.map(z => ({ value: z.id.toString(), label: z.name })),
  ];

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={totalItems > 0 ? t('routeCount', { count: totalItems }) : undefined}
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            data-tour="routes-export-btn"
            onClick={async () => { try { await exportToCsv('rutas'); toast.success(t('csvDownloaded')); } catch { toast.error(t('exportError')); } }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">{tc('export')}</span>
          </button>
          <button
            data-tour="routes-new-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newRoute')}</span>
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
            placeholder={t('searchPlaceholder')}
            dataTour="routes-search"
          />

          <div className="min-w-[160px]">
            <SearchableSelect
              options={estadoOptions}
              value={estadoFilter}
              onChange={(val) => { setEstadoFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder={t('filters.allStatuses')}
            />
          </div>

          <div className="min-w-[160px]">
            <SearchableSelect
              options={zonaOptions}
              value={zonaFilter}
              onChange={(val) => { setZonaFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder={t('filters.allZones')}
            />
          </div>

          {isAdmin && (
          <div className="min-w-[160px]">
            <SearchableSelect
              options={[
                { value: 'all', label: t('filters.allVendors') },
                ...usuarios.map(u => ({ value: u.id.toString(), label: u.nombre })),
              ]}
              value={usuarioFilter}
              onChange={(val) => { setUsuarioFilter(val ? String(val) : 'all'); setCurrentPage(1); }}
              placeholder={t('filters.allVendors')}
            />
          </div>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{tc('refresh')}</span>
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
          entityLabel={t('title').toLowerCase()}
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
            loadingMessage={t('loadingMessage')}
            emptyIcon={<MapPin className="w-16 h-16 text-cyan-300" />}
            emptyTitle={t('emptyTitle')}
            emptyMessage={searchTerm || estadoFilter !== 'all' || zonaFilter !== 'all' ? t('emptyFiltered') : t('emptyDefault')}
            onRowClick={(route) => router.push(`/routes/${route.id}`)}
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
                      <div className="text-sm font-medium text-foreground truncate">{route.nombre}</div>
                      <div className="text-xs text-muted-foreground truncate">{route.zonaNombre || t('noZone')}</div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActiveToggle isActive={route.activo} onToggle={() => handleToggleActive(route)} disabled={loading} isLoading={togglingId === route.id} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge.cls}`}>{badge.label}</span>
                    <span className="text-xs text-foreground/70">{t('columns.stops')}: <span className={route.paradasCompletadas === route.totalParadas && route.totalParadas > 0 ? 'text-green-600 font-medium' : ''}>{route.paradasCompletadas}</span>/{route.totalParadas}</span>
                    <span className="text-xs text-muted-foreground">{route.usuarioNombre}</span>
                    <span className="text-xs text-muted-foreground">{formatDateOnly(route.fecha)}</span>
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
        entityLabel={t('title').toLowerCase()}
        loading={batch.batchLoading}
        consequenceActivate={t('batchConsequenceActivate')}
        consequenceDeactivate={t('batchConsequenceDeactivate')}
      />

      {/* Create Route Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => !actionLoading && setIsModalOpen(false)}
        title={t('drawer.createTitle')}
        icon={<Map className="w-5 h-5 text-teal-500" />}
        width="lg"
        isDirty={isDirty}
        onSave={rhfSubmit(handleSubmit)}
        footer={
          <div data-tour="routes-drawer-actions" className="flex justify-end gap-3">
            <button
              onClick={() => drawerRef.current?.requestClose()}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              {tc('cancel')}
            </button>
            <button
              onClick={rhfSubmit(handleSubmit)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('drawer.createRoute')}
            </button>
          </div>
        }
      >
        <form onSubmit={rhfSubmit(handleSubmit)} className="p-6 space-y-5">
          {/* ── Información general ── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.generalInfo')}</h4>

            {/* Nombre */}
            <div data-tour="routes-drawer-nombre">
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <Map className="w-3.5 h-3.5 text-teal-500" />
                {t('columns.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('nombre')}
                maxLength={100}
                placeholder={t('drawer.namePlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              {errors.nombre && <FieldError message={errors.nombre?.message} />}
            </div>

            {/* Usuario */}
            <div data-tour="routes-drawer-vendedor">
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <User className="w-3.5 h-3.5 text-blue-500" />
                {t('drawer.vendor')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={usuarios.map(u => ({ value: u.id.toString(), label: u.nombre }))}
                value={watch('usuarioId') ? watch('usuarioId').toString() : ''}
                onChange={(val) => setValue('usuarioId', val ? parseInt(String(val)) : 0, { shouldDirty: true })}
                placeholder={t('drawer.selectVendor')}
              />
            </div>

            {/* Zona */}
            <div data-tour="routes-drawer-zona">
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <MapPinned className="w-3.5 h-3.5 text-violet-500" />
                {t('columns.zone')}
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t('drawer.noZone') },
                  ...zones.map(z => ({ value: z.id.toString(), label: z.name })),
                ]}
                value={watch('zonaId') ? watch('zonaId')!.toString() : ''}
                onChange={(val) => setValue('zonaId', val ? parseInt(String(val)) : null, { shouldDirty: true })}
                placeholder={t('drawer.selectZone')}
              />
            </div>
          </div>

          <hr className="border-border-subtle" />

          {/* ── Programación ── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.scheduling')}</h4>

            {/* Fecha */}
            <div data-tour="routes-drawer-fecha">
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                {t('columns.date')} <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                mode="date"
                value={watch('fecha')}
                onChange={(val) => setValue('fecha', val, { shouldValidate: true, shouldDirty: true })}
              />
              {errors.fecha && <FieldError message={errors.fecha?.message} />}
            </div>

            {/* Hora inicio / Hora fin (2 columnas) */}
            <div data-tour="routes-drawer-horario" className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  {t('drawer.startTime')}
                </label>
                <input
                  type="time"
                  {...register('horaInicioEstimada')}
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-500" />
                  {t('drawer.endTime')}
                </label>
                <input
                  type="time"
                  {...register('horaFinEstimada')}
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-border-subtle" />

          {/* ── Detalles adicionales ── */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.additionalDetails')}</h4>

            {/* Descripción */}
            <div data-tour="routes-drawer-descripcion">
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                {tc('description')}
              </label>
              <textarea
                {...register('descripcion')}
                rows={2}
                placeholder={t('drawer.descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Notas */}
            <div data-tour="routes-drawer-notas">
              <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                {tc('notes')}
              </label>
              <textarea
                {...register('notas')}
                rows={2}
                placeholder={t('drawer.notesPlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
