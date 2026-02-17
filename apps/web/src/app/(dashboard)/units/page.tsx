'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { Unit, UnitForm } from '@/types/catalogs';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Ruler } from '@phosphor-icons/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const unitFormSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  abreviatura: z.string().max(10, 'Máximo 10 caracteres').optional(),
});

export default function UnitsPage() {
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

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
  useEffect(() => {
    loadUnits();
  }, []);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const response = await api.get<Unit[]>('/unidades-medida');
      setUnits(response.data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las unidades de medida',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedUnits = filteredUnits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

  const handleOpenDelete = (unit: Unit) => {
    setSelectedUnit(unit);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = handleFormSubmit(async (formData) => {
    try {
      setActionLoading(true);

      if (editingUnit) {
        await api.put(`/unidades-medida/${editingUnit.id}`, formData);
        toast({
          title: 'Unidad actualizada',
          description: `La unidad "${formData.nombre}" se actualizó exitosamente`,
        });
      } else {
        await api.post('/unidades-medida', formData);
        toast({
          title: 'Unidad creada',
          description: `La unidad "${formData.nombre}" se creó exitosamente`,
        });
      }

      setIsModalOpen(false);
      await loadUnits();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Ocurrió un error al guardar la unidad';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  });

  const handleDelete = async () => {
    if (!selectedUnit) return;

    try {
      setActionLoading(true);
      await api.delete(`/unidades-medida/${selectedUnit.id}`);

      toast({
        title: 'Unidad eliminada',
        description: `La unidad "${selectedUnit.nombre}" se eliminó exitosamente`,
      });

      setIsDeleteModalOpen(false);
      setSelectedUnit(null);
      await loadUnits();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Ocurrió un error al eliminar la unidad';
      toast({
        title: 'No se puede eliminar',
        description: message,
        variant: 'destructive',
      });
      setIsDeleteModalOpen(false);
      setSelectedUnit(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Unidades de medida' },
        ]} />

        {/* Title Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Unidades de medida
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              data-tour="units-create-btn"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva unidad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="px-8 py-6">
          {/* Search Row */}
          <div className="flex items-center justify-between mb-4">
            <div className="relative w-64" data-tour="units-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar unidad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Mobile Cards - Visible only on mobile */}
          <div className="sm:hidden space-y-3">
            {/* Loading State */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-green-600 mb-2" />
                <span className="text-sm text-gray-500">Cargando unidades...</span>
              </div>
            )}

            {/* Empty State */}
            {!loading && paginatedUnits.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Ruler className="w-16 h-16 text-indigo-300 mb-4" weight="duotone" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay unidades</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron unidades con ese término'
                    : 'Crea tu primera unidad de medida para comenzar'}
                </p>
              </div>
            )}

            {/* Cards */}
            {!loading && paginatedUnits.map((unit) => (
              <div
                key={unit.id}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                {/* Row 1: Icon + Name/Abbreviation */}
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

                  {unit.abreviatura && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono flex-shrink-0">
                      {unit.abreviatura}
                    </span>
                  )}
                </div>

                {/* Row 2: Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(unit)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleOpenDelete(unit)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table - Hidden on mobile */}
          <div data-tour="units-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Table Header - Always visible */}
            <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
              <div className="w-[80px] text-xs font-semibold text-gray-600">ID</div>
              <div className="flex-1 text-xs font-semibold text-gray-600">Nombre</div>
              <div className="w-[120px] text-xs font-semibold text-gray-600">Abreviatura</div>
              <div className="w-[100px] text-xs font-semibold text-gray-600 text-center">Acciones</div>
            </div>

            {/* Table Body - With loading overlay */}
            <div className="relative min-h-[200px]">
              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    <span className="text-sm text-gray-500">Cargando unidades...</span>
                  </div>
                </div>
              )}

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
                </div>
              ) : (
                /* Table Rows - With opacity transition */
                <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {paginatedUnits.map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-[80px] text-[13px] font-mono text-gray-500">
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
                      <div className="w-[100px] flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(unit)}
                          disabled={loading}
                          className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(unit)}
                          disabled={loading}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination - Always visible when there are items */}
          {(paginatedUnits.length > 0 || loading) && totalItems > 0 && (
            <div className={`flex items-center justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Mostrando {startItem}-{endItem} de {totalItems} unidades
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => !loading && setCurrentPage(page)}
                    disabled={loading}
                    className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}

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
      </div>

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

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar unidad?</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-gray-500">
              ¿Estás seguro de que deseas eliminar la unidad{' '}
              <strong>&quot;{selectedUnit?.nombre}&quot;</strong>? Esta
              acción no se puede deshacer.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedUnit(null);
              }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
