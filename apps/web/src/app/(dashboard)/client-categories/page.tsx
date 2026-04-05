'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { clientCategoryService } from '@/services/api';
import { ApiError } from '@/lib/api';
import { ClientCategory } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Edit2,
  Loader2,
  Upload,
  Download,
  ChevronDown,
  RefreshCw,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { UsersThree } from '@phosphor-icons/react';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function ClientCategoriesPage() {
  // State
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientCategory | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await clientCategoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    let filtered = categories;
    if (!showInactive) {
      filtered = filtered.filter(cat => cat.activo);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (cat) =>
          cat.nombre.toLowerCase().includes(term) ||
          cat.descripcion?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [categories, searchTerm, showInactive]);

  // Pagination
  const totalItems = filteredCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingCategory(null);
    reset({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: ClientCategory) => {
    setEditingCategory(category);
    reset({ nombre: category.nombre, descripcion: category.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (category: ClientCategory) => {
    try {
      setTogglingId(category.id);
      const newActivo = !category.activo;
      await clientCategoryService.toggleActivo(category.id, newActivo);
      toast.success(newActivo ? `"${category.nombre}" activada` : `"${category.nombre}" desactivada`);
      setCategories(prev => prev.map(c => c.id === category.id ? { ...c, activo: newActivo } : c));
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || 'Error al cambiar estado');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await clientCategoryService.delete(id);
      toast.success('Categoría eliminada');
      await loadCategories();
    } catch {
      toast.error('Error al eliminar la categoría');
    }
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingCategory) {
        await clientCategoryService.update(editingCategory.id, data);
        toast.success(`Categoría "${data.nombre}" actualizada`);
      } else {
        await clientCategoryService.create(data);
        toast.success(`Categoría "${data.nombre}" creada`);
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ocurrió un error');
    } finally {
      setActionLoading(false);
    }
  });


  return (
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Categorías de clientes' },
        ]}
        title="Categorías de clientes"
        subtitle={totalItems > 0 ? `${totalItems} categoría${totalItems !== 1 ? 's' : ''}` : undefined}
        actions={
          <>
            <div className="relative" data-tour="client-categories-import-export">
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
                      onClick={async () => { setShowDataMenu(false); try { await exportToCsv('categorias-clientes'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
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
              data-tour="client-categories-create-btn"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva categoría</span>
            </button>
          </>
        }
      >
            {/* Search Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar categoría..."
                dataTour="client-categories-search"
              />
              <button
                onClick={loadCategories}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              <div data-tour="client-categories-toggle-inactive" className="ml-auto">
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
              {!loading && paginatedCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <UsersThree className="w-8 h-8 text-muted-foreground mb-3" weight="duotone" />
                  <p className="text-sm text-gray-500">
                    {searchTerm ? 'No se encontraron categorías' : 'No hay categorías'}
                  </p>
                </div>
              ) : (
                paginatedCategories.map((category) => (
                  <div
                    key={category.id}
                    className={`border border-gray-200 rounded-lg p-3 bg-white ${!category.activo ? 'opacity-60' : ''}`}
                  >
                    {/* Row 1: Icon + Name/Description */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <UsersThree className="w-5 h-5 text-white" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {category.nombre}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{category.descripcion || 'Sin descripción'}</div>
                      </div>
                    </div>
                    {/* Row 2: Actions */}
                    <div className="flex items-center justify-end gap-3">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                        <span>Editar</span>
                      </button>
                      {deleteConfirmId === category.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { handleDelete(category.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                          <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirmId(category.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                      )}
                      <ActiveToggle
                        isActive={category.activo}
                        onToggle={() => handleToggleActive(category)}
                        disabled={loading}
                        isLoading={togglingId === category.id}
                        title={category.activo ? 'Desactivar categoría' : 'Activar categoría'}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Table */}
            <div data-tour="client-categories-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
              {/* Table Header - Always visible */}
              <div className="min-w-[600px] flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200">
                <div className="w-[80px] text-[11px] font-medium text-gray-500">ID</div>
                <div className="flex-1 text-[11px] font-medium text-gray-500">Nombre</div>
                <div className="flex-1 text-[11px] font-medium text-gray-500">Descripción</div>
                <div className="w-[50px] text-[11px] font-medium text-gray-500 text-center">Activo</div>
                <div className="w-16"></div>
              </div>

              {/* Table Body - With loading overlay */}
              <div className="relative min-h-[200px]">
                <TableLoadingOverlay loading={loading} message="Cargando categorías..." />

                {/* Empty State */}
                {!loading && paginatedCategories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 py-20">
                    <UsersThree className="w-10 h-10 text-muted-foreground mb-4" weight="duotone" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay categorías</h3>
                    <p className="text-sm text-gray-500 text-center">
                      {searchTerm
                        ? 'No se encontraron categorías con ese término'
                        : 'Crea tu primera categoría de clientes para comenzar'}
                    </p>
                  </div>
                ) : (
                  /* Table Rows - With opacity transition */
                  <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    {paginatedCategories.map((category) => (
                      <div
                        key={category.id}
                        className={`min-w-[600px] flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors ${!category.activo ? 'opacity-50' : ''}`}
                      >
                        <div className="w-[80px] text-[13px] font-mono text-gray-500">
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
                            disabled={loading}
                            isLoading={togglingId === category.id}
                            title={category.activo ? 'Desactivar categoría' : 'Activar categoría'}
                          />
                        </div>
                        <div className="w-16 flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(category)}
                            disabled={loading}
                            className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {deleteConfirmId === category.id ? (
                            <>
                              <button onClick={() => { handleDelete(category.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirmId(category.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="categorías"
              loading={loading}
              className="pt-4"
            />

        {/* Create/Edit Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          icon={<UsersThree className="w-5 h-5" weight="duotone" />}
          width="sm"
          isDirty={isDirty}
          onSave={handleSubmit}
          footer={
            <div data-tour="client-categories-drawer-actions" className="flex items-center justify-end gap-3">
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
          <form onSubmit={handleSubmit} data-tour="client-categories-form" className="p-6 space-y-4">
            <div data-tour="client-categories-drawer-name" className="space-y-2">
              <label className="text-sm font-medium">
                Nombre <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ej: Mayorista, VIP, Distribuidor..."
                {...register('nombre')}
              />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>

            <div data-tour="client-categories-drawer-description" className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                placeholder="Descripción opcional de la categoría"
                {...register('descripcion')}
              />
            </div>
          </form>
        </Drawer>

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="categorias-clientes"
          entityLabel="categorías"
          onSuccess={loadCategories}
        />
      </PageHeader>
  );
}
