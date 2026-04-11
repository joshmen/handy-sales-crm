'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { PromocionDto, PromocionCreateRequest, promotionService } from '@/services/api/promotions';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Plus,
  Gift,
  Pencil,
  RefreshCw,
  Calendar,
  Package,
  Check,
  X,
  Loader2,
  Tag,
  Download,
  Upload,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { FieldError } from '@/components/forms/FieldError';
import { Megaphone } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { useFormatters } from '@/hooks/useFormatters';

interface ProductoSimple {
  id: number;
  nombre: string;
}

const promotionSchema = z.object({
  nombre: z.string().min(1, 'nameRequired'),
  descripcion: z.string(),
  productoIds: z.array(z.number()).min(1, 'selectProductForDiscount'),
  descuentoPorcentaje: z.number().min(1, 'minOnePercent').max(100, 'discountMax100'),
  fechaInicio: z.string().min(1, 'startDateRequired'),
  fechaFin: z.string().min(1, 'endDateRequired'),
}).refine(data => !data.fechaFin || !data.fechaInicio || data.fechaFin > data.fechaInicio, {
  message: 'endDateAfterStart',
  path: ['fechaFin'],
});

type PromotionFormData = z.infer<typeof promotionSchema>;

export default function PromotionsPage() {
  const t = useTranslations('promotions');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();
  const { formatDate: _fmtDate } = useFormatters();
  const drawerRef = useRef<DrawerHandle>(null);
  const [promotions, setPromotions] = useState<PromocionDto[]>([]);
  const [productos, setProductos] = useState<ProductoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromocionDto | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [search, setSearch] = useState('');

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset: resetForm, watch, setValue, formState: { errors, isDirty } } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: { nombre: '', descripcion: '', productoIds: [], descuentoPorcentaje: 0, fechaInicio: '', fechaFin: '' },
  });

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PromocionDto[]>('/promociones');
      setPromotions(response.data);
    } catch (error) {
      console.error('Error loading promotions:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProductos = useCallback(async () => {
    try {
      const response = await api.get<{ items: ProductoSimple[] }>('/productos?pagina=1&tamanoPagina=500');
      setProductos(response.data.items || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    fetchProductos();
  }, [fetchPromotions, fetchProductos]);

  // Filter
  const filteredPromotions = promotions.filter(p => {
    if (!showInactive && !p.activo) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!p.nombre.toLowerCase().includes(s) && !(p.descripcion || '').toLowerCase().includes(s)) return false;
    }
    return true;
  });

  // Pagination
  const totalItems = filteredPromotions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedPromotions = filteredPromotions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return _fmtDate(dateStr, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isExpired = (fechaFin: string) => {
    if (!fechaFin) return false;
    return new Date(fechaFin) < new Date();
  };

  // Sort state
  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSortPromo = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  const sortedPromotions = useMemo(() => {
    const sorted = [...paginatedPromotions];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nombre': cmp = a.nombre.localeCompare(b.nombre); break;
        case 'descuentoPorcentaje': cmp = a.descuentoPorcentaje - b.descuentoPorcentaje; break;
        case 'fechaInicio': cmp = (a.fechaInicio || '').localeCompare(b.fechaInicio || ''); break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [paginatedPromotions, sortKey, sortDir]);

  // Column definitions
  const promoColumns = useMemo<DataGridColumn<PromocionDto>[]>(() => [
    {
      key: 'nombre',
      label: t('name'),
      sortable: true,
      width: 'flex',
      cellRenderer: (promo) => (
        <div className={`${!promo.activo ? 'opacity-50' : ''}`}>
          <div className="text-[13px] font-medium text-foreground truncate">{promo.nombre}</div>
          {promo.descripcion && <div className="text-xs text-muted-foreground truncate mt-0.5">{promo.descripcion}</div>}
        </div>
      ),
    },
    {
      key: 'productos',
      label: t('products'),
      width: 200,
      cellRenderer: (promo) => promo.productos && promo.productos.length > 0 ? (
        <div className="group relative">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
            <span className="text-[13px] text-foreground/80">
              {promo.productos.length === 1 ? promo.productos[0].productoNombre : t('productsCount', { count: promo.productos.length, plural: 's' })}
            </span>
          </div>
          <div className="invisible group-hover:visible absolute z-20 left-0 top-full mt-1 w-56 bg-foreground text-white text-xs rounded-lg shadow-lg p-2 max-h-[200px] overflow-y-auto">
            <div className="font-medium text-muted-foreground/60 mb-1 px-1">{t('productsCount', { count: promo.productos.length, plural: promo.productos.length !== 1 ? 's' : '' })}:</div>
            {promo.productos.map((prod) => (
              <div key={prod.productoId} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-foreground">
                <Package className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{prod.productoNombre}</span>
              </div>
            ))}
          </div>
        </div>
      ) : <span className="text-[11px] text-muted-foreground">{t('noProducts')}</span>,
    },
    {
      key: 'descuentoPorcentaje',
      label: t('discountPercent'),
      sortable: true,
      width: 80,
      align: 'center',
      cellRenderer: (promo) => (
        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[13px] font-medium text-blue-700 bg-blue-50 rounded-full">{promo.descuentoPorcentaje}%</span>
      ),
    },
    {
      key: 'fechaInicio',
      label: t('validity'),
      sortable: true,
      width: 200,
      cellRenderer: (promo) => (
        <div>
          <div className="flex items-center gap-1.5 text-[13px] text-foreground/70">
            <Calendar className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
            <span>{formatDate(promo.fechaInicio)} - {formatDate(promo.fechaFin)}</span>
          </div>
          {isExpired(promo.fechaFin) && <span className="text-[11px] text-red-500 ml-5">{t('expired')}</span>}
        </div>
      ),
    },
    {
      key: 'activo',
      label: tc('active'),
      width: 50,
      align: 'center',
      cellRenderer: (promo) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActiveToggle isActive={promo.activo} onToggle={() => handleToggleActive(promo)} disabled={loading} isLoading={togglingId === promo.id} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 64,
      cellRenderer: (promo) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleOpenEdit(promo)} disabled={loading} className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
            <Pencil className="w-4 h-4" />
          </button>
          {deleteConfirmId === promo.id ? (
            <>
              <button onClick={() => { handleDelete(promo.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
              <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X className="w-4 h-4" /></button>
            </>
          ) : (
            <button onClick={() => setDeleteConfirmId(promo.id)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ], [loading, togglingId, deleteConfirmId, formatDate, isExpired]);

  // Batch operations
  const visibleIds = sortedPromotions.map(p => p.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, showInactive],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await promotionService.batchToggleActive(ids, activo);

      toast.success(
        activo ? t('batchActivated', { count: ids.length, plural: ids.length > 1 ? 'es' : '', plural2: ids.length > 1 ? 's' : '' }) : t('batchDeactivated', { count: ids.length, plural: ids.length > 1 ? 'es' : '', plural2: ids.length > 1 ? 's' : '' })
      );

      // Optimistic update
      if (!showInactive && !activo) {
        setPromotions(prev => prev.filter(p => !ids.includes(p.id)));
      } else {
        setPromotions(prev => prev.map(p =>
          ids.includes(p.id) ? { ...p, activo } : p
        ));
      }

      batch.completeBatch();
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error(t('batchError'));
      batch.setBatchLoading(false);
      await fetchPromotions();
    }
  };

  const handleRefresh = () => {
    fetchPromotions();
    toast.success(t('refreshed'));
  };

  const handleOpenCreate = () => {
    setEditingPromotion(null);
    resetForm({ nombre: '', descripcion: '', productoIds: [], descuentoPorcentaje: 0, fechaInicio: '', fechaFin: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: PromocionDto) => {
    setEditingPromotion(promo);
    resetForm({
      nombre: promo.nombre,
      descripcion: promo.descripcion || '',
      productoIds: promo.productos?.map(p => p.productoId) || [],
      descuentoPorcentaje: promo.descuentoPorcentaje,
      fechaInicio: promo.fechaInicio ? promo.fechaInicio.split('T')[0] : '',
      fechaFin: promo.fechaFin ? promo.fechaFin.split('T')[0] : '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await promotionService.delete(id);
      toast.success(t('deleted'));
      await fetchPromotions();
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      const dto: PromocionCreateRequest = {
        nombre: data.nombre.trim(),
        descripcion: data.descripcion.trim(),
        productoIds: data.productoIds,
        descuentoPorcentaje: data.descuentoPorcentaje,
        fechaInicio: data.fechaInicio,
        fechaFin: data.fechaFin,
      };

      if (editingPromotion) {
        await api.put(`/promociones/${editingPromotion.id}`, dto);
        toast.success(t('updated'));
      } else {
        await api.post('/promociones', dto);
        toast.success(t('created'));
      }

      setIsModalOpen(false);
      await fetchPromotions();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      toast.error(tApi(e?.response?.data?.message) || tApi(e?.message) || t('errorSaving'));
    } finally {
      setActionLoading(false);
    }
  });

  const handleToggleActive = async (promo: PromocionDto) => {
    try {
      setTogglingId(promo.id);
      const newActivo = !promo.activo;
      await promotionService.toggleActive(promo.id, newActivo);
      toast.success(newActivo ? t('activated') : t('deactivated'));
      // Optimistic update
      if (!showInactive && !newActivo) {
        setPromotions(prev => prev.filter(p => p.id !== promo.id));
      } else {
        setPromotions(prev => prev.map(p =>
          p.id === promo.id ? { ...p, activo: newActivo } : p
        ));
      }
    } catch (error: unknown) {
      toast.error(tApi((error as { response?: { data?: { message?: string } } })?.response?.data?.message) || t('errorToggle'));
      await fetchPromotions();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={`${promotions.length} ${promotions.length === 1 ? t('promoSingular') : t('promoPlural')}`}
      actions={
        <>
          <div className="relative" data-tour="promotions-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('promociones'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
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
            data-tour="promotions-create-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newPromotion')}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setCurrentPage(1); }}
            placeholder={t('searchPlaceholder')}
            dataTour="promotions-search"
          />

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>

          <div data-tour="promotions-toggle-inactive" className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalItems}
          entityLabel={t('title').toLowerCase()}
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* Promotions DataGrid */}
        <div data-tour="promotions-table">
          <DataGrid<PromocionDto>
            columns={promoColumns}
            data={sortedPromotions}
            keyExtractor={(p) => p.id}
            loading={loading}
            loadingMessage={t('loadingPromotions')}
            emptyIcon={<Gift className="w-16 h-16 text-yellow-300" />}
            emptyTitle={t('noPromotions')}
            emptyMessage={t('noPromotionsDesc')}
            sort={{
              key: sortKey,
              direction: sortDir,
              onSort: handleSortPromo,
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
            mobileCardRenderer={(promo) => (
              <div className={`${!promo.activo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-purple-600" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{promo.nombre}</p>
                      {promo.descripcion && <p className="text-xs text-muted-foreground truncate">{promo.descripcion}</p>}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActiveToggle isActive={promo.activo} onToggle={() => handleToggleActive(promo)} disabled={loading} isLoading={togglingId === promo.id} />
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Package className="w-3 h-3 text-blue-400" /> {t('productsCount', { count: promo.productos?.length || 0, plural: (promo.productos?.length || 0) !== 1 ? 's' : '' })}</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{promo.descuentoPorcentaje}%</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 text-violet-500" />
                  <span>{formatDate(promo.fechaInicio)} - {formatDate(promo.fechaFin)}</span>
                  {isExpired(promo.fechaFin) && <span className="text-red-500 ml-1">{t('expired')}</span>}
                </div>
                <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-border-subtle pt-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleOpenEdit(promo)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" /> {tc('edit')}
                  </button>
                  {deleteConfirmId === promo.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(promo.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(promo.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </div>

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel={t('title').toLowerCase()}
        loading={batch.batchLoading}
        consequenceActivate={t('batchConsequenceActivate')}
        consequenceDeactivate={t('batchConsequenceDeactivate')}
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => !actionLoading && setIsModalOpen(false)}
        title={editingPromotion ? t('editPromotion') : t('newPromotion')}
        icon={<Tag className="w-5 h-5 text-amber-500" />}
        width="lg"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex justify-end gap-3" data-tour="promotions-drawer-actions">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="default" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingPromotion ? tc('saveChanges') : t('newPromotion')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} data-tour="promotion-form" className="px-6 py-6 space-y-4">
          <div data-tour="promotions-drawer-name">
            <label className="block text-sm font-medium text-foreground/80 mb-1">{t('name')} <span className="text-red-500">*</span></label>
            <input
              type="text"
              {...register('nombre')}
              placeholder={t('namePlaceholder')}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.nombre && <FieldError message={errors.nombre.message} />}
          </div>

          <div data-tour="promotions-drawer-description">
            <label className="block text-sm font-medium text-foreground/80 mb-1">{t('description')}</label>
            <input
              type="text"
              {...register('descripcion')}
              placeholder={t('descriptionPlaceholder')}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div data-tour="promotions-drawer-products">
            <label className="flex items-center gap-1 text-sm font-medium text-foreground/80 mb-1">{t('products')} <span className="text-red-500">*</span> <HelpTooltip tooltipKey="promo-products" /></label>
            {/* Selected product chips */}
            {watch('productoIds').length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 max-h-[120px] overflow-y-auto p-1">
                {watch('productoIds').map(id => {
                  const prod = productos.find(p => p.id === id);
                  return (
                    <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 border border-green-200 rounded-full">
                      {prod?.nombre || `#${id}`}
                      <button
                        type="button"
                        onClick={() => setValue('productoIds', watch('productoIds').filter(pid => pid !== id), { shouldDirty: true })}
                        className="ml-0.5 p-0.5 hover:bg-green-100 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {/* Product search and add */}
            <SearchableSelect
              options={productos
                .filter(p => !watch('productoIds').includes(p.id))
                .map(p => ({ value: p.id, label: p.nombre }))}
              value={null}
              onChange={(val) => {
                if (val) {
                  const currentIds = watch('productoIds');
                  setValue('productoIds', [...currentIds, Number(val)], { shouldDirty: true });
                }
              }}
              placeholder={watch('productoIds').length > 0 ? t('addAnotherProduct') : t('selectProducts')}
              searchPlaceholder={t('searchProduct')}
              emptyMessage={t('noMoreProducts')}
              onSelectAll={
                watch('productoIds').length < productos.length
                  ? () => setValue('productoIds', productos.map(p => p.id), { shouldDirty: true })
                  : undefined
              }
              onClearAll={
                watch('productoIds').length > 0
                  ? () => setValue('productoIds', [], { shouldDirty: true })
                  : undefined
              }
            />
            {errors.productoIds && <FieldError message={errors.productoIds.message} />}
            <p className="text-xs text-muted-foreground mt-1">{t('selectedCount', { selected: watch('productoIds').length, total: productos.length, plural: watch('productoIds').length !== 1 ? 's' : '', plural2: watch('productoIds').length !== 1 ? 's' : '' })}</p>
          </div>

          <div data-tour="promotions-drawer-discount">
            <label className="block text-sm font-medium text-foreground/80 mb-1">{t('discountPercent')} <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="1"
              max="100"
              {...register('descuentoPorcentaje', { valueAsNumber: true })}
              placeholder={t('discountPlaceholder')}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.descuentoPorcentaje && <FieldError message={errors.descuentoPorcentaje.message} />}
          </div>

          <div className="grid grid-cols-2 gap-4" data-tour="promotions-drawer-dates">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground/80 mb-1">{t('startDate')} <span className="text-red-500">*</span> <HelpTooltip tooltipKey="promo-dates" /></label>
              <DateTimePicker
                mode="date"
                value={watch('fechaInicio')}
                onChange={(val) => setValue('fechaInicio', val, { shouldValidate: true, shouldDirty: true })}
              />
              {errors.fechaInicio && <FieldError message={errors.fechaInicio.message} />}
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-foreground/80 mb-1">{t('endDate')} <span className="text-red-500">*</span></label>
              <DateTimePicker
                mode="date"
                value={watch('fechaFin')}
                onChange={(val) => setValue('fechaFin', val, { shouldValidate: true, shouldDirty: true })}
                min={watch('fechaInicio')}
              />
              {errors.fechaFin && <FieldError message={errors.fechaFin.message} />}
            </div>
          </div>
        </form>
      </Drawer>

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="promociones"
        entityLabel={t('title').toLowerCase()}
        onSuccess={() => fetchPromotions()}
      />
    </PageHeader>
  );
}
