'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { ProductCategory } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ListPagination } from '@/components/ui/ListPagination';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import {
  Plus,
  Edit2,
  Package,
  Loader2,
  Check,
  Minus,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { Tag } from '@phosphor-icons/react';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function ProductCategoriesPage() {
  // State
  const [categories, setCategories] = useState<ProductCategory[]>([]);
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
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get<ProductCategory[]>('/categorias-productos', {
        params: { incluirInactivos: showInactive || undefined },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [showInactive]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.nombre.toLowerCase().includes(term) ||
        cat.descripcion?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // Pagination
  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Batch operations
  const visibleIds = paginatedCategories.map(c => c.id);
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
    setEditingCategory(null);
    reset({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    reset({ nombre: category.nombre, descripcion: category.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingCategory) {
        await api.put(`/categorias-productos/${editingCategory.id}`, data);
        toast.success(`Categoría "${data.nombre}" actualizada`);
      } else {
        await api.post('/categorias-productos', data);
        toast.success(`Categoría "${data.nombre}" creada`);
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Ocurrió un error al guardar la categoría';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  });

  // Individual toggle active/inactive
  const handleToggleActive = async (category: ProductCategory) => {
    try {
      setTogglingId(category.id);
      const newActive = !category.activo;
      const result = await api.patch<{ actualizado?: boolean; message?: string }>(`/categorias-productos/${category.id}/activo`, { activo: newActive });
      if (result.data.actualizado) {
        toast.success(newActive ? 'Categoría activada' : 'Categoría desactivada');
        if (!showInactive && !newActive) {
          setCategories(prev => prev.filter(c => c.id !== category.id));
        } else {
          setCategories(prev => prev.map(c =>
            c.id === category.id ? { ...c, activo: newActive } : c
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
      await api.patch('/categorias-productos/batch-toggle', { ids, activo });
      toast.success(
        `${ids.length} categoría${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''}`
      );
      batch.completeBatch();
      if (!showInactive && !activo) {
        setCategories(prev => prev.filter(c => !ids.includes(c.id)));
      } else {
        setCategories(prev => prev.map(c =>
          ids.includes(c.id) ? { ...c, activo } : c
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
        { label: 'Categorías de productos' },
      ]}
      title="Categorías de productos"
      subtitle={totalItems > 0 ? `${totalItems} categoría${totalItems !== 1 ? 's' : ''}` : undefined}
      actions={
        <>
          <div className="relative" data-tour="product-categories-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('categorias-productos'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
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
            data-tour="product-categories-create-btn"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva categoría</span>
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
            placeholder="Buscar categoría..."
            dataTour="product-categories-search"
          />
          <button
            onClick={loadCategories}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div data-tour="product-categories-toggle-inactive" className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalItems}
          entityLabel="categorías"
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
          {!loading && paginatedCategories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-purple-300 mb-3" />
              <p className="text-sm text-gray-500">
                {searchTerm ? 'No se encontraron categorías' : 'No hay categorías'}
              </p>
            </div>
          ) : (
            paginatedCategories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-3 bg-white"
              >
                {/* Row 1: Checkbox + Icon + Name/Description */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => batch.handleToggleSelect(category.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(category.id)
                        ? 'bg-success border-success text-success-foreground'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {batch.selectedIds.has(category.id) && <Check className="w-3 h-3" />}
                  </button>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-orange-600" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {category.nombre}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{category.descripcion || 'Sin descripción'}</div>
                  </div>
                </div>
                {/* Row 2: Toggle + Actions */}
                <div className="flex items-center justify-between">
                  <ActiveToggle
                    isActive={category.activo}
                    onToggle={() => handleToggleActive(category)}
                    isLoading={togglingId === category.id}
                  />
                  <button
                    onClick={() => handleOpenEdit(category)}
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
        <div data-tour="product-categories-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="min-w-[600px] flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200">
            <div className="w-[28px] flex items-center justify-center">
              <button
                onClick={batch.handleSelectAllVisible}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  batch.allVisibleSelected
                    ? 'bg-success border-success text-success-foreground'
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
            <div className="w-[60px] text-[11px] font-medium text-gray-500 uppercase">ID</div>
            <div className="flex-1 text-[11px] font-medium text-gray-500 uppercase">Nombre</div>
            <div className="flex-1 text-[11px] font-medium text-gray-500 uppercase">Descripción</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
            <div className="w-8"></div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando categorías..." />

            {!loading && paginatedCategories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Package className="w-16 h-16 text-purple-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay categorías</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron categorías con ese término'
                    : 'Crea tu primera categoría de productos para comenzar'}
                </p>
              </div>
            ) : (
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedCategories.map((category) => (
                  <div
                    key={category.id}
                    className="min-w-[600px] flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => batch.handleToggleSelect(category.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(category.id)
                            ? 'bg-success border-success text-success-foreground'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(category.id) && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="w-[60px] text-[13px] font-mono text-gray-500">
                      {category.id}
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-gray-900">
                      {category.nombre}
                    </div>
                    <div className="flex-1 text-[13px] text-gray-500 truncate pr-4">
                      {category.descripcion || '-'}
                    </div>
                    <div className="w-[50px] flex items-center justify-center">
                      <ActiveToggle
                        isActive={category.activo}
                        onToggle={() => handleToggleActive(category)}
                        isLoading={togglingId === category.id}
                      />
                    </div>
                    <div className="w-8 flex justify-center">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        disabled={loading}
                        className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-amber-400 hover:text-amber-600" />
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
          itemLabel="categorías"
          loading={loading}
        />
      </div>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="categorias-productos"
        entityLabel="categorías de productos"
        onSuccess={() => loadCategories()}
      />

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="categorías"
        loading={batch.batchLoading}
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        icon={<Tag className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div data-tour="product-categories-drawer-actions" className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="button" variant="success" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} data-tour="product-categories-form" className="p-6 space-y-4">
          <div data-tour="product-categories-drawer-name" className="space-y-2">
            <label className="text-sm font-medium">
              Nombre <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="Ej: Electrónicos, Ropa, Alimentos..."
              {...register('nombre')}
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div data-tour="product-categories-drawer-description" className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Input
              placeholder="Descripción opcional de la categoría"
              {...register('descripcion')}
            />
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
