'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { SearchableSelect, SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { DescuentoPorCantidadDto, DescuentoPorCantidadCreateDto } from '@/types/discounts';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListPagination } from '@/components/ui/ListPagination';
import {
  Plus,
  ChevronDown,
  RefreshCw,
  Percent,
  Pencil,
  Loader2,
  Check,
  Minus,
  Download,
  Upload,
} from 'lucide-react';
import { Percent as PercentIcon } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';

type TipoAplicacion = 'Global' | 'Producto';

const discountSchema = z.object({
  productoId: z.number(),
  cantidadMinima: z.number().min(1, 'Mínimo 1 unidad'),
  descuentoPorcentaje: z.number().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
  tipoAplicacion: z.enum(['Global', 'Producto']),
}).refine(data => data.tipoAplicacion !== 'Producto' || data.productoId > 0, {
  message: 'Selecciona un producto',
  path: ['productoId'],
});

type DiscountFormData = z.infer<typeof discountSchema>;

export default function DiscountsPage() {
  const drawerRef = useRef<DrawerHandle>(null);

  const [discounts, setDiscounts] = useState<DescuentoPorCantidadDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'global' | 'product'>('global');
  const [showInactiveGlobal, setShowInactiveGlobal] = useState(false);
  const [showInactiveProduct, setShowInactiveProduct] = useState(false);
  const [searchGlobal, setSearchGlobal] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DescuentoPorCantidadDto | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: { productoId: 0, cantidadMinima: 1, descuentoPorcentaje: 0, tipoAplicacion: 'Global' },
  });

  // Products for SearchableSelect
  const [products, setProducts] = useState<{ id: number; nombre: string; codigo?: string }[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const productOptions: SearchableSelectOption[] = useMemo(() =>
    products.map(p => ({
      value: p.id,
      label: p.nombre,
      description: p.codigo || undefined,
    })),
    [products]
  );

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await api.get<{ items: { id: number; nombre: string; codigoBarra: string }[] }>('/productos', {
        params: { pagina: 1, tamanoPagina: 500, activo: true },
      });
      const items = response.data?.items ?? [];
      setProducts(items.map(p => ({ id: p.id, nombre: p.nombre, codigo: p.codigoBarra })));
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<DescuentoPorCantidadDto[]>('/descuentos');
      setDiscounts(response.data);
    } catch (error) {
      console.error('Error loading discounts:', error);
      toast.error('No se pudieron cargar los descuentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleRefresh = () => {
    fetchDiscounts();
    toast.success('Los descuentos se han actualizado correctamente');
  };

  const handleOpenCreate = (tipo: TipoAplicacion) => {
    setEditingDiscount(null);
    resetForm({ productoId: 0, cantidadMinima: 1, descuentoPorcentaje: 0, tipoAplicacion: tipo });
    if (tipo === 'Producto' && products.length === 0) fetchProducts();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (discount: DescuentoPorCantidadDto) => {
    setEditingDiscount(discount);
    resetForm({
      productoId: discount.productoId ?? 0,
      cantidadMinima: discount.cantidadMinima,
      descuentoPorcentaje: discount.descuentoPorcentaje,
      tipoAplicacion: discount.tipoAplicacion,
    });
    if (discount.tipoAplicacion === 'Producto' && products.length === 0) fetchProducts();
    setIsModalOpen(true);
  };

  // Direct toggle active/inactive (like products page)
  const handleToggleActive = async (discount: DescuentoPorCantidadDto) => {
    try {
      setTogglingId(discount.id);
      await api.patch(`/descuentos/${discount.id}/toggle`);
      toast.success(discount.activo ? 'Descuento desactivado' : 'Descuento activado');
      setDiscounts(prev => prev.map(d =>
        d.id === discount.id ? { ...d, activo: !d.activo } : d
      ));
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar el estado del descuento');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      const dto: DescuentoPorCantidadCreateDto = {
        productoId: data.tipoAplicacion === 'Global' ? null : data.productoId,
        cantidadMinima: data.cantidadMinima,
        descuentoPorcentaje: data.descuentoPorcentaje,
        tipoAplicacion: data.tipoAplicacion,
      };

      if (editingDiscount) {
        await api.put(`/descuentos/${editingDiscount.id}`, dto);
        toast.success('Descuento actualizado exitosamente');
      } else {
        await api.post('/descuentos', dto);
        toast.success('Descuento creado exitosamente');
      }

      setIsModalOpen(false);
      await fetchDiscounts();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || 'Ocurrió un error al guardar el descuento';
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  });


  const showInactive = activeTab === 'global' ? showInactiveGlobal : showInactiveProduct;
  const searchTerm = activeTab === 'global' ? searchGlobal : searchProduct;

  const filteredDiscounts = discounts.filter(d => {
    const matchesTab = activeTab === 'global'
      ? d.tipoAplicacion === 'Global'
      : d.tipoAplicacion === 'Producto';
    const matchesStatus = showInactive ? true : d.activo;
    if (!matchesTab || !matchesStatus) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (activeTab === 'product') {
        return (d.productoNombre?.toLowerCase().includes(term) ||
                d.productoCodigo?.toLowerCase().includes(term)) ?? false;
      } else {
        return String(d.cantidadMinima).includes(term) ||
               String(d.descuentoPorcentaje).includes(term);
      }
    }
    return true;
  });

  const globalCount = discounts.filter(d => d.tipoAplicacion === 'Global').length;
  const productCount = discounts.filter(d => d.tipoAplicacion === 'Producto').length;

  const totalItems = filteredDiscounts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedDiscounts = filteredDiscounts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const visibleIds = paginatedDiscounts.map(d => d.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [activeTab, showInactiveGlobal, showInactiveProduct, searchGlobal, searchProduct],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedCount === 0) return;

    try {
      setActionLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await api.patch('/descuentos/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} descuento${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      batch.completeBatch();
      setDiscounts(prev => prev.map(d =>
        ids.includes(d.id) ? { ...d, activo } : d
      ));
    } catch (_error) {
      toast.error('Error al cambiar el estado de los descuentos');
    } finally {
      setActionLoading(false);
    }
  };

  const formatRelativeTime = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'hoy';
    if (days === 1) return 'hace un día';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
    return date.toLocaleDateString('es-MX');
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Descuentos por cantidad' },
      ]}
      title="Descuentos por cantidad"
      actions={
        <>
          <div className="relative" data-tour="discounts-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('descuentos'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
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
          <div className="relative group" data-tour="discounts-create-btn">
            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Nuevo descuento</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button
                onClick={() => handleOpenCreate('Global')}
                className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
              >
                Descuento global
              </button>
              <button
                onClick={() => handleOpenCreate('Producto')}
                className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-gray-50 last:rounded-b-lg border-t border-gray-100"
              >
                Descuento por producto
              </button>
            </div>
          </div>
        </>
      }
    >
          {/* Tabs */}
          <div className="flex items-center border-b border-gray-200 mb-4" data-tour="discounts-tabs">
            <button
              onClick={() => { setActiveTab('global'); setCurrentPage(1); }}
              className={`px-5 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === 'global'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Descuento global ({globalCount})
            </button>
            <button
              onClick={() => { setActiveTab('product'); setCurrentPage(1); }}
              className={`px-5 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === 'product'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              Descuento por producto ({productCount})
            </button>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3 mb-4">
            <SearchBar
              value={searchTerm}
              onChange={(v) => {
                if (activeTab === 'global') setSearchGlobal(v);
                else setSearchProduct(v);
                setCurrentPage(1);
              }}
              placeholder={activeTab === 'product' ? 'Buscar por producto o código...' : 'Buscar descuento...'}
              dataTour="discounts-search"
            />

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            <div data-tour="discounts-toggle-inactive" className="ml-auto">
              <InactiveToggle
                value={showInactive}
                onChange={(v) => {
                  if (activeTab === 'global') setShowInactiveGlobal(v);
                  else setShowInactiveProduct(v);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Selection Action Bar */}
          <BatchActionBar
            selectedCount={batch.selectedCount}
            totalItems={filteredDiscounts.length}
            entityLabel="descuentos"
            onActivate={() => batch.openBatchAction('activate')}
            onDeactivate={() => batch.openBatchAction('deactivate')}
            onClear={batch.handleClearSelection}
            loading={actionLoading}
            className="mb-4"
          />

          {/* Content - Container with loading overlay */}
          <div className="relative min-h-[200px]" data-tour="discounts-cards">
            <TableLoadingOverlay loading={loading} message="Cargando descuentos..." />

            {/* Empty State */}
            {!loading && paginatedDiscounts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Percent className="w-16 h-16 text-orange-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay descuentos</h3>
                <p className="text-sm text-gray-500 text-center">
                  Crea tu primer descuento por cantidad para comenzar
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards */}
                <div className="sm:hidden space-y-3">
                  {paginatedDiscounts.map((discount) => (
                    <div
                      key={discount.id}
                      className={`bg-white border rounded-lg p-4 ${
                        batch.selectedIds.has(discount.id)
                          ? 'border-green-400 bg-green-50/50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-start gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => batch.handleToggleSelect(discount.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              batch.selectedIds.has(discount.id)
                                ? 'bg-green-600 border-green-600 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {batch.selectedIds.has(discount.id) && <Check className="w-3 h-3" />}
                          </button>
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <PercentIcon className="w-5 h-5 text-orange-600" weight="duotone" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {discount.descuentoPorcentaje}% de descuento
                            </p>
                            {discount.tipoAplicacion === 'Producto' && (
                              <p className="text-xs text-gray-500 truncate">{discount.productoNombre || '-'}</p>
                            )}
                          </div>
                        </div>
                        <ActiveToggle
                          isActive={discount.activo}
                          onToggle={() => handleToggleActive(discount)}
                          disabled={loading}
                          isLoading={togglingId === discount.id}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className={`inline-flex px-2 py-0.5 rounded-full ${
                          discount.tipoAplicacion === 'Global'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-purple-100 text-purple-600'
                        }`}>
                          {discount.tipoAplicacion}
                        </span>
                        <span>A partir de {discount.cantidadMinima} unidades</span>
                        {discount.tipoAplicacion === 'Producto' && discount.productoCodigo && (
                          <span className="text-gray-400">• {discount.productoCodigo}</span>
                        )}
                      </div>
                      <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                        <button
                          onClick={() => handleOpenEdit(discount)}
                          disabled={loading}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <Pencil className="w-3 h-3 text-amber-400" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Cards with opacity transition */}
                <div className={`hidden sm:block space-y-4 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                  {/* Select All Header */}
                  <div className="flex items-center gap-3 px-5">
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
                    <span className="text-xs text-gray-500">
                      Seleccionar todos en esta página
                    </span>
                  </div>

                  {paginatedDiscounts.map((discount) => (
                    <div
                      key={discount.id}
                      className={`flex items-center gap-5 bg-white border rounded-lg p-5 transition-colors ${
                        batch.selectedIds.has(discount.id)
                          ? 'border-green-400 bg-green-50/50'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => batch.handleToggleSelect(discount.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(discount.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(discount.id) && <Check className="w-3 h-3" />}
                      </button>

                      {/* Percentage */}
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">Porcentaje de descuento</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {discount.descuentoPorcentaje}%
                        </div>
                      </div>

                      {/* Min Quantity */}
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">A partir de</div>
                        <div className="text-2xl font-semibold text-gray-900">
                          {discount.cantidadMinima} unidades
                        </div>
                      </div>

                      {/* Product (for product-specific) */}
                      {discount.tipoAplicacion === 'Producto' && (
                        <div className="flex-1">
                          <div className="text-xs text-gray-400 mb-1">Producto</div>
                          <div className="text-[13px] font-medium text-gray-900">{discount.productoNombre || '-'}</div>
                          <div className="text-xs text-gray-400">{discount.productoCodigo || ''}</div>
                        </div>
                      )}

                      {/* Created By */}
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">Creado por</div>
                        <div className="text-[13px] font-medium text-green-600">{discount.creadoPor || '-'}</div>
                        <div className="text-xs text-gray-400">{formatRelativeTime(discount.creadoEn)}</div>
                      </div>

                      {/* Modified By */}
                      <div className="flex-1">
                        <div className="text-xs text-gray-400 mb-1">Última modificación</div>
                        <div className="text-[13px] font-medium text-green-600">{discount.actualizadoPor || discount.creadoPor || '-'}</div>
                        <div className="text-xs text-gray-400">{formatRelativeTime(discount.actualizadoEn || discount.creadoEn)}</div>
                      </div>

                      {/* Activo Toggle */}
                      <div className="w-[60px] flex flex-col items-center gap-1">
                        <div className="text-xs text-gray-400">Activo</div>
                        <ActiveToggle
                          isActive={discount.activo}
                          onToggle={() => handleToggleActive(discount)}
                          disabled={loading}
                          isLoading={togglingId === discount.id}
                        />
                      </div>

                      {/* Actions */}
                      <div className="w-[60px] flex items-center justify-center">
                        <button
                          onClick={() => handleOpenEdit(discount)}
                          disabled={loading}
                          className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pagination - Always visible when there are items */}
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="descuentos"
            loading={loading}
          />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? 'Editar Descuento' : 'Nuevo Descuento'}
        icon={<Percent className="w-5 h-5 text-green-600" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex justify-end gap-3" data-tour="discounts-drawer-actions">
            <button
              onClick={() => drawerRef.current?.requestClose()}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingDiscount ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4" data-tour="discount-form">
          <div className="grid grid-cols-2 gap-4" data-tour="discounts-drawer-fields">
            <div data-tour="discounts-drawer-percentage">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Porcentaje <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="100"
                  placeholder="10"
                  {...register('descuentoPorcentaje', { valueAsNumber: true })}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
              </div>
              {errors.descuentoPorcentaje && <p className="text-red-500 text-xs mt-1">{errors.descuentoPorcentaje.message}</p>}
            </div>

            <div data-tour="discounts-drawer-quantity">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantidad minima <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="10"
                {...register('cantidadMinima', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
              {errors.cantidadMinima && <p className="text-red-500 text-xs mt-1">{errors.cantidadMinima.message}</p>}
            </div>
          </div>

          {watch('tipoAplicacion') === 'Producto' && (
            <div data-tour="discounts-drawer-product">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={productOptions}
                value={watch('productoId') || null}
                onChange={(val) => setValue('productoId', val ? Number(val) : 0, { shouldDirty: true })}
                placeholder={loadingProducts ? 'Cargando productos...' : 'Seleccionar producto...'}
                searchPlaceholder="Buscar por nombre o codigo..."
                emptyMessage="No se encontraron productos"
                disabled={loadingProducts}
              />
              {errors.productoId && <p className="text-red-500 text-xs mt-1">{errors.productoId.message}</p>}
            </div>
          )}
        </form>
      </Drawer>

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="descuentos"
        loading={actionLoading}
        consequenceDeactivate="Los clientes ya no podrán obtener estos descuentos."
        consequenceActivate="Los clientes podrán obtener estos descuentos nuevamente."
      />

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="descuentos"
        entityLabel="descuentos"
        onSuccess={() => fetchDiscounts()}
      />
    </PageHeader>
  );
}
