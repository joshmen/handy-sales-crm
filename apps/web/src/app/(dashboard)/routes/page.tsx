'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { routeService, RouteCreateRequest, RouteDetail, RouteStop, RouteListItem } from '@/services/api/routes';
import { zoneService } from '@/services/api/zones';
import { vehiclesService, type Vehiculo } from '@/services/api/vehicles';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { TabBar } from '@/components/ui/TabBar';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SearchBar } from '@/components/common/SearchBar';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { StatCard, type StatTone } from '@/components/dashboard/StatCard';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import {
  Download,
  Map,
  Loader2,
  Calendar,
  Clock,
  User,
  MapPinned,
  Route as RouteIcon,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Check,
  Navigation,
  Truck,
  Info,
} from 'lucide-react';
import { exportToCsv } from '@/services/api/importExport';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SoftBadge, type SoftBadgeTone } from '@/components/ui/SoftBadge';
import { useFormatters } from '@/hooks/useFormatters';
import { usePermissions } from '@/hooks/usePermissions';
import { dateOnlyToUTC } from '@/lib/formatters';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';

interface ZoneOption {
  id: number;
  name: string;
}

// Estado activo de hoy: una ruta va "atrasada" si está en progreso, le quedan paradas
// y ya pasó su hora estimada de fin. Heurística client-side (espejo del badge del mockup).
function isRutaAtrasada(r: RouteDetail): boolean {
  if (r.estado === 2 || r.estado === 6) return false; // Completada / Cerrada
  if (r.totalParadas > 0 && r.paradasCompletadas >= r.totalParadas) return false;
  if (!r.horaFinEstimada) return false;
  const parts = r.horaFinEstimada.split(':');
  const finMin = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes() > finMin;
}

/** "HH:MM:SS" (TimeSpan) → "HH:MM"; vacío → "—". */
const fmtEta = (t?: string | null) => (t ? t.slice(0, 5) : '—');

// Vista decorada de una ruta para el tablero (avance, atrasada, siguiente parada).
interface RutaDecorada {
  r: RouteDetail;
  done: number;
  total: number;
  pct: number;
  atrasada: boolean;
  next: RouteStop | null;
}

function decorate(r: RouteDetail): RutaDecorada {
  const done = r.paradasCompletadas;
  const total = r.totalParadas;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const ordered = [...r.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);
  const next = ordered.find((s) => s.estado === 0 || s.estado === 1) ?? null;
  return { r, done, total, pct, atrasada: isRutaAtrasada(r), next };
}

// Tono del badge de estado de cada parada (EstadoParada: 0 pend / 1 en camino / 2 visitado / 3 omitido).
const STOP_TONE: Record<number, SoftBadgeTone> = { 0: 'default', 1: 'info', 2: 'success', 3: 'warning' };

interface UsuarioOption {
  id: number;
  nombre: string;
}

