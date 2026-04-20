'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { toast } from '@/hooks/useToast';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { Zone } from '@/types/zones';
import { zoneService } from '@/services/api';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { exportToCsv } from '@/services/api/importExport';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Download,
  Upload,
  Search,
  Check,
  Minus,
  Pencil,
  Loader2,
  MapPin,
  Map,
  RefreshCw,
  ChevronDown,
  Trash2,
  X,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { MapPin as MapPinIcon, CaretRight } from '@phosphor-icons/react';
import { GoogleMapWrapper, Circle } from '@/components/maps/GoogleMapWrapper';
import type { MapMarker } from '@/components/maps/GoogleMapWrapper';
import { GoogleMap, useJsApiLoader, Marker as GMarker, Circle as GCircle, Autocomplete } from '@react-google-maps/api';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';

const DEFAULT_CENTER = { lat: 20.6597, lng: -103.3496 }; // Guadalajara, México
const MAPS_LIBRARIES: ('places')[] = ['places'];

// Zod schema for zone form validation
const zoneFormSchema = z.object({
  name: z.string().min(1, 'nameRequired'),
  description: z.string().optional(),
  color: z.string().min(1, 'colorRequired'),
  isEnabled: z.boolean(),
  centroLatitud: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
  centroLongitud: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
  radioKm: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
}).refine(
  (data) => {
    const hasLat = data.centroLatitud !== undefined;
    const hasLng = data.centroLongitud !== undefined;
    return hasLat === hasLng;
  },
  { message: 'coordinatesBothRequired', path: ['centroLongitud'] }
);

type ZoneFormData = z.infer<typeof zoneFormSchema>;

