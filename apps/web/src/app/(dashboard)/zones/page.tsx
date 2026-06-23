'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { toast } from '@/hooks/useToast';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { useFormatters } from '@/hooks/useFormatters';
import { usePermissions } from '@/hooks/usePermissions';
import { Zone } from '@/types/zones';
import { zoneService } from '@/services/api';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { exportToCsv } from '@/services/api/importExport';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Download,
  Upload,
  Search,
  Check,
  Loader2,
  MapPin,
  Map as MapIcon,
  ChevronDown,
  Trash2,
  X,
  Users,
  Target,
  UserX,
  AlertTriangle,
  CalendarClock,
  ArrowRightLeft,
} from 'lucide-react';
import { GoogleMapWrapper, Circle } from '@/components/maps/GoogleMapWrapper';
import type { MapMarker } from '@/components/maps/GoogleMapWrapper';
import { GoogleMap, useJsApiLoader, Marker as GMarker, Circle as GCircle, Autocomplete } from '@react-google-maps/api';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';

const DEFAULT_CENTER = { lat: 20.6597, lng: -103.3496 }; // Guadalajara, México
const MAPS_LIBRARIES: ('places')[] = ['places'];
const COVERAGE_GOAL = 75;

// Audit M-8: schema externalizado a lib/validations/zone.ts
import { zoneFormSchema, type ZoneFormData } from '@/lib/validations/zone';

// Semáforo de cobertura: <60 rojo, <75 ámbar, ≥75 verde.
function coverageColorClass(pct: number): string {
  if (pct < 60) return 'text-red-600';
  if (pct < COVERAGE_GOAL) return 'text-amber-600';
  return 'text-success';
}

