'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InventoryItem } from '@/types/inventory';
import { inventoryService, UpdateInventoryRequest } from '@/services/api/inventory';
import { productService } from '@/services/api/products';
import { Product } from '@/types';
import { toast } from '@/hooks/useToast';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Search,
  AlertTriangle,
  Upload,
  Trash2,
  Warehouse,
  Package,
} from 'lucide-react';
import { Package as PackageIcon } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';

const inventorySchema = z.object({
  productoId: z.number(),
  cantidadActual: z.number().min(0, 'Mínimo 0'),
  stockMinimo: z.number().min(0, 'Mínimo 0'),
  stockMaximo: z.number().min(0, 'Mínimo 0'),
});
type InventoryFormData = z.infer<typeof inventorySchema>;
export default function InventoryPage() {
  const drawerRef = useRef<DrawerHandle>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Products for create modal
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<InventoryFormData>({
    resolver: zodResolver(inventorySchema),
    defaultValues: { productoId: 0, cantidadActual: 0, stockMinimo: 0, stockMaximo: 0 },
  });

  // Image state (separate from form)
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no puede ser mayor a 5MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleDeleteImage = async () => {
    const productId = modalMode === 'edit' ? selectedItem?.productId : watch('productoId');
    if (!productId) return;
    try {
      setUploadingImage(true);
      await productService.deleteProductImage(productId);
      setCurrentImageUrl(null);
      setImageFile(null);
      setImagePreview(null);
      toast.success('Imagen eliminada');
      fetchInventory();
    } catch {
      toast.error('Error al eliminar la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryService.getInventoryItems({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
      });
      setInventoryItems(response.items);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      setError('Error al cargar el inventario. Intenta de nuevo.');
      toast.error('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      // Obtener productos y TODOS los inventarios en paralelo
      const [productsRes, allInventory] = await Promise.all([
        productService.getProducts({ page: 1, limit: 500 }),
        inventoryService.getInventoryItems({ page: 1, limit: 9999 }),
      ]);
      // Filtrar productos que ya tienen inventario
      const existingProductIds = new Set(allInventory.items.map(item => String(item.productId)));
      const availableProducts = (productsRes.products || []).filter(
        p => !existingProductIds.has(String(p.id))
      );
      setProducts(availableProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      toast.error('Error al cargar los productos disponibles');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Open create modal
  const handleOpenCreate = () => {
    fetchProducts();
    setModalMode('create');
    setSelectedItem(null);
    resetForm({ productoId: 0, cantidadActual: 0, stockMinimo: 0, stockMaximo: 0 });
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    setModalOpen(true);
  };

  // Open edit modal
  const handleOpenEdit = (item: InventoryItem) => {
    setModalMode('edit');
    setSelectedItem(item);
    resetForm({
      productoId: Number(item.productId),
      cantidadActual: item.warehouseQuantity,
      stockMinimo: item.minStock,
      stockMaximo: item.maxStock || 0,
    });
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(item.product?.images?.[0] || null);
    setModalOpen(true);
  };

  // Submit form
  const handleSubmit = rhfSubmit(async (data) => {
    if (modalMode === 'create') {
      if (!data.productoId) {
        toast.error('Selecciona un producto');
        return;
      }
      try {
        setSubmitting(true);
        await inventoryService.createInventory(data);
        // Upload image if selected
        if (imageFile) {
          try {
            await productService.uploadProductImage(data.productoId, imageFile);
          } catch {
            toast.error('Inventario creado, pero hubo un error al subir la imagen');
          }
        }
        toast.success('Inventario creado correctamente');
        setModalOpen(false);
        fetchInventory();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Error al crear inventario';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!selectedItem) return;
      try {
        setSubmitting(true);
        const updateData: UpdateInventoryRequest = {
          cantidadActual: data.cantidadActual,
          stockMinimo: data.stockMinimo,
          stockMaximo: data.stockMaximo,
        };
        await inventoryService.updateInventory(Number(selectedItem.id), updateData);
        // Upload image if selected
        if (imageFile) {
          try {
            await productService.uploadProductImage(selectedItem.productId, imageFile);
          } catch {
            toast.error('Inventario actualizado, pero hubo un error al subir la imagen');
          }
        }
        toast.success('Inventario actualizado correctamente');
        setModalOpen(false);
        fetchInventory();
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Error al actualizar inventario';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Calcular rango de items mostrados
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

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

  const getProductColor = (index: number) => {
    const colors = [
      { bg: 'bg-red-100', icon: 'text-red-600' },
      { bg: 'bg-blue-100', icon: 'text-blue-600' },
      { bg: 'bg-green-100', icon: 'text-green-600' },
      { bg: 'bg-yellow-100', icon: 'text-yellow-600' },
      { bg: 'bg-purple-100', icon: 'text-purple-600' },
    ];
    return colors[index % colors.length];
  };

  const isLowStock = (item: InventoryItem) => {
    return item.minStock > 0 && item.warehouseQuantity <= item.minStock;
  };

  return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-8 sm:py-6">
          <Breadcrumb items={[
            { label: 'Inicio', href: '/dashboard' },
            { label: 'Inventario de almacén' },
          ]} />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Inventario de almacén
            </h1>
            <div className="flex items-center gap-2">
            <button
              data-tour="inventory-add-btn"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo producto</span>
            </button>
<button className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span>Descargar</span>
            </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-4 py-4 sm:px-8 sm:py-5 overflow-auto">
          {/* Search */}
          <div data-tour="inventory-search" className="mb-4 relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button onClick={fetchInventory} className="ml-4 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          )}

          {/* Table */}
          <div data-tour="inventory-table" className="bg-white border border-gray-200 rounded overflow-x-auto">
            {/* Mobile Cards */}
            <div className="sm:hidden">
              {loading && (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                    <span className="text-sm text-gray-500">Cargando inventario...</span>
                  </div>
                </div>
              )}

              {!loading && inventoryItems.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <div className="text-center px-4">
                    <Package className="w-12 h-12 mx-auto mb-4 text-indigo-300" />
                    <p className="text-lg font-medium">No hay inventario</p>
                    <p className="text-sm mb-4">
                      {searchTerm ? 'No se encontraron resultados' : 'No hay productos en inventario'}
                    </p>
                    {!searchTerm && (
                      <button
                        onClick={handleOpenCreate}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                      >
                        Agregar producto al inventario
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3">
                  {inventoryItems.map((item, index) => {
                    const color = getProductColor(index);
                    const lowStock = isLowStock(item);
                    return (
                      <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start gap-2.5">
                          {item.product?.images && item.product.images.length > 0 ? (
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              className="w-10 h-10 rounded object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className={`w-10 h-10 rounded ${color.bg} flex items-center justify-center flex-shrink-0`}>
                              <PackageIcon className={`w-5 h-5 ${color.icon}`} weight="duotone" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.product?.name || `Producto #${item.productId}`}
                            </p>
                            <p className="text-xs text-gray-500">{item.product?.code || '-'}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span className={`font-medium ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.totalQuantity?.toLocaleString() || 0} {item.product?.unit || 'PZA'}
                          </span>
                          {lowStock && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">
                              <AlertTriangle className="w-3 h-3" />
                              Stock bajo
                            </span>
                          )}
                          <span>Min: {item.minStock || '-'}</span>
                          <span>Max: {item.maxStock || '-'}</span>
                        </div>
                        <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                          >
                            <Pencil className="w-3 h-3 text-amber-400" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[750px]">
                <div className="flex-1 text-xs font-semibold text-gray-700">Producto</div>
                <div className="w-[120px] text-xs font-semibold text-gray-700">Unidad</div>
                <div className="w-[120px] text-xs font-semibold text-gray-700 text-center flex items-center justify-center gap-1">Existencias <HelpTooltip tooltipKey="total-quantity" /></div>
                <div data-tour="inventory-stock-columns" className="w-[100px] text-xs font-semibold text-gray-700 text-center flex items-center justify-center gap-1">Stock mín. <HelpTooltip tooltipKey="min-stock" /></div>
                <div className="w-[100px] text-xs font-semibold text-gray-700 text-center flex items-center justify-center gap-1">Stock máx. <HelpTooltip tooltipKey="max-stock" /></div>
                <div className="w-[80px] text-xs font-semibold text-gray-700 text-center">Acciones</div>
              </div>

              <div className="relative min-h-[200px]">
                {loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      <span className="text-sm text-gray-500">Cargando inventario...</span>
                    </div>
                  </div>
                )}

                {!loading && inventoryItems.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Package className="w-12 h-12 mx-auto mb-4 text-indigo-300" />
                      <p className="text-lg font-medium">No hay inventario</p>
                      <p className="text-sm mb-4">
                        {searchTerm ? 'No se encontraron resultados' : 'No hay productos en inventario'}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={handleOpenCreate}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                        >
                          Agregar producto al inventario
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    {inventoryItems.map((item, index) => {
                      const color = getProductColor(index);
                      const lowStock = isLowStock(item);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center px-4 py-2.5 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[750px]"
                        >
                          <div className="flex-1 flex items-center gap-2.5">
                            {item.product?.images && item.product.images.length > 0 ? (
                              <img
                                src={item.product.images[0]}
                                alt={item.product.name}
                                className="w-8 h-8 rounded object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className={`w-8 h-8 rounded ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                <PackageIcon className={`w-4 h-4 ${color.icon}`} weight="duotone" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-[13px] font-medium text-gray-900 truncate">
                                {item.product?.name || `Producto #${item.productId}`}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {item.product?.code || '-'}
                              </div>
                            </div>
                          </div>

                          <div className="w-[120px] text-[13px] text-gray-700">
                            {item.product?.unit || 'PZA'}
                          </div>

                          <div className="w-[120px] text-center">
                            <span className={`text-[13px] font-medium ${lowStock ? 'text-red-600' : 'text-gray-700'}`}>
                              {item.totalQuantity?.toLocaleString() || 0}
                            </span>
                            {lowStock && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline-block ml-1" />
                            )}
                          </div>

                          <div className="w-[100px] text-[13px] text-gray-500 text-center">
                            {item.minStock || '-'}
                          </div>

                          <div className="w-[100px] text-[13px] text-gray-500 text-center">
                            {item.maxStock || '-'}
                          </div>

                          <div className="w-[80px] flex justify-center">
                            <button
                              onClick={() => handleOpenEdit(item)}
                              className="p-1.5 hover:bg-green-50 rounded transition-colors"
                              title="Editar inventario"
                            >
                              <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination */}
          {(inventoryItems.length > 0 || loading) && totalItems > 0 && (
            <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Mostrando {startItem}-{endItem} de {totalItems} inventarios
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

        {/* Create/Edit Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalMode === 'create' ? 'Agregar Inventario' : 'Editar Inventario'}
          icon={<Warehouse className="w-5 h-5 text-green-600" />}
          width="md"
          isDirty={isDirty || imageFile !== null}
          onSave={handleSubmit}
          footer={
            <div className="flex justify-end gap-3">
              <button
                onClick={() => drawerRef.current?.requestClose()}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || (modalMode === 'create' && !watch('productoId'))}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />}
                {submitting ? 'Guardando...' : modalMode === 'create' ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          }
        >
          <div data-tour="inventory-form" className="p-6 space-y-4">
            {modalMode === 'create' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto <span className="text-red-500">*</span>
                </label>
                {loadingProducts ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                    Cargando productos...
                  </div>
                ) : products.length === 0 ? (
                  <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span>Todos los productos ya tienen inventario registrado. Agrega un nuevo producto primero.</span>
                    </div>
                  </div>
                ) : (
                  <SearchableSelect
                    options={products.map(p => ({ value: Number(p.id), label: p.name, description: p.code, imageUrl: p.images?.[0] || '' }))}
                    value={watch('productoId') || null}
                    onChange={(val) => {
                      const id = val ? Number(val) : 0;
                      setValue('productoId', id, { shouldDirty: true });
                      // Load existing product image
                      const prod = products.find(p => Number(p.id) === id);
                      setCurrentImageUrl(prod?.images?.[0] || null);
                      setImageFile(null);
                      setImagePreview(null);
                    }}
                    placeholder="Seleccionar producto..."
                    searchPlaceholder="Buscar producto..."
                  />
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-gray-700">
                  {selectedItem?.product?.name || `Producto #${selectedItem?.productId}`}
                  {selectedItem?.product?.code && (
                    <span className="text-gray-400 ml-2">({selectedItem.product.code})</span>
                  )}
                </div>
              </div>
            )}

            {/* Imagen del producto */}
            {(modalMode === 'edit' || watch('productoId') > 0) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagen del producto
                </label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : currentImageUrl ? (
                      <img src={currentImageUrl} alt="Producto" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 cursor-pointer transition-colors w-fit">
                      <Upload className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{currentImageUrl || imagePreview ? 'Cambiar imagen' : 'Subir imagen'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                    {(currentImageUrl || imagePreview) && (
                      <button
                        type="button"
                        onClick={handleDeleteImage}
                        disabled={uploadingImage}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3 h-3 text-red-400 hover:text-red-600" />
                        {uploadingImage ? 'Eliminando...' : 'Eliminar imagen'}
                      </button>
                    )}
                    <p className="text-xs text-gray-400">JPEG, PNG o WebP. Maximo 5 MB.</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad actual <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                {...register('cantidadActual', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                placeholder="0"
              />
              {errors.cantidadActual && (
                <p className="mt-1 text-xs text-red-600">{errors.cantidadActual.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Stock minimo <HelpTooltip tooltipKey="min-stock" /></label>
                <input
                  type="number"
                  min="0"
                  {...register('stockMinimo', { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="0"
                />
                {errors.stockMinimo && (
                  <p className="mt-1 text-xs text-red-600">{errors.stockMinimo.message}</p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Stock maximo <HelpTooltip tooltipKey="max-stock" /></label>
                <input
                  type="number"
                  min="0"
                  {...register('stockMaximo', { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="0"
                />
                {errors.stockMaximo && (
                  <p className="mt-1 text-xs text-red-600">{errors.stockMaximo.message}</p>
                )}
              </div>
            </div>
          </div>
        </Drawer>
      </div>
  );
}
