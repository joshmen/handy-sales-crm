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
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { ProductCategory, ProductCategoryForm } from '@/types/catalogs';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Package,
  Loader2,
  ChevronLeft,
  ChevronRight,
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
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

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
      const response = await api.get<ProductCategory[]>('/categorias-productos');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las categorías',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedCategories = filteredCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

  const handleOpenDelete = (category: ProductCategory) => {
    setSelectedCategory(category);
    setIsDeleteModalOpen(true);
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingCategory) {
        await api.put(`/categorias-productos/${editingCategory.id}`, data);
        toast({
          title: 'Categoría actualizada',
          description: `La categoría "${data.nombre}" se actualizó exitosamente`,
        });
      } else {
        await api.post('/categorias-productos', data);
        toast({
          title: 'Categoría creada',
          description: `La categoría "${data.nombre}" se creó exitosamente`,
        });
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Ocurrió un error al guardar la categoría';
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
    if (!selectedCategory) return;

    try {
      setActionLoading(true);
      await api.delete(`/categorias-productos/${selectedCategory.id}`);

      toast({
        title: 'Categoría eliminada',
        description: `La categoría "${selectedCategory.nombre}" se eliminó exitosamente`,
      });

      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
      await loadCategories();
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Ocurrió un error al eliminar la categoría';
      toast({
        title: 'No se puede eliminar',
        description: message,
        variant: 'destructive',
      });
      setIsDeleteModalOpen(false);
      setSelectedCategory(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
          {/* Breadcrumb */}
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Categorías de productos' },
          ]} />

          {/* Title Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Categorías de productos
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenCreate}
                data-tour="product-categories-create-btn"
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva categoría</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-4 sm:px-8 sm:py-6">
            {/* Search Row */}
            <div className="flex items-center justify-between mb-4">
              <div className="relative w-64" data-tour="product-categories-search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    {/* Row 1: Icon + Name/Description */}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-orange-600" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {category.nombre}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{category.descripcion || 'Sin descripción'}</div>
                      </div>
                    </div>
                    {/* Row 2: Actions */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleOpenEdit(category)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleOpenDelete(category)}
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
            <div data-tour="product-categories-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
              {/* Table Header - Always visible */}
              <div className="min-w-[600px] flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200">
                <div className="w-[80px] text-xs font-semibold text-gray-600">ID</div>
                <div className="flex-1 text-xs font-semibold text-gray-600">Nombre</div>
                <div className="flex-1 text-xs font-semibold text-gray-600">Descripción</div>
                <div className="w-[100px] text-xs font-semibold text-gray-600 text-center">Acciones</div>
              </div>

              {/* Table Body - With loading overlay */}
              <div className="relative min-h-[200px]">
                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                      <span className="text-sm text-gray-500">Cargando categorías...</span>
                    </div>
                  </div>
                )}

                {/* Empty State */}
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
                  /* Table Rows - With opacity transition */
                  <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    {paginatedCategories.map((category) => (
                      <div
                        key={category.id}
                        className="min-w-[600px] flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
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
                        <div className="w-[100px] flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(category)}
                            disabled={loading}
                            className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(category)}
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
            {(paginatedCategories.length > 0 || loading) && totalItems > 0 && (
              <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Mostrando {startItem}-{endItem} de {totalItems} categorías
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
          title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
          icon={<Tag className="w-5 h-5" />}
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
                {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
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
                placeholder="Ej: Electrónicos, Ropa, Alimentos..."
                {...register('nombre')}
              />
              {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Input
                placeholder="Descripción opcional de la categoría"
                {...register('descripcion')}
              />
            </div>
          </div>
        </Drawer>

        {/* Delete Confirmation Modal */}
        <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>¿Eliminar categoría?</DialogTitle>
            </DialogHeader>

            <div className="py-4">
              <p className="text-gray-500">
                ¿Estás seguro de que deseas eliminar la categoría{' '}
                <strong>&quot;{selectedCategory?.nombre}&quot;</strong>? Esta
                acción no se puede deshacer.
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedCategory(null);
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
