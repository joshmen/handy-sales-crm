'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Edit2, Trash2, Check, X, Loader2, Receipt } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SearchBar } from '@/components/common/SearchBar';
import { DataGrid, type DataGridColumn } from '@/components/ui/DataGrid';
import { DateRangeFilter, type DateRangeValue } from '@/components/ui/DateRangeFilter';
import { startOfMonthIso } from '@/components/ui/dateFilterUtils';
import { ReportKPICards } from '@/components/reports/ReportKPICards';
import { useFormatters } from '@/hooks/useFormatters';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FieldError } from '@/components/forms/FieldError';
import {
  getGastosContables,
  createGastoContable,
  updateGastoContable,
  deleteGastoContable,
  GASTO_CONTABLE_CATEGORIAS,
  type GastoContable,
  type GastosContablesListResponse,
} from '@/services/api/gastos-contables';

const formSchema = z.object({
  fecha: z.string().min(1, 'required'),
  categoria: z.string().min(1, 'required'),
  descripcion: z.string().min(1, 'required'),
  base: z.coerce.number().min(0, 'invalid'),
  iva: z.coerce.number().min(0, 'invalid'),
  proveedorRfc: z.string(),
  proveedorNombre: z.string(),
});
type FormData = z.infer<typeof formSchema>;

// Retención del filtro de rango (un año, igual que el resto del backoffice).
const RET = 365;

// "Hoy" calculado sobre el día calendario del tenant (se inyecta `today`
// desde `useFormatters().tenantToday()`). Antes usaba `new Date()` (TZ del
// browser), desfasando el default del form para tenants en TZ distinta a la
// del navegador.
function todayIso(today: string) {
  return today;
}