export default function ZonesPage() {
  const t = useTranslations('zones');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();
  const showApiError = useApiErrorToast();
  const drawerRef = useRef<DrawerHandle>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalZones, setTotalZones] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const [showInactive, setShowInactive] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Drawer states
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [savingZone, setSavingZone] = useState(false);

  // Import/Export state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Map modal state
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [allZonesForMap, setAllZonesForMap] = useState<Zone[]>([]);

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
      color: '#EC4899',
      isEnabled: true,
      centroLatitud: undefined,
      centroLongitud: undefined,
      radioKm: undefined,
    },
  });

  const watchedColor = watch('color');

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
      const response = await zoneService.getZones({
        search: searchTerm || undefined,
        page: currentPage,
        limit: pageSize,
        isEnabled: showInactive ? undefined : true,
      });
      setZones(response.zones || []);
      setTotalZones(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      console.error('Error al cargar zonas:', err);
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, showInactive]);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  const handleCreateZone = () => {
    setEditingZone(null);
    reset({
      name: '',
      description: '',
      color: '#EC4899',
      isEnabled: true,
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
      color: zone.color || '#EC4899',
      isEnabled: zone.isEnabled,
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

  const handleViewMap = async () => {
    try {
      // Load all zones (no pagination) for map display
      const response = await zoneService.getZones({ limit: 200 });
      setAllZonesForMap(response.zones);
      setIsMapOpen(true);
    } catch {
      toast.error(t('errorLoadingMap'));
    }
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (zone: Zone) => {
    try {
      setTogglingId(zone.id);
      const newActive = !zone.isEnabled;
      await api.patch(`/zonas/${zone.id}/activo`, { activo: newActive });
      toast.success(newActive ? t('zoneActivated') : t('zoneDeactivated'));
      if (!showInactive && !newActive) {
        setZones(prev => prev.filter(z => z.id !== zone.id));
      } else {
        setZones(prev => prev.map(z =>
          z.id === zone.id ? { ...z, isEnabled: newActive } : z
        ));
      }
    } catch (err: unknown) {
      console.error('Error al cambiar estado:', err);
      const raw = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(tApi(raw) || t('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  const visibleIds = zones.map(z => parseInt(z.id));
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, showInactive],
  });

  const handleDelete = async (id: string) => {
    try {
      await zoneService.deleteZone(id);
      toast.success(t('zoneDeleted'));
      fetchZones();
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    }
  };

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await api.patch('/zonas/batch-toggle', { ids, activo });

      toast.success(
        t('batchSuccess', { count: ids.length, action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() })
      );

      batch.completeBatch();
      if (!showInactive && !activo) {
        setZones(prev => prev.filter(z => !ids.includes(parseInt(z.id))));
      } else {
        setZones(prev => prev.map(z =>
          ids.includes(parseInt(z.id)) ? { ...z, isEnabled: activo } : z
        ));
      }
    } catch (error: unknown) {
      console.error('Error en batch toggle:', error);
      const raw = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(tApi(raw) || t('errorChangingStatus'));
      batch.setBatchLoading(false);
    }
  };

  // Colores disponibles
  const availableColors = [
    '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'
  ];

  const handleRefresh = () => {
    fetchZones();
    toast.success(t('zonesUpdated'));
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={totalZones > 0 ? t('zoneCount', { count: totalZones }) : undefined}
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            data-tour="zones-map-btn"
            onClick={handleViewMap}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors"
          >
            <Map className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">{t('mapTitle')}</span>
          </button>
          <div className="relative" data-tour="zones-import-export">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
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
          <button
            data-tour="zones-add-btn"
            onClick={handleCreateZone}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newZone')}</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder={t('searchPlaceholder')} dataTour="zones-search" />

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>

          <div data-tour="zones-toggle-inactive" className="ml-auto">
            <InactiveToggle value={showInactive} onChange={(v) => { setShowInactive(v); setCurrentPage(1); }} />
          </div>
        </div>

          {/* Error message */}
          <ErrorBanner error={error} onRetry={fetchZones} />

          {/* Selection Action Bar */}
          <BatchActionBar
            selectedCount={batch.selectedCount}
            totalItems={totalZones}
            entityLabel={t('title').toLowerCase()}
            onActivate={() => batch.openBatchAction('activate')}
            onDeactivate={() => batch.openBatchAction('deactivate')}
            onClear={batch.handleClearSelection}
            loading={batch.batchLoading}
          />

          {/* Mobile Cards View */}
          <div className="sm:hidden space-y-3">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-green-600 animate-spin mb-3" />
                <span className="text-sm text-muted-foreground">{t('loadingZones')}</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && zones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="w-12 h-12 text-teal-300 mb-4" />
                <p className="text-lg font-medium text-foreground">{t('emptyTitle')}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchTerm ? t('emptyFiltered') : t('emptyDefault')}
                </p>
              </div>
            )}

            {/* Zone Cards */}
            {!loading && zones.length > 0 && zones.map((zone) => (
              <div
                key={zone.id}
                className={`border border-border-subtle rounded-lg p-3 bg-surface-2 ${
                  !zone.isEnabled ? 'opacity-60' : ''
                }`}
              >
                {/* Row 1: Checkbox + Color Avatar + Name/Description + Toggle */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => batch.handleToggleSelect(parseInt(zone.id))}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(parseInt(zone.id))
                        ? 'bg-success border-success text-success-foreground'
                        : 'border-border-default hover:border-green-500'
                    }`}
                  >
                    {batch.selectedIds.has(parseInt(zone.id)) && <Check className="w-3 h-3" />}
                  </button>

                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: zone.color + '20' }}
                  >
                    <MapPinIcon className="w-5 h-5" style={{ color: zone.color }} weight="duotone" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {zone.name}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {zone.description || t('noDescription')}
                    </div>
                  </div>

                  <ActiveToggle isActive={zone.isEnabled} onToggle={() => handleToggleActive(zone)} disabled={loading} isLoading={togglingId === zone.id} title={zone.isEnabled ? tc('deactivate') : tc('activate')} />
                </div>

                {/* Row 2: Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                    {zone.clientCount || 0} {t('columns.clients')}
                  </span>
                </div>

                {/* Row 3: Actions */}
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => handleEditZone(zone)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                    <span>{tc('edit')}</span>
                  </button>
                  {deleteConfirmId === zone.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(zone.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(zone.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Zones Table */}
          <div className="hidden sm:block bg-surface-2 border border-border-subtle rounded-lg overflow-hidden" data-tour="zones-table">
            {/* Table Header */}
            <div className="flex items-center gap-3 bg-surface-1 px-5 h-10 border-b border-border-subtle">
              <div className="w-[28px] flex items-center justify-center">
                <button
                  onClick={batch.handleSelectAllVisible}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    batch.allVisibleSelected
                      ? 'bg-success border-success text-success-foreground'
                      : batch.someVisibleSelected
                      ? 'bg-green-100 border-green-600'
                      : 'border-border-default hover:border-green-500'
                  }`}
                >
                  {batch.allVisibleSelected ? (
                    <Check className="w-3 h-3" />
                  ) : batch.someVisibleSelected ? (
                    <Minus className="w-3 h-3 text-green-600" />
                  ) : null}
                </button>
              </div>
              <div className="w-[40px] text-[11px] font-medium text-muted-foreground">{t('columns.color')}</div>
              <div className="flex-1 text-[11px] font-medium text-muted-foreground">{t('columns.name')}</div>
              <div className="w-[100px] text-[11px] font-medium text-muted-foreground text-center">{t('columns.clients')}</div>
              <div className="w-[80px] text-[11px] font-medium text-muted-foreground">{t('columns.active')}</div>
              <div className="w-16" />
            </div>

            {/* Table Body - With loading overlay */}
            <div className="relative min-h-[200px]">
              {/* Loading Overlay */}
              <TableLoadingOverlay loading={loading} message={t('loadingZones')} />

              {/* Empty State */}
              {!loading && zones.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-teal-300" />
                    <p className="text-lg font-medium">{t('emptyTitle')}</p>
                    <p className="text-sm">
                      {searchTerm ? t('emptyFiltered') : t('emptyDefault')}
                    </p>
                  </div>
                </div>
              ) : (
                /* Table Rows - With opacity transition */
                <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {zones.map((zone) => (
                  <div
                    key={zone.id}
                    onClick={() => handleEditZone(zone)}
                    className={`flex items-center gap-3 px-5 py-3.5 border-b border-border-subtle bg-surface-2 hover:bg-amber-50 cursor-pointer transition-colors group ${
                      !zone.isEnabled ? 'opacity-60' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-[28px] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => batch.handleToggleSelect(parseInt(zone.id))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(parseInt(zone.id))
                            ? 'bg-success border-success text-success-foreground'
                            : 'border-border-default hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(parseInt(zone.id)) && <Check className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Color */}
                    <div className="w-[40px]">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                    </div>

                    {/* Nombre */}
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-green-600">
                        {zone.name}
                      </span>
                      {zone.description && (
                        <span className="text-[11px] text-muted-foreground ml-2">{zone.description}</span>
                      )}
                    </div>

                    {/* Clientes */}
                    <div className="w-[100px] text-[13px] text-foreground/80 text-center">
                      {zone.clientCount || 0}
                    </div>

                    {/* Activa - Toggle Switch */}
                    <div className="w-[80px]" onClick={(e) => e.stopPropagation()}>
                      <ActiveToggle isActive={zone.isEnabled} onToggle={() => handleToggleActive(zone)} disabled={loading} isLoading={togglingId === zone.id} title={zone.isEnabled ? tc('deactivate') : tc('activate')} />
                    </div>

                    {/* Actions */}
                    <div className="w-16 flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {deleteConfirmId === zone.id ? (
                        <>
                          <button onClick={() => { handleDelete(zone.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setDeleteConfirmId(zone.id)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
                          <CaretRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-amber-500 transition-colors" weight="bold" />
                        </>
                      )}
                    </div>
                  </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination - Always visible when there are zones */}
          {(zones.length > 0 || loading) && totalZones > 0 && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalZones}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel={t('title').toLowerCase()}
              loading={loading}
            />
          )}

        {/* Zone Map Modal */}
        {isMapOpen && (
          <Modal
            isOpen={isMapOpen}
            onClose={() => setIsMapOpen(false)}
            title={t('mapTitle')}
            size="2xl"
          >
            <div className="space-y-3">
              {(() => {
                const zonesWithGeo = allZonesForMap.filter(z => z.mapSettings?.centerLatitude && z.mapSettings?.centerLongitude);

                if (zonesWithGeo.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4">
                        <Map className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                      <p className="text-sm font-medium text-foreground/80">{t('noGeoZones')}</p>
                      <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
                        {t('noGeoZonesHint')}
                      </p>
                    </div>
                  );
                }

                const markers: MapMarker[] = zonesWithGeo.map(z => ({
                  id: z.id,
                  lat: z.mapSettings!.centerLatitude!,
                  lng: z.mapSettings!.centerLongitude!,
                  title: z.name,
                  label: z.name,
                  info: (
                    <div className="min-w-[160px]">
                      <p className="font-semibold text-sm">{z.name}</p>
                      {z.description && <p className="text-xs text-muted-foreground mt-0.5">{z.description}</p>}
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border-subtle">
                        <span className="text-xs text-foreground/70">
                          {z.clientCount || 0} {t('columns.clients')}
                        </span>
                        {z.boundaries?.[0]?.radius && (
                          <span className="text-xs text-muted-foreground">{t('drawer.radiusKm')}: {z.boundaries[0].radius} km</span>
                        )}
                      </div>
                    </div>
                  ),
                }));

                const zonesWithoutGeo = allZonesForMap.filter(z => !z.mapSettings?.centerLatitude || !z.mapSettings?.centerLongitude);

                return (
                  <>
                    <div className="rounded-md overflow-hidden border border-border-subtle shadow-sm">
                      <GoogleMapWrapper markers={markers} height="520px">
                        {zonesWithGeo.map(z => {
                          const radius = z.boundaries?.[0]?.radius;
                          if (!radius) return null;
                          return (
                            <Circle
                              key={`circle-${z.id}`}
                              center={{ lat: z.mapSettings!.centerLatitude!, lng: z.mapSettings!.centerLongitude! }}
                              radius={radius * 1000}
                              options={{
                                fillColor: z.color,
                                fillOpacity: 0.15,
                                strokeColor: z.color,
                                strokeOpacity: 0.6,
                                strokeWeight: 2,
                              }}
                            />
                          );
                        })}
                      </GoogleMapWrapper>
                    </div>
                    {/* Legend */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {zonesWithoutGeo.length > 0
                          ? t('zonesOnMap', { shown: zonesWithGeo.length, total: allZonesForMap.length })
                          : t('title')}
                      </span>
                      {zonesWithGeo.map(z => (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => {
                            setIsMapOpen(false);
                            handleEditZone(z);
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-surface-3 transition-colors group"
                          title={`${tc('edit')} ${z.name}`}
                        >
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: z.color }} />
                          <span className="text-xs text-foreground/70 group-hover:text-foreground">{z.name}</span>
                          {z.boundaries?.[0]?.radius && (
                            <span className="text-[11px] text-muted-foreground">{z.boundaries[0].radius} km</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </Modal>
        )}

        {/* Batch Confirm Modal */}
        <BatchConfirmModal
          isOpen={batch.isBatchConfirmOpen}
          onClose={batch.closeBatchConfirm}
          onConfirm={handleBatchToggle}
          action={batch.batchAction}
          selectedCount={batch.selectedCount}
          entityLabel={t('title').toLowerCase()}
          loading={batch.batchLoading}
          consequenceDeactivate={t('batchConsequenceDeactivate')}
          consequenceActivate={t('batchConsequenceActivate')}
        />

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
            {/* ── Información general ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted-foreground">{t('drawer.generalInfo')}</h4>

              {/* Name + Color on same row */}
              <div className="flex gap-4 items-start" data-tour="zones-drawer-name">
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 mb-1.5">
                    <Map className="w-3.5 h-3.5 text-green-600" />
                    {tc('name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
                      style={{ backgroundColor: watchedColor || '#EC4899' }}
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
                  className="w-full px-3 py-2 border border-border-default rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder={t('drawer.descriptionPlaceholder')}
                  rows={2}
                />
                {errors.description && (
                  <FieldError message={errors.description?.message} />
                )}
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
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
                          fillColor: watchedColor || '#EC4899',
                          fillOpacity: 0.15,
                          strokeColor: watchedColor || '#EC4899',
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
                        className="w-full px-3 py-2 text-sm border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
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
                  className="mt-0.5 w-4 h-4 text-green-600 border-border-default rounded focus:ring-green-600"
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
