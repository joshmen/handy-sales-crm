'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef  } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
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
  Download,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import { Percent as PercentIcon } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { useFormatters } from '@/hooks/useFormatters';

type TipoAplicacion = 'Global' | 'Producto';

const discountSchema = z.object({
  productoId: z.number(),
  cantidadMinima: z.number().min(1, 'minOneUnit'),
  descuentoPorcentaje: z.number().min(1, 'minOnePercent').max(100, 'discountMax100'),
  tipoAplicacion: z.enum(['Global', 'Producto']),
}).refine(data => data.tipoAplicacion !== 'Producto' || data.productoId > 0, {
  message: 'selectProduct',
  path: ['productoId'],
});

type DiscountFormData = z.infer<typeof discountSchema>;

export default function DiscountsPage() {
  const t = useTranslations('discounts');
  const tc = useTranslations('common');
  const { formatDate } = useFormatters();
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleRefresh = () => {
    fetchDiscounts();
    toast.success(t('refreshed'));
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
      toast.success(discount.activo ? t('deactivated') : t('activated'));
      setDiscounts(prev => prev.map(d =>
        d.id === discount.id ? { ...d, activo: !d.activo } : d
      ));
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(t('errorToggle'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/descuentos/${id}`);
      toast.success(t('deleted'));
      await fetchDiscounts();
    } catch {
      toast.error(t('errorDeleting'));
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
        toast.success(t('updated'));
      } else {
        await api.post('/descuentos', dto);
        toast.success(t('created'));
      }

      setIsModalOpen(false);
      await fetchDiscounts();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      const message = e?.response?.data?.message || t('errorSaving');
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

  // Sort state
  const [sortKey, setSortKey] = useState('descuentoPorcentaje');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  const sortedDiscounts = useMemo(() => {
    const sorted = [...paginatedDiscounts];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'descuentoPorcentaje': cmp = a.descuentoPorcentaje - b.descuentoPorcentaje; break;
        case 'cantidadMinima': cmp = a.cantidadMinima - b.cantidadMinima; break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [paginatedDiscounts, sortKey, sortDir]);

  // Column definitions
  const discountColumns = useMemo<DataGridColumn<DescuentoPorCantidadDto>[]>(() => [
    {
      key: 'descuentoPorcentaje',
      label: t('discount'),
      sortable: true,
      width: 'flex',
      cellRenderer: (d) => (
        <div>
          <div className="text-lg font-semibold text-gray-900">{d.descuentoPorcentaje}%</div>
        </div>
      ),
    },
    {
      key: 'cantidadMinima',
      label: t('minQuantity'),
      sortable: true,
      width: 'flex',
      cellRenderer: (d) => (
        <div className="text-[13px] text-gray-900">{d.cantidadMinima} {t('units')}</div>
      ),
    },
    ...(activeTab === 'product' ? [{
      key: 'producto',
      label: t('product'),
      width: 'flex' as const,
      cellRenderer: (d: DescuentoPorCantidadDto) => (
        <div>
          <div className="text-[13px] font-medium text-gray-900">{d.productoNombre || '-'}</div>
          <div className="text-xs text-gray-400">{d.productoCodigo || ''}</div>
        </div>
      ),
    }] : []),
    {
      key: 'creadoPor',
      label: t('createdBy'),
      width: 'flex',
      hiddenOnMobile: true,
      cellRenderer: (d) => (
        <div>
          <div className="text-[13px] font-medium text-green-600">{d.creadoPor || '-'}</div>
          <div className="text-xs text-gray-400">{formatRelativeTime(d.creadoEn)}</div>
        </div>
      ),
    },
    {
      key: 'actualizadoPor',
      label: t('lastModified'),
      width: 'flex',
      hiddenOnMobile: true,
      cellRenderer: (d) => (
        <div>
          <div className="text-[13px] font-medium text-green-600">{d.actualizadoPor || d.creadoPor || '-'}</div>
          <div className="text-xs text-gray-400">{formatRelativeTime(d.actualizadoEn || d.creadoEn)}</div>
        </div>
      ),
    },
    {
      key: 'activo',
      label: tc('active'),
      width: 60,
      align: 'center' as const,
      cellRenderer: (d) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActiveToggle isActive={d.activo} onToggle={() => handleToggleActive(d)} disabled={loading} isLoading={togglingId === d.id} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 60,
      cellRenderer: (d) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleOpenEdit(d)} disabled={loading} className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
            <Pencil className="w-4 h-4" />
          </button>
          {deleteConfirmId === d.id ? (
            <>
              <button onClick={() => { handleDelete(d.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <button onClick={() => setDeleteConfirmId(d.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ] as DataGridColumn<DescuentoPorCantidadDto>[], [activeTab, loading, togglingId, deleteConfirmId]);

  const visibleIds = sortedDiscounts.map(d => d.id);
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
        activo ? t('batchActivated', { count: ids.length, plural: ids.length > 1 ? 's' : '', plural2: ids.length > 1 ? 's' : '' }) : t('batchDeactivated', { count: ids.length, plural: ids.length > 1 ? 's' : '', plural2: ids.length > 1 ? 's' : '' })
      );

      batch.completeBatch();
      setDiscounts(prev => prev.map(d =>
        ids.includes(d.id) ? { ...d, activo } : d
      ));
    } catch (_error) {
      toast.error(t('batchError'));
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
    if (days === 0) return t('today');
    if (days === 1) return t('dayAgo');
    if (days < 7) return t('daysAgo', { count: days });
    if (days < 30) return t('weeksAgo', { count: Math.floor(days / 7) });
    return formatDate(date);
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={totalItems > 0 ? t('discountCount', { count: totalItems, plural: totalItems !== 1 ? 's' : '' }) : undefined}
      actions={
        <>
          <div className="relative" data-tour="discounts-import-export">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-surface-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">{tc('importExport')}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {showDataMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-surface-2 border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('descuentos'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-surface-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    {tc('exportCsv')}
                  </button>
                  <button
                    onClick={() => { setIsImportOpen(true); setShowDataMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-surface-1"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    {tc('importCsv')}
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="relative group" data-tour="discounts-create-btn">
            <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors">
              <Plus className="w-4 h-4" />
              <span>{t('newDiscount')}</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 w-56 bg-surface-2 border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
              <button
                onClick={() => handleOpenCreate('Global')}
                className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-surface-1 first:rounded-t-lg"
              >
                {t('globalDiscount')}
              </button>
              <button
                onClick={() => handleOpenCreate('Producto')}
                className="w-full px-4 py-2.5 text-left text-[13px] text-gray-700 hover:bg-surface-1 last:rounded-b-lg border-t border-gray-100"
              >
                {t('productDiscount')}
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
              {t('tabGlobal', { count: globalCount })}
            </button>
            <button
              onClick={() => { setActiveTab('product'); setCurrentPage(1); }}
              className={`px-5 py-2 text-[13px] font-medium border-b-2 transition-colors ${
                activeTab === 'product'
                  ? 'text-green-600 border-green-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {t('tabProduct', { count: productCount })}
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
              placeholder={activeTab === 'product' ? t('searchProduct') : t('searchGlobal')}
              dataTour="discounts-search"
            />

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{tc('refresh')}</span>
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
            entityLabel={t('title').toLowerCase()}
            onActivate={() => batch.openBatchAction('activate')}
            onDeactivate={() => batch.openBatchAction('deactivate')}
            onClear={batch.handleClearSelection}
            loading={actionLoading}
            className="mb-4"
          />

          {/* Discounts DataGrid */}
          <div data-tour="discounts-cards">
            <DataGrid<DescuentoPorCantidadDto>
              columns={discountColumns}
              data={sortedDiscounts}
              keyExtractor={(d) => d.id}
              loading={loading}
              loadingMessage={t('loadingDiscounts')}
              emptyIcon={<Percent className="w-16 h-16 text-orange-300" />}
              emptyTitle={t('noDiscounts')}
              emptyMessage={t('noDiscountsDesc')}
              onRowClick={(d) => handleOpenEdit(d)}
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
              pagination={{
                currentPage,
                totalPages,
                totalItems,
                pageSize,
                onPageChange: setCurrentPage,
              }}
              mobileCardRenderer={(discount) => (
                <>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <PercentIcon className="w-5 h-5 text-orange-600" weight="duotone" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{discount.descuentoPorcentaje}% de descuento</p>
                        {discount.tipoAplicacion === 'Producto' && <p className="text-xs text-gray-500 truncate">{discount.productoNombre || '-'}</p>}
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ActiveToggle isActive={discount.activo} onToggle={() => handleToggleActive(discount)} disabled={loading} isLoading={togglingId === discount.id} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className={`inline-flex px-2 py-0.5 rounded-full ${discount.tipoAplicacion === 'Global' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>{discount.tipoAplicacion}</span>
                    <span>{t('startingFrom', { count: discount.cantidadMinima })}</span>
                    {discount.tipoAplicacion === 'Producto' && discount.productoCodigo && <span className="text-gray-400">- {discount.productoCodigo}</span>}
                  </div>
                  <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-gray-100 pt-2" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => handleOpenEdit(discount)} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-surface-2 border border-gray-200 rounded hover:bg-surface-1 transition-colors disabled:opacity-50">
                      <Pencil className="w-3 h-3 text-amber-400" /><span>{tc('edit')}</span>
                    </button>
                    {deleteConfirmId === discount.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { handleDelete(discount.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                        <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(discount.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                </>
              )}
            />
          </div>

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingDiscount ? t('editDiscount') : t('newDiscount')}
        icon={<Percent className="w-5 h-5 text-green-600" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex justify-end gap-3" data-tour="discounts-drawer-actions">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingDiscount ? tc('saveChanges') : t('newDiscount')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4" data-tour="discount-form">
          <div className="grid grid-cols-2 gap-4" data-tour="discounts-drawer-fields">
            <div data-tour="discounts-drawer-percentage">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('percentage')} <span className="text-red-500">*</span>
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
              {errors.descuentoPorcentaje && <FieldError message={errors.descuentoPorcentaje.message} />}
            </div>

            <div data-tour="discounts-drawer-quantity">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('minQuantity')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="10"
                {...register('cantidadMinima', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
              {errors.cantidadMinima && <FieldError message={errors.cantidadMinima.message} />}
            </div>
          </div>

          {watch('tipoAplicacion') === 'Producto' && (
            <div data-tour="discounts-drawer-product">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('product')} <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                options={productOptions}
                value={watch('productoId') || null}
                onChange={(val) => setValue('productoId', val ? Number(val) : 0, { shouldDirty: true })}
                placeholder={loadingProducts ? t('loadingProducts') : t('selectProduct')}
                searchPlaceholder={t('searchProductPlaceholder')}
                emptyMessage={t('noProducts')}
                disabled={loadingProducts}
              />
              {errors.productoId && <FieldError message={errors.productoId.message} />}
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
        entityLabel={t('title').toLowerCase()}
        loading={actionLoading}
        consequenceDeactivate={t('batchConsequenceDeactivate')}
        consequenceActivate={t('batchConsequenceActivate')}
      />

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="descuentos"
        entityLabel={t('title').toLowerCase()}
        onSuccess={() => fetchDiscounts()}
      />
    </PageHeader>
  );
}
