'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Product } from '@/types';
import { productService } from '@/services/api/products';
import { productCategoryService, unitService } from '@/services/api';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { PageHeader } from '@/components/layout/PageHeader';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  RefreshCw,
  DollarSign,
  Loader2,
  Check,
  Minus,
  Upload,
  Download,
  ChevronDown,
  Trash2,
  Camera,
  Package,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { Package as PackageIcon } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { useFormatters } from '@/hooks/useFormatters';

// Tipos locales para los catálogos (coinciden con el backend)
interface FamiliaProducto {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface CategoriaProducto {
  id: number;
  nombre: string;
  descripcion?: string;
}

interface UnidadMedida {
  id: number;
  nombre: string;
  abreviatura?: string;
}

// Tipo para el producto del backend con IDs
interface ProductoDetalle {
  id: number;
  nombre: string;
  codigoBarra: string;
  descripcion: string;
  familiaId: number;
  categoraId: number;
  unidadMedidaId: number;
  precioBase: number;
  activo: boolean;
}

// Zod schema para validación del formulario
const productSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  codigoBarra: z.string().min(1, 'El código de barras es requerido'),
  descripcion: z.string(),
  familiaId: z.number().min(1, 'Selecciona una familia de productos'),
  categoraId: z.number().min(1, 'Selecciona una categoría'),
  unidadMedidaId: z.number().min(1, 'Selecciona una unidad de medida'),
  precioBase: z.number().min(0.01, 'El precio debe ser mayor a 0'),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductsPage() {
  const { formatCurrency } = useFormatters();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;
  const [savingProduct, setSavingProduct] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Catálogos para dropdowns
  const [familias, setFamilias] = useState<FamiliaProducto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProducto[]>([]);
  const [unidades, setUnidades] = useState<UnidadMedida[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Filtros
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<number | null>(null);
  const [selectedCategoriaId, setSelectedCategoriaId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // React Hook Form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, setValue, watch, formState: { errors, isDirty: isFormDirty } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre: '',
      codigoBarra: '',
      descripcion: '',
      familiaId: 0,
      categoraId: 0,
      unidadMedidaId: 0,
      precioBase: 0,
    },
  });

