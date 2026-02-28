'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { Unit, UnitForm } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ListPagination } from '@/components/ui/ListPagination';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Edit2,
  Loader2,
  Check,
  Minus,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { Ruler } from '@phosphor-icons/react';

const unitFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  abreviatura: z.string().max(10, 'Máximo 10 caracteres').optional(),
});

export default function UnitsPage() {
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form state with react-hook-form
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UnitForm>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      nombre: '',
      abreviatura: '',
    },
  });

  // Load units
  const loadUnits = async () => {
    try {
      setLoading(true);
      const response = await api.get<Unit[]>('/unidades-medida', {
        params: { incluirInactivos: showInactive || undefined },
      });
      setUnits(response.data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('No se pudieron cargar las unidades de medida');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, [showInactive]);

  // Filtered units
  const filteredUnits = useMemo(() => {
    if (!searchTerm) return units;
    const term = searchTerm.toLowerCase();
    return units.filter(
      (unit) =>
        unit.nombre.toLowerCase().includes(term) ||
        unit.abreviatura?.toLowerCase().includes(term)
    );
  }, [units, searchTerm]);

  // Pagination
  const totalItems = filteredUnits.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUnits = filteredUnits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Batch operations
  const visibleIds = paginatedUnits.map(u => u.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, showInactive],
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingUnit(null);
    reset({ nombre: '', abreviatura: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    reset({
      nombre: unit.nombre,
      abreviatura: unit.abreviatura || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = handleFormSubmit(async (formData) => {
    try {
      setActionLoading(true);

      if (editingUnit) {
        await api.put(`/unidades-medida/${editingUnit.id}`, formData);
        toast.success(`Unidad "${formData.nombre}" actualizada exitosamente`);
      } else {
        await api.post('/unidades-medida', formData);
        toast.success(`Unidad "${formData.nombre}" creada exitosamente`);
      }

      setIsModalOpen(false);
      await loadUnits();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ocurrió un error al guardar la unidad';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  });

  // Individual toggle active/inactive
  const handleToggleActive = async (unit: Unit) => {
    try {
      setTogglingId(unit.id);
      const newActive = !unit.activo;
      const result = await api.patch<{ actualizado?: boolean; message?: string }>(`/unidades-medida/${unit.id}/activo`, { activo: newActive });
      if (result.data.actualizado) {
        toast.success(newActive ? 'Unidad activada' : 'Unidad desactivada');
        if (!showInactive && !newActive) {
          setUnits(prev => prev.filter(u => u.id !== unit.id));
        } else {
          setUnits(prev => prev.map(u =>
            u.id === unit.id ? { ...u, activo: newActive } : u
          ));
        }
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  // Batch toggle
  const handleBatchToggle = async () => {
    if (batch.selectedCount === 0) return;
    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';
      await api.patch('/unidades-medida/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} unidad${ids.length > 1 ? 'es' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''}`
      );
      batch.completeBatch();
      if (!showInactive && !activo) {
        setUnits(prev => prev.filter(u => !ids.includes(u.id)));
      } else {
        setUnits(prev => prev.map(u =>
          ids.includes(u.id) ? { ...u, activo } : u
        ));
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado';
      toast.error(message);
    } finally {
      batch.setBatchLoading(false);
    }
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Unidades de medida' },
      ]}
      title="Unidades de medida"
      actions={
        <>
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('unidades-medida'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
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
            onClick={handleOpenCreate}
            data-tour="units-create-btn"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva unidad</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder="Buscar unidad..."
            dataTour="units-search"
          />
          <button
            onClick={loadUnits}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <InactiveToggle
            value={showInactive}
            onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            className="ml-auto"
          />
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalItems}
          entityLabel="unidades"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
          {!loading && paginatedUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Ruler className="w-12 h-12 text-indigo-300 mb-3" weight="duotone" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No se encontraron unidades' : 'No hay unidades'}
              </p>
            </div>
          ) : (
            paginatedUnits.map((unit) => (
              <div
                key={unit.id}
                className={`border border-gray-200 rounded-lg p-3 bg-white ${
                  !unit.activo ? 'opacity-60' : ''
                }`}
              >
                {/* Row 1: Icon + Name/Abbreviation + Checkbox + Toggle */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-5 h-5 text-blue-600" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {unit.nombre}
                    </div>
                    {unit.abreviatura && (
                      <div className="text-xs text-gray-500">{unit.abreviatura}</div>
                    )}
                  </div>
                  <button
                    onClick={() => batch.handleToggleSelect(unit.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(unit.id)
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {batch.selectedIds.has(unit.id) && <Check className="w-3 h-3" />}
                  </button>
                  <ActiveToggle
                    isActive={unit.activo}
                    onToggle={() => handleToggleActive(unit)}
                    disabled={loading}
                    isLoading={togglingId === unit.id}
                  />
                </div>
                {/* Row 2: Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(unit)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div data-tour="units-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="min-w-[600px] flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
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
            <div className="w-[60px] text-xs font-semibold text-gray-600">ID</div>
            <div className="flex-1 text-xs font-semibold text-gray-600">Nombre</div>
            <div className="w-[120px] text-xs font-semibold text-gray-600">Abreviatura</div>
            <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
            <div className="w-[45px] text-xs font-semibold text-gray-600 text-center">Editar</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando unidades..." />

            {/* Empty State */}
            {!loading && paginatedUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Ruler className="w-16 h-16 text-indigo-300 mb-4" weight="duotone" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay unidades</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron unidades con ese término'
                    : 'Crea tu primera unidad de medida para comenzar'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Unidad
                  </button>
                )}
              </div>
            ) : (
              /* Table Rows */
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className={`min-w-[600px] flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !unit.activo ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => batch.handleToggleSelect(unit.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(unit.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(unit.id) && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="w-[60px] text-[13px] font-mono text-gray-500">
                      {unit.id}
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-gray-900">
                      {unit.nombre}
                    </div>
                    <div className="w-[120px]">
                      {unit.abreviatura ? (
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-gray-100 text-gray-700 rounded">
                          {unit.abreviatura}
                        </span>
                      ) : (
                        <span className="text-[13px] text-gray-400">-</span>
                      )}
                    </div>
                    <div className="w-[50px] flex items-center justify-center">
                      <ActiveToggle
                        isActive={unit.activo}
                        onToggle={() => handleToggleActive(unit)}
                        disabled={loading}
                        isLoading={togglingId === unit.id}
                      />
                    </div>
                    <div className="w-[45px] flex items-center justify-center">
                      <button
                        onClick={() => handleOpenEdit(unit)}
                        disabled={loading}
                        className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="unidades"
          loading={loading}
        />
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="unidades-medida"
        entityLabel="unidades de medida"
        onSuccess={() => loadUnits()}
      />

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="unidades"
        loading={batch.batchLoading}
        consequenceActivate="Las unidades activadas volverán a aparecer en las listas activas."
        consequenceDeactivate="Las unidades desactivadas no aparecerán en las listas activas."
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}
        icon={<Ruler className="w-5 h-5" weight="duotone" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => drawerRef.current?.requestClose()}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingUnit ? 'Guardar Cambios' : 'Crear Unidad'}
            </button>
          </div>
        }
      >
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ej: Kilogramo, Pieza, Litro..."
              {...register('nombre')}
            />
            {errors.nombre && (
              <p className="text-xs text-red-500">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Abreviatura</label>
            <Input
              placeholder="Ej: kg, pz, lt, m..."
              {...register('abreviatura')}
              maxLength={10}
            />
            {errors.abreviatura && (
              <p className="text-xs text-red-500">{errors.abreviatura.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Abreviatura corta para mostrar en tablas y reportes
            </p>
          </div>
        </div>
      </Drawer>
    </PageHeader>
  );
}
