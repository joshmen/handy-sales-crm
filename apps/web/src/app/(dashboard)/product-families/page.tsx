'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Boxes,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  X,
  Power,
  PowerOff,
  FolderTree,
} from 'lucide-react';
import { Package } from '@phosphor-icons/react';

interface ProductFamily {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

interface ProductFamilyForm {
  nombre: string;
  descripcion: string;
}

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function ProductFamiliesPage() {
  // State
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingFamily, setSavingFamily] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Modal states
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ProductFamily | null>(null);
  const [deletingFamily, setDeletingFamily] = useState<ProductFamily | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load families
  const loadFamilies = async () => {
    try {
      setLoading(true);
      const response = await api.get<ProductFamily[]>('/familias-productos');
      setFamilies(response.data);
    } catch (error) {
      console.error('Error loading families:', error);
      toast.error('No se pudieron cargar las familias de productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  // Filtered families
  const filteredFamilies = useMemo(() => {
    let result = families;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (family) =>
          family.nombre.toLowerCase().includes(term) ||
          family.descripcion?.toLowerCase().includes(term)
      );
    }

    if (!showInactive) {
      result = result.filter((family) => family.activo);
    }

    return result;
  }, [families, searchTerm, showInactive]);

  // Pagination
  const totalItems = filteredFamilies.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedFamilies = filteredFamilies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page and clear selection when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingFamily(null);
    reset({ nombre: '', descripcion: '' });
    setShowFamilyForm(true);
  };

  const handleOpenEdit = (family: ProductFamily) => {
    setEditingFamily(family);
    reset({ nombre: family.nombre, descripcion: family.descripcion || '' });
    setShowFamilyForm(true);
  };

  const handleOpenDelete = (family: ProductFamily) => {
    setDeletingFamily(family);
    setShowDeleteConfirm(true);
  };

  const handleSaveFamily = rhfSubmit(async (data) => {
    try {
      setSavingFamily(true);

      if (editingFamily) {
        await api.put(`/familias-productos/${editingFamily.id}`, data);
        toast.success(`Familia "${data.nombre}" actualizada exitosamente`);
      } else {
        await api.post('/familias-productos', data);
        toast.success(`Familia "${data.nombre}" creada exitosamente`);
      }

      setShowFamilyForm(false);
      await loadFamilies();
    } catch (error: any) {
      console.error('Error al guardar familia:', error);
      const message = error?.response?.data?.message || 'Error al guardar la familia';
      toast.error(message);
    } finally {
      setSavingFamily(false);
    }
  });

  const handleCancelForm = () => {
    setShowFamilyForm(false);
    setEditingFamily(null);
  };

