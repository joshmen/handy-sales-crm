'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { inventoryMovementService, InventoryMovement, CreateInventoryMovementRequest } from '@/services/api/inventoryMovements';
import { productService } from '@/services/api/products';
import { inventoryService } from '@/services/api/inventory';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Search,
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Package,
  RefreshCw,
  X,
  Calendar,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';
import { ArrowsLeftRight } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';

type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE';

const movementSchema = z.object({
  productoId: z.number().min(1, 'Selecciona un producto'),
  tipoMovimiento: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: z.number().min(0.01, 'La cantidad debe ser mayor a 0'),
  motivo: z.string().min(1, 'Selecciona un motivo'),
  comentario: z.string(),
});
type MovementFormData = z.infer<typeof movementSchema>;

interface ProductOption {
  id: number;
  name: string;
  code: string;
  imageUrl: string;
}

export default function InventoryMovementsPage() {
  const drawerRef = useRef<DrawerHandle>(null);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [hasInventory, setHasInventory] = useState<boolean | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<MovementFormData>({
    resolver: zodResolver(movementSchema),
    defaultValues: { productoId: 0, tipoMovimiento: 'ENTRADA', cantidad: 0, motivo: '', comentario: '' },
  });

  const pageSize = 10;

  const fetchMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await inventoryMovementService.getMovements({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        movementType: typeFilter !== 'all' ? typeFilter : undefined,
        reason: reasonFilter !== 'all' ? reasonFilter : undefined,
      });
      setMovements(response.items);
      setTotalItems(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error al cargar movimientos:', err);
      setError('Error al cargar los movimientos. Intenta de nuevo.');
      toast.error('Error al cargar movimientos de inventario');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, typeFilter, reasonFilter]);

  const fetchProducts = async () => {
    try {
      const response = await productService.getProducts({ page: 1, limit: 100 });
      setProducts((response.products || []).map(p => ({
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
    fetchMovements();
  }, [fetchMovements]);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Fetch stock when product changes
  const watchedProductoId = watch('productoId');
  useEffect(() => {
    if (!watchedProductoId) {
      setCurrentStock(null);
      setHasInventory(null);
      return;
    }

    let cancelled = false;
    const fetchStock = async () => {
      setStockLoading(true);
      try {
        const item = await inventoryService.getInventoryByProductId(watchedProductoId);
        if (!cancelled) {
          setCurrentStock(item.warehouseQuantity);
          setHasInventory(true);
          // Auto-switch from SALIDA if stock is 0
          if (item.warehouseQuantity === 0 && watch('tipoMovimiento') === 'SALIDA') {
            setValue('tipoMovimiento', 'ENTRADA');
          }
        }
      } catch {
        if (!cancelled) {
          setCurrentStock(null);
          setHasInventory(false);
          // Auto-switch from SALIDA if no inventory exists
          if (watch('tipoMovimiento') === 'SALIDA') {
            setValue('tipoMovimiento', 'ENTRADA');
          }
        }
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    };
    fetchStock();
    return () => { cancelled = true; };
  }, [watchedProductoId]);

  // Reset stock state when drawer closes
  useEffect(() => {
    if (!showModal) {
      setCurrentStock(null);
      setHasInventory(null);
      setStockLoading(false);
    }
  }, [showModal]);

  const handleCreateMovement = rhfSubmit(async (data) => {
    if (!data.productoId || data.cantidad <= 0) {
      toast.error('Selecciona un producto y una cantidad válida');
      return;
    }

    try {
      setSubmitting(true);
      const result = await inventoryMovementService.createMovement(data);

      if (result.success) {
        toast.success('Movimiento registrado correctamente');
        setShowModal(false);
        resetForm({ productoId: 0, tipoMovimiento: 'ENTRADA', cantidad: 0, motivo: '', comentario: '' });
        fetchMovements();
      } else {
        toast.error(result.error || 'Error al registrar movimiento');
      }
    } catch (err) {
      console.error('Error al crear movimiento:', err);
      toast.error('Error al registrar movimiento');
    } finally {
      setSubmitting(false);
    }
  });

  // Calculate item range
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers
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

  // Movement type badge colors
  const getTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'ENTRADA':
        return 'bg-green-100 text-green-600';
      case 'SALIDA':
        return 'bg-red-100 text-red-600';
      case 'AJUSTE':
        return 'bg-yellow-100 text-yellow-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Quantity display
  const getQuantityDisplay = (movement: InventoryMovement) => {
    const sign = movement.movementType === 'ENTRADA' ? '+' : '-';
    const color = movement.movementType === 'ENTRADA' ? 'text-green-600' :
                  movement.movementType === 'SALIDA' ? 'text-red-600' : 'text-yellow-600';
    return { sign, color };
  };

  const typeOptions = [
    { value: 'all', label: 'Todos los tipos' },
    { value: 'ENTRADA', label: 'Entrada' },
    { value: 'SALIDA', label: 'Salida' },
    { value: 'AJUSTE', label: 'Ajuste' },
  ];

  const reasonOptions = [
    { value: 'all', label: 'Todos los motivos' },
    { value: 'COMPRA', label: 'Compra' },
    { value: 'VENTA', label: 'Venta' },
    { value: 'DEVOLUCION', label: 'Devolución' },
    { value: 'AJUSTE_INVENTARIO', label: 'Ajuste de inventario' },
    { value: 'MERMA', label: 'Merma' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
  ];

  const reasonLabels: Record<string, string> = {
    'COMPRA': 'Compra',
    'VENTA': 'Venta',
    'DEVOLUCION': 'Devolución',
    'AJUSTE_INVENTARIO': 'Ajuste inv.',
    'MERMA': 'Merma',
    'TRANSFERENCIA': 'Transferencia',
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Breadcrumbs */}
      <div className="flex items-center justify-between">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Inventario', href: '/inventory' },
          { label: 'Movimientos' },
        ]} />
        <div className="flex items-center gap-4">
          <Search className="w-[18px] h-[18px] text-blue-400 cursor-pointer hover:text-gray-700" />
          <Bell className="w-[18px] h-[18px] text-gray-500 cursor-pointer hover:text-gray-700" />
        </div>
      </div>

      {/* Title Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Movimientos de inventario
          </h1>
          <span className="text-lg text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {totalItems}
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            data-tour="movements-new-btn"
            onClick={() => {
              resetForm({ productoId: 0, tipoMovimiento: 'ENTRADA', cantidad: 0, motivo: '', comentario: '' });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo movimiento</span>
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Search Input */}
        <div className="relative w-64">
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

        {/* Type Filter */}
        <div data-tour="movements-type-filter" className="min-w-[160px]">
          <SearchableSelect
            options={typeOptions}
            value={typeFilter}
            onChange={(val) => {
              setTypeFilter(val ? String(val) : 'all');
              setCurrentPage(1);
            }}
            placeholder="Todos los tipos"
          />
        </div>

        {/* Reason Filter */}
        <div data-tour="movements-reason-filter" className="min-w-[180px]">
          <SearchableSelect
            options={reasonOptions}
            value={reasonFilter}
            onChange={(val) => {
              setReasonFilter(val ? String(val) : 'all');
              setCurrentPage(1);
            }}
            placeholder="Todos los motivos"
          />
        </div>

        <button
          onClick={fetchMovements}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
          <button onClick={fetchMovements} className="ml-4 underline hover:no-underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Movements Table */}
      <div data-tour="movements-table" className="border border-gray-200 rounded-lg overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : movements.length === 0 ? (
          <div className="flex items-center justify-center h-64 bg-white text-gray-400">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-indigo-300" />
              <p className="text-lg font-medium">No hay movimientos</p>
              <p className="text-sm">
                {searchTerm || typeFilter !== 'all' || reasonFilter !== 'all'
                  ? 'No se encontraron resultados con los filtros aplicados'
                  : 'Aún no se han registrado movimientos de inventario'}
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
                  <div key={movement.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <ArrowsLeftRight className="w-5 h-5 text-indigo-600" weight="duotone" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {movement.productName}
                        </p>
                        <p className="text-xs text-gray-500">{movement.productCode}</p>
                      </div>
                      <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 ${badge}`}>
                        {movement.movementType}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className={`font-semibold ${qty.color}`}>
                        {qty.sign}{Math.abs(movement.quantity)}
                      </span>
                      {movement.reason && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {reasonLabels[movement.reason] || movement.reason}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-violet-500" />
                        {movement.createdAt.toLocaleDateString('es-MX')}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                      <span className="text-gray-500">
                        {movement.previousStock ?? '-'} → <span className="font-medium text-gray-900">{movement.newStock ?? '-'}</span>
                      </span>
                      {movement.userName && (
                        <span className="text-gray-400 truncate max-w-[120px]">{movement.userName}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block">
              {/* Table Header */}
              <div className="flex items-center bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[1100px]">
                <div className="w-[130px] text-[11px] font-medium text-gray-500 uppercase">Fecha</div>
                <div className="flex-1 min-w-[180px] text-[11px] font-medium text-gray-500 uppercase">Producto</div>
                <div className="w-[90px] text-[11px] font-medium text-gray-500 uppercase text-center">Tipo</div>
                <div className="w-[80px] text-[11px] font-medium text-gray-500 uppercase text-right">Cantidad</div>
                <div className="w-[80px] text-[11px] font-medium text-gray-500 uppercase text-right hidden md:block">Anterior</div>
                <div className="w-[80px] text-[11px] font-medium text-gray-500 uppercase text-right hidden md:block">Nuevo</div>
                <div className="w-[140px] text-[11px] font-medium text-gray-500 uppercase pl-4">Motivo</div>
                <div className="w-[150px] text-[11px] font-medium text-gray-500 uppercase hidden lg:block">Usuario</div>
              </div>

              {/* Table Rows */}
              {movements.map((movement) => {
                const badge = getTypeBadge(movement.movementType);
                const qty = getQuantityDisplay(movement);
                return (
                  <div
                    key={movement.id}
                    className="flex items-center px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[1100px]"
                  >
                    {/* Fecha */}
                    <div className="w-[130px]">
                      <span className="text-[13px] text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {movement.createdAt.toLocaleDateString('es-MX')}
                      </span>
                      <div className="text-[11px] text-gray-500">
                        {movement.createdAt.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Producto */}
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-[13px] font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {movement.productName}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {movement.productCode}
                      </div>
                    </div>

                    {/* Tipo */}
                    <div className="w-[90px] text-center">
                      <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${badge}`}>
                        {movement.movementType}
                      </span>
                    </div>

                    {/* Cantidad */}
                    <div className="w-[80px] text-right">
                      <span className={`text-[13px] font-semibold ${qty.color}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {qty.sign}{Math.abs(movement.quantity)}
                      </span>
                    </div>

                    {/* Stock Anterior */}
                    <div className="w-[80px] text-right hidden md:block">
                      <span className="text-[13px] text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {movement.previousStock ?? '-'}
                      </span>
                    </div>

                    {/* Stock Nuevo */}
                    <div className="w-[80px] text-right hidden md:block">
                      <span className="text-[13px] text-gray-900 font-medium" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {movement.newStock ?? '-'}
                      </span>
                    </div>

                    {/* Motivo */}
                    <div className="w-[140px] pl-4">
                      <span className="text-[13px] text-gray-900 truncate block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {movement.reason ? (reasonLabels[movement.reason] || movement.reason) : '-'}
                      </span>
                    </div>

                    {/* Usuario */}
                    <div className="w-[150px] hidden lg:block">
                      <span className="text-[13px] text-gray-500 truncate block" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
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

      {/* Pagination */}
      {!loading && movements.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-gray-500 order-2 sm:order-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Mostrando {startItem}-{endItem} de {totalItems} movimientos
          </span>
          <div className="flex items-center gap-2 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((page, idx) => (
                <button
                  key={idx}
                  onClick={() => typeof page === 'number' && setCurrentPage(page)}
                  disabled={page === '...'}
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
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* New Movement Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Nuevo Movimiento"
        icon={<ArrowLeftRight className="w-5 h-5 text-indigo-500" />}
        width="md"
        isDirty={isDirty}
        onSave={handleCreateMovement}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => drawerRef.current?.requestClose()}
              className="px-4 py-2 text-xs font-medium text-gray-700 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateMovement}
              disabled={submitting || !watch('productoId') || watch('cantidad') <= 0}
              className="px-4 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        }
      >
        <div className="px-6 py-4 space-y-4">
          {/* Product Select */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Producto *</label>
            <SearchableSelect
              options={products.map(p => ({ value: p.id, label: p.name, description: p.code, imageUrl: p.imageUrl }))}
              value={watch('productoId') || null}
              onChange={(val) => {
                setValue('productoId', val ? Number(val) : 0, { shouldDirty: true });
              }}
              placeholder="Seleccionar producto"
              searchPlaceholder="Buscar producto..."
            />
            {errors.productoId && (
              <p className="mt-1 text-xs text-red-600">{errors.productoId.message}</p>
            )}
          </div>

          {/* Stock Info */}
          {watch('productoId') > 0 && (
            <div>
              {stockLoading ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-gray-400"></div>
                  <span className="text-xs text-gray-500">Consultando existencias...</span>
                </div>
              ) : hasInventory === false ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="text-xs text-amber-700">Sin existencias registradas — no es posible dar salida</span>
                </div>
              ) : currentStock !== null && currentStock === 0 ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <span className="text-xs text-red-700">Existencias: <strong>0</strong> — no es posible dar salida</span>
                </div>
              ) : currentStock !== null ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded border border-green-200">
                  <Package className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-green-700">Existencias actuales: <strong>{currentStock}</strong></span>
                </div>
              ) : null}
            </div>
          )}

          {/* Movement Type */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5">Tipo de movimiento * <HelpTooltip tooltipKey="movement-type" /></label>
            <div className="flex gap-2">
              {(['ENTRADA', 'SALIDA', 'AJUSTE'] as MovementType[]).map(type => {
                const salidaDisabled = type === 'SALIDA' && (hasInventory === false || currentStock === 0);
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={salidaDisabled}
                    onClick={() => !salidaDisabled && setValue('tipoMovimiento', type, { shouldDirty: true })}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded border transition-colors ${
                      salidaDisabled
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : watch('tipoMovimiento') === type
                        ? type === 'ENTRADA' ? 'bg-green-100 border-green-500 text-green-700'
                        : type === 'SALIDA' ? 'bg-red-100 border-red-500 text-red-700'
                        : 'bg-yellow-100 border-yellow-500 text-yellow-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                    title={salidaDisabled ? 'No hay existencias para dar salida' : undefined}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1.5">Cantidad * <HelpTooltip tooltipKey="movement-quantity" /></label>
            <input
              type="number"
              min="0"
              step="0.01"
              {...register('cantidad', { valueAsNumber: true })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500"
              placeholder="0"
            />
            {errors.cantidad && (
              <p className="mt-1 text-xs text-red-600">{errors.cantidad.message}</p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Motivo</label>
            <SearchableSelect
              options={[
                { value: 'COMPRA', label: 'Compra' },
                { value: 'VENTA', label: 'Venta' },
                { value: 'DEVOLUCION', label: 'Devolución' },
                { value: 'AJUSTE_INVENTARIO', label: 'Ajuste de inventario' },
                { value: 'MERMA', label: 'Merma' },
                { value: 'TRANSFERENCIA', label: 'Transferencia' },
              ]}
              value={watch('motivo') || null}
              onChange={(val) => {
                setValue('motivo', val ? String(val) : '', { shouldDirty: true });
              }}
              placeholder="Seleccionar motivo"
            />
            {errors.motivo && (
              <p className="mt-1 text-xs text-red-600">{errors.motivo.message}</p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Comentario</label>
            <textarea
              {...register('comentario')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 resize-none"
              placeholder="Opcional: añade un comentario..."
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}