export default function GastosPage() {
  const t = useTranslations('gastos');
  const tc = useTranslations('common');
  const { formatCurrency, formatDateOnly, tenantToday } = useFormatters();
  const showApiError = useApiErrorToast();
  const fmt = (n: number) => formatCurrency(n);

  // Filtro de rango — default "este mes" (día 1 del mes a hoy), tenant-aware.
  // Reemplaza los dos <input type="date"> + botón Aplicar previos.
  const [rango, setRango] = useState<DateRangeValue>(() => {
    const hoy = tenantToday();
    return { mode: 'mes', from: startOfMonthIso(hoy), to: hoy };
  });
  const [data, setData] = useState<GastosContablesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<GastoContable | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const drawerRef = useRef<DrawerHandle>(null);

  const { register, handleSubmit: rhfSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { fecha: todayIso(tenantToday()), categoria: 'Otros', descripcion: '', base: 0, iva: 0, proveedorRfc: '', proveedorNombre: '' },
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // El backend espera { desde, hasta }; mapeamos el rango del filtro.
      setData(await getGastosContables({ desde: rango.from, hasta: rango.to }));
    } catch (err) {
      showApiError(err, t('errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [rango, showApiError, t]);

  // Carga reactiva: al cambiar el rango (atajos o personalizado) se recarga
  // el grid y, con él, los KPIs del resumen inline del backend.
  useEffect(() => {
    loadData();
  }, [loadData]);

  const items = data?.items ?? [];

  const filtered = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(g =>
      g.descripcion.toLowerCase().includes(term) ||
      g.categoria.toLowerCase().includes(term) ||
      (g.proveedorNombre?.toLowerCase().includes(term) ?? false) ||
      (g.proveedorRfc?.toLowerCase().includes(term) ?? false)
    );
  }, [items, searchTerm]);

  const handleOpenCreate = () => {
    setEditing(null);
    reset({ fecha: todayIso(tenantToday()), categoria: 'Otros', descripcion: '', base: 0, iva: 0, proveedorRfc: '', proveedorNombre: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (g: GastoContable) => {
    setEditing(g);
    reset({
      fecha: g.fecha.slice(0, 10),
      categoria: g.categoria,
      descripcion: g.descripcion,
      base: g.base,
      iva: g.iva,
      proveedorRfc: g.proveedorRfc ?? '',
      proveedorNombre: g.proveedorNombre ?? '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteGastoContable(id);
      toast.success(t('deleted'));
      await loadData();
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    }
  };

  const handleSubmit = rhfSubmit(async (formData) => {
    try {
      setActionLoading(true);
      const payload = {
        fecha: formData.fecha,
        categoria: formData.categoria,
        descripcion: formData.descripcion,
        base: formData.base,
        iva: formData.iva,
        proveedorRfc: formData.proveedorRfc || undefined,
        proveedorNombre: formData.proveedorNombre || undefined,
      };
      if (editing) {
        await updateGastoContable(editing.id, payload);
        toast.success(t('updated'));
      } else {
        await createGastoContable(payload);
        toast.success(t('created'));
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      showApiError(err, tc('errorOccurred'));
    } finally {
      setActionLoading(false);
    }
  });

  return (
    <PageHeader
      section="ventas"
      title={t('title')}
      subtitle={data ? t('subtitleRange', { from: formatDateOnly(rango.from), to: formatDateOnly(rango.to), count: data.total, plural: data.total !== 1 ? 's' : '' }) : t('subtitle')}
      actions={
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>{t('newExpense')}</span>
        </button>
      }
    >
      {/* Filtro de rango (Esta semana / Este mes / Trimestre / Personalizado) */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <DateRangeFilter value={rango} onChange={setRango} retentionDays={RET} />
      </div>

      {/* KPIs */}
      {data && (
        <div className="mb-5">
          <ReportKPICards cards={[
            { label: t('count'), value: data.total, color: 'gray' },
            { label: t('totalBase'), value: fmt(data.totalBase), color: 'blue' },
            { label: t('totalIva'), value: fmt(data.totalIva), color: 'gray' },
            { label: t('totalGeneral'), value: fmt(data.totalGeneral), color: 'blue' },
          ]} />
        </div>
      )}

      {/* Buscador */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder={t('searchPlaceholder')} />
      </div>

      {/* Tabla */}
      <DataGrid<GastoContable>
        columns={[
          { key: 'fecha', label: t('date'), width: 110, sortable: true, cellRenderer: (g) => <span className="text-muted-foreground">{formatDateOnly(g.fecha)}</span> },
          { key: 'categoria', label: t('category'), width: 130, sortable: true, cellRenderer: (g) => <span className="font-medium text-foreground">{g.categoria}</span> },
          { key: 'descripcion', label: t('description'), width: 'flex', sortable: true, cellRenderer: (g) => <span className="text-foreground/80 truncate">{g.descripcion}</span> },
          { key: 'base', label: t('base'), width: 110, align: 'right', sortable: true, cellRenderer: (g) => <span className="tabular-nums">{fmt(g.base)}</span> },
          { key: 'iva', label: t('iva'), width: 100, align: 'right', sortable: true, cellRenderer: (g) => <span className="tabular-nums text-muted-foreground">{fmt(g.iva)}</span> },
          { key: 'total', label: t('total'), width: 120, align: 'right', sortable: true, cellRenderer: (g) => <span className="tabular-nums font-semibold text-foreground">{fmt(g.total)}</span> },
          { key: 'proveedorNombre', label: t('supplier'), width: 'flex', sortable: true, hiddenOnMobile: true, cellRenderer: (g) => <span className="text-muted-foreground truncate">{g.proveedorNombre || '-'}</span> },
          { key: 'actions', label: '', width: 80, cellRenderer: (g) => (
            <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => handleOpenEdit(g)} className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors" title={tc('edit')}>
                <Edit2 className="w-4 h-4" />
              </button>
              {deleteConfirmId === g.id ? (
                <>
                  <button onClick={() => { handleDelete(g.id); setDeleteConfirmId(null); }} className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteConfirmId(null)} className="p-1 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X className="w-4 h-4" /></button>
                </>
              ) : (
                <button onClick={() => setDeleteConfirmId(g.id)} className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors" title={tc('delete')}><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          )},
        ] as DataGridColumn<GastoContable>[]}
        data={filtered}
        keyExtractor={(g) => g.id}
        loading={loading}
        loadingMessage={t('loading')}
        emptyIcon={<Receipt className="w-10 h-10 text-muted-foreground" />}
        emptyTitle={searchTerm ? t('emptySearchTitle') : t('emptyTitle')}
        emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
        mobileCardRenderer={(g) => (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-foreground">{g.categoria}</span>
              <span className="tabular-nums text-sm font-semibold text-foreground">{fmt(g.total)}</span>
            </div>
            <div className="text-xs text-muted-foreground truncate mb-2">{g.descripcion}</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{formatDateOnly(g.fecha)}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => handleOpenEdit(g)} className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                {deleteConfirmId === g.id ? (
                  <div className="flex items-center gap-1">
                    <button onClick={() => { handleDelete(g.id); setDeleteConfirmId(null); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"><Check size={16} /></button>
                    <button onClick={() => setDeleteConfirmId(null)} className="p-1.5 text-muted-foreground hover:bg-surface-3 rounded transition-colors"><X size={16} /></button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirmId(g.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          </div>
        )}
      />

      {/* Drawer crear/editar */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? t('drawer.titleEdit') : t('drawer.titleNew')}
        icon={<Receipt className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="wbOutline" onClick={() => drawerRef.current?.requestClose()} disabled={actionLoading}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="wbPrimary" onClick={handleSubmit} disabled={actionLoading} className="flex items-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? tc('saveChanges') : t('drawer.create')}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('date')} <span className="text-red-500">*</span></label>
            <Input type="date" {...register('fecha')} />
            {errors.fecha && <FieldError message={t('drawer.fieldRequired')} />}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('category')} <span className="text-red-500">*</span></label>
            <select
              {...register('categoria')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {GASTO_CONTABLE_CATEGORIAS.map(c => (
                <option key={c} value={c}>{t(`categories.${c}`)}</option>
              ))}
            </select>
            {errors.categoria && <FieldError message={t('drawer.fieldRequired')} />}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('description')} <span className="text-red-500">*</span></label>
            <Input placeholder={t('drawer.descriptionPlaceholder')} {...register('descripcion')} />
            {errors.descripcion && <FieldError message={t('drawer.fieldRequired')} />}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('base')} <span className="text-red-500">*</span></label>
              <Input type="number" step="0.01" min="0" {...register('base')} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('iva')}</label>
              <Input type="number" step="0.01" min="0" {...register('iva')} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('drawer.supplierRfc')}</label>
            <Input placeholder={t('drawer.supplierRfcPlaceholder')} {...register('proveedorRfc')} />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('drawer.supplierName')}</label>
            <Input placeholder={t('drawer.supplierNamePlaceholder')} {...register('proveedorNombre')} />
          </div>
        </form>
      </Drawer>
    </PageHeader>
  );
}