  const handleDelete = async () => {
    if (!deletingFamily) return;

    try {
      setSavingFamily(true);
      await api.delete(`/familias-productos/${deletingFamily.id}`);
      toast.success(`Familia "${deletingFamily.nombre}" eliminada exitosamente`);
      setShowDeleteConfirm(false);
      setDeletingFamily(null);
      await loadFamilies();
    } catch (error: any) {
      console.error('Error al eliminar:', error);
      const message = error?.response?.data?.message || 'Ocurrió un error al eliminar la familia';
      toast.error(message);
      setShowDeleteConfirm(false);
      setDeletingFamily(null);
    } finally {
      setSavingFamily(false);
    }
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (family: ProductFamily) => {
    try {
      setTogglingId(family.id);
      const newActivo = !family.activo;
      await api.patch(`/familias-productos/${family.id}/activo`, { activo: newActivo });
      toast.success(newActivo ? 'Familia activada' : 'Familia desactivada');
      if (!showInactive && !newActivo) {
        setFamilies(prev => prev.filter(f => f.id !== family.id));
      } else {
        setFamilies(prev => prev.map(f =>
          f.id === family.id ? { ...f, activo: newActivo } : f
        ));
      }
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      const message = error?.response?.data?.message || 'Error al cambiar el estado de la familia';
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
    const visibleIds = paginatedFamilies.map(f => f.id);
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

      await api.patch('/familias-productos/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} familia${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
      if (!showInactive && !activo) {
        setFamilies(prev => prev.filter(f => !ids.includes(f.id)));
      } else {
        setFamilies(prev => prev.map(f =>
          ids.includes(f.id) ? { ...f, activo } : f
        ));
      }
    } catch (error: any) {
      console.error('Error en batch toggle:', error);
      const message = error?.response?.data?.message || 'Error al cambiar el estado de las familias';
      toast.error(message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  // Computed selection state
  const visibleIds = paginatedFamilies.map(f => f.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Familias de productos' },
        ]} />

        {/* Title Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Familias de productos
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreate}
              data-tour="product-families-create-btn"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva familia</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-64" data-tour="product-families-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar familia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Toggle para mostrar inactivas */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-600">Mostrar inactivas</span>
            <button
              onClick={() => setShowInactive(!showInactive)}
              data-tour="product-families-toggle-inactive"
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                showInactive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={showInactive ? 'Mostrando todas las familias' : 'Solo familias activas'}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                showInactive ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Selection Action Bar */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-700">
                {selectedCount} seleccionada{selectedCount > 1 ? 's' : ''}
              </span>
              {selectedCount < totalItems && (
                <span className="text-xs text-blue-500">
                  de {totalItems} familias
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

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
          {!loading && paginatedFamilies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Boxes className="w-12 h-12 text-pink-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No se encontraron familias' : 'No hay familias'}
              </p>
            </div>
          ) : (
            paginatedFamilies.map((family) => (
              <div
                key={family.id}
                className={`border border-gray-200 rounded-lg p-3 bg-white ${
                  !family.activo ? 'opacity-60' : ''
                }`}
              >
                {/* Row 1: Icon + Name/Description + Checkbox + Toggle */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-purple-600" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {family.nombre}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{family.descripcion || 'Sin descripción'}</div>
                  </div>
                  <button
                    onClick={() => handleToggleSelect(family.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedIds.has(family.id)
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {selectedIds.has(family.id) && <Check className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => handleToggleActive(family)}
                    disabled={togglingId === family.id || loading}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                      family.activo ? 'bg-green-500' : 'bg-gray-300'
                    } ${togglingId === family.id ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                        family.activo ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    >
                      {family.activo ? (
                        <Check className="w-2.5 h-2.5 text-green-600" />
                      ) : (
                        <X className="w-2.5 h-2.5 text-gray-400" />
                      )}
                    </span>
                  </button>
                </div>
                {/* Row 2: Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(family)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                    <span>Editar</span>
                  </button>
                  <button
                    onClick={() => handleOpenDelete(family)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div data-tour="product-families-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="min-w-[600px] flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200">
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
            <div className="w-[60px] text-xs font-semibold text-gray-600">ID</div>
            <div className="flex-1 text-xs font-semibold text-gray-600">Nombre</div>
            <div className="flex-1 text-xs font-semibold text-gray-600">Descripción</div>
            <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
            <div className="w-[45px] text-xs font-semibold text-gray-600 text-center">Editar</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="text-sm text-gray-500">Cargando familias...</span>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && paginatedFamilies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Boxes className="w-16 h-16 text-pink-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay familias</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron familias con ese término'
                    : 'Crea tu primera familia de productos para comenzar'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Familia
                  </button>
                )}
              </div>
            ) : (
              /* Table Rows */
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedFamilies.map((family) => (
                  <div
                    key={family.id}
                    className={`min-w-[600px] flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      !family.activo ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSelect(family.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedIds.has(family.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {selectedIds.has(family.id) && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="w-[60px] text-[13px] font-mono text-gray-500">
                      {family.id}
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-gray-900">
                      {family.nombre}
                    </div>
                    <div className="flex-1 text-[13px] text-gray-500 truncate pr-4">
                      {family.descripcion || '-'}
                    </div>
                    <div className="w-[50px] flex items-center justify-center">
                      <button
                        onClick={() => handleToggleActive(family)}
                        disabled={togglingId === family.id || loading}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                          family.activo ? 'bg-green-500' : 'bg-gray-300'
                        } ${togglingId === family.id ? 'opacity-50' : ''}`}
                        title={family.activo ? 'Desactivar familia' : 'Activar familia'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                          family.activo ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                          {family.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                        </span>
                      </button>
                    </div>
                    <div className="w-[45px] flex items-center justify-center">
                      <button
                        onClick={() => handleOpenEdit(family)}
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

        {/* Pagination */}
        {(paginatedFamilies.length > 0 || loading) && totalItems > 0 && (
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Mostrando {startItem}-{endItem} de {totalItems} familias
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
          title={`¿${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} familia${selectedCount > 1 ? 's' : ''}?`}
        >
          <div className="py-4">
            <p className="text-gray-500">
              ¿Estás seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
              <strong>{selectedCount}</strong> familia{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}?
              {batchAction === 'deactivate' && ' Las familias desactivadas no aparecerán en las listas activas.'}
              {batchAction === 'activate' && ' Las familias activadas volverán a aparecer en las listas activas.'}
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
              {batchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
            </button>
          </div>
        </Modal>
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={showFamilyForm}
        onClose={handleCancelForm}
        title={editingFamily ? 'Editar Familia' : 'Nueva Familia'}
        icon={<FolderTree className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSaveFamily}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => drawerRef.current?.requestClose()}
              disabled={savingFamily}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveFamily}
              disabled={savingFamily}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {savingFamily && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingFamily ? 'Guardar Cambios' : 'Crear Familia'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveFamily} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('nombre')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Ej: Implantes, Herramientas, Accesorios..."
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              {...register('descripcion')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Descripción opcional de la familia"
            />
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setDeletingFamily(null); }}
          title="¿Eliminar familia?"
        >
          <div className="py-4">
            <p className="text-gray-500">
              ¿Estás seguro de que deseas eliminar la familia{' '}
              <strong>&quot;{deletingFamily?.nombre}&quot;</strong>? Esta acción no se puede deshacer.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeletingFamily(null); }}
              disabled={savingFamily}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={savingFamily}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {savingFamily && <Loader2 className="w-4 h-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