  // CSV Import modal
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [, setUploadingImage] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // Combined isDirty that includes image
  const formIsDirtyWithImage = isFormDirty || imageFile !== null;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Cargar catálogos
  const fetchCatalogs = useCallback(async () => {
    try {
      setLoadingCatalogs(true);
      const [familiasRes, categoriasRes, unidadesRes] = await Promise.all([
        api.get<FamiliaProducto[]>('/familias-productos'),
        productCategoryService.getAll(),
        unitService.getAll(),
      ]);

      setFamilias(familiasRes.data);
      setCategorias(categoriasRes.map(c => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion })));
      setUnidades(unidadesRes.map(u => ({ id: u.id, nombre: u.nombre, abreviatura: u.abreviatura })));
    } catch (err) {
      console.error('Error al cargar catálogos:', err);
    } finally {
      setLoadingCatalogs(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productService.getProducts({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        familyId: selectedFamiliaId || undefined,
        categoryId: selectedCategoriaId || undefined,
        isActive: showInactive ? undefined : true,
      });
      setProducts(response.products);
      setTotalProducts(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('Error al cargar los productos. Intenta de nuevo.');
      toast.error('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedFamiliaId, selectedCategoriaId, showInactive]);

  // Load catalogs only once on mount
  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  // Fetch products when filters change (fetchProducts changes when its dependencies change)
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    resetForm({
      nombre: '',
      codigoBarra: '',
      descripcion: '',
      familiaId: familias[0]?.id || 0,
      categoraId: categorias[0]?.id || 0,
      unidadMedidaId: unidades[0]?.id || 0,
      precioBase: 0,
    });
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    setShowProductForm(true);
  };

  const handleEditProduct = async (product: Product) => {
    setEditingProduct(product);
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(product.images[0] || null);

    // Obtener los detalles completos del producto para tener los IDs
    try {
      const response = await api.get<ProductoDetalle>(`/productos/${product.id}`);
      const detalle = response.data;

      resetForm({
        nombre: detalle.nombre,
        codigoBarra: detalle.codigoBarra,
        descripcion: detalle.descripcion || '',
        familiaId: detalle.familiaId,
        categoraId: detalle.categoraId,
        unidadMedidaId: detalle.unidadMedidaId,
        precioBase: detalle.precioBase,
      });
    } catch (err) {
      console.error('Error al obtener detalles del producto:', err);
      // Fallback con valores por defecto
      resetForm({
        nombre: product.name,
        codigoBarra: product.code,
        descripcion: product.description || '',
        familiaId: familias[0]?.id || 0,
        categoraId: categorias[0]?.id || 0,
        unidadMedidaId: unidades[0]?.id || 0,
        precioBase: product.price,
      });
    }

    setShowProductForm(true);
  };

  const handleSaveProduct = rhfSubmit(async (data) => {
    try {
      setSavingProduct(true);
      let productId: number;

      if (editingProduct) {
        productId = parseInt(editingProduct.id);
        await productService.updateProduct(productId, data);
        toast.success('Producto actualizado correctamente');
      } else {
        const result = await productService.createProduct(data);
        productId = result.id;
        toast.success('Producto creado correctamente');
      }

      // Upload image if one was selected
      if (imageFile) {
        try {
          setUploadingImage(true);
          await productService.uploadProductImage(productId, imageFile);
          toast.success('Imagen subida correctamente');
        } catch (imgErr) {
          console.error('Error al subir imagen:', imgErr);
          toast.error('El producto se guardó pero hubo un error al subir la imagen');
        } finally {
          setUploadingImage(false);
        }
      }

      await fetchProducts();
      setShowProductForm(false);
      setEditingProduct(null);
    } catch (err: unknown) {
      console.error('Error al guardar producto:', err);
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || 'Error al guardar el producto');
    } finally {
      setSavingProduct(false);
    }
  });

  const handleCancelForm = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setCurrentImageUrl(null);
    setShowProductForm(false);
    setEditingProduct(null);
  };

  const handleToggleActive = async (product: Product) => {
    try {
      setTogglingId(product.id);
      const newActive = !product.isActive;
      await productService.toggleActive(product.id, newActive);
      toast.success(newActive ? 'Producto activado' : 'Producto desactivado');
      if (!showInactive && !newActive) {
        setProducts(prev => prev.filter(p => p.id !== product.id));
      } else {
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, isActive: newActive } : p
        ));
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error('Error al cambiar el estado del producto');
    } finally {
      setTogglingId(null);
    }
  };

  const visibleIds = products.map(p => parseInt(p.id));
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, selectedFamiliaId, selectedCategoriaId, showInactive],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedCount === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await productService.batchToggleActive(ids, activo);

      toast.success(
        `${ids.length} producto${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      batch.completeBatch();
      if (!showInactive && !activo) {
        setProducts(prev => prev.filter(p => !ids.includes(parseInt(p.id))));
      } else {
        setProducts(prev => prev.map(p =>
          ids.includes(parseInt(p.id)) ? { ...p, isActive: activo } : p
        ));
      }
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de los productos');
    } finally {
      batch.setBatchLoading(false);
    }
  };
  return (
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Productos' },
        ]}
        title="Productos"
        subtitle={totalProducts > 0 ? `${totalProducts} producto${totalProducts !== 1 ? 's' : ''}` : undefined}
        actions={
          <>
            <div className="relative" data-tour="products-import-export">
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
                      onClick={async () => { setShowDataMenu(false); try { await exportToCsv('productos'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
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
              data-tour="products-new-btn"
              onClick={handleCreateProduct}
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
            <SearchBar value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder="Buscar producto..." dataTour="products-search" />
            <div className="min-w-[180px] max-w-[300px]" data-tour="products-family-filter">
              <SearchableSelect
                options={familias.map(f => ({ value: f.id, label: f.nombre, description: f.descripcion }))}
                value={selectedFamiliaId}
                onChange={(val) => {
                  setSelectedFamiliaId(val ? Number(val) : null);
                  setCurrentPage(1);
                }}
                placeholder="Todas las familias"
                searchPlaceholder="Buscar familia..."
              />
            </div>
            <div className="min-w-[150px] max-w-[250px]" data-tour="products-category-filter">
              <SearchableSelect
                options={categorias.map(c => ({ value: c.id, label: c.nombre, description: c.descripcion }))}
                value={selectedCategoriaId}
                onChange={(val) => {
                  setSelectedCategoriaId(val ? Number(val) : null);
                  setCurrentPage(1);
                }}
                placeholder="Todas las categorías"
                searchPlaceholder="Buscar categoría..."
              />
            </div>
            <button
              onClick={fetchProducts}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Toggle para mostrar inactivos */}
            <div data-tour="products-toggle-inactive" className="ml-auto">
              <InactiveToggle value={showInactive} onChange={(v) => { setShowInactive(v); setCurrentPage(1); }} />
            </div>
          </div>

          {/* Error message */}
          <ErrorBanner error={error} onRetry={fetchProducts} />

          {/* Selection Action Bar */}
          <BatchActionBar
            selectedCount={batch.selectedCount}
            totalItems={totalProducts}
            entityLabel="productos"
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
            {!loading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-purple-300 mb-3" />
                <p className="text-sm text-gray-500 mb-3">No hay productos</p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateProduct}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Producto
                  </button>
                )}
              </div>
            ) : (
              products.map((product) => (
                <div
                  key={product.id}
                  className={`bg-white border border-gray-200 rounded-lg p-3 ${!product.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Row 1: checkbox + image + name + toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => batch.handleToggleSelect(parseInt(product.id))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(parseInt(product.id))
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(parseInt(product.id)) && <Check className="w-3 h-3" />}
                      </button>
                      <div className="w-10 h-10 flex-shrink-0">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-10 h-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-green-100 flex items-center justify-center">
                            <PackageIcon className="w-5 h-5 text-green-600" weight="duotone" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{product.code}</p>
                      </div>
                    </div>
                    <ActiveToggle isActive={product.isActive} onToggle={() => handleToggleActive(product)} disabled={loading} isLoading={togglingId === product.id} title={product.isActive ? 'Desactivar producto' : 'Activar producto'} />
                  </div>
                  {/* Row 2: Metrics */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">
                      {formatCurrency(product.price)}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                      product.stock <= product.minStock
                        ? 'bg-red-50 text-red-600'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      Stock: {product.stock}
                    </span>
                    {product.family && (
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                        {product.family}
                      </span>
                    )}
                    {product.category && (
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">
                        {product.category}
                      </span>
                    )}
                    {product.unit && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-xs">
                        {product.unit}
                      </span>
                    )}
                  </div>
                  {/* Row 3: Actions */}
                  <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                    >
                      <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" /> Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Products Table */}
          <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto" data-tour="products-table">
            {/* Table Header - Always visible */}
            <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[900px]">
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
              <div className="w-[45px] text-[11px] font-medium text-gray-500 uppercase">Imagen</div>
              <div className="w-[95px] text-[11px] font-medium text-gray-500 uppercase">Código</div>
              <div className="flex-1 min-w-[250px] text-[11px] font-medium text-gray-500 uppercase">Nombre</div>
              <div className="w-[90px] text-[11px] font-medium text-gray-500 uppercase">Precio</div>
              <div className="w-[90px] text-[11px] font-medium text-gray-500 uppercase">Existencia</div>
              <div className="w-[100px] text-[11px] font-medium text-gray-500 uppercase hidden md:block">Familia</div>
              <div className="w-[130px] text-[11px] font-medium text-gray-500 uppercase hidden lg:block">Categoría</div>
              <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
              <div className="w-8"></div>
            </div>

            {/* Table Body - With loading overlay */}
            <div className="relative min-h-[200px]">
              {/* Loading Overlay */}
              <TableLoadingOverlay loading={loading} message="Cargando productos..." />

              {/* Empty State */}
              {!loading && products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 py-20">
                  <Package className="w-16 h-16 text-purple-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay productos</h3>
                  <p className="text-sm text-gray-500 text-center">
                    {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primer producto'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreateProduct}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Producto
                    </button>
                  )}
                </div>
              ) : (
                /* Table Rows - With opacity transition */
                <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[900px] ${
                        !product.isActive ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="w-[28px] flex items-center justify-center">
                        <button
                          onClick={() => batch.handleToggleSelect(parseInt(product.id))}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            batch.selectedIds.has(parseInt(product.id))
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {batch.selectedIds.has(parseInt(product.id)) && <Check className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="w-[45px] flex items-center justify-center">
                        {product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-9 h-9 rounded-md object-cover"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-md bg-green-100 flex items-center justify-center">
                            <PackageIcon className="w-[18px] h-[18px] text-green-600" weight="duotone" />
                          </div>
                        )}
                      </div>
                      <div className="w-[95px] text-[13px] font-mono text-gray-500 truncate">
                        {product.code}
                      </div>
                      <div className="flex-1 min-w-[250px] text-[13px] font-medium text-gray-900 truncate">
                        {product.name}
                      </div>
                      <div className="w-[90px] text-[13px] font-medium text-gray-900">
                        {formatCurrency(product.price)}
                      </div>
                      <div className={`w-[90px] text-[13px] font-medium ${
                        product.stock <= product.minStock
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {product.stock}
                      </div>
                      <div className="w-[100px] text-[13px] text-blue-600 truncate hidden md:block">
                        {product.family || '-'}
                      </div>
                      <div className="w-[130px] text-[13px] text-gray-500 truncate hidden lg:block">
                        {product.category || '-'}
                      </div>
                      <div className="w-[50px] flex items-center justify-center">
                        <ActiveToggle isActive={product.isActive} onToggle={() => handleToggleActive(product)} disabled={loading} isLoading={togglingId === product.id} title={product.isActive ? 'Desactivar producto' : 'Activar producto'} />
                      </div>
                      <div className="w-8 flex items-center justify-center">
                        <button
                          onClick={() => handleEditProduct(product)}
                          disabled={loading}
                          className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination - Always visible when there are products */}
          {(products.length > 0 || loading) && totalProducts > 0 && (
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalProducts}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="productos"
              loading={loading}
              className="pt-4"
            />
          )}
        </div>

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="productos"
          entityLabel="productos"
          onSuccess={() => fetchProducts()}
        />

        {/* Batch Confirm Modal */}
        <BatchConfirmModal
          isOpen={batch.isBatchConfirmOpen}
          onClose={batch.closeBatchConfirm}
          onConfirm={handleBatchToggle}
          action={batch.batchAction}
          selectedCount={batch.selectedCount}
          entityLabel="productos"
          loading={batch.batchLoading}
          consequenceDeactivate="Los productos desactivados no aparecerán en las listas activas."
          consequenceActivate="Los productos activados volverán a aparecer en las listas activas."
        />

        {/* Product Form Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={showProductForm}
          onClose={handleCancelForm}
          title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
          icon={<Package className="w-5 h-5 text-green-600" />}
          width="lg"
          isDirty={formIsDirtyWithImage}
          onSave={() => {
            const form = document.getElementById('product-form') as HTMLFormElement;
            form?.requestSubmit();
          }}
          footer={
            <div className="flex justify-end gap-3" data-tour="product-drawer-actions">
              <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={savingProduct}>
                Cancelar
              </Button>
              <Button type="submit" form="product-form" variant="success" disabled={savingProduct || loadingCatalogs} className="flex items-center gap-2">
                {savingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </Button>
            </div>
          }
        >
          <form id="product-form" onSubmit={handleSaveProduct} className="space-y-4 p-6" data-tour="product-form">
              {/* Nombre */}
              <div data-tour="product-drawer-name">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('nombre')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Nombre del producto"
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
              </div>

              {/* Codigo de Barras */}
              <div data-tour="product-drawer-barcode">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Codigo de Barras <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('codigoBarra')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono"
                  placeholder="7501234567890"
                />
                {errors.codigoBarra && <p className="text-red-500 text-xs mt-1">{errors.codigoBarra.message}</p>}
              </div>

              {/* Descripcion */}
              <div data-tour="product-drawer-description">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descripcion
                </label>
                <textarea
                  {...register('descripcion')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Descripcion del producto"
                  rows={2}
                />
              </div>

              {/* Imagen del producto */}
              <div data-tour="product-drawer-image">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Imagen del producto
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50">
                      {imagePreview ? (
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : currentImageUrl ? (
                        <img src={currentImageUrl} alt="Producto" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-purple-300" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      ref={(el) => { if (el) el.dataset.productImage = 'true'; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('La imagen no debe exceder 5 MB');
                            return;
                          }
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.querySelector<HTMLInputElement>('input[data-product-image]');
                        input?.click();
                      }}
                      className="absolute bottom-0 right-0 p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors shadow-lg"
                      title={currentImageUrl || imagePreview ? 'Cambiar imagen' : 'Subir imagen'}
                    >
                      {currentImageUrl || imagePreview ? (
                        <Camera className="h-3.5 w-3.5 text-white" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 text-white" />
                      )}
                    </button>
                    {(imagePreview || currentImageUrl) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (currentImageUrl && editingProduct && !imagePreview) {
                            try {
                              await productService.deleteProductImage(editingProduct.id);
                              setCurrentImageUrl(null);
                              toast.success('Imagen eliminada');
                              await fetchProducts();
                            } catch {
                              toast.error('Error al eliminar la imagen');
                            }
                          } else {
                            setImageFile(null);
                            setImagePreview(null);
                          }
                        }}
                        className="absolute -bottom-1 -left-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Eliminar imagen"
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">JPEG, PNG o WebP. Max 5 MB.</p>
                </div>
              </div>

              {/* Familia de Productos */}
              <div data-tour="product-drawer-family">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Familia de Productos <span className="text-red-500">*</span>
                </label>
                {loadingCatalogs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={familias.map(f => ({ value: f.id, label: f.nombre, description: f.descripcion }))}
                      value={watch('familiaId') || null}
                      onChange={(val) => setValue('familiaId', val ? Number(val) : 0, { shouldDirty: true })}
                      placeholder="Selecciona una familia"
                      searchPlaceholder="Buscar familia..."
                    />
                    {errors.familiaId && <p className="text-red-500 text-xs mt-1">{errors.familiaId.message}</p>}
                  </>
                )}
              </div>

              {/* Categoria de Productos */}
              <div data-tour="product-drawer-category">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria <span className="text-red-500">*</span>
                </label>
                {loadingCatalogs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={categorias.map(c => ({ value: c.id, label: c.nombre, description: c.descripcion }))}
                      value={watch('categoraId') || null}
                      onChange={(val) => setValue('categoraId', val ? Number(val) : 0, { shouldDirty: true })}
                      placeholder="Selecciona una categoria"
                      searchPlaceholder="Buscar categoria..."
                    />
                    {errors.categoraId && <p className="text-red-500 text-xs mt-1">{errors.categoraId.message}</p>}
                  </>
                )}
              </div>

              {/* Unidad de Medida */}
              <div data-tour="product-drawer-unit">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidad de Medida <span className="text-red-500">*</span>
                </label>
                {loadingCatalogs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Cargando...
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={unidades.map(u => ({ value: u.id, label: `${u.nombre}${u.abreviatura ? ` (${u.abreviatura})` : ''}` }))}
                      value={watch('unidadMedidaId') || null}
                      onChange={(val) => setValue('unidadMedidaId', val ? Number(val) : 0, { shouldDirty: true })}
                      placeholder="Selecciona una unidad"
                      searchPlaceholder="Buscar unidad..."
                    />
                    {errors.unidadMedidaId && <p className="text-red-500 text-xs mt-1">{errors.unidadMedidaId.message}</p>}
                  </>
                )}
              </div>

              {/* Precio Base */}
              <div data-tour="product-drawer-price">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio Base <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...register('precioBase', { valueAsNumber: true })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
                {errors.precioBase && <p className="text-red-500 text-xs mt-1">{errors.precioBase.message}</p>}
              </div>
            </form>
        </Drawer>

      </PageHeader>
  );
}
