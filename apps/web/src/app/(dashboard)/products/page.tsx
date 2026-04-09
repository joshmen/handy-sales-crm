'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Upload,
  Download,
  ChevronDown,
  Package,
  Trash2,
  X,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { Package as PackageIcon } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('products');
  const tc = useTranslations('common');
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
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

      // Backend requires descripcion to be non-empty; default to nombre if blank
      const payload = {
        ...data,
        descripcion: data.descripcion?.trim() || data.nombre,
      };

      if (editingProduct) {
        productId = parseInt(editingProduct.id);
        await productService.updateProduct(productId, payload);
        toast.success(t('productUpdated'));
      } else {
        const result = await productService.createProduct(payload);
        productId = result.id;
        toast.success(t('productCreated'));
      }

      // Upload image if one was selected
      if (imageFile) {
        try {
          setUploadingImage(true);
          await productService.uploadProductImage(productId, imageFile);
          toast.success(tc('imageUploaded'));
        } catch (imgErr) {
          console.error('Error al subir imagen:', imgErr);
          toast.error(t('errorSaving'));
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
      toast.error(e?.response?.data?.message || e?.message || t('errorSaving'));
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
      toast.success(newActive ? t('productActivated') : t('productDeactivated'));
      if (!showInactive && !newActive) {
        setProducts(prev => prev.filter(p => p.id !== product.id));
      } else {
        setProducts(prev => prev.map(p =>
          p.id === product.id ? { ...p, isActive: newActive } : p
        ));
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error(t('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  // Sort state
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'price': cmp = a.price - b.price; break;
        case 'stock': cmp = a.stock - b.stock; break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [products, sortKey, sortDir]);

  // Column definitions
  const productColumns = useMemo<DataGridColumn<Product>[]>(() => [
    {
      key: 'image',
      label: t('columns.image'),
      width: 45,
      cellRenderer: (product) => product.images[0] ? (
        <img src={product.images[0]} alt={product.name} className="w-9 h-9 rounded-md object-cover" />
      ) : (
        <div className="w-9 h-9 rounded-md bg-green-100 flex items-center justify-center">
          <PackageIcon className="w-[18px] h-[18px] text-green-600" weight="duotone" />
        </div>
      ),
    },
    {
      key: 'code',
      label: t('columns.code'),
      width: 95,
      cellRenderer: (product) => <span className="text-[13px] font-mono text-gray-500 truncate block">{product.code}</span>,
    },
    {
      key: 'name',
      label: t('columns.name'),
      sortable: true,
      width: 'flex',
      cellRenderer: (product) => <span className="text-[13px] font-medium text-gray-900 truncate block">{product.name}</span>,
    },
    {
      key: 'price',
      label: t('columns.price'),
      sortable: true,
      width: 90,
      cellRenderer: (product) => <span className="text-[13px] font-medium text-gray-900">{formatCurrency(product.price)}</span>,
    },
    {
      key: 'stock',
      label: t('columns.stock'),
      sortable: true,
      width: 90,
      cellRenderer: (product) => (
        <span className={`text-[13px] font-medium ${product.stock <= product.minStock ? 'text-red-600' : 'text-gray-900'}`}>
          {product.stock}
        </span>
      ),
    },
    {
      key: 'family',
      label: t('columns.family'),
      width: 100,
      hiddenOnMobile: true,
      cellRenderer: (product) => <span className="text-[13px] text-blue-600 truncate block">{product.family || '-'}</span>,
    },
    {
      key: 'category',
      label: t('columns.category'),
      width: 130,
      hiddenOnMobile: true,
      cellRenderer: (product) => <span className="text-[13px] text-gray-500 truncate block">{product.category || '-'}</span>,
    },
    {
      key: 'isActive',
      label: t('columns.active'),
      width: 50,
      align: 'center',
      cellRenderer: (product) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActiveToggle isActive={product.isActive} onToggle={() => handleToggleActive(product)} disabled={loading} isLoading={togglingId === product.id} title={product.isActive ? t('deactivateProduct') : t('activateProduct')} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 64,
      cellRenderer: (product) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleEditProduct(product)} disabled={loading} className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
            <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
          </button>
          {deleteConfirmId === product.id ? (
            <>
              <button onClick={() => { handleDelete(product.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <button onClick={() => setDeleteConfirmId(product.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ], [loading, togglingId, deleteConfirmId, formatCurrency]);

  const visibleIds = sortedProducts.map(p => parseInt(p.id));
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, selectedFamiliaId, selectedCategoriaId, showInactive],
  });

  const handleDelete = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      toast.success(t('productDeleted'));
      fetchProducts();
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  const handleBatchToggle = async () => {
    if (batch.selectedCount === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await productService.batchToggleActive(ids, activo);

      toast.success(
        t('batchSuccess', { count: ids.length, plural: ids.length > 1 ? 's' : '', action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() })
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
      toast.error(t('errorBatchToggle'));
    } finally {
      batch.setBatchLoading(false);
    }
  };
  return (
      <PageHeader
        breadcrumbs={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title') },
        ]}
        title={t('title')}
        subtitle={totalProducts > 0 ? t('subtitle', { count: totalProducts, plural: totalProducts !== 1 ? 's' : '' }) : undefined}
        actions={
          <>
            <div className="relative" data-tour="products-import-export">
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">{tc('importExport')}</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
              {showDataMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={async () => { setShowDataMenu(false); try { await exportToCsv('productos'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      {tc('exportCsv')}
                    </button>
                    <button
                      onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      {tc('importCsv')}
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              data-tour="products-new-btn"
              onClick={handleCreateProduct}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newProduct')}</span>
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <SearchBar value={searchTerm} onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }} placeholder={t('searchPlaceholder')} dataTour="products-search" />
            <div className="min-w-[180px] max-w-[300px]" data-tour="products-family-filter">
              <SearchableSelect
                options={familias.map(f => ({ value: f.id, label: f.nombre, description: f.descripcion }))}
                value={selectedFamiliaId}
                onChange={(val) => {
                  setSelectedFamiliaId(val ? Number(val) : null);
                  setCurrentPage(1);
                }}
                placeholder={t('filters.allFamilies')}
                searchPlaceholder={t('filters.searchFamily')}
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
                placeholder={t('filters.allCategories')}
                searchPlaceholder={t('filters.searchCategory')}
              />
            </div>
            <button
              onClick={fetchProducts}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tc('refresh')}</span>
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

          {/* Products DataGrid */}
          <div data-tour="products-table">
            <DataGrid<Product>
              columns={productColumns}
              data={sortedProducts}
              keyExtractor={(p) => parseInt(p.id)}
              loading={loading}
              loadingMessage={t('loadingProducts')}
              emptyIcon={<Package className="w-16 h-16 text-purple-300" />}
              emptyTitle={t('emptyTitle')}
              emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
              sort={{
                key: sortKey,
                direction: sortDir,
                onSort: handleSort,
              }}
              selection={{
                selectedIds: batch.selectedIds as unknown as Set<string | number>,
                onToggle: (id) => batch.handleToggleSelect(id as number),
                onSelectAll: batch.handleSelectAllVisible,
                onClearAll: batch.handleClearSelection,
              }}
              pagination={totalProducts > 0 ? {
                currentPage,
                totalPages,
                totalItems: totalProducts,
                pageSize,
                onPageChange: setCurrentPage,
              } : undefined}
              mobileCardRenderer={(product) => (
                <div className={`${!product.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 flex-shrink-0">
                        {product.images[0] ? (
                          <img src={product.images[0]} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
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
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActiveToggle isActive={product.isActive} onToggle={() => handleToggleActive(product)} disabled={loading} isLoading={togglingId === product.id} title={product.isActive ? t('deactivateProduct') : t('activateProduct')} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium">{formatCurrency(product.price)}</span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${product.stock <= product.minStock ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-700'}`}>Stock: {product.stock}</span>
                    {product.family && <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">{product.family}</span>}
                    {product.category && <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs">{product.category}</span>}
                  </div>
                  <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-gray-100 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleEditProduct(product)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded">
                      <Pencil className="w-3.5 h-3.5 text-amber-400" /> {tc('edit')}
                    </button>
                    {deleteConfirmId === product.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { handleDelete(product.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                        <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(product.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              )}
            />
          </div>
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
          consequenceDeactivate={t('consequenceDeactivate')}
          consequenceActivate={t('consequenceActivate')}
        />

        {/* Product Form Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={showProductForm}
          onClose={handleCancelForm}
          title={editingProduct ? t('drawer.titleEdit') : t('drawer.titleNew')}
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
                {tc('cancel')}
              </Button>
              <Button type="submit" form="product-form" variant="success" disabled={savingProduct || loadingCatalogs || !watch('familiaId')} className="flex items-center gap-2">
                {savingProduct && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProduct ? tc('saveChanges') : t('drawer.createProduct')}
              </Button>
            </div>
          }
        >
          <form id="product-form" onSubmit={handleSaveProduct} className="space-y-4 p-6" data-tour="product-form">
              {/* Nombre */}
              <div data-tour="product-drawer-name">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.nameLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('nombre')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder={t('drawer.namePlaceholder')}
                />
                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
              </div>

              {/* Codigo de Barras */}
              <div data-tour="product-drawer-barcode">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.barcode')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('codigoBarra')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent font-mono"
                  placeholder={t('drawer.barcodePlaceholder')}
                />
                {errors.codigoBarra && <p className="text-red-500 text-xs mt-1">{errors.codigoBarra.message}</p>}
              </div>

              {/* Descripcion */}
              <div data-tour="product-drawer-description">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.description')}
                </label>
                <textarea
                  {...register('descripcion')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder={t('drawer.descriptionPlaceholder')}
                  rows={2}
                />
              </div>

              {/* Imagen del producto */}
              <div data-tour="product-drawer-image">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.productImage')}
                </label>
                <ImageUpload
                  variant="square"
                  src={imagePreview || currentImageUrl}
                  alt="Producto"
                  fallbackIcon={<Package className="w-8 h-8 text-purple-300" />}
                  size="md"
                  maxSizeMB={5}
                  accept="image/jpeg,image/png,image/webp"
                  hint={t('drawer.imageHint')}
                  onUpload={(file) => {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }}
                  onDelete={async () => {
                    if (currentImageUrl && editingProduct && !imagePreview) {
                      try {
                        await productService.deleteProductImage(editingProduct.id);
                        setCurrentImageUrl(null);
                        toast.success(tc('imageDeleted'));
                        await fetchProducts();
                      } catch {
                        toast.error(tc('errorDeletingImage'));
                      }
                    } else {
                      setImageFile(null);
                      setImagePreview(null);
                    }
                  }}
                />
              </div>

              {/* Familia de Productos */}
              <div data-tour="product-drawer-family">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.productFamily')} <span className="text-red-500">*</span>
                </label>
                {loadingCatalogs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tc('loading')}
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={familias.map(f => ({ value: f.id, label: f.nombre, description: f.descripcion }))}
                      value={watch('familiaId') || null}
                      onChange={(val) => setValue('familiaId', val ? Number(val) : 0, { shouldDirty: true })}
                      placeholder={t('drawer.selectFamily')}
                      searchPlaceholder={t('drawer.searchFamily')}
                    />
                    {errors.familiaId && <p className="text-red-500 text-xs mt-1">{errors.familiaId.message}</p>}
                  </>
                )}
              </div>

              {/* Categoria de Productos */}
              <div data-tour="product-drawer-category">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.category')} <span className="text-red-500">*</span>
                </label>
                {loadingCatalogs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tc('loading')}
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={categorias.map(c => ({ value: c.id, label: c.nombre, description: c.descripcion }))}
                      value={watch('categoraId') || null}
                      onChange={(val) => setValue('categoraId', val ? Number(val) : 0, { shouldDirty: true })}
                      placeholder={t('drawer.selectCategory')}
                      searchPlaceholder={t('drawer.searchCategory')}
                    />
                    {errors.categoraId && <p className="text-red-500 text-xs mt-1">{errors.categoraId.message}</p>}
                  </>
                )}
              </div>

              {/* Unidad de Medida */}
              <div data-tour="product-drawer-unit">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.unit')} <span className="text-red-500">*</span>
                </label>
                {loadingCatalogs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tc('loading')}
                  </div>
                ) : (
                  <>
                    <SearchableSelect
                      options={unidades.map(u => ({ value: u.id, label: `${u.nombre}${u.abreviatura ? ` (${u.abreviatura})` : ''}` }))}
                      value={watch('unidadMedidaId') || null}
                      onChange={(val) => setValue('unidadMedidaId', val ? Number(val) : 0, { shouldDirty: true })}
                      placeholder={t('drawer.selectUnit')}
                      searchPlaceholder={t('drawer.searchUnit')}
                    />
                    {errors.unidadMedidaId && <p className="text-red-500 text-xs mt-1">{errors.unidadMedidaId.message}</p>}
                  </>
                )}
              </div>

              {/* Precio Base */}
              <div data-tour="product-drawer-price">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('drawer.basePrice')} <span className="text-red-500">*</span>
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
