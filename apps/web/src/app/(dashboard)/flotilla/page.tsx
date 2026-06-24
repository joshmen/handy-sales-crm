'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import {
  vehiclesService,
  Vehiculo,
  TIPO_VEHICULO_LABEL,
  ESTADO_VEHICULO_LABEL,
  ESTADO_VEHICULO_TONE,
} from '@/services/api/vehicles';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Loader2,
  Check,
  Truck,
  Trash2,
  X,
} from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { SoftBadge } from '@/components/ui/SoftBadge';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { useFormatters } from '@/hooks/useFormatters';
import { usePermissions } from '@/hooks/usePermissions';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { FieldError } from '@/components/forms/FieldError';

// Zod schema para validación del formulario
const vehicleSchema = z.object({
  placa: z.string().min(1, 'placaRequired'),
  tipo: z.number().int().min(0).max(1),
  capacidadUnidades: z.number().int().min(0),
  vendedorId: z.number().nullable(),
  kilometraje: z.number().int().min(0).nullable(),
  estado: z.number().int().min(0).max(3),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

export default function FlotillaPage() {
  const t = useTranslations('flotilla');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const { tApi } = useBackendTranslation();
  const showApiError = useApiErrorToast();
  const { formatNumber } = useFormatters();
  const { isAdminValue } = usePermissions();
  const canWrite = !!isAdminValue;

  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehiculo | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Vendedores (rol VENDEDOR) para el dropdown de chofer.
  const [vendedores, setVendedores] = useState<{ id: number; nombre: string }[]>([]);

  const drawerRef = useRef<DrawerHandle>(null);

  const {
    register,
    handleSubmit: rhfSubmit,
    reset: resetForm,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      placa: '',
      tipo: 0,
      capacidadUnidades: 0,
      vendedorId: null,
      kilometraje: null,
      estado: 0,
    },
  });

  const fetchVehiculos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await vehiclesService.getVehiculos();
      setVehiculos(data);
    } catch (err) {
      console.error('Error al cargar vehículos:', err);
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
    fetchVehiculos();
  }, [fetchVehiculos]);

  useEffect(() => {
    fetchVendedores();
  }, [fetchVendedores]);

  // Filtrado client-side: search por placa/chofer + toggle inactivos.
  const filteredVehiculos = useMemo(() => {
    let list = vehiculos;
    if (!showInactive) {
      list = list.filter(v => v.activo);
    }
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(v =>
        v.placa.toLowerCase().includes(term) ||
        (v.vendedorNombre || '').toLowerCase().includes(term)
      );
    }
    return list;
  }, [vehiculos, showInactive, searchTerm]);

  const handleCreateVehicle = () => {
    setEditingVehicle(null);
    resetForm({
      placa: '',
      tipo: 0,
      capacidadUnidades: 0,
      vendedorId: null,
      kilometraje: null,
      estado: 0,
    });
    setShowVehicleForm(true);
  };

  const handleEditVehicle = (vehiculo: Vehiculo) => {
    setEditingVehicle(vehiculo);
    resetForm({
      placa: vehiculo.placa,
      tipo: vehiculo.tipo,
      capacidadUnidades: vehiculo.capacidadUnidades,
      vendedorId: vehiculo.vendedorId ?? null,
      kilometraje: vehiculo.kilometraje ?? null,
      estado: vehiculo.estado,
    });
    setShowVehicleForm(true);
  };

  const handleSaveVehicle = rhfSubmit(async (data) => {
    try {
      setSavingVehicle(true);
      if (editingVehicle) {
        await vehiclesService.updateVehiculo(editingVehicle.id, {
          id: editingVehicle.id,
          ...data,
          activo: editingVehicle.activo,
        });
        toast.success(t('vehicleUpdated'));
      } else {
        await vehiclesService.createVehiculo(data);
        toast.success(t('vehicleCreated'));
      }
      await fetchVehiculos();
      setShowVehicleForm(false);
      setEditingVehicle(null);
    } catch (err: unknown) {
      console.error('Error al guardar vehículo:', err);
      const e = err as { message?: string };
      toast.error(tApi(e?.message) || t('errorSaving'));
    } finally {
      setSavingVehicle(false);
    }
  });

  const handleCancelForm = () => {
    setShowVehicleForm(false);
    setEditingVehicle(null);
  };

  const handleToggleActive = async (vehiculo: Vehiculo) => {
    try {
      setTogglingId(vehiculo.id);
      const newActive = !vehiculo.activo;
      await vehiclesService.toggleActive(vehiculo.id, newActive);
      toast.success(newActive ? t('vehicleActivated') : t('vehicleDeactivated'));
      setVehiculos(prev => prev.map(v =>
        v.id === vehiculo.id ? { ...v, activo: newActive } : v
      ));
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error(t('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await vehiclesService.deleteVehiculo(id);
      toast.success(t('vehicleDeleted'));
      fetchVehiculos();
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    }
  };

  const visibleIds = filteredVehiculos.map(v => v.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [searchTerm, showInactive],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedCount === 0) return;
    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';
      await vehiclesService.batchToggleActive(ids, activo);
      toast.success(
        t('batchSuccess', { count: ids.length, plural: ids.length > 1 ? 's' : '', action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() })
      );
      batch.completeBatch();
      setVehiculos(prev => prev.map(v =>
        ids.includes(v.id) ? { ...v, activo } : v
      ));
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error(t('errorBatchToggle'));
    } finally {
      batch.setBatchLoading(false);
    }
  };

  const columns = useMemo<DataGridColumn<Vehiculo>[]>(() => [
    {
      key: 'placa',
      label: t('columns.placa'),
      width: 'flex',
      cellRenderer: (v) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-[9px] bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Truck className="w-[18px] h-[18px] text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-foreground font-mono truncate">{v.placa}</span>
        </div>
      ),
    },
    {
      key: 'tipo',
      label: t('columns.tipo'),
      width: 140,
      hiddenOnMobile: true,
      cellRenderer: (v) => (
        <SoftBadge tone={v.tipo === 1 ? 'info' : 'default'}>
          {TIPO_VEHICULO_LABEL[v.tipo] ?? v.tipoNombre}
        </SoftBadge>
      ),
    },
    {
      key: 'capacidad',
      label: t('columns.capacity'),
      width: 110,
      align: 'center',
      hiddenOnMobile: true,
      cellRenderer: (v) => (
        <span className="text-[13px] font-medium text-foreground tabular-nums">{formatNumber(v.capacidadUnidades)}</span>
      ),
    },
    {
      key: 'chofer',
      label: t('columns.driver'),
      width: 180,
      hiddenOnMobile: true,
      cellRenderer: (v) => (
        v.vendedorNombre
          ? <span className="text-[13px] text-foreground truncate">{v.vendedorNombre}</span>
          : <span className="text-[13px] text-muted-foreground italic">{t('noDriver')}</span>
      ),
    },
    {
      key: 'kilometraje',
      label: t('columns.km'),
      width: 120,
      align: 'right',
      hiddenOnMobile: true,
      cellRenderer: (v) => (
        <span className="text-[13px] text-foreground tabular-nums">
          {v.kilometraje != null ? formatNumber(v.kilometraje) : '—'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: t('columns.status'),
      width: 150,
      cellRenderer: (v) => (
        <SoftBadge tone={ESTADO_VEHICULO_TONE[v.estado] ?? 'default'}>
          {ESTADO_VEHICULO_LABEL[v.estado] ?? v.estadoNombre}
        </SoftBadge>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 64,
      cellRenderer: (v) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canWrite && (
            <button onClick={() => handleEditVehicle(v)} disabled={loading} className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
              <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
            </button>
          )}
          {canWrite && (
            deleteConfirmId === v.id ? (
              <>
                <button onClick={() => { handleDelete(v.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <button onClick={() => setDeleteConfirmId(v.id)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
            )
          )}
        </div>
      ),
    },
  ], [loading, deleteConfirmId, canWrite, formatNumber, t, tc]);

  return (
    <PageHeader
      section="operacion"
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: tn('sectionOperations') },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={vehiculos.length > 0 ? t('subtitle', { count: vehiculos.length }) : undefined}
      actions={
        canWrite ? (
          <button
            onClick={handleCreateVehicle}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newVehicle')}</span>
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        <ErrorBanner error={error} onRetry={fetchVehiculos} />

        {/* Toolbar: búsqueda + inactivos */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-72 lg:w-80">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t('searchPlaceholder')} className="w-full" />
          </div>
          <InactiveToggle value={showInactive} onChange={setShowInactive} />
        </div>

        {/* Batch Action Bar */}
        {canWrite && (
          <BatchActionBar
            selectedCount={batch.selectedCount}
            totalItems={filteredVehiculos.length}
            entityLabel={t('title').toLowerCase()}
            onActivate={() => batch.openBatchAction('activate')}
            onDeactivate={() => batch.openBatchAction('deactivate')}
            onClear={batch.handleClearSelection}
            loading={batch.batchLoading}
          />
        )}

        {/* DataGrid */}
        <DataGrid<Vehiculo>
          columns={columns}
          data={filteredVehiculos}
          keyExtractor={(v) => v.id}
          loading={loading}
          loadingMessage={t('loadingVehicles')}
          emptyIcon={<Truck className="w-16 h-16 text-blue-300" />}
          emptyTitle={t('emptyTitle')}
          emptyMessage={searchTerm ? t('emptySearchMessage') : t('empty')}
          selection={canWrite ? {
            selectedIds: batch.selectedIds as unknown as Set<string | number>,
            onToggle: (id) => batch.handleToggleSelect(id as number),
            onSelectAll: batch.handleSelectAllVisible,
            onClearAll: batch.handleClearSelection,
          } : undefined}
          mobileCardRenderer={(v) => (
            <div className={`${!v.activo ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground font-mono truncate">{v.placa}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.vendedorNombre || t('noDriver')}</p>
                  </div>
                </div>
                {canWrite && (
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActiveToggle isActive={v.activo} onToggle={() => handleToggleActive(v)} disabled={loading} isLoading={togglingId === v.id} title={v.activo ? tc('deactivate') : tc('activate')} />
                  </div>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <SoftBadge tone={v.tipo === 1 ? 'info' : 'default'}>{TIPO_VEHICULO_LABEL[v.tipo] ?? v.tipoNombre}</SoftBadge>
                <SoftBadge tone={ESTADO_VEHICULO_TONE[v.estado] ?? 'default'}>{ESTADO_VEHICULO_LABEL[v.estado] ?? v.estadoNombre}</SoftBadge>
                <span className="px-2 py-1 bg-surface-3 text-foreground/80 rounded-md text-xs font-medium">{t('columns.capacity')}: {formatNumber(v.capacidadUnidades)}</span>
              </div>
              {canWrite && (
                <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-border-subtle pt-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEditVehicle(v)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-primary hover:bg-primary/5 rounded">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" /> {tc('edit')}
                  </button>
                  {deleteConfirmId === v.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(v.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(v.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                  )}
                </div>
              )}
            </div>
          )}
        />
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
      />

      {/* Vehicle Form Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={showVehicleForm}
        onClose={handleCancelForm}
        title={editingVehicle ? t('drawer.editTitle') : t('drawer.createTitle')}
        icon={<Truck className="w-5 h-5 text-primary" />}
        width="lg"
        isDirty={isDirty}
        onSave={() => {
          const form = document.getElementById('vehicle-form') as HTMLFormElement;
          form?.requestSubmit();
        }}
        footer={
          <div className="flex justify-end gap-3">
            <Button type="button" variant="wbOutline" onClick={() => drawerRef.current?.requestClose()} disabled={savingVehicle}>
              {tc('cancel')}
            </Button>
            <Button type="submit" form="vehicle-form" variant="wbPrimary" disabled={savingVehicle} className="flex items-center gap-2">
              {savingVehicle && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('drawer.save')}
            </Button>
          </div>
        }
      >
        <form id="vehicle-form" onSubmit={handleSaveVehicle} className="space-y-4 p-6">
          {/* Placa */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.placa')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('placa')}
              className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
              placeholder={t('drawer.placaPlaceholder')}
            />
            {errors.placa && <FieldError message={errors.placa.message} />}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.tipo')}
            </label>
            <select
              value={watch('tipo')}
              onChange={(e) => setValue('tipo', Number(e.target.value), { shouldDirty: true })}
              className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={0}>{t('tipos.seca')}</option>
              <option value={1}>{t('tipos.refrigerada')}</option>
            </select>
          </div>

          {/* Capacidad (unidades) */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.capacity')}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              {...register('capacidadUnidades', { valueAsNumber: true })}
              className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0"
            />
            {errors.capacidadUnidades && <FieldError message={errors.capacidadUnidades.message} />}
          </div>

          {/* Chofer (vendedor) */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.driver')}
            </label>
            <SearchableSelect
              options={vendedores.map(v => ({ value: v.id, label: v.nombre }))}
              value={watch('vendedorId') ?? null}
              onChange={(val) => setValue('vendedorId', val ? Number(val) : null, { shouldDirty: true })}
              placeholder={t('noDriver')}
              searchPlaceholder={tc('searchEllipsis')}
            />
          </div>

          {/* Kilometraje */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.km')}
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={watch('kilometraje') ?? ''}
              onChange={(e) => setValue('kilometraje', e.target.value === '' ? null : Number(e.target.value), { shouldDirty: true })}
              className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="0"
            />
            {errors.kilometraje && <FieldError message={errors.kilometraje.message} />}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.status')}
            </label>
            <select
              value={watch('estado')}
              onChange={(e) => setValue('estado', Number(e.target.value), { shouldDirty: true })}
              className="w-full px-3 py-2 border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={0}>{t('estados.disponible')}</option>
              <option value={1}>{t('estados.enRuta')}</option>
              <option value={2}>{t('estados.mantenimiento')}</option>
              <option value={3}>{t('estados.baja')}</option>
            </select>
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
