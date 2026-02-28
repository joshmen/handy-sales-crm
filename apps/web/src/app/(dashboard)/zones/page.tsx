'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { toast } from '@/hooks/useToast';
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
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { MapPin as MapPinIcon } from '@phosphor-icons/react';
import { GoogleMapWrapper, Circle } from '@/components/maps/GoogleMapWrapper';
import type { MapMarker } from '@/components/maps/GoogleMapWrapper';
import { GoogleMap, useJsApiLoader, Marker as GMarker, Circle as GCircle, Autocomplete } from '@react-google-maps/api';

const DEFAULT_CENTER = { lat: 20.6597, lng: -103.3496 }; // Guadalajara, México
const MAPS_LIBRARIES: ('places')[] = ['places'];

// Zod schema for zone form validation
const zoneFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  color: z.string().min(1, 'El color es obligatorio'),
  isEnabled: z.boolean(),
  centroLatitud: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
  centroLongitud: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
  radioKm: z.union([z.number(), z.nan()]).optional().transform(v => v && !isNaN(v) ? v : undefined),
});

type ZoneFormData = z.infer<typeof zoneFormSchema>;

export default function ZonesPage() {
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
  const moveMarkerTo = useCallback((lat: number, lng: number) => {
    setDrawerMapCenter({ lat, lng });
    setValue('centroLatitud', lat, { shouldDirty: true });
    setValue('centroLongitud', lng, { shouldDirty: true });
  }, [setValue]);

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
      setError('Error al cargar las zonas. Intenta de nuevo.');
      toast.error('Error al cargar las zonas');
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
      radioKm: undefined,
    });
    // Try to get user's location for new zones
    setDrawerMapRadius(5);
    setValue('radioKm', 5, { shouldDirty: true });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => moveMarkerTo(pos.coords.latitude, pos.coords.longitude),
        () => moveMarkerTo(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
        { timeout: 5000 }
      );
    } else {
      moveMarkerTo(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
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
        toast.success('Zona actualizada correctamente');
      } else {
        await zoneService.createZone(data);
        toast.success('Zona creada correctamente');
      }
      await fetchZones();
      setShowZoneForm(false);
      setEditingZone(null);
      reset();
    } catch (err) {
      console.error('Error al guardar zona:', err);
      toast.error('Error al guardar la zona');
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
    reset();
  };

  const handleViewMap = async () => {
    try {
      // Load all zones (no pagination) for map display
      const response = await zoneService.getZones({ limit: 200 });
      setAllZonesForMap(response.zones);
      setIsMapOpen(true);
    } catch {
      toast.error('Error al cargar zonas para el mapa');
    }
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (zone: Zone) => {
    try {
      setTogglingId(zone.id);
      const newActive = !zone.isEnabled;
      await api.patch(`/zonas/${zone.id}/activo`, { activo: newActive });
      toast.success(newActive ? 'Zona activada' : 'Zona desactivada');
      if (!showInactive && !newActive) {
        setZones(prev => prev.filter(z => z.id !== zone.id));
      } else {
        setZones(prev => prev.map(z =>
          z.id === zone.id ? { ...z, isEnabled: newActive } : z
        ));
      }
    } catch (err: unknown) {
      console.error('Error al cambiar estado:', err);
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado de la zona';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  const visibleIds = zones.map(z => parseInt(z.id));
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, showInactive],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await api.patch('/zonas/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} zona${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''} exitosamente`
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
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado de las zonas';
      toast.error(message);
      batch.setBatchLoading(false);
    }
  };

  // Colores disponibles
  const availableColors = [
    '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'
  ];

  const handleRefresh = () => {
    fetchZones();
    toast.success('Las zonas se han actualizado correctamente');
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Zonas' },
      ]}
      title="Zonas"
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            onClick={handleViewMap}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
          >
            <Map className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Mapa</span>
          </button>
          <div className="relative">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Importar / Exportar</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {showDataMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={() => { setShowDataMenu(false); exportToCsv('zonas'); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    Importar CSV
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            data-tour="zones-add-btn"
            onClick={handleCreateZone}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva zona</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder="Buscar zona..." dataTour="zones-search" />

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <InactiveToggle value={showInactive} onChange={(v) => { setShowInactive(v); setCurrentPage(1); }} className="ml-auto" />
        </div>

          {/* Error message */}
          <ErrorBanner error={error} onRetry={fetchZones} />

          {/* Selection Action Bar */}
          <BatchActionBar
            selectedCount={batch.selectedCount}
            totalItems={totalZones}
            entityLabel="zonas"
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
                <span className="text-sm text-gray-500">Cargando zonas...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && zones.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MapPin className="w-12 h-12 text-teal-300 mb-4" />
                <p className="text-lg font-medium text-gray-900">No hay zonas</p>
                <p className="text-sm text-gray-500 mb-4">
                  {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primera zona'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateZone}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Zona
                  </button>
                )}
              </div>
            )}

            {/* Zone Cards */}
            {!loading && zones.length > 0 && zones.map((zone) => (
              <div
                key={zone.id}
                className={`border border-gray-200 rounded-lg p-3 bg-white ${
                  !zone.isEnabled ? 'opacity-60' : ''
                }`}
              >
                {/* Row 1: Checkbox + Color Avatar + Name/Description + Toggle */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => batch.handleToggleSelect(parseInt(zone.id))}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(parseInt(zone.id))
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
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
                    <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {zone.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {zone.description || 'Sin descripción'}
                    </div>
                  </div>

                  <ActiveToggle isActive={zone.isEnabled} onToggle={() => handleToggleActive(zone)} disabled={loading} isLoading={togglingId === zone.id} title={zone.isEnabled ? 'Desactivar zona' : 'Activar zona'} />
                </div>

                {/* Row 2: Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                    {zone.clientCount || 0} cliente{zone.clientCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Row 3: Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleEditZone(zone)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Zones Table */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded overflow-hidden" data-tour="zones-table">
            {/* Table Header - Always visible */}
            <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
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
              <div className="w-[40px] text-xs font-semibold text-gray-700">Color</div>
              <div className="flex-1 text-xs font-semibold text-gray-700">Nombre</div>
              <div className="w-[100px] text-xs font-semibold text-gray-700 text-center">Clientes</div>
              <div className="w-[80px] text-xs font-semibold text-gray-700">Activa</div>
              <div className="w-[50px] text-xs font-semibold text-gray-700 text-center">Editar</div>
            </div>

            {/* Table Body - With loading overlay */}
            <div className="relative min-h-[200px]">
              {/* Loading Overlay */}
              <TableLoadingOverlay loading={loading} message="Cargando zonas..." />

              {/* Empty State */}
              {!loading && zones.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 mx-auto mb-4 text-teal-300" />
                    <p className="text-lg font-medium">No hay zonas</p>
                    <p className="text-sm">
                      {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primera zona'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={handleCreateZone}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar Zona
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Table Rows - With opacity transition */
                <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {zones.map((zone) => (
                  <div
                    key={zone.id}
                    className={`flex items-center gap-3 px-4 h-11 border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                      !zone.isEnabled ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => batch.handleToggleSelect(parseInt(zone.id))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(parseInt(zone.id))
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
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
                        <span className="text-[11px] text-gray-400 ml-2">{zone.description}</span>
                      )}
                    </div>

                    {/* Clientes */}
                    <div className="w-[100px] text-[13px] text-gray-700 text-center">
                      {zone.clientCount || 0}
                    </div>

                    {/* Activa - Toggle Switch */}
                    <div className="w-[80px]">
                      <ActiveToggle isActive={zone.isEnabled} onToggle={() => handleToggleActive(zone)} disabled={loading} isLoading={togglingId === zone.id} title={zone.isEnabled ? 'Desactivar zona' : 'Activar zona'} />
                    </div>

                    {/* Editar */}
                    <div className="w-[50px] flex items-center justify-center">
                      <button
                        onClick={() => handleEditZone(zone)}
                        disabled={loading}
                        className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
              itemLabel="zonas"
              loading={loading}
            />
          )}

        {/* Zone Map Modal */}
        {isMapOpen && (
          <Modal
            isOpen={isMapOpen}
            onClose={() => setIsMapOpen(false)}
            title="Mapa de Zonas"
          >
            <div className="py-2">
              {(() => {
                const zonesWithGeo = allZonesForMap.filter(z => z.mapSettings?.centerLatitude && z.mapSettings?.centerLongitude);
                const markers: MapMarker[] = zonesWithGeo.map(z => ({
                  id: z.id,
                  lat: z.mapSettings!.centerLatitude!,
                  lng: z.mapSettings!.centerLongitude!,
                  title: z.name,
                  label: z.name,
                  info: (
                    <div>
                      <p className="font-semibold">{z.name}</p>
                      {z.description && <p className="text-xs text-gray-500">{z.description}</p>}
                      <p className="text-xs mt-1">{z.clientCount || 0} clientes</p>
                      {z.boundaries?.[0]?.radius && (
                        <p className="text-xs text-gray-500">Radio: {z.boundaries[0].radius} km</p>
                      )}
                    </div>
                  ),
                }));

                if (zonesWithGeo.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Map className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-600 font-medium">Sin coordenadas</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Edita una zona y agrega latitud, longitud y radio para verla en el mapa.
                      </p>
                    </div>
                  );
                }

                return (
                  <>
                    <GoogleMapWrapper markers={markers} height="450px">
                      {zonesWithGeo.map(z => {
                        const radius = z.boundaries?.[0]?.radius;
                        if (!radius) return null;
                        return (
                          <Circle
                            key={`circle-${z.id}`}
                            center={{ lat: z.mapSettings!.centerLatitude!, lng: z.mapSettings!.centerLongitude! }}
                            radius={radius * 1000} // km to meters
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
                    {/* Legend */}
                    <div className="mt-3 flex flex-wrap gap-3">
                      {zonesWithGeo.map(z => (
                        <div key={z.id} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color }} />
                          <span className="text-xs text-gray-600">{z.name}</span>
                          {z.boundaries?.[0]?.radius && (
                            <span className="text-xs text-gray-400">({z.boundaries[0].radius} km)</span>
                          )}
                        </div>
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
          entityLabel="zona"
          loading={batch.batchLoading}
          consequenceDeactivate="Las zonas desactivadas no aparecerán en las listas activas."
          consequenceActivate="Las zonas activadas volverán a aparecer en las listas activas."
        />

        {/* Zone Form Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={showZoneForm}
          onClose={handleCloseDrawer}
          title={editingZone ? 'Editar Zona' : 'Nueva Zona'}
          icon={<MapPin className="w-5 h-5" />}
          width="lg"
          isDirty={isDirty}
          onSave={handleSubmit(handleSaveZone)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => drawerRef.current?.requestClose()}
                disabled={savingZone}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit(handleSaveZone)}
                disabled={savingZone}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingZone && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingZone ? 'Guardar Cambios' : 'Crear Zona'}
              </button>
            </div>
          }
        >
          <form onSubmit={handleSubmit(handleSaveZone)} className="p-6 space-y-5">
            {/* ── Información general ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Información general</h4>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1.5">
                  <Map className="w-3.5 h-3.5 text-teal-500" />
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Nombre de la zona"
                />
                {errors.name && (
                  <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Descripción
                </label>
                <textarea
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Descripción de la zona"
                  rows={2}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: watchedColor || '#EC4899' }} />
                  Color
                </label>
                <div className="flex gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setValue('color', color, { shouldDirty: true })}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        watchedColor === color ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ── Ubicación ── */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ubicación</h4>
              {isMapsLoaded ? (
                <div className="space-y-3">
                  {/* Place search */}
                  <Autocomplete
                    onLoad={(ac) => { autocompleteRef.current = ac; }}
                    onPlaceChanged={handlePlaceSelected}
                    restrictions={{ country: 'mx' }}
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar lugar... (ej. Zapopan, Guadalajara)"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                      />
                    </div>
                  </Autocomplete>

                  {/* Map */}
                  <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 320 }}>
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
                        }}
                        onRadiusChanged={() => {
                          if (circleRef.current) {
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
                  </div>
                  <p className="text-xs text-gray-400">
                    Busca un lugar, haz doble clic en el mapa, o arrastra el marcador para posicionar la zona.
                  </p>

                  {/* Radius input + coordinates */}
                  <div className="grid grid-cols-4 gap-2 items-end">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Radio (km)</label>
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
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                      />
                    </div>
                    <div className="col-span-3">
                      <div className="flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2.5">
                        <span><span className="font-medium">Lat:</span> {drawerMapCenter.lat.toFixed(4)}</span>
                        <span><span className="font-medium">Lng:</span> {drawerMapCenter.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando mapa...
                  </div>
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* ── Estado ── */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEnabled"
                {...register('isEnabled')}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
              />
              <label htmlFor="isEnabled" className="text-xs font-medium text-gray-700">
                Zona activa
              </label>
            </div>
          </form>
        </Drawer>

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="zonas"
          entityLabel="zonas"
          onSuccess={fetchZones}
        />
      </div>
    </PageHeader>
  );
}
