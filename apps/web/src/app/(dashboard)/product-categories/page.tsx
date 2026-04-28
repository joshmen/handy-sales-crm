'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { productCategoryService } from '@/services/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { ProductCategory } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { useTranslations } from 'next-intl';
import { useBackendTranslation } from '@/hooks/useBackendTranslation';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { FieldError } from '@/components/forms/FieldError';
import {
  Plus,
  Edit2,
  Package,
  Loader2,
  Check,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
  Trash2,
  X,
} from 'lucide-react';
import { Tag } from '@phosphor-icons/react';

const formSchema = z.object({
  nombre: z.string().min(1, 'nameRequired'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function ProductCategoriesPage() {
  const t = useTranslations('productCategories');
  const tc = useTranslations('common');
  const { tApi } = useBackendTranslation();
  const showApiError = useApiErrorToast();
  // State
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get<ProductCategory[]>('/categorias-productos', {
        params: { incluirInactivos: showInactive || undefined },
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [showInactive]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return categories;
    const term = searchTerm.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.nombre.toLowerCase().includes(term) ||
        cat.descripcion?.toLowerCase().includes(term)
    );
  }, [categories, searchTerm]);

  // Sort state
  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  // Sorted + paginated categories
  const sortedCategories = useMemo(() => {
    const sorted = [...filteredCategories].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return sorted;
  }, [filteredCategories, sortKey, sortDir]);

  // Pagination (use sorted data)
  const totalItems = sortedCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCategories = sortedCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Batch operations
  const visibleIds = paginatedCategories.map(c => c.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, showInactive],
  });

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingCategory(null);
    reset({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: ProductCategory) => {
    setEditingCategory(category);
    reset({ nombre: category.nombre, descripcion: category.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingCategory) {
        await api.put(`/categorias-productos/${editingCategory.id}`, data);
        toast.success(t('categoryUpdated', { name: data.nombre }));
      } else {
        await api.post('/categorias-productos', data);
        toast.success(t('categoryCreated', { name: data.nombre }));
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (error: unknown) {
      toast.error(tApi((error as { response?: { data?: { message?: string } } })?.response?.data?.message) || t('errorSaving'));
    } finally {
      setActionLoading(false);
    }
  });

  // Individual toggle active/inactive
  const handleToggleActive = async (category: ProductCategory) => {
    try {
      setTogglingId(category.id);
      const newActive = !category.activo;
      const result = await api.patch<{ actualizado?: boolean; message?: string }>(`/categorias-productos/${category.id}/activo`, { activo: newActive });
      if (result.data.actualizado) {
        toast.success(newActive ? t('categoryActivated') : t('categoryDeactivated'));
        if (!showInactive && !newActive) {
          setCategories(prev => prev.filter(c => c.id !== category.id));
        } else {
          setCategories(prev => prev.map(c =>
            c.id === category.id ? { ...c, activo: newActive } : c
          ));
        }
      }
    } catch (error: unknown) {
      toast.error(tApi((error as { response?: { data?: { message?: string } } })?.response?.data?.message) || t('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await productCategoryService.delete(id);
      toast.success(t('categoryDeleted'));
      await loadCategories();
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    }
  };

  // Batch toggle
  const handleBatchToggle = async () => {
    if (batch.selectedCount === 0) return;
    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';
      await api.patch('/categorias-productos/batch-toggle', { ids, activo });
      toast.success(
        t('batchSuccess', { count: ids.length, plural: ids.length > 1 ? 's' : '', action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() })
      );
      batch.completeBatch();
      if (!showInactive && !activo) {
        setCategories(prev => prev.filter(c => !ids.includes(c.id)));
      } else {
        setCategories(prev => prev.map(c =>
          ids.includes(c.id) ? { ...c, activo } : c
        ));
      }
    } catch (error: unknown) {
      toast.error(tApi((error as { response?: { data?: { message?: string } } })?.response?.data?.message) || t('errorBatchToggle'));
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
      subtitle={totalItems > 0 ? t('subtitle', { count: totalItems, plural: totalItems !== 1 ? 's' : '' }) : undefined}
      actions={
        <>
          <div className="relative" data-tour="product-categories-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('categorias-productos'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    {tc('exportCsv')}
                  </button>
                  <button
                    onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
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
            onClick={handleOpenCreate}
            data-tour="product-categories-create-btn"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newCategory')}</span>
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
            placeholder={t('searchPlaceholder')}
            dataTour="product-categories-search"
          />
          <button
            onClick={loadCategories}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>

          <div data-tour="product-categories-toggle-inactive" className="ml-auto">
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

        {/* DataGrid */}
        <div data-tour="product-categories-table">
          <DataGrid<ProductCategory>
            columns={[
              { key: 'id', label: tc('id'), width: 60, sortable: true, cellRenderer: (item) => <span className="font-mono text-muted-foreground">{item.id}</span> },
              { key: 'nombre', label: tc('name'), width: 'flex', sortable: true, cellRenderer: (item) => <span className="font-medium text-foreground">{item.nombre}</span> },
              { key: 'descripcion', label: tc('description'), width: 'flex', sortable: true, hiddenOnMobile: true, cellRenderer: (item) => <span className="text-muted-foreground truncate">{item.descripcion || '-'}</span> },
              { key: 'activo', label: tc('active'), width: 50, align: 'center', cellRenderer: (item) => (
                <div onClick={e => e.stopPropagation()}>
                  <ActiveToggle isActive={item.activo} onToggle={() => handleToggleActive(item)} isLoading={togglingId === item.id} />
                </div>
              )},
              { key: 'actions', label: '', width: 80, cellRenderer: (item) => (
                <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleOpenEdit(item)} disabled={loading} className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
                    <Edit2 className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                  </button>
                  {deleteConfirmId === item.id ? (
                    <>
                      <button onClick={() => { handleDelete(item.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(item.id)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              )},
            ] as DataGridColumn<ProductCategory>[]}
            data={paginatedCategories}
            keyExtractor={(item) => item.id}
            selection={{
              selectedIds: batch.selectedIds,
              onToggle: (id) => batch.handleToggleSelect(id as number),
              onSelectAll: batch.handleSelectAllVisible,
              onClearAll: batch.handleClearSelection,
            }}
            pagination={{ currentPage, totalPages, totalItems, pageSize, onPageChange: setCurrentPage }}
            sort={{ key: sortKey, direction: sortDir, onSort: handleSort }}
            loading={loading}
            loadingMessage={t('loadingCategories')}
            emptyIcon={<Package className="w-16 h-16 text-purple-300" />}
            emptyTitle={searchTerm ? t('emptySearchTitle') : t('emptyTitle')}
            emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
            mobileCardRenderer={(category) => (
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => batch.handleToggleSelect(category.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(category.id)
                        ? 'bg-success border-success text-success-foreground'
                        : 'border-border-default hover:border-green-500'
                    }`}
                  >
                    {batch.selectedIds.has(category.id) && <Check className="w-3 h-3" />}
                  </button>
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Tag className="w-5 h-5 text-orange-600" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{category.nombre}</div>
                    <div className="text-xs text-muted-foreground truncate">{category.descripcion || tc('noDescription')}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <ActiveToggle isActive={category.activo} onToggle={() => handleToggleActive(category)} isLoading={togglingId === category.id} />
                  <button onClick={() => handleOpenEdit(category)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" /><span>{tc('edit')}</span>
                  </button>
                  {deleteConfirmId === category.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(category.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(category.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
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
        entity="categorias-productos"
        entityLabel={t('title').toLowerCase()}
        onSuccess={() => loadCategories()}
      />

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel={t('title').toLowerCase()}
        loading={batch.batchLoading}
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? t('drawer.titleEdit') : t('drawer.titleNew')}
        icon={<Tag className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div data-tour="product-categories-drawer-actions" className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingCategory ? tc('saveChanges') : t('drawer.createCategory')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} data-tour="product-categories-form" className="p-6 space-y-4">
          <div data-tour="product-categories-drawer-name" className="space-y-2">
            <label className="text-sm font-medium">
              {t('drawer.nameLabel')} <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={t('drawer.namePlaceholder')}
              {...register('nombre')}
            />
            {errors.nombre && <FieldError message={errors.nombre.message} />}
          </div>

          <div data-tour="product-categories-drawer-description" className="space-y-2">
            <label className="text-sm font-medium">{t('drawer.descriptionLabel')}</label>
            <Input
              placeholder={t('drawer.descriptionPlaceholder')}
              {...register('descripcion')}
            />
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
