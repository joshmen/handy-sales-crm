'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { InventoryItem } from '@/types/inventory';
import { inventoryService, UpdateInventoryRequest } from '@/services/api/inventory';
import { productService } from '@/services/api/products';
import { inventoryMovementService, InventoryMovement } from '@/services/api/inventoryMovements';
import { Product } from '@/types';
import { toast } from '@/hooks/useToast';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
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
  Calendar,
  ArrowLeftRight,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { SearchBar } from '@/components/common/SearchBar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Package as PackageIcon, CaretRight } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { ListPagination } from '@/components/ui/ListPagination';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { FieldError } from '@/components/forms/FieldError';

// ─── Almacén tab types ───────────────────────────────────────────────
const inventorySchema = z.object({
  productoId: z.number(),
  cantidadActual: z.number().min(0, 'minZero'),
  stockMinimo: z.number().min(0, 'minZero'),
  stockMaximo: z.number().min(0, 'minZero'),
});
type InventoryFormData = z.infer<typeof inventorySchema>;

const ALERTAS_VALIDAS = ['stock_bajo', 'critico'] as const;
type AlertaInventario = typeof ALERTAS_VALIDAS[number];

// Labels are set inside the component where useTranslations is available

// ─── Movimientos tab types ───────────────────────────────────────────
type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

const movementSchema = z.object({
  productoId: z.number().min(1, 'selectProductRequired'),
  tipoMovimiento: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.number().min(0.01, 'quantityGreaterThanZero'),
  motivo: z.string().min(1, 'selectReason'),
  comentario: z.string(),
});
type MovementFormData = z.infer<typeof movementSchema>;

interface ProductOption {
  id: number;
  name: string;
  code: string;
  imageUrl: string;
}

type ActiveTab = 'almacen' | 'movimientos';

