'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { unitService } from '@/services/api/units';
import { Unit } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ListPagination } from '@/components/ui/ListPagination';
import { api } from '@/lib/api';
import {
  Plus,
  Edit2,
  Ruler,
  Loader2,
  Check,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  abreviatura: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function UnitsPage() {
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', abreviatura: '' },
  });

  // Load units
  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await unitService.getAll();
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('No se pudieron cargar las unidades de medida');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  // Filtered units
  const filteredUnits = useMemo(() => {
    let result = units;
    if (!showInactive) {
      result = result.filter(u => u.activo);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.nombre.toLowerCase().includes(term) ||
          u.abreviatura?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [units, searchTerm, showInactive]);

  // Pagination
  const totalItems = filteredUnits.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUnits = filteredUnits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingUnit(null);
    reset({ nombre: '', abreviatura: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    reset({ nombre: unit.nombre, abreviatura: unit.abreviatura || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingUnit) {
        await unitService.update(editingUnit.id, data);
        toast.success(`Unidad "${data.nombre}" actualizada`);
      } else {
        await unitService.create(data);
        toast.success(`Unidad "${data.nombre}" creada`);
      }

      setIsModalOpen(false);
      await loadUnits();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message || 'Error al guardar la unidad';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  });

  // Toggle active/inactive
  const handleToggleActive = async (unit: Unit) => {
    try {
      setTogglingId(unit.id);
      const newActive = !unit.activo;
      await api.patch(`/unidades-medida/${unit.id}/activo`, { activo: newActive });
      toast.success(newActive ? 'Unidad activada' : 'Unidad desactivada');
      setUnits(prev => prev.map(u =>
        u.id === unit.id ? { ...u, activo: newActive } : u
      ));
    } catch {
      toast.error('Error al cambiar el estado');
    } finally {
      setTogglingId(null);
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await unitService.delete(id);
      toast.success('Unidad eliminada');
      await loadUnits();
    } catch {
      toast.error('Error al eliminar la unidad');
    }
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Productos', href: '/products' },
        { label: 'Unidades de medida' },
      ]}
      title="Unidades de medida"
      subtitle={totalItems > 0 ? `${totalItems} unidad${totalItems !== 1 ? 'es' : ''}` : undefined}
      actions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva unidad</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder="Buscar unidad..."
          />
          <button
            onClick={loadUnits}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
          {!loading && paginatedUnits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Ruler className="w-12 h-12 text-orange-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No se encontraron unidades' : 'No hay unidades de medida'}
              </p>
            </div>
          ) : (
            paginatedUnits.map((unit) => (
              <div
                key={unit.id}
                className={`border border-gray-200 rounded-lg p-3 bg-white ${!unit.activo ? 'opacity-60' : ''}`}
              >
                {/* Row 1: Icon + Name */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Ruler className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {unit.nombre}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">{unit.abreviatura || '-'}</div>
                  </div>
                </div>
                {/* Row 2: Toggle + Actions */}
                <div className="flex items-center justify-between">
                  <ActiveToggle
                    isActive={unit.activo}
                    onToggle={() => handleToggleActive(unit)}
                    isLoading={togglingId === unit.id}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(unit)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Editar</span>
                    </button>
                    {deleteConfirmId === unit.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { handleDelete(unit.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                        <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(unit.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="min-w-[500px] flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200">
            <div className="w-[60px] text-[11px] font-medium text-gray-500">ID</div>
            <div className="flex-1 text-[11px] font-medium text-gray-500">Nombre</div>
            <div className="w-[120px] text-[11px] font-medium text-gray-500">Abreviatura</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 text-center">Activo</div>
            <div className="w-16"></div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando unidades..." />

            {!loading && paginatedUnits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Ruler className="w-16 h-16 text-orange-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay unidades</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron unidades con ese término'
                    : 'Crea tu primera unidad de medida para comenzar'}
                </p>
              </div>
            ) : (
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedUnits.map((unit) => (
                  <div
                    key={unit.id}
                    className={`min-w-[500px] flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors ${!unit.activo ? 'opacity-50' : ''}`}
                  >
                    <div className="w-[60px] text-[13px] font-mono text-gray-500">
                      {unit.id}
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-gray-900">
                      {unit.nombre}
                    </div>
                    <div className="w-[120px] text-[13px] text-gray-500 font-mono">
                      {unit.abreviatura || '-'}
                    </div>
                    <div className="w-[50px] flex items-center justify-center">
                      <ActiveToggle
                        isActive={unit.activo}
                        onToggle={() => handleToggleActive(unit)}
                        isLoading={togglingId === unit.id}
                      />
                    </div>
                    <div className="w-16 flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(unit)}
                        disabled={loading}
                        className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                      </button>
                      {deleteConfirmId === unit.id ? (
                        <>
                          <button onClick={() => { handleDelete(unit.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(unit.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      )}
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

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}
        icon={<Ruler className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="button" variant="success" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingUnit ? 'Guardar Cambios' : 'Crear Unidad'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ej: Pieza, Kilogramo, Litro..."
              {...register('nombre')}
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Abreviatura</label>
            <Input
              placeholder="Ej: PZA, KG, LT..."
              {...register('abreviatura')}
            />
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
