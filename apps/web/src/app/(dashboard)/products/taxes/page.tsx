'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/hooks/useToast';
import { impuestosService, TasaImpuesto, TasaImpuestoCreateRequest } from '@/services/api/impuestos';
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
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { FieldError } from '@/components/forms/FieldError';
import {
  Plus,
  Edit2,
  Receipt,
  Loader2,
  Check,
  RefreshCw,
  Trash2,
  X,
  Star,
} from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(1, 'nameRequired'),
  tasa: z.coerce.number().min(0, 'rateRange').max(1, 'rateRange'),
  esDefault: z.boolean(),
});
type FormData = z.infer<typeof formSchema>;

export default function TaxRatesPage() {
  const t = useTranslations('taxes');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();

  const [tasas, setTasas] = useState<TasaImpuesto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const drawerRef = useRef<DrawerHandle>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<TasaImpuesto | null>(null);

  const { register, handleSubmit: rhfSubmit, reset, watch, setValue, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { nombre: '', tasa: 0.16, esDefault: false },
  });
  const esDefaultValue = watch('esDefault');

  const loadTasas = async () => {
    try {
      setLoading(true);
      const data = await impuestosService.getTasas(true);
      setTasas(data);
    } catch (err) {
      showApiError(err, t('errorLoading'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasas();
  }, []);

  const filteredTasas = useMemo(() => {
    let result = tasas;
    if (!showInactive) result = result.filter(t => t.activo);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t => t.nombre.toLowerCase().includes(term));
    }
    return result;
  }, [tasas, searchTerm, showInactive]);

  const [sortKey, setSortKey] = useState('nombre');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSortChange = useCallback((key: string) => {
    if (sortKey === key) setSortDir(p => (p === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }, [sortKey]);

  const sortedTasas = useMemo(() => {
    return [...filteredTasas].sort((a, b) => {
      const aVal = String((a as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      const bVal = String((b as unknown as Record<string, unknown>)[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filteredTasas, sortKey, sortDir]);

  const totalItems = sortedTasas.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginated = sortedTasas.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, showInactive]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ nombre: '', tasa: 0.16, esDefault: false });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tasa: TasaImpuesto) => {
    setEditing(tasa);
    reset({ nombre: tasa.nombre, tasa: tasa.tasa, esDefault: tasa.esDefault });
    setIsModalOpen(true);
  };

  const handleSubmit = rhfSubmit(async (data) => {
    try {
      setActionLoading(true);
      const payload: TasaImpuestoCreateRequest = {
        nombre: data.nombre,
        tasa: data.tasa,
        esDefault: data.esDefault,
      };
      if (editing) {
        await impuestosService.updateTasa(editing.id, payload);
        toast.success(t('updatedSuccess'));
      } else {
        await impuestosService.createTasa(payload);
        toast.success(t('createdSuccess'));
      }
      setIsModalOpen(false);
      await loadTasas();
    } catch (err) {
      showApiError(err, t('errorSaving'));
    } finally {
      setActionLoading(false);
    }
  });

  const handleToggleActive = async (tasa: TasaImpuesto) => {
    try {
      setTogglingId(tasa.id);
      const newActive = !tasa.activo;
      await impuestosService.updateTasa(tasa.id, { activo: newActive });
      setTasas(prev => prev.map(x => x.id === tasa.id ? { ...x, activo: newActive } : x));
      toast.success(newActive ? t('activated') : t('deactivated'));
    } catch {
      toast.error(tc('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await impuestosService.deleteTasa(id);
      toast.success(t('deletedSuccess'));
      await loadTasas();
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    }
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: tc('home'), href: '/dashboard' },
        { label: t('breadcrumbProducts'), href: '/products' },
        { label: t('breadcrumbTaxes') },
      ]}
      title={t('title')}
      subtitle={totalItems > 0 ? (totalItems !== 1 ? t('subtitlePlural', { count: totalItems }) : t('subtitle', { count: totalItems })) : t('subtitleEmpty')}
      actions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newRate')}</span>
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <SearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
            placeholder={t('searchPlaceholder')}
          />
          <button
            onClick={loadTasas}
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

        <DataGrid<TasaImpuesto>
          columns={[
            { key: 'nombre', label: t('name'), width: 'flex', sortable: true, cellRenderer: (item) => (
              <div className="flex items-center gap-2">
                {item.esDefault && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" aria-label={t('defaultBadge')} />}
                <span className="font-medium text-foreground">{item.nombre}</span>
              </div>
            )},
            { key: 'tasa', label: t('rate'), width: 100, align: 'right', sortable: true, cellRenderer: (item) => (
              <span className="font-mono text-foreground/80">{(item.tasa * 100).toFixed(2)}%</span>
            )},
            { key: 'productosCount', label: t('products'), width: 90, align: 'center', sortable: true, cellRenderer: (item) => (
              <span className="text-muted-foreground">{item.productosCount}</span>
            )},
            { key: 'activo', label: t('active'), width: 50, align: 'center', cellRenderer: (item) => (
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
          ] as DataGridColumn<TasaImpuesto>[]}
          data={paginated}
          keyExtractor={(item) => item.id}
          pagination={{ currentPage, totalPages, totalItems, pageSize, onPageChange: setCurrentPage }}
          sort={{ key: sortKey, direction: sortDir, onSort: handleSortChange }}
          loading={loading}
          loadingMessage={t('loadingMessage')}
          emptyIcon={<Receipt className="w-16 h-16 text-teal-300" />}
          emptyTitle={searchTerm ? t('emptySearchTitle') : t('emptyTitle')}
          emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
          mobileCardRenderer={(tasa) => (
            <div className={!tasa.activo ? 'opacity-60' : ''}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {tasa.esDefault && <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />}
                    <div className="text-sm font-medium text-foreground truncate">{tasa.nombre}</div>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{(tasa.tasa * 100).toFixed(2)}%</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <ActiveToggle isActive={tasa.activo} onToggle={() => handleToggleActive(tasa)} isLoading={togglingId === tasa.id} />
                <div className="flex items-center gap-1">
                  <button onClick={() => handleOpenEdit(tasa)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors">
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" /><span>{tc('edit')}</span>
                  </button>
                  {deleteConfirmId === tasa.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { handleDelete(tasa.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                      <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(tasa.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                  )}
                </div>
              </div>
            </div>
          )}
        />
      </div>

      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? t('drawerTitleEdit') : t('drawerTitleCreate')}
        icon={<Receipt className="w-5 h-5" />}
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
              {editing ? tc('saveChanges') : t('create')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('name')} <span className="text-red-500">*</span>
            </label>
            <Input placeholder={t('namePlaceholder')} {...register('nombre')} />
            {errors.nombre && <FieldError message={errors.nombre.message} />}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('rate')} <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder={t('ratePlaceholder')}
              {...register('tasa', { valueAsNumber: true })}
            />
            <p className="text-[11px] text-muted-foreground">{t('rateHint')}</p>
            {errors.tasa && <FieldError message={errors.tasa.message} />}
          </div>

          <label className="flex items-start gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={esDefaultValue ?? false}
              onChange={(e) => setValue('esDefault', e.target.checked, { shouldDirty: true })}
              className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">{t('isDefault')}</p>
              <p className="text-[11px] text-muted-foreground">{t('isDefaultHint')}</p>
            </div>
          </label>
        </form>
      </Drawer>
    </PageHeader>
  );
}
