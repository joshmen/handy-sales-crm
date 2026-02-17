'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Product } from '@/types';
import { productService, CreateProductRequest } from '@/services/api/products';
import { productCategoryService, unitService } from '@/services/api';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ExportButton } from '@/components/shared/ExportButton';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Loader2,
  Check,
  Minus,
  X,
  Power,
  PowerOff,
  Upload,
  Trash2,
  Camera,
  Package,
} from 'lucide-react';
import { Package as PackageIcon } from '@phosphor-icons/react';

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

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

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

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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
    } catch (err: any) {
      console.error('Error al guardar producto:', err);
      toast.error(err?.response?.data?.message || 'Error al guardar el producto');
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
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, isActive: newActive } : p
      ));
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error('Error al cambiar el estado del producto');
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
    const visibleIds = products.map(p => parseInt(p.id));
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

      await productService.batchToggleActive(ids, activo);

      toast.success(
        `${ids.length} producto${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
      setProducts(prev => prev.map(p =>
        ids.includes(parseInt(p.id)) ? { ...p, isActive: activo } : p
      ));
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de los productos');
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, searchTerm, selectedFamiliaId, selectedCategoriaId, showInactive]);

  // Computed selection state
  const visibleIds = products.map(p => parseInt(p.id));
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(value);
  };

  // Calcular rango de items mostrados
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalProducts);

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
            { label: 'Productos' },
          ]} />

          {/* Title Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Productos
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                data-tour="products-new-btn"
                onClick={handleCreateProduct}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo producto</span>
              </button>
              <ExportButton entity="productos" label="Exportar" />
              <button
                onClick={() => setIsImportOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Importar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="relative w-64" data-tour="products-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
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
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            {/* Toggle para mostrar inactivos */}
            <div className="flex items-center gap-2 ml-auto" data-tour="products-toggle-inactive">
              <span className="text-xs text-gray-600">Mostrar inactivos</span>
              <button
                onClick={() => setShowInactive(!showInactive)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                  showInactive ? 'bg-green-500' : 'bg-gray-300'
                }`}
                title={showInactive ? 'Mostrando todos los productos' : 'Solo productos activos'}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                  showInactive ? 'translate-x-4' : 'translate-x-0'
                }`} />
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button onClick={fetchProducts} className="ml-4 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          )}

          {/* Selection Action Bar */}
          {selectedCount > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-blue-700">
                  {selectedCount} seleccionado{selectedCount > 1 ? 's' : ''}
                </span>
                {selectedCount < totalProducts && (
                  <span className="text-xs text-blue-500">
                    de {totalProducts} productos
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
            {!loading && products.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-purple-300 mb-3" />
                <p className="text-sm text-gray-500 mb-3">No hay productos</p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateProduct}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
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
                  className={`bg-white border border-gray-200 rounded-lg p-4 ${!product.isActive ? 'opacity-60' : ''}`}
                >
                  {/* Row 1: checkbox + image + name + toggle */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => handleToggleSelect(parseInt(product.id))}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedIds.has(parseInt(product.id))
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {selectedIds.has(parseInt(product.id)) && <Check className="w-3 h-3" />}
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
                    <button
                      onClick={() => handleToggleActive(product)}
                      disabled={togglingId === product.id || loading}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex-shrink-0 ${
                        product.isActive ? 'bg-green-500' : 'bg-gray-300'
                      } ${togglingId === product.id ? 'opacity-50' : ''}`}
                      title={product.isActive ? 'Desactivar producto' : 'Activar producto'}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                        product.isActive ? 'translate-x-4' : 'translate-x-0'
                      }`}>
                        {product.isActive ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                      </span>
                    </button>
                  </div>
                  {/* Row 2: Metrics */}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-medium">
                      {formatCurrency(product.price)}
                    </span>
                    <span className={`px-2 py-0.5 rounded font-medium ${
                      product.stock <= product.minStock
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-600'
                    }`}>
                      Stock: {product.stock}
                    </span>
                    {product.family && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded">
                        {product.family}
                      </span>
                    )}
                    {product.category && (
                      <span className="text-gray-400">
                        {product.category}
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
            <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[850px]">
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
              <div className="w-[45px] text-xs font-semibold text-gray-600">Imagen</div>
              <div className="w-[95px] text-xs font-semibold text-gray-600">Código</div>
              <div className="flex-1 min-w-[120px] text-xs font-semibold text-gray-600">Nombre</div>
              <div className="w-[85px] text-xs font-semibold text-gray-600">Precio</div>
              <div className="w-[70px] text-xs font-semibold text-gray-600">Existencia</div>
              <div className="w-[85px] text-xs font-semibold text-gray-600">Familia</div>
              <div className="w-[85px] text-xs font-semibold text-gray-600">Categoría</div>
              <div className="w-[65px] text-xs font-semibold text-gray-600">Unidad</div>
              <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
              <div className="w-[45px] text-xs font-semibold text-gray-600 text-center">Editar</div>
            </div>

            {/* Table Body - With loading overlay */}
            <div className="relative min-h-[200px]">
              {/* Loading Overlay */}
              {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                    <span className="text-sm text-gray-500">Cargando productos...</span>
                  </div>
                </div>
              )}

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
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
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
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[850px] ${
                        !product.isActive ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="w-[28px] flex items-center justify-center">
                        <button
                          onClick={() => handleToggleSelect(parseInt(product.id))}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selectedIds.has(parseInt(product.id))
                              ? 'bg-green-600 border-green-600 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {selectedIds.has(parseInt(product.id)) && <Check className="w-3 h-3" />}
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
                      <div className="flex-1 min-w-[120px] text-[13px] font-medium text-gray-900 truncate">
                        {product.name}
                      </div>
                      <div className="w-[85px] text-[13px] font-medium text-gray-900">
                        {formatCurrency(product.price)}
                      </div>
                      <div className={`w-[70px] text-[13px] font-medium ${
                        product.stock <= product.minStock
                          ? 'text-red-600'
                          : 'text-gray-900'
                      }`}>
                        {product.stock}
                      </div>
                      <div className="w-[85px] text-[13px] text-blue-600 truncate">
                        {product.family || '-'}
                      </div>
                      <div className="w-[85px] text-[13px] text-gray-500 truncate">
                        {product.category || '-'}
                      </div>
                      <div className="w-[65px] text-[13px] text-gray-500 truncate">
                        {product.unit || '-'}
                      </div>
                      <div className="w-[50px] flex items-center justify-center">
                        <button
                          onClick={() => handleToggleActive(product)}
                          disabled={togglingId === product.id || loading}
                          className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                            product.isActive ? 'bg-green-500' : 'bg-gray-300'
                          } ${togglingId === product.id ? 'opacity-50' : ''}`}
                          title={product.isActive ? 'Desactivar producto' : 'Activar producto'}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                            product.isActive ? 'translate-x-4' : 'translate-x-0'
                          }`}>
                            {product.isActive ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                          </span>
                        </button>
                      </div>
                      <div className="w-[45px] flex items-center justify-center">
                        <button
                          onClick={() => handleEditProduct(product)}
                          disabled={loading}
                          className="p-1.5 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
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
            <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
              <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Mostrando {startItem}-{endItem} de {totalProducts} productos
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

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="productos"
          entityLabel="productos"
          onSuccess={() => fetchProducts()}
        />

        {/* Batch Confirm Modal */}
        {isBatchConfirmOpen && (
          <Modal
            isOpen={isBatchConfirmOpen}
            onClose={() => setIsBatchConfirmOpen(false)}
            title={`¿${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} producto${selectedCount > 1 ? 's' : ''}?`}
          >
            <div className="py-4">
              <p className="text-gray-500">
                ¿Estás seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
                <strong>{selectedCount}</strong> producto{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}?
                {batchAction === 'deactivate' && ' Los productos desactivados no aparecerán en las listas activas.'}
                {batchAction === 'activate' && ' Los productos activados volverán a aparecer en las listas activas.'}
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
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => drawerRef.current?.requestClose()}
                disabled={savingProduct}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="product-form"
                disabled={savingProduct || loadingCatalogs}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
              >
                {savingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            </div>
          }
        >
          <form id="product-form" onSubmit={handleSaveProduct} className="space-y-4 p-6" data-tour="product-form">
              {/* Nombre */}
              <div>
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
              <div>
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
              <div>
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
              <div>
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
              <div>
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
              <div>
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
              <div>
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
              <div>
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
      </div>
  );
}