// Pin SVG numerado y coloreado como data-URL (icono de Marker en el mapa).
function numberedPinDataUrl(color: string, index: number): string {
  const label = String(index);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
    <path d="M17 0C7.6 0 0 7.6 0 17c0 11.9 17 29 17 29s17-17.1 17-29C34 7.6 26.4 0 17 0z" fill="${color}"/>
    <circle cx="17" cy="17" r="11" fill="#ffffff" fill-opacity="0.95"/>
    <text x="17" y="22" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${color}">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export default function ZonesPage() {
  const t = useTranslations('zones');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const { tApi } = useBackendTranslation();
  const { formatCurrency } = useFormatters();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const showApiError = useApiErrorToast();
  const drawerRef = useRef<DrawerHandle>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalZones, setTotalZones] = useState(0);
  const [showInactive, setShowInactive] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drawer states
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [savingZone, setSavingZone] = useState(false);

  // Import/Export state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Vendedores (rol VENDEDOR) para el dropdown de asignación de zona.
  const [vendedores, setVendedores] = useState<{ id: number; nombre: string }[]>([]);

  // Drawer map state
  const [drawerMapCenter, setDrawerMapCenter] = useState(DEFAULT_CENTER);
  const [drawerMapRadius, setDrawerMapRadius] = useState(5); // km
  const circleRef = useRef<google.maps.Circle | null>(null);
  const circleInitRef = useRef(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded: isMapsLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });

  // Form setup with react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useForm<ZoneFormData>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#0176D3',
      frecuenciaVisita: 0,
      isEnabled: true,
      vendedorId: null,
      centroLatitud: undefined,
      centroLongitud: undefined,
      radioKm: undefined,
    },
  });

  const watchedColor = watch('color');
  const watchedFrecuencia = watch('frecuenciaVisita');

  const frequencyOptions = [
    { value: 0, label: t('frequency.weekly') },
    { value: 1, label: t('frequency.biweekly') },
    { value: 2, label: t('frequency.monthly') },
  ];

  // Move marker + update form values
  const moveMarkerTo = useCallback((lat: number, lng: number, markDirty = true) => {
    setDrawerMapCenter({ lat, lng });
    if (markDirty) {
      setValue('centroLatitud', lat, { shouldDirty: true });
      setValue('centroLongitud', lng, { shouldDirty: true });
    } else {
      // Update values AND defaults so the form stays clean
      reset({ ...getValues(), centroLatitud: lat, centroLongitud: lng }, { keepDirtyValues: true });
    }
  }, [setValue, reset, getValues]);

  // Handle Places Autocomplete selection
  const handlePlaceSelected = useCallback(() => {
    if (!autocompleteRef.current) return;
    const place = autocompleteRef.current.getPlace();
    if (place.geometry?.location) {
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      moveMarkerTo(lat, lng);
    }
  }, [moveMarkerTo]);

  // Handle double-click on map to reposition marker
  const handleMapDblClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      moveMarkerTo(e.latLng.lat(), e.latLng.lng());
    }
  }, [moveMarkerTo]);

  const fetchZones = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // GET /zonas/stats: zonas con métricas reales (ventasMes, cobertura, color, frecuencia).
      // El layout split muestra mapa + lista completa sin paginar (zonas por tenant son pocas).
      const response = await zoneService.getZonesStats({
        search: searchTerm || undefined,
        limit: 200,
        isEnabled: showInactive ? undefined : true,
      });
      setZones(response.zones || []);
      setTotalZones(response.total || 0);
    } catch (err) {
      console.error('Error al cargar zonas:', err);
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showInactive]);

  const fetchVendedores = useCallback(async () => {
    try {
      const response = await api.get<{ items?: { id: number; nombre: string; rol?: string }[] } | { id: number; nombre: string; rol?: string }[]>('/api/usuarios?pagina=1&tamanoPagina=500');
      const data = response.data;
      const items = Array.isArray(data) ? data : data.items || [];
      setVendedores(items.filter(u => u.rol === 'VENDEDOR').map(u => ({ id: u.id, nombre: u.nombre })));
    } catch (err) {
      console.error('Error al cargar vendedores:', err);
    }
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  useEffect(() => {
    fetchVendedores();
  }, [fetchVendedores]);

  const handleCreateZone = () => {
    setEditingZone(null);
    reset({
      name: '',
      description: '',
      color: '#0176D3',
      frecuenciaVisita: 0,
      isEnabled: true,
      vendedorId: null,
      centroLatitud: undefined,
      centroLongitud: undefined,
      radioKm: 5,
    });
    // Try to get user's location for new zones
    setDrawerMapRadius(5);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => moveMarkerTo(pos.coords.latitude, pos.coords.longitude, false),
        () => moveMarkerTo(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false),
        { timeout: 5000 }
      );
    } else {
      moveMarkerTo(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, false);
    }
    setShowZoneForm(true);
  };

  const handleSaveZone = async (data: ZoneFormData) => {
    try {
      setSavingZone(true);
      if (editingZone) {
        await zoneService.updateZone({
          id: editingZone.id,
          ...data,
        });
        toast.success(t('zoneUpdated'));
      } else {
        await zoneService.createZone(data);
        toast.success(t('zoneCreated'));
      }
      await fetchZones();
      setShowZoneForm(false);
      setEditingZone(null);
      reset();
    } catch (err) {
      console.error('Error al guardar zona:', err);
      const apiErr = err as { message?: string };
      toast.error(tApi(apiErr?.message) || t('errorSaving'));
    } finally {
      setSavingZone(false);
    }
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
    const lat = zone.mapSettings?.centerLatitude;
    const lng = zone.mapSettings?.centerLongitude;
    const radius = zone.boundaries?.[0]?.radius;
    reset({
      name: zone.name,
      description: zone.description || '',
      color: zone.color || '#0176D3',
      frecuenciaVisita: zone.frecuenciaVisita ?? 0,
      isEnabled: zone.isEnabled,
      vendedorId: zone.vendedorId ?? null,
      centroLatitud: lat ?? undefined,
      centroLongitud: lng ?? undefined,
      radioKm: radius ?? undefined,
    });
    // Set drawer map to zone's position or default
    if (lat && lng) {
      setDrawerMapCenter({ lat, lng });
      setDrawerMapRadius(radius ?? 5);
    } else {
      setDrawerMapCenter(DEFAULT_CENTER);
      setDrawerMapRadius(5);
    }
    setShowZoneForm(true);
  };

  const handleCloseDrawer = () => {
    setShowZoneForm(false);
    setEditingZone(null);
    circleRef.current = null;
    reset();
  };

  const handleDelete = async (id: string) => {
    try {
      await zoneService.deleteZone(id);
      toast.success(t('zoneDeleted'));
      fetchZones();
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    }
  };

  // Paleta de colores alineada al diseño Claude (blue-forward).
  const availableColors = [
    '#0176D3', '#2563EB', '#7C3AED', '#D97706', '#DC2626', '#0891B2', '#DB2777', '#65A30D'
  ];

  const zonesWithGeo = zones.filter(z => z.mapSettings?.centerLatitude && z.mapSettings?.centerLongitude);

  // ── KPIs (sobre el conjunto cargado) ──
  const activeZonesCount = zones.filter(z => z.isEnabled).length;
  const clientsInPortfolio = zones.reduce((sum, z) => sum + (z.clientCount || 0), 0);
  const avgCoverage = zones.length > 0
    ? Math.round(zones.reduce((sum, z) => sum + (z.coberturaPct || 0), 0) / zones.length)
    : 0;
  const withoutVendorCount = zones.filter(z => !z.vendedorId).length;
  const avgCoverageColor: 'red' | 'orange' | 'green' = avgCoverage < 60 ? 'red' : avgCoverage < COVERAGE_GOAL ? 'orange' : 'green';

  // Índice 1-based por zona (espejado entre mapa y lista) según el orden actual.
  const indexById = new Map(zones.map((z, i) => [z.id, i + 1]));

  const editingCoverage = editingZone?.coberturaPct ?? 0;

  return (
    <PageHeader
      section="operacion"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: tn('sectionOperations') },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={totalZones > 0 ? t('zoneCount', { count: totalZones }) : undefined}
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative" data-tour="zones-import-export">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-[13px] font-medium text-foreground border border-border-strong bg-card rounded-full hover:bg-surface-2 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">{tc('importExport')}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            </button>
            {showDataMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-surface-2 border border-border-subtle rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => { setShowDataMenu(false); exportToCsv('zonas'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    {tc('exportCsv')}
                  </button>
                  <button
                    onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    {tc('importCsv')}
                  </button>
                </div>
              </>
            )}
          </div>
          <Button variant="wbPrimary" data-tour="zones-add-btn" onClick={handleCreateZone}>
            <Plus className="w-4 h-4 mr-2" />
            <span>{t('newZone')}</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── KPIs ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title={t('stats.activeZones')}
            value={activeZonesCount}
            icon={MapPin}
            color="blue"
            isLoading={loading}
          />
          <MetricCard
            title={t('stats.clientsInPortfolio')}
            value={clientsInPortfolio}
            icon={Users}
            color="blue"
            isLoading={loading}
          />
          <MetricCard
            title={t('stats.avgCoverage')}
            value={`${avgCoverage}%`}
            icon={Target}
            color={avgCoverageColor}
            isLoading={loading}
          />
          <MetricCard
            title={t('stats.withoutVendor')}
            value={withoutVendorCount}
            icon={UserX}
            color={withoutVendorCount > 0 ? 'orange' : 'green'}
            isLoading={loading}
          />
        </div>

        {/* Toolbar: búsqueda + inactivos */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar value={searchTerm} onChange={(v) => setSearchTerm(v)} placeholder={t('searchPlaceholder')} dataTour="zones-search" />
          <div data-tour="zones-toggle-inactive" className="ml-auto">
            <InactiveToggle value={showInactive} onChange={(v) => setShowInactive(v)} />
          </div>
        </div>

        <ErrorBanner error={error} onRetry={fetchZones} />

        {/* Split: mapa (izq) + detalle por zona (der) — espejo del mockup */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4">
          {/* Mapa de zonas */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-foreground">{t('mapCardTitle')}</h3>
            </div>
            {!isMapsLoaded ? (
              <div className="flex items-center justify-center h-[440px] text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />{t('drawer.loadingMap')}
              </div>
            ) : zonesWithGeo.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[440px] text-center px-6">
                <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4"><MapIcon className="w-8 h-8 text-muted-foreground/60" /></div>
                <p className="text-sm font-medium text-foreground/80">{t('noGeoZones')}</p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">{t('noGeoZonesHint')}</p>
              </div>
            ) : (
              <GoogleMapWrapper
                markers={zonesWithGeo.map((z): MapMarker => ({
                  id: z.id,
                  lat: z.mapSettings!.centerLatitude!,
                  lng: z.mapSettings!.centerLongitude!,
                  title: z.name,
                  label: z.name,
                  iconUrl: numberedPinDataUrl(z.color, indexById.get(z.id) ?? 1),
                }))}
                onMarkerClick={(m) => {
                  const zone = zones.find(z => z.id === m.id);
                  if (zone) handleEditZone(zone);
                }}
                height="440px"
              >
                {zonesWithGeo.map(z => {
                  const radius = z.boundaries?.[0]?.radius;
                  if (!radius) return null;
                  return (
                    <Circle
                      key={`c-${z.id}`}
                      center={{ lat: z.mapSettings!.centerLatitude!, lng: z.mapSettings!.centerLongitude! }}
                      radius={radius * 1000}
                      options={{ fillColor: z.color, fillOpacity: 0.15, strokeColor: z.color, strokeOpacity: 0.6, strokeWeight: 2 }}
                    />
                  );
                })}
              </GoogleMapWrapper>
            )}
          </div>

          {/* Detalle por zona */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col" style={{ maxHeight: 491 }}>
            <div className="px-4 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
              <h3 className="text-[15px] font-bold text-foreground">{t('detailCardTitle')}</h3>
              <span className="text-[12px] text-muted-foreground tabular-nums">{zones.length}</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin mb-2" /><span className="text-sm text-muted-foreground">{t('loadingZones')}</span></div>
              ) : zones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4"><MapPin className="w-10 h-10 text-primary/40 mb-3" /><p className="text-sm font-medium text-foreground">{t('emptyTitle')}</p><p className="text-xs text-muted-foreground">{searchTerm ? t('emptyFiltered') : t('emptyDefault')}</p></div>
              ) : (
                zones.map((zone, i) => {
                  const cobertura = zone.coberturaPct ?? 0;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => handleEditZone(zone)}
                      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surface-1 transition-colors ${i < zones.length - 1 ? 'border-b border-border' : ''} ${!zone.isEnabled ? 'opacity-60' : ''}`}
                    >
                      {/* Cuadro numerado y coloreado */}
                      <span
                        className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[12px] font-bold text-white"
                        style={{ backgroundColor: zone.color }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13.5px] font-bold text-foreground truncate">{zone.name}</div>
                        <div className="text-[11.5px] truncate">
                          {zone.vendedorName
                            ? <span className="text-muted-foreground">{zone.vendedorName}</span>
                            : <span className="text-amber-600 font-medium">{t('noVendor')}</span>
                          }
                          <span className="text-muted-foreground"> · {zone.clientCount || 0} {t('columns.clients').toLowerCase()}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                        <span className="text-[12.5px] font-bold text-foreground/90 whitespace-nowrap font-mono tabular-nums">{formatCurrency(zone.ventasMes || 0)}</span>
                        <span className={`text-[11px] font-medium whitespace-nowrap ${coverageColorClass(cobertura)}`}>{t('coverageLabel', { pct: cobertura })}</span>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {deleteConfirmId === zone.id ? (
                          <>
                            <button onClick={() => { handleDelete(zone.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <button onClick={() => setDeleteConfirmId(zone.id)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Zone Form Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={showZoneForm}
          onClose={handleCloseDrawer}
          title={editingZone ? t('drawer.editTitle') : t('drawer.createTitle')}
          icon={<MapPin className="w-5 h-5" />}
          width="xl"
          isDirty={isDirty}
          onSave={handleSubmit(handleSaveZone)}
          footer={
            <div data-tour="zones-drawer-actions" className="flex items-center justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={savingZone}>
                {tc('cancel')}
              </Button>
              <Button type="button" variant="success" onClick={handleSubmit(handleSaveZone)} disabled={savingZone} className="flex items-center gap-2">
                {savingZone && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingZone ? t('drawer.saveChanges') : t('drawer.createZone')}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSubmit(handleSaveZone)} className="p-6 space-y-5">
            {/* ── KPIs (solo al editar) ── */}
            {editingZone && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.kpisTitle')}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">{t('drawer.kpiClients')}</div>
                    <div className="text-base font-bold text-foreground tabular-nums">{editingZone.clientCount || 0}</div>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">{t('drawer.kpiSales')}</div>
                    <div className="text-base font-bold text-foreground tabular-nums font-mono">{formatCurrency(editingZone.ventasMes || 0)}</div>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">{t('drawer.kpiTicket')}</div>
                    <div className="text-base font-bold text-foreground tabular-nums font-mono">{formatCurrency(editingZone.ticketPromedio || 0)}</div>
                  </div>
                  <div className="rounded-lg border border-border-subtle bg-surface-1 px-3 py-2.5">
                    <div className="text-[11px] text-muted-foreground">{t('drawer.kpiCoverage')}</div>
                    <div className={`text-base font-bold tabular-nums ${coverageColorClass(editingCoverage)}`}>{editingCoverage}%</div>
                  </div>
                </div>
                {editingCoverage < COVERAGE_GOAL && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{t('drawer.coverageBelowGoal')}</p>
                  </div>
                )}
                {hasPermission('manage_roles') && (
                  <button
                    type="button"
                    onClick={() => router.push('/clients/transferir-cartera')}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-primary border border-border-default rounded-lg hover:bg-surface-1 transition-colors"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    {t('drawer.reassignPortfolio')}
                  </button>
                )}
                <hr className="border-border-subtle" />
              </div>
            )}

            {/* ── Información general ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.generalInfo')}</h4>

              {/* Name + Color on same row */}
              <div className="flex gap-4 items-start" data-tour="zones-drawer-name">
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                    <MapIcon className="w-3.5 h-3.5 text-primary" />
                    {tc('name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('drawer.namePlaceholder')}
                  />
                  {errors.name && (
                    <FieldError message={errors.name?.message} />
                  )}
                </div>

                <div data-tour="zones-drawer-color">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-border-subtle"
                      style={{ backgroundColor: watchedColor || '#0176D3' }}
                    />
                    {t('drawer.color')}
                  </label>
                  <div className="flex gap-1.5 flex-wrap max-w-[180px]">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setValue('color', color, { shouldDirty: true })}
                        className={`w-7 h-7 rounded-full border-2 transition-all relative flex items-center justify-center ${
                          watchedColor === color
                            ? 'border-gray-800 ring-2 ring-offset-1 ring-gray-300'
                            : 'border-transparent hover:border-border-default'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {watchedColor === color && (
                          <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/80 mb-1.5">
                  {tc('description')}
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('drawer.descriptionPlaceholder')}
                  rows={2}
                />
                {errors.description && (
                  <FieldError message={errors.description?.message} />
                )}
              </div>

              {/* Vendedor + Frecuencia */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div data-tour="zones-drawer-vendor">
                  <label className="block text-xs font-medium text-foreground/80 mb-1.5">{t('drawer.vendor')}</label>
                  <SearchableSelect
                    options={vendedores.map(v => ({ value: v.id, label: v.nombre }))}
                    value={watch('vendedorId') ?? null}
                    onChange={(val) => setValue('vendedorId', val ? Number(val) : null, { shouldDirty: true })}
                    placeholder={t('drawer.vendorPlaceholder')}
                    searchPlaceholder={t('drawer.searchVendor')}
                  />
                </div>
                <div data-tour="zones-drawer-frequency">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-primary" />
                    {t('drawer.frequency')}
                  </label>
                  <div className="flex gap-1.5">
                    {frequencyOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValue('frecuenciaVisita', opt.value, { shouldDirty: true })}
                        className={`flex-1 px-2 py-2 text-[12.5px] font-medium rounded-lg border transition-colors ${
                          watchedFrecuencia === opt.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border-default text-foreground/70 hover:bg-surface-1'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-border-subtle" />

            {/* ── Ubicación ── */}
            <div data-tour="zones-drawer-map" className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.location')}</h4>
              {isMapsLoaded ? (
                <div className="space-y-4">
                  {/* Place search */}
                  <Autocomplete
                    onLoad={(ac) => { autocompleteRef.current = ac; }}
                    onPlaceChanged={handlePlaceSelected}
                    restrictions={{ country: 'mx' }}
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      <input
                        type="text"
                        placeholder={t('drawer.searchPlaceholder')}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </Autocomplete>

                  {/* Map with hint overlay */}
                  <div className="relative rounded-md overflow-hidden border border-border-subtle shadow-sm" style={{ height: 380 }}>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={drawerMapCenter}
                      zoom={12}
                      onDblClick={handleMapDblClick}
                      options={{
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: false,
                        disableDoubleClickZoom: true,
                      }}
                    >
                      <GMarker
                        position={drawerMapCenter}
                        draggable
                        onDragEnd={(e) => {
                          if (e.latLng) {
                            moveMarkerTo(e.latLng.lat(), e.latLng.lng());
                          }
                        }}
                      />
                      <GCircle
                        center={drawerMapCenter}
                        radius={drawerMapRadius * 1000}
                        options={{
                          fillColor: watchedColor || '#0176D3',
                          fillOpacity: 0.15,
                          strokeColor: watchedColor || '#0176D3',
                          strokeOpacity: 0.6,
                          strokeWeight: 2,
                          editable: true,
                          draggable: false,
                        }}
                        onLoad={(circle) => {
                          circleRef.current = circle;
                          // Skip the initial onRadiusChanged that fires right after mount
                          circleInitRef.current = true;
                          requestAnimationFrame(() => { circleInitRef.current = false; });
                        }}
                        onRadiusChanged={() => {
                          if (circleRef.current && !circleInitRef.current) {
                            const newRadius = circleRef.current.getRadius() / 1000;
                            const clamped = Math.max(0.1, Math.round(newRadius * 10) / 10);
                            setDrawerMapRadius(clamped);
                            setValue('radioKm', clamped, { shouldDirty: true });
                          }
                        }}
                        onCenterChanged={() => {
                          if (circleRef.current) {
                            const cc = circleRef.current.getCenter();
                            if (cc && (cc.lat() !== drawerMapCenter.lat || cc.lng() !== drawerMapCenter.lng)) {
                              circleRef.current.setCenter(drawerMapCenter);
                            }
                          }
                        }}
                      />
                    </GoogleMap>
                    {/* Hint overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-2 pointer-events-none">
                      <p className="text-[11px] text-white/90 text-center">
                        {t('drawer.mapHint')}
                      </p>
                    </div>
                  </div>

                  {/* Radius + Coordinates */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-foreground/80 mb-1.5">{t('drawer.radiusKm')}</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={drawerMapRadius}
                        onChange={(e) => {
                          const val = Math.max(0.1, Math.round(parseFloat(e.target.value || '0.1') * 10) / 10);
                          setDrawerMapRadius(val);
                          setValue('radioKm', val, { shouldDirty: true });
                        }}
                        className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('drawer.latitude')}</label>
                      <div className="px-3 py-2 text-sm text-foreground/70 bg-surface-1 border border-border-subtle rounded-lg tabular-nums">
                        {drawerMapCenter.lat.toFixed(6)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{t('drawer.longitude')}</label>
                      <div className="px-3 py-2 text-sm text-foreground/70 bg-surface-1 border border-border-subtle rounded-lg tabular-nums">
                        {drawerMapCenter.lng.toFixed(6)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-48 bg-surface-1 rounded-lg border border-border-subtle">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('drawer.loadingMap')}
                  </div>
                </div>
              )}
            </div>

            <hr className="border-border-subtle" />

            {/* ── Estado ── */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.status')}</h4>
              <label htmlFor="isEnabled" className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  id="isEnabled"
                  {...register('isEnabled')}
                  className="mt-0.5 w-4 h-4 text-primary border-border-default rounded focus:ring-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                    {t('drawer.activeZone')}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('drawer.activeZoneHint')}
                  </p>
                </div>
              </label>
            </div>
          </form>
        </Drawer>

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="zonas"
          entityLabel={t('title').toLowerCase()}
          onSuccess={fetchZones}
        />
      </div>
    </PageHeader>
  );
}