const routeSchema = z.object({
  nombre: z.string().min(1, 'nameRequired').max(100),
  usuarioId: z.number(),
  zonaId: z.number().nullable(),
  vehiculoId: z.number().nullable(),
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
  const tn = useTranslations('nav');
  const router = useRouter();
  const { tenantToday, formatDateOnly } = useFormatters();
  const { data: session } = useSession();
  const { hasPermission } = usePermissions();
  const isVendedor = session?.user?.role === 'VENDEDOR';
  const canViewTeam = hasPermission('view_team');

  // Rutas activas de hoy para el tablero de control de la jornada.
  const [activeRoutes, setActiveRoutes] = useState<RouteDetail[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zones, setZones] = useState<ZoneOption[]>([]);

  // Filtros del tablero
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'onTrack' | 'behind'>('all');

  // Vista de la página: "jornada" (default, solo rutas activas de hoy) o "todas"
  // (lista completa: canceladas, completadas, de cualquier día).
  const [viewMode, setViewMode] = useState<'jornada' | 'todas'>('jornada');

  // ── Estado de la vista "Todas las rutas" (lista completa paginada) ──
  const [allRoutes, setAllRoutes] = useState<RouteListItem[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [allSearch, setAllSearch] = useState('');
  const [allEstado, setAllEstado] = useState<string>('all');
  const [allUsuario, setAllUsuario] = useState<string>('all');
  const [allFechaDesde, setAllFechaDesde] = useState('');
  const [allFechaHasta, setAllFechaHasta] = useState('');
  const [allPage, setAllPage] = useState(1);
  const [allTotalItems, setAllTotalItems] = useState(0);
  const [allTotalPages, setAllTotalPages] = useState(1);
  const allPageSize = 20;

  // Drawer de detalle de ruta
  const [detailRoute, setDetailRoute] = useState<RouteDetail | null>(null);

  // Create modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  const drawerRef = useRef<DrawerHandle>(null);

  // React Hook Form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<RouteFormData>({
    resolver: zodResolver(routeSchema),
    defaultValues: {
      nombre: '',
      usuarioId: 0,
      zonaId: null,
      vehiculoId: null,
      fecha: '',
      horaInicioEstimada: '',
      horaFinEstimada: '',
      descripcion: '',
      notas: '',
    },
  });

  const fetchActiveRoutes = useCallback(async () => {
    try {
      setActiveLoading(true);
      setError(null);
      const data = await routeService.getActiveRoutesMap();
      setActiveRoutes(data);
    } catch {
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setActiveLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    fetchActiveRoutes();
  }, [fetchActiveRoutes]);

  // ── Vista "Todas las rutas": lista completa paginada ──
  const fetchAllRoutes = useCallback(async () => {
    try {
      setAllLoading(true);
      setAllError(null);
      const response = await routeService.getRutas({
        page: allPage,
        limit: allPageSize,
        search: allSearch || undefined,
        estado: allEstado !== 'all' ? parseInt(allEstado) : undefined,
        usuarioId: allUsuario !== 'all' ? parseInt(allUsuario) : undefined,
        fechaDesde: allFechaDesde || undefined,
        fechaHasta: allFechaHasta || undefined,
        mostrarInactivos: true,
      });
      setAllRoutes(response.items);
      setAllTotalItems(response.total);
      setAllTotalPages(Math.ceil(response.total / allPageSize) || 1);
    } catch {
      setAllError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setAllLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPage, allSearch, allEstado, allUsuario, allFechaDesde, allFechaHasta]);

  useEffect(() => {
    if (viewMode === 'todas') fetchAllRoutes();
  }, [viewMode, fetchAllRoutes]);

  const fetchVehiculos = async () => {
    try {
      const list = await vehiclesService.getVehiculos();
      // Solo asignables: activos y no dados de baja (estado 3).
      setVehiculos(list.filter((v) => v.activo && v.estado !== 3));
    } catch (err) {
      console.error('Error al cargar vehículos:', err);
    }
  };

  useEffect(() => {
    fetchZones();
    fetchUsuarios();
    fetchVehiculos();
  }, []);

  // ── Datos derivados del tablero ──
  const decorated = useMemo(() => activeRoutes.map(decorate), [activeRoutes]);

  const filtered = useMemo(() => {
    let list = decorated;
    if (filterTab === 'onTrack') list = list.filter(d => !d.atrasada);
    else if (filterTab === 'behind') list = list.filter(d => d.atrasada);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(d =>
        (d.r.zonaNombre || d.r.nombre || '').toLowerCase().includes(q) ||
        (d.r.usuarioNombre || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [decorated, filterTab, searchTerm]);

  // KPIs
  const sumDone = decorated.reduce((s, d) => s + d.done, 0);
  const sumTotal = decorated.reduce((s, d) => s + d.total, 0);
  const overallPct = sumTotal > 0 ? Math.round((sumDone / sumTotal) * 100) : 0;
  const atrasadas = decorated.filter(d => d.atrasada);
  const worstZona = atrasadas.slice().sort((a, b) => a.pct - b.pct)[0]?.r;
  const estClose = decorated
    .map(d => d.r.horaFinEstimada)
    .filter((h): h is string => !!h)
    .sort()
    .slice(-1)[0];

  const kpiCards: Array<{ title: string; value: string; hint?: string; icon: React.ComponentType<{ size?: number; className?: string }>; tone: StatTone }> = [
    { title: t('dashboard.kpiActiveRoutes'), value: String(decorated.length), icon: RouteIcon, tone: 'primary' },
    { title: t('dashboard.kpiStopsDone'), value: `${sumDone} / ${sumTotal}`, hint: `${overallPct}%`, icon: CheckCircle2, tone: 'default' },
    { title: t('dashboard.kpiDelayed'), value: String(atrasadas.length), hint: worstZona ? (worstZona.zonaNombre || worstZona.nombre) : undefined, icon: AlertTriangle, tone: atrasadas.length > 0 ? 'danger' : 'default' },
    { title: t('dashboard.kpiEstClose'), value: fmtEta(estClose), icon: Clock, tone: 'default' },
  ];

  // ── Columnas del tablero ──
  const columns: DataGridColumn<RutaDecorada>[] = [
    {
      key: 'zona', label: t('columns.zone'), width: 'flex', cellRenderer: (d) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: d.atrasada ? 'rgba(220,38,38,0.10)' : 'rgba(1,118,211,0.10)', color: d.atrasada ? '#DC2626' : '#0176D3' }}>
            <RouteIcon className="w-[18px] h-[18px]" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground truncate">{d.r.zonaNombre || d.r.nombre}</p>
            <p className="text-xs text-muted-foreground truncate">{d.r.usuarioNombre}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'pct', label: t('dashboard.colProgress'), width: 200, cellRenderer: (d) => {
        const barColor = d.atrasada ? '#DC2626' : d.pct < 60 ? '#D97706' : '#16A34A';
        return (
          <div className="flex items-center gap-2.5 min-w-[150px]">
            <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-surface-3 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, d.pct)}%`, background: barColor }} /></div>
            <span className="text-[12px] font-bold text-foreground tabular-nums w-12 text-right">{d.done}/{d.total}</span>
          </div>
        );
      },
    },
    { key: 'next', label: t('dashboard.colNextStop'), width: 'flex', hiddenOnMobile: true, cellRenderer: (d) => <span className="text-[13px] text-foreground/70 truncate">{d.next ? d.next.clienteNombre : t('dashboard.allCompleted')}</span> },
    { key: 'eta', label: t('dashboard.colEstClose'), width: 110, align: 'center', cellRenderer: (d) => <span className="text-[13px] text-foreground tabular-nums">{fmtEta(d.r.horaFinEstimada)}</span> },
    { key: 'estado', label: t('columns.status'), width: 120, align: 'center', cellRenderer: (d) => <SoftBadge tone={d.atrasada ? 'danger' : 'success'}>{d.atrasada ? t('delayed') : t('dashboard.statusOnTime')}</SoftBadge> },
    { key: 'chev', label: '', width: 44, align: 'center', cellRenderer: () => <ChevronRight className="w-4 h-4 text-muted-foreground/50" /> },
  ];

  // ── Vista "Todas las rutas": estado (badge SLDS), opciones de filtro y columnas ──
  // EstadoRuta: 0 Planificada · 1 EnProgreso · 2 Completada · 3 Cancelada ·
  //             4 PendienteAceptar · 5 CargaAceptada · 6 Cerrada.
  const getEstadoBadge = (estado: number): { tone: SoftBadgeTone; label: string } => {
    switch (estado) {
      case 0: return { tone: 'default', label: t('status.planned') };
      case 1: return { tone: 'info', label: t('status.inProgress') };
      case 2: return { tone: 'success', label: t('status.completed') };
      case 3: return { tone: 'danger', label: t('status.cancelled') };
      case 4: return { tone: 'warning', label: t('status.pendingAccept') };
      case 5: return { tone: 'primary', label: t('status.loadAccepted') };
      case 6: return { tone: 'success', label: t('status.closed') };
      default: return { tone: 'default', label: t('status.unknown') };
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

  const allColumns: DataGridColumn<RouteListItem>[] = [
    {
      key: 'codigo', label: t('allRoutes.colCode'), width: 150,
      cellRenderer: (r) => <span className="text-[12px] font-mono text-muted-foreground truncate block">{r.codigo || '-'}</span>,
    },
    {
      key: 'nombre', label: t('columns.name'), width: 'flex',
      cellRenderer: (r) => <span className="text-[13px] font-medium text-foreground truncate block">{r.nombre}</span>,
    },
    {
      key: 'zonaNombre', label: t('columns.zone'), width: 120,
      cellRenderer: (r) => <span className="text-[13px] text-muted-foreground truncate block">{r.zonaNombre || '-'}</span>,
    },
    {
      key: 'usuarioNombre', label: t('columns.user'), width: 150,
      cellRenderer: (r) => <span className="text-[13px] text-foreground/80 truncate block">{r.usuarioNombre}</span>,
    },
    {
      key: 'fecha', label: t('columns.date'), width: 110,
      cellRenderer: (r) => <span className="text-[13px] text-foreground tabular-nums">{formatDateOnly(r.fecha)}</span>,
    },
    {
      key: 'estado', label: t('columns.status'), width: 130, align: 'center',
      cellRenderer: (r) => { const b = getEstadoBadge(r.estado); return <SoftBadge tone={b.tone}>{b.label}</SoftBadge>; },
    },
    {
      key: 'paradas', label: t('columns.stops'), width: 90, align: 'center',
      cellRenderer: (r) => (
        <span className="text-[13px] text-foreground/80 tabular-nums">
          <span className={r.paradasCompletadas === r.totalParadas && r.totalParadas > 0 ? 'text-green-600 font-semibold' : ''}>{r.paradasCompletadas}</span>/{r.totalParadas}
        </span>
      ),
    },
  ];

  // Create handlers
  const handleOpenCreate = () => {
    // Default `fecha` al día calendario tenant (no UTC del browser).
    const todayString = tenantToday();
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
      const fmtTime = (tt?: string | null) => tt ? (tt.length === 5 ? `${tt}:00` : tt) : null;
      const createData: RouteCreateRequest = {
        nombre: data.nombre,
        usuarioId: data.usuarioId,
        zonaId: data.zonaId,
        vehiculoId: data.vehiculoId,
        fecha: dateOnlyToUTC(data.fecha),
        horaInicioEstimada: fmtTime(data.horaInicioEstimada),
        horaFinEstimada: fmtTime(data.horaFinEstimada),
        descripcion: data.descripcion || undefined,
        notas: data.notas || undefined,
      };
      await routeService.createRuta(createData);
      toast.success(t('routeCreated'));
      setIsModalOpen(false);
      fetchActiveRoutes();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || t('errorSaving');
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const detailStops = detailRoute ? [...detailRoute.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita) : [];

  return (
    <PageHeader
      section="operacion"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: tn('sectionOperations') },
        { label: t('title') },
      ]}
      title={isVendedor ? t('myRoute') : t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {canViewTeam && (
            <Button variant="wbOutline" onClick={() => router.push('/team/gps')}>
              <Navigation className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <span className="hidden sm:inline">{t('dashboard.viewGps')}</span>
            </Button>
          )}
          <button
            data-tour="routes-export-btn"
            onClick={async () => { try { await exportToCsv('rutas'); toast.success(t('csvDownloaded')); } catch { toast.error(t('exportError')); } }}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[13px] font-medium text-foreground border border-border-strong bg-card rounded-full hover:bg-surface-2 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">{tc('export')}</span>
          </button>
          <Button variant="wbPrimary" data-tour="routes-new-btn" onClick={handleOpenCreate}>
            <MapPinned className="w-4 h-4 mr-2" />
            <span>{t('planRoutes')}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Tabs de nivel superior: jornada de hoy vs lista completa de rutas */}
        <TabBar
          items={[
            { id: 'jornada', label: t('viewTabs.today') },
            { id: 'todas', label: t('viewTabs.all') },
          ]}
          value={viewMode}
          onChange={(id) => setViewMode(id as typeof viewMode)}
        />

        {viewMode === 'jornada' && (
        <>
        <ErrorBanner error={error} onRetry={fetchActiveRoutes} />

        {/* KPI Row — espejo del mockup RoutesPage */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <StatCard
              key={card.title}
              label={card.title}
              value={card.value}
              icon={card.icon}
              tone={card.tone}
              sub={card.hint}
              loading={activeLoading}
            />
          ))}
        </div>

        {/* Tabs (segmentado) + búsqueda */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 lg:flex-1">
            <TabBar
              items={[
                { id: 'all', label: t('dashboard.tabs.all') },
                { id: 'onTrack', label: t('dashboard.tabs.onTrack') },
                { id: 'behind', label: t('dashboard.tabs.behind') },
              ]}
              value={filterTab}
              onChange={(id) => setFilterTab(id as typeof filterTab)}
            />
          </div>
          <div className="w-full sm:w-72 lg:w-80">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t('dashboard.searchPlaceholder')} className="w-full" />
          </div>
        </div>

        {/* Tabla por zona/vendedor */}
        <DataGrid<RutaDecorada>
          columns={columns}
          data={filtered}
          keyExtractor={(d) => d.r.id}
          onRowClick={(d) => setDetailRoute(d.r)}
          loading={activeLoading}
          loadingMessage={t('loadingMessage')}
          emptyIcon={<RouteIcon className="w-8 h-8 text-muted-foreground/60" />}
          emptyTitle={t('dashboard.emptyTitle')}
          emptyMessage={t('dashboard.emptyHint')}
          mobileCardRenderer={(d) => {
            const barColor = d.atrasada ? '#DC2626' : d.pct < 60 ? '#D97706' : '#16A34A';
            return (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0" style={{ background: d.atrasada ? 'rgba(220,38,38,0.10)' : 'rgba(1,118,211,0.10)', color: d.atrasada ? '#DC2626' : '#0176D3' }}>
                      <RouteIcon className="w-[18px] h-[18px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{d.r.zonaNombre || d.r.nombre}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.r.usuarioNombre}</p>
                    </div>
                  </div>
                  <SoftBadge tone={d.atrasada ? 'danger' : 'success'}>{d.atrasada ? t('delayed') : t('dashboard.statusOnTime')}</SoftBadge>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(100, d.pct)}%`, background: barColor }} /></div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{d.next ? d.next.clienteNombre : t('dashboard.allCompleted')}</span>
                  <span className="tabular-nums">{d.done}/{d.total} · {fmtEta(d.r.horaFinEstimada)}</span>
                </div>
              </div>
            );
          }}
        />
        </>
        )}

        {viewMode === 'todas' && (
        <>
        <ErrorBanner error={allError} onRetry={fetchAllRoutes} />

        {/* Barra de filtros de la lista completa */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-72">
            <SearchBar
              value={allSearch}
              onChange={(v) => { setAllSearch(v); setAllPage(1); }}
              placeholder={t('allRoutes.searchPlaceholder')}
              className="w-full"
            />
          </div>

          <div className="min-w-[160px]">
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">{t('columns.status')}</label>
            <SearchableSelect
              options={estadoOptions}
              value={allEstado}
              onChange={(val) => { setAllEstado(val ? String(val) : 'all'); setAllPage(1); }}
              placeholder={t('filters.allStatuses')}
            />
          </div>

          {!isVendedor && (
          <div className="min-w-[160px]">
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">{t('drawer.vendor')}</label>
            <SearchableSelect
              options={[
                { value: 'all', label: t('filters.allVendors') },
                ...usuarios.map((u) => ({ value: u.id.toString(), label: u.nombre })),
              ]}
              value={allUsuario}
              onChange={(val) => { setAllUsuario(val ? String(val) : 'all'); setAllPage(1); }}
              placeholder={t('filters.allVendors')}
            />
          </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">{tc('from')}</label>
            <input
              type="date"
              value={allFechaDesde}
              onChange={(e) => { setAllFechaDesde(e.target.value); setAllPage(1); }}
              className="px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1">{tc('to')}</label>
            <input
              type="date"
              value={allFechaHasta}
              onChange={(e) => { setAllFechaHasta(e.target.value); setAllPage(1); }}
              className="px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista completa de rutas (cualquier estado / cualquier día) */}
        <DataGrid<RouteListItem>
          columns={allColumns}
          data={allRoutes}
          keyExtractor={(r) => r.id}
          onRowClick={(r) => router.push(`/routes/${r.id}`)}
          loading={allLoading}
          loadingMessage={t('loadingMessage')}
          emptyIcon={<RouteIcon className="w-8 h-8 text-muted-foreground/60" />}
          emptyTitle={t('emptyTitle')}
          emptyMessage={allSearch || allEstado !== 'all' || allUsuario !== 'all' || allFechaDesde || allFechaHasta ? t('emptyFiltered') : t('emptyDefault')}
          pagination={{
            currentPage: allPage,
            totalPages: allTotalPages,
            totalItems: allTotalItems,
            pageSize: allPageSize,
            onPageChange: setAllPage,
          }}
          mobileCardRenderer={(r) => {
            const b = getEstadoBadge(r.estado);
            return (
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.nombre}</p>
                    {r.codigo && <p className="text-[11px] font-mono text-muted-foreground truncate">{r.codigo}</p>}
                    <p className="text-xs text-muted-foreground truncate">{r.zonaNombre || t('noZone')}</p>
                  </div>
                  <SoftBadge tone={b.tone}>{b.label}</SoftBadge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{r.usuarioNombre}</span>
                  <span className="tabular-nums">{formatDateOnly(r.fecha)} · {r.paradasCompletadas}/{r.totalParadas}</span>
                </div>
              </div>
            );
          }}
        />
        </>
        )}
      </div>

      {/* Drawer de detalle de ruta (paradas visitadas/pendientes) */}
      <Drawer
        isOpen={!!detailRoute}
        onClose={() => setDetailRoute(null)}
        title={detailRoute ? (detailRoute.zonaNombre || detailRoute.nombre) : ''}
        icon={<RouteIcon className="w-5 h-5 text-primary" />}
        width="md"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            {canViewTeam && detailRoute && (
              <button
                onClick={() => router.push(`/team/gps?v=${detailRoute.usuarioId}`)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                {t('dashboard.viewGps')}
              </button>
            )}
            <button
              onClick={() => detailRoute && router.push(`/routes/${detailRoute.id}`)}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
            >
              {t('dashboard.viewFullRoute')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        }
      >
        {detailRoute && (
          <div className="p-6 space-y-4">
            <div className="text-sm text-muted-foreground">
              {detailRoute.usuarioNombre} · {detailRoute.paradasCompletadas}/{detailRoute.totalParadas} {t('columns.stops').toLowerCase()}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground mb-1">{t('dashboard.drawerStops')}</h4>
              {detailStops.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('detail.noStops')}</p>
              ) : (
                <div>
                  {detailStops.map((s, i) => {
                    const visited = s.estado === 2;
                    const label = s.estado === 2 ? t('detail.stopVisited') : s.estado === 1 ? t('detail.stopEnRoute') : s.estado === 3 ? t('detail.stopSkipped') : t('detail.stopPending');
                    return (
                      <div key={s.id} className={`flex items-center gap-3 py-3 ${i < detailStops.length - 1 ? 'border-b border-border-subtle' : ''}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${visited ? 'bg-green-100 text-green-600' : 'bg-surface-3 text-muted-foreground'}`}>
                          {visited ? <Check className="w-3.5 h-3.5" /> : <span className="text-[11px] font-semibold">{s.ordenVisita}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground truncate">{s.clienteNombre}</p>
                          <p className="text-[11px] text-muted-foreground">{fmtEta(s.horaEstimadaLlegada)}</p>
                        </div>
                        <SoftBadge tone={STOP_TONE[s.estado] ?? 'default'}>{label}</SoftBadge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Create Route Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => !actionLoading && setIsModalOpen(false)}
        title={t('drawer.createTitle')}
        icon={<Map className="w-5 h-5 text-primary" />}
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
              className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
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
                <Map className="w-3.5 h-3.5 text-primary" />
                {t('columns.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('nombre')}
                maxLength={100}
                placeholder={t('drawer.namePlaceholder')}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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

            {/* Vehículo (flotilla) — opcional; su capacidad alimenta el armado de carga. */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                <Truck className="w-3.5 h-3.5 text-muted-foreground" />
                {t('drawer.vehicle')}
              </label>
              <SearchableSelect
                options={[
                  { value: '', label: t('drawer.noVehicle') },
                  ...vehiculos.map((v) => ({
                    value: v.id.toString(),
                    label: `${v.placa} · ${v.capacidadUnidades} u${v.vendedorNombre ? ' · ' + v.vendedorNombre : ''}`,
                  })),
                ]}
                value={watch('vehiculoId') ? watch('vehiculoId')!.toString() : ''}
                onChange={(val) => setValue('vehiculoId', val ? parseInt(String(val)) : null, { shouldDirty: true })}
                placeholder={t('drawer.selectVehicle')}
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
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                  className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
            <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="w-3 h-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
              {t('drawer.scheduleHint')}
            </p>
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
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
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
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
