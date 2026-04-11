'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { unitService } from '@/services/api/units';
import { Unit } from '@/types/catalogs';
import { PageHeader } from '@/components/layout/PageHeader';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { api } from '@/lib/api';
import { useTranslations } from 'next-intl';
import { FieldError } from '@/components/forms/FieldError';
import {
  Plus,
  Edit2,
  Ruler,
  Loader2,
  Check,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(1, 'nameRequired'),
  abreviatura: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function UnitsPage() {
  const t = useTranslations('units');
  const tc = useTranslations('common');
  // State
  const [units, setUnits] = useState<Unit[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  // Form state with react-hook-form
  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', abreviatura: '' },
  });

  // Load units
  const loadUnits = async () => {
    try {
      setLoading(true);
      const data = await unitService.getAll();
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error(t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  // Filtered units
  const filteredUnits = useMemo(() => {
    let result = units;
    if (!showInactive) {
      result = result.filter(u => u.activo);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) =>
          u.nombre.toLowerCase().includes(term) ||
          u.abreviatura?.toLowerCase().includes(term)
      );
    }
    return result;
  }, [units, searchTerm, showInactive]);

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

  const sortedUnits = useMemo(() => {
    return [...filteredUnits].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredUnits, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedUnits.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedUnits = sortedUnits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showInactive]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingUnit(null);
    reset({ nombre: '', abreviatura: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: Unit) => {
    setEditingUnit(unit);
    reset({ nombre: unit.nombre, abreviatura: unit.abreviatura || '' });
    setIsModalOpen(true);
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);

      if (editingUnit) {
        await unitService.update(editingUnit.id, data);
        toast.success(t('unitUpdated', { name: data.nombre }));
      } else {
        await unitService.create(data);
        toast.success(t('unitCreated', { name: data.nombre }));
      }

      setIsModalOpen(false);
      await loadUnits();
    } catch (error: unknown) {
      const message = (error as { message?: string })?.message || t('errorSaving');
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  });

  // Toggle active/inactive
  const handleToggleActive = async (unit: Unit) => {
    try {
      setTogglingId(unit.id);
      const newActive = !unit.activo;
      await api.patch(`/unidades-medida/${unit.id}/activo`, { activo: newActive });
      toast.success(newActive ? t('unitActivated') : t('unitDeactivated'));
      setUnits(prev => prev.map(u =>
        u.id === unit.id ? { ...u, activo: newActive } : u
      ));
    } catch {
      toast.error(tc('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  // Delete
  const handleDelete = async (id: number) => {
    try {
      await unitService.delete(id);
      toast.success(t('unitDeleted'));
      await loadUnits();
    } catch {
      toast.error(t('errorDeleting'));
    }
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('breadcrumbProducts'), href: '/products' },
        { label: t('breadcrumbUnits') },
      ]}
      title={t('title')}
      subtitle={totalItems > 0 ? (totalItems !== 1 ? t('subtitlePlural', { count: totalItems }) : t('subtitle', { count: totalItems })) : undefined}
      actions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newUnit')}</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder={t('searchPlaceholder')}
          />
          <button
            onClick={loadUnits}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tc('refresh')}</span>
          </button>

          <div className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* DataGrid */}
        <DataGrid<Unit>
          columns={[
            { key: 'id', label: t('columnId'), width: 60, sortable: true, cellRenderer: (item) => <span className="font-mono text-muted-foreground">{item.id}</span> },
            { key: 'nombre', label: t('columnName'), width: 'flex', sortable: true, cellRenderer: (item) => <span className="font-medium text-foreground">{item.nombre}</span> },
            { key: 'abreviatura', label: t('abbreviationLabel'), width: 120, sortable: true, cellRenderer: (item) => <span className="text-muted-foreground font-mono">{item.abreviatura || '-'}</span> },
            { key: 'activo', label: t('columnActive'), width: 50, align: 'center', cellRenderer: (item) => (
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
          ] as DataGridColumn<Unit>[]}
          data={paginatedUnits}
          keyExtractor={(item) => item.id}
          pagination={{ currentPage, totalPages, totalItems, pageSize, onPageChange: setCurrentPage }}
          sort={{ key: sortKey, direction: sortDir, onSort: handleSortChange }}
          loading={loading}
          loadingMessage={t('loadingMessage')}
          emptyIcon={<Ruler className="w-16 h-16 text-orange-300" />}
          emptyTitle={searchTerm ? t('emptySearchTitle') : t('emptyTitle')}
          emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
          mobileCardRenderer={(unit) => (
            <div className={!unit.activo ? 'opacity-60' : ''}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Ruler className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{unit.nombre}</div>
                  <div className="text-xs text-muted-foreground font-mono">{unit.abreviatura || '-'}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <ActiveToggle isActive={unit.activo} onToggle={() => handleToggleActive(unit)} isLoading={togglingId === unit.id} />
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(unit)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" /><span>{tc('edit')}</span>
                  </button>
                  {deleteConfirmId === unit.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(unit.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(unit.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                  )}
                </div>
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
        title={editingUnit ? t('drawerTitleEdit') : t('drawerTitleCreate')}
        icon={<Ruler className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="success" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingUnit ? tc('saveChanges') : t('createUnit')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {tc('name')} <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder={t('namePlaceholder')}
              {...register('nombre')}
            />
            {errors.nombre && <FieldError message={errors.nombre.message} />}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('abbreviationLabel')}</label>
            <Input
              placeholder={t('abbreviationPlaceholder')}
              {...register('abreviatura')}
            />
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
