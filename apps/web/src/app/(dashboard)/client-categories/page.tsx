'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { clientCategoryService } from '@/services/api';
import { ApiError } from '@/lib/api';
import { ClientCategory } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import {
  Plus,
  Edit2,
  Loader2,
  Upload,
  Download,
  ChevronDown,
  RefreshCw,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { UsersThree } from '@phosphor-icons/react';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';

const formSchema = z.object({
  nombre: z.string().min(1, 'nameRequired'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function ClientCategoriesPage() {
  const t = useTranslations('clientCategories');
  const tc = useTranslations('common');
  // State
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ClientCategory | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', descripcion: '' },
  });

  // Load categories
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await clientCategoryService.getAll();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    let filtered = categories;
    if (!showInactive) {
      filtered = filtered.filter(cat => cat.activo);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (cat) =>
          cat.nombre.toLowerCase().includes(term) ||
          cat.descripcion?.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [categories, searchTerm, showInactive]);

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

  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredCategories, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedCategories.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedCategories = sortedCategories.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingCategory(null);
    reset({ nombre: '', descripcion: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: ClientCategory) => {
    setEditingCategory(category);
    reset({ nombre: category.nombre, descripcion: category.descripcion || '' });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (category: ClientCategory) => {
    try {
      setTogglingId(category.id);
      const newActivo = !category.activo;
      await clientCategoryService.toggleActivo(category.id, newActivo);
      toast.success(newActivo ? t('categoryActivated', { name: category.nombre }) : t('categoryDeactivated', { name: category.nombre }));
      setCategories(prev => prev.map(c => c.id === category.id ? { ...c, activo: newActivo } : c));
    } catch (error) {
      const apiError = error as ApiError;
      toast.error(apiError.message || tc('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await clientCategoryService.delete(id);
      toast.success(t('categoryDeleted'));
      await loadCategories();
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingCategory) {
        await clientCategoryService.update(editingCategory.id, data);
        toast.success(t('categoryUpdated', { name: data.nombre }));
      } else {
        await clientCategoryService.create(data);
        toast.success(t('categoryCreated', { name: data.nombre }));
      }

      setIsModalOpen(false);
      await loadCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tc('errorOccurred'));
    } finally {
      setActionLoading(false);
    }
  });


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
            <div className="relative" data-tour="client-categories-import-export">
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
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
                      onClick={async () => { setShowDataMenu(false); try { await exportToCsv('categorias-clientes'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-surface-1"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      {tc('exportCsv')}
                    </button>
                    <button
                      onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-surface-1"
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
              data-tour="client-categories-create-btn"
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newCategory')}</span>
            </button>
          </>
        }
      >
            {/* Search Row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder={t('searchPlaceholder')}
                dataTour="client-categories-search"
              />
              <button
                onClick={loadCategories}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tc('refresh')}</span>
              </button>

              <div data-tour="client-categories-toggle-inactive" className="ml-auto">
                <InactiveToggle
                  value={showInactive}
                  onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
                />
              </div>
            </div>

            {/* DataGrid */}
            <div data-tour="client-categories-table">
              <DataGrid<ClientCategory>
                columns={[
                  { key: 'id', label: tc('id'), width: 80, sortable: true, cellRenderer: (item) => <span className="font-mono text-muted-foreground">{item.id}</span> },
                  { key: 'nombre', label: tc('name'), width: 'flex', sortable: true, cellRenderer: (item) => <span className="font-medium text-gray-900">{item.nombre}</span> },
                  { key: 'descripcion', label: tc('description'), width: 'flex', sortable: true, hiddenOnMobile: true, cellRenderer: (item) => <span className="text-muted-foreground truncate">{item.descripcion || '-'}</span> },
                  { key: 'activo', label: tc('active'), width: 50, align: 'center', cellRenderer: (item) => (
                    <div onClick={e => e.stopPropagation()}>
                      <ActiveToggle isActive={item.activo} onToggle={() => handleToggleActive(item)} disabled={loading} isLoading={togglingId === item.id} title={item.activo ? t('deactivateCategory') : t('activateCategory')} />
                    </div>
                  )},
                  { key: 'actions', label: '', width: 80, cellRenderer: (item) => (
                    <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleOpenEdit(item)} disabled={loading} className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50" title={tc('edit')}>
                        <Edit2 className="w-4 h-4" />
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
                ] as DataGridColumn<ClientCategory>[]}
                data={paginatedCategories}
                keyExtractor={(item) => item.id}
                pagination={{ currentPage, totalPages, totalItems, pageSize, onPageChange: setCurrentPage }}
                sort={{ key: sortKey, direction: sortDir, onSort: handleSort }}
                loading={loading}
                loadingMessage={t('loadingCategories')}
                emptyIcon={<UsersThree className="w-10 h-10 text-muted-foreground" weight="duotone" />}
                emptyTitle={searchTerm ? t('emptySearchTitle') : t('emptyTitle')}
                emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
                mobileCardRenderer={(category) => (
                  <div className={!category.activo ? 'opacity-60' : ''}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <UsersThree className="w-5 h-5 text-white" weight="duotone" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{category.nombre}</div>
                        <div className="text-xs text-muted-foreground truncate">{category.descripcion || tc('noDescription')}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleOpenEdit(category)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors">
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
                      <ActiveToggle isActive={category.activo} onToggle={() => handleToggleActive(category)} disabled={loading} isLoading={togglingId === category.id} title={category.activo ? t('deactivateCategory') : t('activateCategory')} />
                    </div>
                  </div>
                )}
              />
            </div>

        {/* Create/Edit Drawer */}
        <Drawer
          ref={drawerRef}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCategory ? t('drawer.titleEdit') : t('drawer.titleNew')}
          icon={<UsersThree className="w-5 h-5" weight="duotone" />}
          width="sm"
          isDirty={isDirty}
          onSave={handleSubmit}
          footer={
            <div data-tour="client-categories-drawer-actions" className="flex items-center justify-end gap-3">
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
          <form onSubmit={handleSubmit} data-tour="client-categories-form" className="p-6 space-y-4">
            <div data-tour="client-categories-drawer-name" className="space-y-2">
              <label className="text-sm font-medium">
                {t('drawer.nameLabel')} <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder={t('drawer.namePlaceholder')}
                {...register('nombre')}
              />
              {errors.nombre && <FieldError message={errors.nombre.message} />}
            </div>

            <div data-tour="client-categories-drawer-description" className="space-y-2">
              <label className="text-sm font-medium">{t('drawer.descriptionLabel')}</label>
              <Input
                placeholder={t('drawer.descriptionPlaceholder')}
                {...register('descripcion')}
              />
            </div>
          </form>
        </Drawer>

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="categorias-clientes"
          entityLabel={t('title').toLowerCase()}
          onSuccess={loadCategories}
        />
      </PageHeader>
  );
}
