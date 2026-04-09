'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Loader2,
  Check,
  ListOrdered,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
  Trash2,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { CurrencyDollar } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { useFormatters } from '@/hooks/useFormatters';

interface ListaPrecio {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function PriceListsPage() {
  const t = useTranslations('priceLists');
  const tc = useTranslations('common');
  const { formatDate: _fmtDate } = useFormatters();
  // State
  const [priceLists, setPriceLists] = useState<ListaPrecio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingList, setSavingList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [showListForm, setShowListForm] = useState(false);
  const [editingList, setEditingList] = useState<ListaPrecio | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load price lists
  const loadPriceLists = async () => {
    try {
      setLoading(true);
      const response = await api.get<ListaPrecio[]>('/listas-precios');
      setPriceLists(response.data);
    } catch (error) {
      console.error('Error loading price lists:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPriceLists();
  }, []);

  // Filtered lists
  const filteredLists = useMemo(() => {
    let result = priceLists;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (list) =>
          list.nombre.toLowerCase().includes(term) ||
          list.descripcion?.toLowerCase().includes(term)
      );
    }

    if (!showInactive) {
      result = result.filter((list) => list.activo);
    }

    return result;
  }, [priceLists, searchTerm, showInactive]);

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

  const sortedLists = useMemo(() => {
    return [...filteredLists].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredLists, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedLists.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedLists = sortedLists.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingList(null);
    reset({ nombre: '', descripcion: '' });
    setShowListForm(true);
  };

  const handleOpenEdit = (list: ListaPrecio) => {
    setEditingList(list);
    reset({ nombre: list.nombre, descripcion: list.descripcion || '' });
    setShowListForm(true);
  };

  const handleSaveList = rhfSubmit(async (data) => {
    try {
      setSavingList(true);

      if (editingList) {
        await api.put(`/listas-precios/${editingList.id}`, data);
        toast.success(t('updated', { name: data.nombre }));
      } else {
        await api.post('/listas-precios', data);
        toast.success(t('created', { name: data.nombre }));
      }

      setShowListForm(false);
      await loadPriceLists();
    } catch (error: unknown) {
      console.error('Error al guardar lista:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errorSaving');
      toast.error(message);
    } finally{
      setSavingList(false);
    }
  });

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/listas-precios/${id}`);
      toast.success(t('deleted'));
      await loadPriceLists();
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  const handleCancelForm = () => {
    setShowListForm(false);
    setEditingList(null);
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (list: ListaPrecio) => {
    try {
      setTogglingId(list.id);
      const newActivo = !list.activo;
      await api.patch(`/listas-precios/${list.id}/activo`, { activo: newActivo });
      toast.success(newActivo ? t('activated') : t('deactivated'));
      if (!showInactive && !newActivo) {
        setPriceLists(prev => prev.filter(l => l.id !== list.id));
      } else {
        setPriceLists(prev => prev.map(l =>
          l.id === list.id ? { ...l, activo: newActivo } : l
        ));
      }
    } catch (error: unknown) {
      console.error('Error al cambiar estado:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('errorToggle');
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

  const visibleIds = paginatedLists.map(l => l.id);
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [searchTerm, showInactive, currentPage],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await api.patch('/listas-precios/batch-toggle', { ids, activo });

      toast.success(
        activo ? t('batchActivated', { count: ids.length, plural: ids.length > 1 ? 's' : '', plural2: ids.length > 1 ? 's' : '' }) : t('batchDeactivated', { count: ids.length, plural: ids.length > 1 ? 's' : '', plural2: ids.length > 1 ? 's' : '' })
      );

      batch.completeBatch();
      if (!showInactive && !activo) {
        setPriceLists(prev => prev.filter(l => !ids.includes(l.id)));
      } else {
        setPriceLists(prev => prev.map(l =>
          ids.includes(l.id) ? { ...l, activo } : l
        ));
      }
    } catch (error: unknown) {
      console.error('Error en batch toggle:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || t('batchError');
      toast.error(message);
      batch.setBatchLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return t('today');
    if (days === 1) return t('dayAgo');
    if (days < 7) return t('daysAgo', { count: days });
    if (days < 30) return t('weeksAgo', { count: Math.floor(days / 7) });
    return _fmtDate(date);
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('title') },
      ]}
      title={t('title')}
      actions={
        <>
          <div className="relative" data-tour="pricelists-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('listas-precios'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    {tc('exportCsv')}
                  </button>
                  <button
                    onClick={() => { setIsImportOpen(true); setShowDataMenu(false); }}
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
            data-tour="pricelists-new-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newList')}</span>
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
            dataTour="pricelists-search"
          />
          <button
            onClick={loadPriceLists}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>

          <div data-tour="pricelists-toggle-inactive" className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
              label={t('showInactive')}
            />
          </div>
        </div>

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalItems}
          entityLabel="listas de precios"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* DataGrid */}
        <div data-tour="pricelists-table">
          <DataGrid<ListaPrecio>
            columns={[
              { key: 'id', label: tc('id'), width: 60, sortable: true, cellRenderer: (item) => <span className="font-mono text-gray-500">{item.id}</span> },
              { key: 'nombre', label: tc('name'), width: 'flex', sortable: true, cellRenderer: (item) => <span className="font-medium text-gray-900">{item.nombre}</span> },
              { key: 'descripcion', label: tc('description'), width: 'flex', sortable: true, hiddenOnMobile: true, cellRenderer: (item) => <span className="text-gray-500 truncate">{item.descripcion || '-'}</span> },
              { key: 'actualizadoEn', label: t('modification'), width: 140, sortable: true, hiddenOnMobile: true, cellRenderer: (item) => <span className="text-gray-500">{formatDate(item.actualizadoEn || item.creadoEn)}</span> },
              { key: 'activo', label: tc('active'), width: 50, align: 'center', cellRenderer: (item) => (
                <div onClick={e => e.stopPropagation()}>
                  <ActiveToggle isActive={item.activo} onToggle={() => handleToggleActive(item)} disabled={loading} isLoading={togglingId === item.id} />
                </div>
              )},
              { key: 'actions', label: '', width: 80, cellRenderer: (item) => (
                <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleOpenEdit(item)} disabled={loading} className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title="Editar">
                    <Pencil className="w-4 h-4" />
                  </button>
                  {deleteConfirmId === item.id ? (
                    <>
                      <button onClick={() => { handleDelete(item.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(item.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  )}
                </div>
              )},
            ] as DataGridColumn<ListaPrecio>[]}
            data={paginatedLists}
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
            loadingMessage={t('loadingLists')}
            emptyIcon={<CurrencyDollar className="w-16 h-16 text-green-300" weight="duotone" />}
            emptyTitle={t('noLists')}
            emptyMessage={searchTerm ? t('noListsSearch') : t('noListsDesc')}
            mobileCardRenderer={(list) => (
              <div className={!list.activo ? 'opacity-60' : ''}>
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => batch.handleToggleSelect(list.id)} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${batch.selectedIds.has(list.id) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 hover:border-green-500'}`}>
                    {batch.selectedIds.has(list.id) && <Check className="w-3 h-3" />}
                  </button>
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <CurrencyDollar className="w-5 h-5 text-green-600" weight="duotone" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{list.nombre}</div>
                    <div className="text-xs text-gray-500 truncate">{list.descripcion || t('noDescription')}</div>
                  </div>
                  <ActiveToggle isActive={list.activo} onToggle={() => handleToggleActive(list)} disabled={loading} isLoading={togglingId === list.id} />
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium">{formatDate(list.actualizadoEn || list.creadoEn)}</span>
                </div>
                <div className="flex justify-end gap-1">
                  <button onClick={() => handleOpenEdit(list)} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" /><span>{tc('edit')}</span>
                  </button>
                  {deleteConfirmId === list.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(list.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(list.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
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
        entityLabel="lista"
        loading={batch.batchLoading}
        consequenceDeactivate={t('batchConsequenceDeactivate')}
        consequenceActivate={t('batchConsequenceActivate')}
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={showListForm}
        onClose={handleCancelForm}
        title={editingList ? t('editList') : t('newListTitle')}
        icon={<ListOrdered className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSaveList}
        footer={
          <div data-tour="pricelists-drawer-actions" className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={savingList}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSaveList} disabled={savingList} className="flex items-center gap-2">
              {savingList && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingList ? tc('saveChanges') : t('newList')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveList} data-tour="pricelist-form" className="p-6 space-y-4">
          <div data-tour="pricelists-drawer-name">
            <Input
              id="nombre"
              label={<>{tc('name')} <span className="text-red-500">*</span></>}
              type="text"
              {...register('nombre')}
              placeholder={t('namePlaceholder')}
              error={errors.nombre?.message}
            />
          </div>
          <div data-tour="pricelists-drawer-description">
            <Input
              id="descripcion"
              label={tc('description')}
              type="text"
              {...register('descripcion')}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>
        </form>
      </Drawer>

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="listas-precios"
        entityLabel="listas de precios"
        onSuccess={() => loadPriceLists()}
      />
    </PageHeader>
  );
}
