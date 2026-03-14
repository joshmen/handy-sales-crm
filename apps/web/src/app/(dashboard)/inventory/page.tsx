'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InventoryItem } from '@/types/inventory';
import { inventoryService, UpdateInventoryRequest } from '@/services/api/inventory';
import { productService } from '@/services/api/products';
import { Product } from '@/types';
import { toast } from '@/hooks/useToast';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import {
  Download,
  Plus,
  Pencil,
  AlertTriangle,
  Upload,
  Warehouse,
  Package,
  RefreshCw,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { ListPagination } from '@/components/ui/ListPagination';
import { SearchBar } from '@/components/common/SearchBar';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Package as PackageIcon, CaretRight } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';

const inventorySchema = z.object({
  productoId: z.number(),
  cantidadActual: z.number().min(0, 'Mínimo 0'),
  stockMinimo: z.number().min(0, 'Mínimo 0'),
  stockMaximo: z.number().min(0, 'Mínimo 0'),
});
type InventoryFormData = z.infer<typeof inventorySchema>;
// Whitelist segura — solo estos valores son válidos, cualquier otro se ignora
const ALERTAS_VALIDAS = ['stock_bajo', 'critico'] as const;
type AlertaInventario = typeof ALERTAS_VALIDAS[number];

const ALERTA_LABELS: Record<AlertaInventario, string> = {
  stock_bajo: 'Stock bajo',
  critico: 'En cero',
};

export default function InventoryPage() {
  const router = useRouter();
  const drawerRef = useRef<DrawerHandle>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertFilter, setAlertFilter] = useState<AlertaInventario | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  // Leer query param al montar — whitelist estricta, nunca se renderiza raw
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('alerta');
    if (raw && (ALERTAS_VALIDAS as readonly string[]).includes(raw)) {
      setAlertFilter(raw as AlertaInventario);
    }
  }, []);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Import/Export
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

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
        limit: alertFilter ? 100 : pageSize,
        search: searchTerm || undefined,
        lowStock: alertFilter === 'stock_bajo' || alertFilter === 'critico' || undefined,
      });
      // Para "critico" filtramos adicionalmente los que están exactamente en cero
      const items = alertFilter === 'critico'
        ? response.items.filter(i => i.warehouseQuantity <= 0)
        : response.items;
      setInventoryItems(items);
      setTotalItems(alertFilter === 'critico' ? items.length : response.total);
      setTotalPages(alertFilter ? 1 : response.totalPages);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      setError('Error al cargar el inventario. Intenta de nuevo.');
      toast.error('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, alertFilter]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      // Obtener productos y TODOS los inventarios en paralelo
      const [productsRes, allInventory] = await Promise.all([
        productService.getProducts({ page: 1, limit: 500 }),
        inventoryService.getInventoryItems({ page: 1, limit: 500 }),
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

  const handleRefresh = () => {
    fetchInventory();
    toast.success('Inventario actualizado');
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
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = e?.response?.data?.message || e?.message || 'Error al crear inventario';
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
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        const msg = e?.response?.data?.message || e?.message || 'Error al actualizar inventario';
        toast.error(msg);
      } finally {
        setSubmitting(false);
      }
    }
  });

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
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Inventario de almacén' },
      ]}
      title="Inventario de almacén"
      subtitle={totalItems > 0 ? `${totalItems} producto${totalItems !== 1 ? 's' : ''}` : undefined}
      actions={
        <>
          <div className="relative" data-tour="inventory-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('inventario'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => { setIsImportOpen(true); setShowDataMenu(false); }}
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
            data-tour="inventory-add-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo producto</span>
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
            placeholder="Buscar producto..."
            dataTour="inventory-search"
          />

          {/* Chip de alerta — solo cuando viene de notificación */}
          {alertFilter && (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
              alertFilter === 'critico'
                ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              <AlertTriangle className="w-3 h-3" />
              {ALERTA_LABELS[alertFilter]}
              <button
                onClick={() => { setAlertFilter(null); router.push('/inventory'); }}
                className="ml-0.5 hover:opacity-70"
                aria-label="Quitar filtro"
              >
                ×
              </button>
            </span>
          )}

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>

        {/* Error */}
        <ErrorBanner error={error} onRetry={fetchInventory} />

          {/* Table */}
          <div data-tour="inventory-table" className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
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
                    <p className="text-sm">
                      {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Crea tu primer registro de inventario para comenzar'}
                    </p>
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
              <div className="flex items-center bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[750px]">
                <div className="flex-1 text-[11px] font-medium text-gray-500">Producto</div>
                <div className="w-[120px] text-[11px] font-medium text-gray-500">Unidad</div>
                <div className="w-[120px] text-[11px] font-medium text-gray-500 text-center flex items-center justify-center gap-1">Existencias <HelpTooltip tooltipKey="total-quantity" /></div>
                <div data-tour="inventory-stock-columns" className="w-[100px] text-[11px] font-medium text-gray-500 text-center flex items-center justify-center gap-1">Stock mín. <HelpTooltip tooltipKey="min-stock" /></div>
                <div className="w-[100px] text-[11px] font-medium text-gray-500 text-center flex items-center justify-center gap-1">Stock máx. <HelpTooltip tooltipKey="max-stock" /></div>
                <div className="w-8"></div>
              </div>

              <div className="relative min-h-[200px]">
                <TableLoadingOverlay loading={loading} message="Cargando inventario..." />

                {!loading && inventoryItems.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-gray-400">
                    <div className="text-center">
                      <Package className="w-12 h-12 mx-auto mb-4 text-indigo-300" />
                      <p className="text-lg font-medium">No hay inventario</p>
                      <p className="text-sm">
                        {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Crea tu primer registro de inventario para comenzar'}
                      </p>
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
                          onClick={() => handleOpenEdit(item)}
                          className="flex items-center px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-amber-50 cursor-pointer transition-colors group min-w-[750px]"
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

                          <div className="w-8 flex items-center justify-center">
                            <CaretRight className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors" weight="bold" />
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
          {(inventoryItems.length > 0 || loading) && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="productos"
              loading={loading}
            />
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
            <div data-tour="inventory-drawer-actions" className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="button" variant="success" onClick={handleSubmit} disabled={submitting || (modalMode === 'create' && !watch('productoId'))} className="flex items-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {modalMode === 'create' ? 'Crear Ajuste' : 'Guardar Cambios'}
              </Button>
            </div>
          }
        >
          <div data-tour="inventory-form" className="p-6 space-y-4">
            {modalMode === 'create' ? (
              <div data-tour="inventory-product-selector">
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
                <ImageUpload
                  variant="square"
                  src={imagePreview || currentImageUrl}
                  alt="Producto"
                  fallbackIcon={<Package className="w-8 h-8 text-gray-300" />}
                  size="md"
                  maxSizeMB={5}
                  accept="image/jpeg,image/png,image/webp"
                  hint="PNG, JPG o WebP. Máx. 5 MB."
                  disabled={uploadingImage}
                  onUpload={(file) => {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                  onDelete={handleDeleteImage}
                />
              </div>
            )}

            <div data-tour="inventory-quantity">
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

            <div data-tour="inventory-stock-fields" className="grid grid-cols-2 gap-4">
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

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="inventario"
        entityLabel="inventario"
        onSuccess={() => fetchInventory()}
        infoNote="Si un producto ya tiene inventario, sus valores se actualizarán con los del CSV."
      />
    </PageHeader>
  );
}