export default function InventoryPage() {
  const t = useTranslations('inventory');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();

  const ALERTA_LABELS: Record<AlertaInventario, string> = {
    stock_bajo: t('warehouse.lowStock'),
    critico: t('warehouse.inZero'),
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const { formatDate } = useFormatters();

  // ─── Tab state ─────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'movimientos' ? 'movimientos' : 'almacen';
  });

  // ─── Almacén state ─────────────────────────────────────────────────
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

  // Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Per-product movement history in drawer
  const [drawerMovements, setDrawerMovements] = useState<InventoryMovement[]>([]);
  const [drawerMovementsLoading, setDrawerMovementsLoading] = useState(false);

  // ─── Movimientos tab state ─────────────────────────────────────────
  const movDrawerRef = useRef<DrawerHandle>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [movLoading, setMovLoading] = useState(true);
  const [movError, setMovError] = useState<string | null>(null);
  const [movSearchTerm, setMovSearchTerm] = useState('');
  const [movTotalItems, setMovTotalItems] = useState(0);
  const [movCurrentPage, setMovCurrentPage] = useState(1);
  const [movTotalPages, setMovTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [showMovModal, setShowMovModal] = useState(false);
  const [movProducts, setMovProducts] = useState<ProductOption[]>([]);
  const [movSubmitting, setMovSubmitting] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [hasInventory, setHasInventory] = useState<boolean | null>(null);

  // Movement form
  const { register: movRegister, handleSubmit: movRhfSubmit, reset: movResetForm, watch: movWatch, setValue: movSetValue, formState: { errors: movErrors, isDirty: movIsDirty } } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { productoId: 0, tipoMovimiento: 'ENTRADA', cantidad: 0, motivo: '', comentario: '' },
  });

  // ─── Almacén: read alert filter from URL ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('alerta');
    if (raw && (ALERTAS_VALIDAS as readonly string[]).includes(raw)) {
      setAlertFilter(raw as AlertaInventario);
    }
  }, []);

  // ─── Almacén: fetch inventory ──────────────────────────────────────
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
      const items = alertFilter === 'critico'
        ? response.items.filter(i => i.warehouseQuantity <= 0)
        : response.items;
      setInventoryItems(items);
      setTotalItems(alertFilter === 'critico' ? items.length : response.total);
      setTotalPages(alertFilter ? 1 : response.totalPages);
    } catch (err) {
      console.error('Error al cargar inventario:', err);
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, alertFilter]);

  useEffect(() => {
    if (activeTab === 'almacen') {
      fetchInventory();
    }
  }, [fetchInventory, activeTab]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const [productsRes, allInventory] = await Promise.all([
        productService.getProducts({ page: 1, limit: 500 }),
        inventoryService.getInventoryItems({ page: 1, limit: 500 }),
      ]);
      const existingProductIds = new Set(allInventory.items.map(item => String(item.productId)));
      const availableProducts = (productsRes.products || []).filter(
        p => !existingProductIds.has(String(p.id))
      );
      setProducts(availableProducts);
    } catch (err) {
      console.error('Error loading products:', err);
      toast.error(t('errorLoadingProducts'));
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleRefresh = () => {
    fetchInventory();
    toast.success(t('inventoryUpdated'));
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
      toast.success(t('imageDeleted'));
      fetchInventory();
    } catch {
      toast.error(t('errorDeletingImage'));
    } finally {
      setUploadingImage(false);
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
    setDrawerMovements([]);
    setModalOpen(true);
  };

  // Open edit modal — also fetch per-product movements
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
    setDrawerMovements([]);
    setModalOpen(true);

    // Fetch last 5 movements for this product
    setDrawerMovementsLoading(true);
    inventoryMovementService.getMovementsByProduct(Number(item.productId), 5)
      .then(setDrawerMovements)
      .catch(() => setDrawerMovements([]))
      .finally(() => setDrawerMovementsLoading(false));
  };

  // Submit inventory form
  const handleSubmit = rhfSubmit(async (data) => {
    if (modalMode === 'create') {
      if (!data.productoId) {
        toast.error(t('selectProduct'));
        return;
      }
      try {
        setSubmitting(true);
        await inventoryService.createInventory(data);
        if (imageFile) {
          try {
            await productService.uploadProductImage(data.productoId, imageFile);
          } catch {
            toast.error(t('imageErrorOnCreate'));
          }
        }
        toast.success(t('inventoryCreated'));
        setModalOpen(false);
        fetchInventory();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(tApi(e?.response?.data?.message) || tApi(e?.message) || t('errorCreating'));
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
        if (imageFile) {
          try {
            await productService.uploadProductImage(selectedItem.productId, imageFile);
          } catch {
            toast.error(t('imageErrorOnUpdate'));
          }
        }
        toast.success(t('inventoryUpdatedOk'));
        setModalOpen(false);
        fetchInventory();
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } }; message?: string };
        toast.error(tApi(e?.response?.data?.message) || tApi(e?.message) || t('errorUpdating'));
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

  // ─── Movimientos: fetch ────────────────────────────────────────────
  const fetchMovements = useCallback(async () => {
    try {
      setMovLoading(true);
      setMovError(null);
      const response = await inventoryMovementService.getMovements({
        page: movCurrentPage,
        limit: pageSize,
        search: movSearchTerm || undefined,
        movementType: typeFilter !== 'all' ? typeFilter : undefined,
        reason: reasonFilter !== 'all' ? reasonFilter : undefined,
      });
      setMovements(response.items);
      setMovTotalItems(response.total);
      setMovTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
      setMovError(t('errorLoadingMovements'));
      toast.error(t('errorLoadingMovementsShort'));
    } finally {
      setMovLoading(false);
    }
  }, [movCurrentPage, movSearchTerm, typeFilter, reasonFilter]);

  const fetchMovProducts = async () => {
    try {
      const response = await productService.getProducts({ page: 1, limit: 100 });
      setMovProducts((response.products || []).map(p => ({
        id: parseInt(p.id),
        name: p.name,
        code: p.code,
        imageUrl: p.images?.[0] || '',
      })));
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'movimientos') {
      fetchMovements();
    }
  }, [fetchMovements, activeTab]);

  useEffect(() => {
    if (activeTab === 'movimientos') {
      fetchMovProducts();
    }
  }, [activeTab]);

  // Fetch stock when product changes in movement drawer
  const watchedMovProductoId = movWatch('productoId');
  useEffect(() => {
    if (!watchedMovProductoId) {
      setCurrentStock(null);
      setHasInventory(null);
      return;
    }

    let cancelled = false;
    const fetchStock = async () => {
      setStockLoading(true);
      try {
        const item = await inventoryService.getInventoryByProductId(watchedMovProductoId);
        if (!cancelled) {
          setCurrentStock(item.warehouseQuantity);
          setHasInventory(true);
          if (item.warehouseQuantity === 0 && movWatch('tipoMovimiento') === 'SALIDA') {
            movSetValue('tipoMovimiento', 'ENTRADA');
          }
        }
      } catch {
        if (!cancelled) {
          setCurrentStock(null);
          setHasInventory(false);
          if (movWatch('tipoMovimiento') === 'SALIDA') {
            movSetValue('tipoMovimiento', 'ENTRADA');
          }
        }
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    };
    fetchStock();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedMovProductoId]);

  // Reset stock state when movement drawer closes
  useEffect(() => {
    if (!showMovModal) {
      setCurrentStock(null);
      setHasInventory(null);
      setStockLoading(false);
    }
  }, [showMovModal]);

  const handleCreateMovement = movRhfSubmit(async (data) => {
    if (!data.productoId || data.cantidad <= 0) {
      toast.error(t('movements.selectProductAndQuantity'));
      return;
    }

    try {
      setMovSubmitting(true);
      const result = await inventoryMovementService.createMovement(data);

      if (result.success) {
        toast.success(t('movements.registered'));
        setShowMovModal(false);
        movResetForm({ productoId: 0, tipoMovimiento: 'ENTRADA', cantidad: 0, motivo: '', comentario: '' });
        fetchMovements();
      } else {
        toast.error(result.error || t('movements.errorRegistering'));
      }
    } catch (err) {
      console.error('Error al crear movimiento:', err);
      toast.error(t('movements.errorRegistering'));
    } finally {
      setMovSubmitting(false);
    }
  });

  const handleMovRefresh = () => {
    fetchMovements();
    toast.success(t('movements.updated'));
  };

  const getTypeLabel = (type: MovementType) => {
    switch (type) {
      case 'ENTRADA': return t('movements.entry');
      case 'SALIDA': return t('movements.exit');
      case 'AJUSTE': return t('movements.adjustment');
      default: return type;
    }
  };

  // Movement type badge colors
  const getTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'ENTRADA': return 'bg-green-100 text-green-600';
      case 'SALIDA': return 'bg-red-100 text-red-600';
      case 'AJUSTE': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-surface-3 text-foreground/70';
    }
  };

  const getQuantityDisplay = (movement: InventoryMovement) => {
    const sign = movement.movementType === 'ENTRADA' ? '+' : '-';
    const color = movement.movementType === 'ENTRADA' ? 'text-green-600' :
                  movement.movementType === 'SALIDA' ? 'text-red-600' : 'text-yellow-600';
    return { sign, color };
  };

  const typeOptions = [
    { value: 'all', label: t('filters.allTypes') },
    { value: 'ENTRADA', label: t('filters.entry') },
    { value: 'SALIDA', label: t('filters.exit') },
    { value: 'AJUSTE', label: t('filters.adjustment') },
  ];

  const reasonOptions = [
    { value: 'all', label: t('filters.allReasons') },
    { value: 'COMPRA', label: t('reasons.purchase') },
    { value: 'VENTA', label: t('reasons.sale') },
    { value: 'DEVOLUCION', label: t('reasons.return') },
    { value: 'AJUSTE_INVENTARIO', label: t('reasons.inventoryAdjustment') },
    { value: 'MERMA', label: t('reasons.shrinkage') },
    { value: 'TRANSFERENCIA', label: t('reasons.transfer') },
  ];

  const reasonLabels: Record<string, string> = {
    'COMPRA': t('reasons.purchase'),
    'VENTA': t('reasons.sale'),
    'DEVOLUCION': t('reasons.return'),
    'AJUSTE_INVENTARIO': t('reasons.adjustmentShort'),
    'MERMA': t('reasons.shrinkage'),
    'TRANSFERENCIA': t('reasons.transfer'),
  };

  const movementTypeConfig: Record<MovementType, { label: string; icon: React.ReactNode; activeClass: string }> = {
    ENTRADA: { label: t('movementDrawer.entry'), icon: <ArrowDownToLine className="w-4 h-4" />, activeClass: 'bg-green-100 border-green-500 text-green-700' },
    SALIDA: { label: t('movementDrawer.exit'), icon: <ArrowUpFromLine className="w-4 h-4" />, activeClass: 'bg-red-100 border-red-500 text-red-700' },
    AJUSTE: { label: t('movementDrawer.adjustment'), icon: <SlidersHorizontal className="w-4 h-4" />, activeClass: 'bg-yellow-100 border-yellow-500 text-yellow-700' },
  };

  const motivosPorTipo: Record<MovementType, { value: string; label: string }[]> = {
    ENTRADA: [
      { value: 'COMPRA', label: t('reasons.purchase') },
      { value: 'DEVOLUCION', label: t('reasons.customerReturn') },
      { value: 'TRANSFERENCIA', label: t('reasons.transfer') },
    ],
    SALIDA: [
      { value: 'VENTA', label: t('reasons.sale') },
      { value: 'MERMA', label: t('reasons.shrinkage') },
      { value: 'DEVOLUCION', label: t('reasons.supplierReturn') },
      { value: 'TRANSFERENCIA', label: t('reasons.transfer') },
    ],
    AJUSTE: [
      { value: 'AJUSTE_INVENTARIO', label: t('reasons.inventoryAdjustment') },
      { value: 'MERMA', label: t('reasons.shrinkage') },
    ],
  };

  const watchedTipoMovimiento = movWatch('tipoMovimiento');
  const watchedCantidad = movWatch('cantidad');

  const projectedStock = currentStock !== null && watchedCantidad > 0
    ? watchedTipoMovimiento === 'ENTRADA'
      ? currentStock + watchedCantidad
      : watchedTipoMovimiento === 'SALIDA'
        ? currentStock - watchedCantidad
        : watchedCantidad
    : null;

  // ─── Determine actions based on active tab ─────────────────────────
  const almacenActions = (
    <>
      <div className="relative" data-tour="inventory-import-export">
        <button
          onClick={() => setShowDataMenu(!showDataMenu)}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">{tc('importExport')}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
        {showDataMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
            <div className="absolute right-0 mt-1 w-44 bg-surface-2 border border-border-subtle rounded-lg shadow-lg z-20 py-1">
              <button
                onClick={async () => { setShowDataMenu(false); try { await exportToCsv('inventario'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                {tc('exportCsv')}
              </button>
              <button
                onClick={() => { setIsImportOpen(true); setShowDataMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                {tc('importCsv')}
              </button>
            </div>
          </>
        )}
      </div>
      <button
        data-tour="inventory-add-btn"
        onClick={handleOpenCreate}
        className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>{t('warehouse.newProduct')}</span>
      </button>
    </>
  );

  const movimientosActions = (
    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
      <button
        data-tour="movements-export-btn"
        onClick={() => exportToCsv('inventario')}
        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-subtle rounded hover:bg-surface-1 transition-colors"
      >
        <Download className="w-3.5 h-3.5 text-emerald-500" />
        <span className="hidden sm:inline">{tc('exportCsv')}</span>
      </button>
      <button
        data-tour="movements-new-btn"
        onClick={() => {
          movResetForm({ productoId: 0, tipoMovimiento: 'ENTRADA', cantidad: 0, motivo: '', comentario: '' });
          setShowMovModal(true);
        }}
        className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>{t('movements.newMovement')}</span>
      </button>
    </div>
  );

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={activeTab === 'almacen'
        ? (totalItems > 0 ? t('subtitle', { count: totalItems, plural: totalItems !== 1 ? 's' : '' }) : undefined)
        : (movTotalItems > 0 ? t('movementsSubtitle', { count: movTotalItems, plural: movTotalItems !== 1 ? 's' : '' }) : undefined)
      }
      actions={activeTab === 'almacen' ? almacenActions : movimientosActions}
      actionsKey={activeTab}
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-surface-3 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('almacen')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'almacen' ? 'bg-surface-2 text-foreground shadow-elevation-1' : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {t('tabs.warehouse')}
          </button>
          <button
            onClick={() => setActiveTab('movimientos')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'movimientos' ? 'bg-surface-2 text-foreground shadow-elevation-1' : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {t('tabs.movements')}
          </button>
        </div>

        {/* ═══════════════ ALMACÉN TAB ═══════════════ */}
        {activeTab === 'almacen' && (
          <div key="almacen" className="animate-fade-in">
            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              <SearchBar
                value={searchTerm}
                onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
                placeholder={t('warehouse.searchPlaceholder')}
                dataTour="inventory-search"
              />

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
                    aria-label={t('removeFilter')}
                  >
                    ×
                  </button>
                </span>
              )}

              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{tc('refresh')}</span>
              </button>
            </div>

            <ErrorBanner error={error} onRetry={fetchInventory} />

            <div data-tour="inventory-table">
              <DataGrid<InventoryItem>
                columns={[
                  { key: 'product', label: t('columns.product'), width: 'flex', sortable: true, cellRenderer: (item, index) => {
                    const color = getProductColor(index);
                    return (
                      <div className="flex items-center gap-2.5">
                        {item.product?.images && item.product.images.length > 0 ? (
                          <img src={item.product.images[0]} alt={item.product.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-8 h-8 rounded ${color.bg} flex items-center justify-center flex-shrink-0`}>
                            <PackageIcon className={`w-4 h-4 ${color.icon}`} weight="duotone" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-foreground truncate">{item.product?.name || `${t('drawer.productLabel')} #${item.productId}`}</div>
                          <div className="text-[11px] text-muted-foreground">{item.product?.code || '-'}</div>
                        </div>
                      </div>
                    );
                  }},
                  { key: 'unit', label: t('columns.unit'), width: 120, hiddenOnMobile: true, cellRenderer: (item) => <span className="text-foreground/80">{item.product?.unit || 'PZA'}</span> },
                  { key: 'totalQuantity', label: t('columns.stock'), width: 120, align: 'center', sortable: true, headerRenderer: () => <span className="inline-flex items-center gap-1">{t('columns.stockHeader')} <HelpTooltip tooltipKey="total-quantity" /></span>, cellRenderer: (item) => {
                    const lowStock = isLowStock(item);
                    return (
                      <span>
                        <span className={`text-[13px] font-medium ${lowStock ? 'text-red-600' : 'text-foreground/80'}`}>{item.totalQuantity?.toLocaleString() || 0}</span>
                        {lowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline-block ml-1" />}
                      </span>
                    );
                  }},
                  { key: 'minStock', label: t('columns.minStock'), width: 100, align: 'center', hiddenOnMobile: true, headerRenderer: () => <span className="inline-flex items-center gap-1" data-tour="inventory-stock-columns">{t('columns.minStock')} <HelpTooltip tooltipKey="min-stock" /></span>, cellRenderer: (item) => <span className="text-muted-foreground">{item.minStock || '-'}</span> },
                  { key: 'maxStock', label: t('columns.maxStock'), width: 100, align: 'center', hiddenOnMobile: true, headerRenderer: () => <span className="inline-flex items-center gap-1">{t('columns.maxStock')} <HelpTooltip tooltipKey="max-stock" /></span>, cellRenderer: (item) => <span className="text-muted-foreground">{item.maxStock || '-'}</span> },
                  { key: 'arrow', label: '', width: 32, cellRenderer: () => <CaretRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-amber-500 transition-colors" weight="bold" /> },
                ] as DataGridColumn<InventoryItem>[]}
                data={inventoryItems}
                keyExtractor={(item) => item.id}
                onRowClick={(item) => handleOpenEdit(item)}
                pagination={{ currentPage, totalPages, totalItems, pageSize, onPageChange: setCurrentPage }}
                loading={loading}
                loadingMessage={t('warehouse.loadingInventory')}
                emptyIcon={<Package className="w-12 h-12 text-indigo-300" />}
                emptyTitle={t('warehouse.noInventory')}
                emptyMessage={searchTerm ? t('warehouse.noInventorySearch') : t('warehouse.noInventoryDefault')}
                mobileCardRenderer={(item) => {
                  const color = getProductColor(0);
                  const lowStock = isLowStock(item);
                  return (
                    <div>
                      <div className="flex items-start gap-2.5">
                        {item.product?.images && item.product.images.length > 0 ? (
                          <img src={item.product.images[0]} alt={item.product.name} className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        ) : (
                          <div className={`w-10 h-10 rounded ${color.bg} flex items-center justify-center flex-shrink-0`}>
                            <PackageIcon className={`w-5 h-5 ${color.icon}`} weight="duotone" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{item.product?.name || `${t('drawer.productLabel')} #${item.productId}`}</p>
                          <p className="text-xs text-muted-foreground">{item.product?.code || '-'}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={`font-medium ${lowStock ? 'text-red-600' : 'text-foreground'}`}>{item.totalQuantity?.toLocaleString() || 0} {item.product?.unit || 'PZA'}</span>
                        {lowStock && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full"><AlertTriangle className="w-3 h-3" />{t('warehouse.lowStock')}</span>}
                        <span>{t('columns.minStock')}: {item.minStock || '-'}</span>
                        <span>{t('columns.maxStock')}: {item.maxStock || '-'}</span>
                      </div>
                      <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-border-subtle pt-2">
                        <button onClick={() => handleOpenEdit(item)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-foreground/80 bg-surface-2 border border-border-subtle rounded hover:bg-surface-1 transition-colors">
                          <Pencil className="w-3 h-3 text-amber-400" /><span>{tc('edit')}</span>
                        </button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          </div>
        )}

        {/* ═══════════════ MOVIMIENTOS TAB ═══════════════ */}
        {activeTab === 'movimientos' && (
          <div key="movimientos" className="animate-fade-in">
            {/* Filter Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              <SearchBar
                value={movSearchTerm}
                onChange={(val) => {
                  setMovSearchTerm(val);
                  setMovCurrentPage(1);
                }}
                placeholder={t('warehouse.searchPlaceholder')}
                className="w-64"
                dataTour="movements-search"
              />

              <div data-tour="movements-type-filter" className="min-w-[160px]">
                <SearchableSelect
                  options={typeOptions}
                  value={typeFilter}
                  onChange={(val) => {
                    setTypeFilter(val ? String(val) : 'all');
                    setMovCurrentPage(1);
                  }}
                  placeholder={t('filters.allTypes')}
                />
              </div>

              <div data-tour="movements-reason-filter" className="min-w-[180px]">
                <SearchableSelect
                  options={reasonOptions}
                  value={reasonFilter}
                  onChange={(val) => {
                    setReasonFilter(val ? String(val) : 'all');
                    setMovCurrentPage(1);
                  }}
                  placeholder={t('filters.allReasons')}
                />
              </div>

              <button
                onClick={handleMovRefresh}
                disabled={movLoading}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${movLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{tc('refresh')}</span>
              </button>
            </div>

            {movError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {movError}
                <button onClick={fetchMovements} className="ml-4 underline hover:no-underline">
                  {t('movements.retry')}
                </button>
              </div>
            )}

            {/* Movements Table */}
            <div data-tour="movements-table" className="relative min-h-[200px] border border-border-subtle rounded-lg overflow-x-auto">
              <TableLoadingOverlay loading={movLoading} message={t('movements.loadingMovements')} />
              {!movLoading && movements.length === 0 ? (
                <div className="flex items-center justify-center h-64 bg-surface-2 text-muted-foreground">
                  <div className="text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-indigo-300" />
                    <p className="text-lg font-medium">{t('movements.noMovements')}</p>
                    <p className="text-sm">
                      {movSearchTerm || typeFilter !== 'all' || reasonFilter !== 'all'
                        ? t('movements.noMovementsFiltered')
                        : t('movements.noMovementsDefault')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="sm:hidden space-y-3 p-3">
                    {movements.map((movement) => {
                      const badge = getTypeBadge(movement.movementType);
                      const qty = getQuantityDisplay(movement);
                      return (
                        <div key={movement.id} className="bg-surface-2 border border-border-subtle rounded-lg p-4">
                          <div className="flex items-start gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground truncate">
                                {movement.productName}
                              </p>
                              <p className="text-xs text-muted-foreground">{movement.productCode}</p>
                            </div>
                            <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 ${badge}`}>
                              {getTypeLabel(movement.movementType as MovementType)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className={`font-semibold ${qty.color}`}>
                              {qty.sign}{Math.abs(movement.quantity)}
                            </span>
                            {movement.reason && (
                              <span className="px-2 py-0.5 bg-surface-3 text-foreground/70 rounded">
                                {reasonLabels[movement.reason] || movement.reason}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-violet-500" />
                              {formatDate(movement.createdAt)}
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-center justify-between border-t border-border-subtle pt-2 text-xs">
                            <span className="text-muted-foreground">
                              {movement.previousStock ?? '-'} → <span className="font-medium text-foreground">{movement.newStock ?? '-'}</span>
                            </span>
                            {movement.userName && (
                              <span className="text-muted-foreground truncate max-w-[120px]">{movement.userName}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block">
                    <div className="flex items-center bg-surface-1 px-5 h-10 border-b border-border-subtle min-w-[1100px]">
                      <div className="w-[130px] text-[11px] font-medium text-muted-foreground">{t('movementColumns.date')}</div>
                      <div className="flex-1 min-w-[180px] text-[11px] font-medium text-muted-foreground">{t('movementColumns.product')}</div>
                      <div className="w-[90px] text-[11px] font-medium text-muted-foreground text-center">{t('movementColumns.type')}</div>
                      <div className="w-[80px] text-[11px] font-medium text-muted-foreground text-right">{t('movementColumns.quantity')}</div>
                      <div className="w-[80px] text-[11px] font-medium text-muted-foreground text-right hidden md:block">{t('movementColumns.previous')}</div>
                      <div className="w-[80px] text-[11px] font-medium text-muted-foreground text-right hidden md:block">{t('movementColumns.new')}</div>
                      <div className="w-[140px] text-[11px] font-medium text-muted-foreground pl-4">{t('movementColumns.reason')}</div>
                      <div className="w-[150px] text-[11px] font-medium text-muted-foreground hidden lg:block">{t('movementColumns.user')}</div>
                    </div>

                    {movements.map((movement) => {
                      const badge = getTypeBadge(movement.movementType);
                      const qty = getQuantityDisplay(movement);
                      return (
                        <div
                          key={movement.id}
                          className="flex items-center px-5 py-3.5 border-b border-border-subtle bg-surface-2 hover:bg-amber-50 transition-colors min-w-[1100px]"
                        >
                          <div className="w-[130px]">
                            <span className="text-[13px] text-foreground">
                              {formatDate(movement.createdAt)}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {formatDate(movement.createdAt, { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="flex-1 min-w-[180px]">
                            <div className="text-[13px] font-medium text-foreground truncate">
                              {movement.productName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {movement.productCode}
                            </div>
                          </div>
                          <div className="w-[90px] text-center">
                            <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge}`}>
                              {getTypeLabel(movement.movementType as MovementType)}
                            </span>
                          </div>
                          <div className="w-[80px] text-right">
                            <span className={`text-[13px] font-semibold ${qty.color}`}>
                              {qty.sign}{Math.abs(movement.quantity)}
                            </span>
                          </div>
                          <div className="w-[80px] text-right hidden md:block">
                            <span className="text-[13px] text-muted-foreground">
                              {movement.previousStock ?? '-'}
                            </span>
                          </div>
                          <div className="w-[80px] text-right hidden md:block">
                            <span className="text-[13px] text-foreground font-medium">
                              {movement.newStock ?? '-'}
                            </span>
                          </div>
                          <div className="w-[140px] pl-4">
                            <span className="text-[13px] text-foreground truncate block">
                              {movement.reason ? (reasonLabels[movement.reason] || movement.reason) : '-'}
                            </span>
                          </div>
                          <div className="w-[150px] hidden lg:block">
                            <span className="text-[13px] text-muted-foreground truncate block">
                              {movement.userName || '-'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <ListPagination
              currentPage={movCurrentPage}
              totalPages={movTotalPages}
              totalItems={movTotalItems}
              pageSize={pageSize}
              onPageChange={setMovCurrentPage}
              itemLabel={t('tabs.movements').toLowerCase()}
            />
          </div>
        )}
      </div>

      {/* ═══════════════ INVENTORY CREATE/EDIT DRAWER ═══════════════ */}
      <Drawer
        ref={drawerRef}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalMode === 'create' ? t('drawer.addTitle') : t('drawer.editTitle')}
        icon={<Warehouse className="w-5 h-5 text-green-600" />}
        width="md"
        isDirty={isDirty || imageFile !== null}
        onSave={handleSubmit}
        footer={
          <div data-tour="inventory-drawer-actions" className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={submitting}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSubmit} disabled={submitting || (modalMode === 'create' && !watch('productoId'))} className="flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {modalMode === 'create' ? t('drawer.createAdjustment') : t('drawer.saveChanges')}
            </Button>
          </div>
        }
      >
        <div data-tour="inventory-form" className="p-6 space-y-4">
          {modalMode === 'create' ? (
            <div data-tour="inventory-product-selector">
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t('drawer.productLabel')} <span className="text-red-500">*</span>
              </label>
              {loadingProducts ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 border border-border-subtle rounded text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                  {t('drawer.loadingProducts')}
                </div>
              ) : products.length === 0 ? (
                <div className="px-3 py-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{t('drawer.allProductsHaveInventory')}</span>
                  </div>
                </div>
              ) : (
                <SearchableSelect
                  options={products.map(p => ({ value: Number(p.id), label: p.name, description: p.code, imageUrl: p.images?.[0] || '' }))}
                  value={watch('productoId') || null}
                  onChange={(val) => {
                    const id = val ? Number(val) : 0;
                    setValue('productoId', id, { shouldDirty: true });
                    const prod = products.find(p => Number(p.id) === id);
                    setCurrentImageUrl(prod?.images?.[0] || null);
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  placeholder={t('drawer.selectProduct')}
                  searchPlaceholder={t('drawer.searchProduct')}
                />
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">{t('drawer.productLabel')}</label>
              <div className="px-3 py-2 bg-surface-1 border border-border-subtle rounded text-sm text-foreground/80">
                {selectedItem?.product?.name || `${t('drawer.productLabel')} #${selectedItem?.productId}`}
                {selectedItem?.product?.code && (
                  <span className="text-muted-foreground ml-2">({selectedItem.product.code})</span>
                )}
              </div>
            </div>
          )}

          {/* Imagen del producto */}
          {(modalMode === 'edit' || watch('productoId') > 0) && (
            <div>
              <label className="block text-sm font-medium text-foreground/80 mb-1">
                {t('drawer.productImage')}
              </label>
              <ImageUpload
                variant="square"
                src={imagePreview || currentImageUrl}
                alt="Producto"
                fallbackIcon={<Package className="w-8 h-8 text-muted-foreground/60" />}
                size="md"
                maxSizeMB={5}
                accept="image/jpeg,image/png,image/webp"
                hint={t('drawer.imageHint')}
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
            <label className="block text-sm font-medium text-foreground/80 mb-1">
              {t('drawer.currentQuantity')} <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              {...register('cantidadActual', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="0"
            />
            {errors.cantidadActual && (
              <FieldError message={errors.cantidadActual?.message} />
            )}
          </div>

          <div data-tour="inventory-stock-fields" className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground/80 mb-1">{t('drawer.minStock')} <HelpTooltip tooltipKey="min-stock" /></label>
              <input
                type="number"
                min="0"
                {...register('stockMinimo', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                placeholder="0"
              />
              {errors.stockMinimo && (
                <FieldError message={errors.stockMinimo?.message} />
              )}
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground/80 mb-1">{t('drawer.maxStock')} <HelpTooltip tooltipKey="max-stock" /></label>
              <input
                type="number"
                min="0"
                {...register('stockMaximo', { valueAsNumber: true })}
                className="w-full px-3 py-2 text-sm border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
                placeholder="0"
              />
              {errors.stockMaximo && (
                <FieldError message={errors.stockMaximo?.message} />
              )}
            </div>
          </div>

          {/* Per-product movement history */}
          {modalMode === 'edit' && selectedItem && (
            <div className="mt-6 pt-4 border-t border-border-subtle">
              <h4 className="text-sm font-semibold text-foreground/80 mb-3">{t('drawer.recentMovements')}</h4>
              {drawerMovementsLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {t('drawer.loadingMovements')}
                </div>
              ) : drawerMovements.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">{t('drawer.noMovements')}</p>
              ) : (
                <div className="space-y-2">
                  {drawerMovements.map((mov) => {
                    const badge = getTypeBadge(mov.movementType);
                    const qty = getQuantityDisplay(mov);
                    return (
                      <div key={mov.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-border-subtle last:border-b-0">
                        <span className="text-muted-foreground w-[70px] flex-shrink-0">{formatDate(mov.createdAt)}</span>
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${badge}`}>
                          {getTypeLabel(mov.movementType as MovementType)}
                        </span>
                        <span className={`font-semibold ${qty.color}`}>
                          {qty.sign}{Math.abs(mov.quantity)}
                        </span>
                        <span className="text-muted-foreground truncate flex-1 text-right">{mov.userName || ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  setActiveTab('movimientos');
                }}
                className="mt-3 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
              >
                {t('drawer.viewAll')}
              </button>
            </div>
          )}
        </div>
      </Drawer>

      {/* ═══════════════ NEW MOVEMENT DRAWER ═══════════════ */}
      <Drawer
        ref={movDrawerRef}
        isOpen={showMovModal}
        onClose={() => setShowMovModal(false)}
        title={t('movementDrawer.title')}
        icon={<ArrowLeftRight className="w-5 h-5 text-indigo-500" />}
        width="md"
        isDirty={movIsDirty}
        onSave={handleCreateMovement}
        footer={
          <div data-tour="movements-drawer-actions" className="flex items-center justify-end gap-3">
            <button
              onClick={() => movDrawerRef.current?.requestClose()}
              className="px-4 py-2 text-xs font-medium text-foreground/80 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
            >
              {tc('cancel')}
            </button>
            <button
              onClick={handleCreateMovement}
              disabled={movSubmitting || !movWatch('productoId') || movWatch('cantidad') <= 0}
              className="px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {movSubmitting ? t('saving') : t('save')}
            </button>
          </div>
        }
      >
        <div className="px-6 py-4 space-y-4">
          {/* Product Select */}
          <div data-tour="movements-product-selector">
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">{t('movementDrawer.productLabel')} *</label>
            <SearchableSelect
              options={movProducts.map(p => ({ value: p.id, label: p.name, description: p.code, imageUrl: p.imageUrl }))}
              value={movWatch('productoId') || null}
              onChange={(val) => {
                movSetValue('productoId', val ? Number(val) : 0, { shouldDirty: true });
                movSetValue('motivo', '', { shouldDirty: true });
              }}
              placeholder={t('movementDrawer.selectProduct')}
              searchPlaceholder={t('movementDrawer.searchProduct')}
            />
            {movErrors.productoId && (
              <p className="mt-1 text-xs text-red-600">{movErrors.productoId.message}</p>
            )}
          </div>

          {/* Stock Info */}
          {watchedMovProductoId > 0 && (
            <div>
              {stockLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-surface-1 rounded border border-border-subtle">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-border-strong"></div>
                  <span className="text-xs text-muted-foreground">{t('movementDrawer.checkingStock')}</span>
                </div>
              ) : hasInventory === false ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-amber-700">{t('movementDrawer.noStockRegistered')}</span>
                </div>
              ) : currentStock !== null && currentStock === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700">{t('movementDrawer.zeroStock')}</span>
                </div>
              ) : currentStock !== null ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded border border-green-200">
                  <Package className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-green-700">
                    {t('movementDrawer.currentStock')} <strong>{currentStock}</strong>
                    {projectedStock !== null && (
                      <span className="ml-2 text-muted-foreground">
                        <ArrowRight className="w-3 h-3 inline mx-1" />
                        <strong className={projectedStock < 0 ? 'text-red-600' : 'text-green-700'}>{projectedStock}</strong>
                      </span>
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Movement Type */}
          <div data-tour="movements-type-selector">
            <label className="flex items-center gap-1 text-xs font-medium text-foreground/80 mb-1.5">{t('movementDrawer.movementType')} * <HelpTooltip tooltipKey="movement-type" /></label>
            <div className="flex gap-2">
              {(['ENTRADA', 'SALIDA', 'AJUSTE'] as MovementType[]).map(type => {
                const config = movementTypeConfig[type];
                const salidaDisabled = type === 'SALIDA' && (hasInventory === false || currentStock === 0);
                const isSelected = watchedTipoMovimiento === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={salidaDisabled}
                    onClick={() => {
                      if (!salidaDisabled) {
                        movSetValue('tipoMovimiento', type, { shouldDirty: true });
                        movSetValue('motivo', '', { shouldDirty: true });
                      }
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded border transition-colors ${
                      salidaDisabled
                        ? 'bg-surface-3 border-border-subtle text-muted-foreground cursor-not-allowed'
                        : isSelected
                          ? config.activeClass
                          : 'bg-surface-2 border-border-subtle text-foreground/80 hover:bg-surface-1'
                    }`}
                    title={salidaDisabled ? t('movementDrawer.noExitPossible') : undefined}
                  >
                    {config.icon}
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div data-tour="movements-quantity">
            <label className="flex items-center gap-1 text-xs font-medium text-foreground/80 mb-1.5">{t('movementDrawer.quantity')} * <HelpTooltip tooltipKey="movement-quantity" /></label>
            <input
              type="number"
              min="0"
              step="0.01"
              {...movRegister('cantidad', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="0"
            />
            {movErrors.cantidad && (
              <p className="mt-1 text-xs text-red-600">{movErrors.cantidad.message}</p>
            )}
          </div>

          {/* Reason */}
          <div data-tour="movements-reason">
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">{t('movementDrawer.reason')} *</label>
            <SearchableSelect
              options={motivosPorTipo[watchedTipoMovimiento] || []}
              value={movWatch('motivo') || null}
              onChange={(val) => {
                movSetValue('motivo', val ? String(val) : '', { shouldDirty: true });
              }}
              placeholder={t('movementDrawer.selectReason')}
            />
            {movErrors.motivo && (
              <p className="mt-1 text-xs text-red-600">{movErrors.motivo.message}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1.5">{t('movementDrawer.comment')}</label>
            <textarea
              {...movRegister('comentario')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border-subtle rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 resize-none"
              placeholder={t('movementDrawer.commentPlaceholder')}
            />
          </div>
        </div>
      </Drawer>

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="inventario"
        entityLabel={t('title').toLowerCase()}
        onSuccess={() => fetchInventory()}
        infoNote={t('csvUpdatedNote')}
      />
    </PageHeader>
  );
}
