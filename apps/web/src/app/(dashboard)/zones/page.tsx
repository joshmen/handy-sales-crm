'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { toast } from '@/hooks/useToast';
import { Zone, ZoneForm } from '@/types/zones';
import { zoneService } from '@/services/api';
import { api } from '@/lib/api';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  X,
  Power,
  PowerOff,
  Pencil,
  Loader2,
  MapPin,
} from 'lucide-react';
import { MapPin as MapPinIcon } from '@phosphor-icons/react';

// Zod schema for zone form validation
const zoneFormSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  description: z.string().optional(),
  color: z.string().min(1, 'El color es obligatorio'),
  isEnabled: z.boolean(),
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

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Drawer states
  const [showZoneForm, setShowZoneForm] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [savingZone, setSavingZone] = useState(false);

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
    },
  });

  const watchedColor = watch('color');

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
    });
    setShowZoneForm(true);
  };

  const handleSaveZone = async (data: ZoneFormData) => {
    try {
      setSavingZone(true);
      if (editingZone) {
        await zoneService.updateZone({
          id: editingZone.id,
          ...data,
          userIds: editingZone.userIds || []
        });
        toast.success('Zona actualizada correctamente');
      } else {
        await zoneService.createZone({
          ...data,
          userIds: []
        });
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
    reset({
      name: zone.name,
      description: zone.description || '',
      color: zone.color || '#EC4899',
      isEnabled: zone.isEnabled,
    });
    setShowZoneForm(true);
  };

  const handleCancelForm = () => {
    drawerRef.current?.requestClose();
  };

  const handleCloseDrawer = () => {
    setShowZoneForm(false);
    setEditingZone(null);
    reset();
  };

  const handleViewMap = () => {
    toast.info('Funcionalidad del mapa próximamente');
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (zone: Zone) => {
    try {
      setTogglingId(zone.id);
      const newActive = !zone.isEnabled;
      await api.patch(`/zonas/${zone.id}/activo`, { activo: newActive });
      toast.success(newActive ? 'Zona activada' : 'Zona desactivada');
      setZones(prev => prev.map(z =>
        z.id === zone.id ? { ...z, isEnabled: newActive } : z
      ));
    } catch (err: any) {
      console.error('Error al cambiar estado:', err);
      const message = err?.response?.data?.message || 'Error al cambiar el estado de la zona';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  // Multi-select handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = zones.map(z => parseInt(z.id));
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

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenBatchAction = (action: 'activate' | 'deactivate') => {
    setBatchAction(action);
    setIsBatchConfirmOpen(true);
  };

  const handleBatchToggle = async () => {
    if (selectedIds.size === 0) return;

    try {
      setBatchLoading(true);
      const ids = Array.from(selectedIds);
      const activo = batchAction === 'activate';

      await api.patch('/zonas/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} zona${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
      setZones(prev => prev.map(z =>
        ids.includes(parseInt(z.id)) ? { ...z, isEnabled: activo } : z
      ));
    } catch (error: any) {
      console.error('Error en batch toggle:', error);
      const message = error?.response?.data?.message || 'Error al cambiar el estado de las zonas';
      toast.error(message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, searchTerm, showInactive]);

  // Computed selection state
  const visibleIds = zones.map(z => parseInt(z.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  // Calcular rango de items mostrados
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalZones);

  // Generar números de página para mostrar
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

  // Colores disponibles
  const availableColors = [
    '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#14B8A6'
  ];

  return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-8 py-6">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Zonas' },
          ]} />

          {/* Title Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Zonas
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleViewMap}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-500" />
                <span>Mapa</span>
              </button>
              <button
                data-tour="zones-add-btn"
                onClick={handleCreateZone}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva zona</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-8 py-4 overflow-auto space-y-4">
          {/* Toolbar */}
          <div className="flex items-center gap-4">
            <div className="relative w-64" data-tour="zones-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50">
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Descargar</span>
            </button>

            {/* Toggle para mostrar inactivas */}
            <div className="flex items-center gap-2 ml-auto" data-tour="zones-toggle-inactive">
              <span className="text-xs text-gray-600">Mostrar inactivas</span>
              <button
                onClick={() => {
                  setShowInactive(!showInactive);
                  setCurrentPage(1);
                }}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                  showInactive ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={showInactive ? 'Mostrando todas las zonas' : 'Solo zonas activas'}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                  showInactive ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button onClick={fetchZones} className="ml-4 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          )}

          {/* Selection Action Bar */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-700">
                  {selectedCount} seleccionada{selectedCount > 1 ? 's' : ''}
                </span>
                {selectedCount < totalZones && (
                  <span className="text-xs text-blue-500">
                    de {totalZones} zonas
                  </span>
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
                    onClick={() => handleToggleSelect(parseInt(zone.id))}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedIds.has(parseInt(zone.id))
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {selectedIds.has(parseInt(zone.id)) && <Check className="w-3 h-3" />}
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

                  <button
                    onClick={() => handleToggleActive(zone)}
                    disabled={togglingId === zone.id || loading}
                    className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                      zone.isEnabled ? 'bg-green-500' : 'bg-gray-300'
                    } ${togglingId === zone.id ? 'opacity-50' : ''}`}
                    title={zone.isEnabled ? 'Desactivar zona' : 'Activar zona'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                      zone.isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}>
                      {zone.isEnabled ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                    </span>
                  </button>
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
              <div className="w-[40px] text-xs font-semibold text-gray-700">Color</div>
              <div className="flex-1 text-xs font-semibold text-gray-700">Nombre</div>
              <div className="w-[100px] text-xs font-semibold text-gray-700 text-center">Clientes</div>
              <div className="w-[80px] text-xs font-semibold text-gray-700">Activa</div>
              <div className="w-[50px] text-xs font-semibold text-gray-700 text-center">Editar</div>
            </div>

            {/* Table Body - With loading overlay */}
            <div className="relative min-h-[200px]">
              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="text-sm text-gray-500">Cargando zonas...</span>
                  </div>
                </div>
              )}

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
                        onClick={() => handleToggleSelect(parseInt(zone.id))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedIds.has(parseInt(zone.id))
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {selectedIds.has(parseInt(zone.id)) && <Check className="w-3 h-3" />}
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
                      <button
                        onClick={() => handleToggleActive(zone)}
                        disabled={togglingId === zone.id || loading}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                          zone.isEnabled ? 'bg-green-500' : 'bg-gray-300'
                        } ${togglingId === zone.id ? 'opacity-50' : ''}`}
                        title={zone.isEnabled ? 'Desactivar zona' : 'Activar zona'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                          zone.isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                          {zone.isEnabled ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                        </span>
                      </button>
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
            <div className={`flex items-center justify-between transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Mostrando {startItem}-{endItem} de {totalZones} zonas
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
            title={`¿${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} zona${selectedCount > 1 ? 's' : ''}?`}
          >
            <div className="py-4">
              <p className="text-gray-500">
                ¿Estás seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
                <strong>{selectedCount}</strong> zona{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}?
                {batchAction === 'deactivate' && ' Las zonas desactivadas no aparecerán en las listas activas.'}
                {batchAction === 'activate' && ' Las zonas activadas volverán a aparecer en las listas activas.'}
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
                {batchLoading && <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
              </button>
            </div>
          </Modal>
        )}

        {/* Zone Form Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={showZoneForm}
          onClose={handleCloseDrawer}
          title={editingZone ? 'Editar Zona' : 'Nueva Zona'}
          icon={<MapPin className="w-5 h-5" />}
          width="sm"
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
          <form onSubmit={handleSubmit(handleSaveZone)} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder="Nombre de la zona"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                {...register('description')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder="Descripción de la zona"
                rows={2}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isEnabled"
                {...register('isEnabled')}
                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600"
              />
              <label htmlFor="isEnabled" className="text-sm text-gray-700">
                Zona activa
              </label>
            </div>
          </form>
        </Drawer>
      </div>
  );
}
