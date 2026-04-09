'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Pencil,
  Trash2,
  Boxes,
  Loader2,
  Check,
  X,
  FolderTree,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { Package } from '@phosphor-icons/react';

interface ProductFamily {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
}

const formSchema = z.object({
  nombre: z.string().min(1, 'nameRequired'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function ProductFamiliesPage() {
  const t = useTranslations('productFamilies');
  const tc = useTranslations('common');
  const tv = useTranslations('formValidation');
  // State
  const [families, setFamilies] = useState<ProductFamily[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingFamily, setSavingFamily] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ProductFamily | null>(null);
  const [deletingFamily, setDeletingFamily] = useState<ProductFamily | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load families
  const loadFamilies = async () => {
    try {
      setLoading(true);
      const response = await api.get<ProductFamily[]>('/familias-productos');
      setFamilies(response.data);
    } catch (error) {
      console.error('Error loading families:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  // Filtered families
  const filteredFamilies = useMemo(() => {
    let result = families;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (family) =>
          family.nombre.toLowerCase().includes(term) ||
          family.descripcion?.toLowerCase().includes(term)
      );
    }

    if (!showInactive) {
      result = result.filter((family) => family.activo);
    }

    return result;
  }, [families, searchTerm, showInactive]);

  // Sort state
  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSortChange = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  const sortedFamilies = useMemo(() => {
    return [...filteredFamilies].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredFamilies, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedFamilies.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedFamilies = sortedFamilies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingFamily(null);
    reset({ nombre: '', descripcion: '' });
    setShowFamilyForm(true);
  };

  const handleOpenEdit = (family: ProductFamily) => {
    setEditingFamily(family);
    reset({ nombre: family.nombre, descripcion: family.descripcion || '' });
    setShowFamilyForm(true);
  };

  const handleOpenDelete = (family: ProductFamily) => {
    setDeletingFamily(family);
    setShowDeleteConfirm(true);
  };

  const handleSaveFamily = rhfSubmit(async (data) => {
    try {
      setSavingFamily(true);

      if (editingFamily) {
        await api.put(`/familias-productos/${editingFamily.id}`, data);
        toast.success(t('familyUpdated', { name: data.nombre }));
      } else {
        await api.post('/familias-productos', data);
        toast.success(t('familyCreated', { name: data.nombre }));
      }

      setShowFamilyForm(false);
      await loadFamilies();
    } catch (error: unknown) {
      console.error('Error al guardar familia:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errorSaving');
      toast.error(message);
    } finally {
      setSavingFamily(false);
    }
  });

  const handleCancelForm = () => {
    setShowFamilyForm(false);
    setEditingFamily(null);
  };

  const handleDelete = async () => {
    if (!deletingFamily) return;

    try {
      setSavingFamily(true);
      await api.delete(`/familias-productos/${deletingFamily.id}`);
      toast.success(t('familyDeleted', { name: deletingFamily.nombre }));
      setShowDeleteConfirm(false);
      setDeletingFamily(null);
      await loadFamilies();
    } catch (error: unknown) {
      console.error('Error al eliminar:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errorDeleting');
      toast.error(message);
      setShowDeleteConfirm(false);
      setDeletingFamily(null);
    } finally {
      setSavingFamily(false);
    }
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (family: ProductFamily) => {
    try {
      setTogglingId(family.id);
      const newActivo = !family.activo;
      await api.patch(`/familias-productos/${family.id}/activo`, { activo: newActivo });
      toast.success(newActivo ? t('familyActivated') : t('familyDeactivated'));
      if (!showInactive && !newActivo) {
        setFamilies(prev => prev.filter(f => f.id !== family.id));
      } else {
        setFamilies(prev => prev.map(f =>
          f.id === family.id ? { ...f, activo: newActivo } : f
        ));
      }
    } catch (error: unknown) {
      console.error('Error al cambiar estado:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errorChangingStatus');
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  // Batch operations
  const visibleIds = paginatedFamilies.map(f => f.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, showInactive],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await api.patch('/familias-productos/batch-toggle', { ids, activo });

      toast.success(
        t('batchSuccess', { count: ids.length, plural: ids.length > 1 ? 's' : '', action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() })
      );

      if (!showInactive && !activo) {
        setFamilies(prev => prev.filter(f => !ids.includes(f.id)));
      } else {
        setFamilies(prev => prev.map(f =>
          ids.includes(f.id) ? { ...f, activo } : f
        ));
      }
      batch.completeBatch();
    } catch (error: unknown) {
      console.error('Error en batch toggle:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errorBatchToggle');
      toast.error(message);
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
          <div className="relative" data-tour="product-families-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('familias-productos'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
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
            onClick={handleOpenCreate}
            data-tour="product-families-create-btn"
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newFamily')}</span>
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
            dataTour="product-families-search"
          />
          <button
            onClick={loadFamilies}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>

          <div data-tour="product-families-toggle-inactive" className="ml-auto">
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
          entityLabel="familias"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* DataGrid */}
        <div data-tour="product-families-table">
          <DataGrid<ProductFamily>
            columns={[
              { key: 'id', label: tc('id'), width: 60, sortable: true, cellRenderer: (item) => <span className="font-mono text-gray-500">{item.id}</span> },
              { key: 'nombre', label: tc('name'), width: 'flex', sortable: true, cellRenderer: (item) => <span className="font-medium text-gray-900">{item.nombre}</span> },
              { key: 'descripcion', label: tc('description'), width: 'flex', sortable: true, hiddenOnMobile: true, cellRenderer: (item) => <span className="text-gray-500 truncate">{item.descripcion || '-'}</span> },
              { key: 'activo', label: tc('active'), width: 50, align: 'center', cellRenderer: (item) => (
                <div onClick={e => e.stopPropagation()}>
                  <ActiveToggle isActive={item.activo} onToggle={() => handleToggleActive(item)} disabled={loading} isLoading={togglingId === item.id} />
                </div>
              )},
              { key: 'actions', label: '', width: 40, cellRenderer: (item) => (
                <div className="flex justify-center" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleOpenEdit(item)} disabled={loading} className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
                    <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                  </button>
                </div>
              )},
            ] as DataGridColumn<ProductFamily>[]}
            data={paginatedFamilies}
            keyExtractor={(item) => item.id}
            selection={{
              selectedIds: batch.selectedIds,
              onToggle: (id) => batch.handleToggleSelect(id as number),
              onSelectAll: batch.handleSelectAllVisible,
              onClearAll: batch.handleClearSelection,
            }}
            pagination={{ currentPage, totalPages, totalItems, pageSize, onPageChange: setCurrentPage }}
            sort={{ key: sortKey, direction: sortDir, onSort: handleSortChange }}
            loading={loading}
            loadingMessage={t('loadingFamilies')}
            emptyIcon={<Boxes className="w-16 h-16 text-pink-300" />}
            emptyTitle={searchTerm ? t('emptySearchTitle') : t('emptyTitle')}
            emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
            mobileCardRenderer={(family) => (
              <div className={!family.activo ? 'opacity-60' : ''}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-purple-600" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{family.nombre}</div>
                    <div className="text-xs text-gray-500 truncate">{family.descripcion || tc('noDescription')}</div>
                  </div>
                  <button onClick={() => batch.handleToggleSelect(family.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${batch.selectedIds.has(family.id) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-500'}`}>
                    {batch.selectedIds.has(family.id) && <Check className="w-3 h-3" />}
                  </button>
                  <ActiveToggle isActive={family.activo} onToggle={() => handleToggleActive(family)} disabled={loading} isLoading={togglingId === family.id} />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => handleOpenEdit(family)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" /><span>{tc('edit')}</span>
                  </button>
                  <button onClick={() => handleOpenDelete(family)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" /><span>{tc('delete')}</span>
                  </button>
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
        entity="familias-productos"
        entityLabel="familias de productos"
        onSuccess={() => loadFamilies()}
      />

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="familia"
        loading={batch.batchLoading}
        consequenceActivate={t('consequenceActivate')}
        consequenceDeactivate={t('consequenceDeactivate')}
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={showFamilyForm}
        onClose={handleCancelForm}
        title={editingFamily ? t('drawer.titleEdit') : t('drawer.titleNew')}
        icon={<FolderTree className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSaveFamily}
        footer={
          <div className="flex items-center justify-end gap-3" data-tour="product-families-drawer-actions">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={savingFamily}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSaveFamily} disabled={savingFamily} className="flex items-center gap-2">
              {savingFamily && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingFamily ? tc('saveChanges') : t('drawer.createFamily')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveFamily} className="p-6 space-y-4" data-tour="product-families-form">
          <div data-tour="product-families-drawer-name">
            <Input
              id="nombre"
              label={<>{t('drawer.nameLabel')} <span className="text-red-500">*</span></>}
              type="text"
              {...register('nombre')}
              placeholder={t('drawer.namePlaceholder')}
              error={errors.nombre?.message ? tv(errors.nombre.message) : undefined}
            />
          </div>
          <div data-tour="product-families-drawer-description">
            <Input
              id="descripcion"
              label={t('drawer.descriptionLabel')}
              type="text"
              {...register('descripcion')}
              placeholder={t('drawer.descriptionPlaceholder')}
            />
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => { setShowDeleteConfirm(false); setDeletingFamily(null); }}
          title={t('confirmDeleteTitle')}
        >
          <div className="py-4">
            <p className="text-gray-500">
              {t('confirmDeleteMessage', { name: deletingFamily?.nombre ?? '' })}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeletingFamily(null); }} disabled={savingFamily}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={savingFamily} className="flex items-center gap-2">
              {savingFamily && <Loader2 className="w-4 h-4 animate-spin" />}
              {tc('delete')}
            </Button>
          </div>
        </Modal>
      )}
    </PageHeader>
  );
}
