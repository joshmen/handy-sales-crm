'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchBar } from '@/components/common/SearchBar';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ListPagination } from '@/components/ui/ListPagination';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  metaVendedorService,
  MetaVendedor,
  CreateMetaVendedorRequest,
  UpdateMetaVendedorRequest,
} from '@/services/api/metas';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Target } from '@phosphor-icons/react';
import { useFormatters } from '@/hooks/useFormatters';

// ─── Types ─────────────────────────────────────────────
interface UsuarioOption {
  id: number;
  nombre: string;
}

// ─── Constants ─────────────────────────────────────────
const TIPO_OPTIONS = [
  { value: 'ventas', label: 'Ventas ($)' },
  { value: 'pedidos', label: 'Pedidos (#)' },
  { value: 'visitas', label: 'Visitas (#)' },
];

const PERIODO_OPTIONS = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensual', label: 'Mensual' },
];

const TIPO_LABELS: Record<string, string> = {
  ventas: 'Ventas',
  pedidos: 'Pedidos',
  visitas: 'Visitas',
};

const PERIODO_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  mensual: 'Mensual',
};

const TIPO_COLORS: Record<string, string> = {
  ventas: 'bg-emerald-100 text-emerald-700',
  pedidos: 'bg-blue-100 text-blue-700',
  visitas: 'bg-purple-100 text-purple-700',
};

// ─── Zod Schema ────────────────────────────────────────
const metaSchema = z.object({
  usuarioId: z.number({ required_error: 'Selecciona un vendedor' }).min(1, 'Selecciona un vendedor'),
  tipo: z.enum(['ventas', 'pedidos', 'visitas'], { required_error: 'Selecciona un tipo' }),
  periodo: z.enum(['semanal', 'mensual'], { required_error: 'Selecciona un período' }),
  monto: z.number({ required_error: 'El monto es requerido' }).positive('Debe ser mayor a 0'),
  fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fechaFin: z.string().min(1, 'La fecha de fin es requerida'),
  autoRenovar: z.boolean(),
}).refine(d => d.fechaFin > d.fechaInicio, {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['fechaFin'],
});

type MetaFormData = z.infer<typeof metaSchema>;

// ─── Helpers ───────────────────────────────────────────


const todayStr = () => new Date().toISOString().slice(0, 10);
const nextMonthStr = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

// ─── Page ──────────────────────────────────────────────
export default function MetasPage() {
  const { formatDate, formatNumber } = useFormatters();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';

  // Data
  const [metas, setMetas] = useState<MetaVendedor[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Drawer
  const drawerRef = useRef<DrawerHandle>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState<MetaVendedor | null>(null);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<MetaFormData>({
    resolver: zodResolver(metaSchema),
    defaultValues: {
      usuarioId: 0,
      tipo: 'ventas',
      periodo: 'mensual',
      monto: 0,
      fechaInicio: todayStr(),
      fechaFin: nextMonthStr(),
      autoRenovar: false,
    },
  });

  const watchedUsuarioId = watch('usuarioId');
  const watchedTipo = watch('tipo');
  const watchedPeriodo = watch('periodo');

  // ─── Load Data ─────────────────────────────────────
  const loadMetas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await metaVendedorService.getAll();
      setMetas(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las metas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsuarios = useCallback(async () => {
    try {
      const res = await api.get<{ items: UsuarioOption[] } | UsuarioOption[]>(
        '/api/usuarios?pagina=1&tamanoPagina=500'
      );
      const raw = res.data;
      const items = Array.isArray(raw) ? raw : (raw as { items: UsuarioOption[] }).items ?? [];
      setUsuarios(items.filter(u => u.nombre));
    } catch {
      console.error('Error al cargar usuarios');
    }
  }, []);

  useEffect(() => {
    loadMetas();
    loadUsuarios();
  }, [loadMetas, loadUsuarios]);

  // ─── Filtering ─────────────────────────────────────
  const filtered = useMemo(() => {
    let result = metas;
    if (!showInactive) result = result.filter(m => m.activo);
    if (filterTipo) result = result.filter(m => m.tipo === filterTipo);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(m =>
        m.usuarioNombre?.toLowerCase().includes(q) ||
        TIPO_LABELS[m.tipo]?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [metas, showInactive, filterTipo, searchTerm]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const totalPages = Math.ceil(filtered.length / pageSize);

  // ─── Drawer helpers ────────────────────────────────
  const openCreate = () => {
    setEditingMeta(null);
    reset({
      usuarioId: 0,
      tipo: 'ventas',
      periodo: 'mensual',
      monto: 0,
      fechaInicio: todayStr(),
      fechaFin: nextMonthStr(),
      autoRenovar: false,
    });
    setIsDrawerOpen(true);
  };

  const openEdit = (meta: MetaVendedor) => {
    setEditingMeta(meta);
    reset({
      usuarioId: meta.usuarioId,
      tipo: meta.tipo as 'ventas' | 'pedidos' | 'visitas',
      periodo: meta.periodo as 'semanal' | 'mensual',
      monto: meta.monto,
      fechaInicio: meta.fechaInicio.slice(0, 10),
      fechaFin: meta.fechaFin.slice(0, 10),
      autoRenovar: meta.autoRenovar ?? false,
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingMeta(null);
  };

  // ─── Submit ────────────────────────────────────────
  const onSubmit = async (data: MetaFormData) => {
    try {
      setActionLoading(true);
      if (editingMeta) {
        const req: UpdateMetaVendedorRequest = {
          tipo: data.tipo,
          periodo: data.periodo,
          monto: data.monto,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          activo: editingMeta.activo,
          autoRenovar: data.autoRenovar,
        };
        await metaVendedorService.update(editingMeta.id, req);
        toast.success('Meta actualizada');
      } else {
        const req: CreateMetaVendedorRequest = {
          usuarioId: data.usuarioId,
          tipo: data.tipo,
          periodo: data.periodo,
          monto: data.monto,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          autoRenovar: data.autoRenovar,
        };
        await metaVendedorService.create(req);
        toast.success('Meta creada');
      }
      closeDrawer();
      await loadMetas();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar la meta';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Toggle Activo ─────────────────────────────────
  const handleToggle = async (meta: MetaVendedor) => {
    try {
      setTogglingId(meta.id);
      await metaVendedorService.toggleActivo(meta.id, !meta.activo);
      setMetas(prev => prev.map(m => m.id === meta.id ? { ...m, activo: !m.activo } : m));
    } catch {
      toast.error('No se pudo cambiar el estado');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Delete ────────────────────────────────────────
  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      setDeleteLoading(true);
      await metaVendedorService.delete(confirmDeleteId);
      setMetas(prev => prev.filter(m => m.id !== confirmDeleteId));
      toast.success('Meta eliminada');
    } catch {
      toast.error('No se pudo eliminar la meta');
    } finally {
      setDeleteLoading(false);
      setConfirmDeleteId(null);
    }
  };

  // ─── Render ────────────────────────────────────────
  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Metas de Vendedor' },
      ]}
      title="Metas de Vendedor"
      subtitle={metas.length > 0 ? `${metas.length} meta${metas.length !== 1 ? 's' : ''}` : undefined}
      actions={
        isAdmin ? (
          <button
            data-tour="metas-add-btn"
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva meta
          </button>
        ) : undefined
      }
    >
      {/* Error */}
      <ErrorBanner error={error} onRetry={loadMetas} />

      {/* Filters */}
      <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2 sm:gap-3">
        <SearchBar
          dataTour="metas-search"
          value={searchTerm}
          onChange={v => { setSearchTerm(v); setCurrentPage(1); }}
          placeholder="Buscar por vendedor o tipo..."
          className="w-full sm:w-64"
        />

        <select
          data-tour="metas-tipo-filter"
          value={filterTipo}
          onChange={e => { setFilterTipo(e.target.value); setCurrentPage(1); }}
          className="h-9 border border-gray-300 rounded-lg text-sm px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos los tipos</option>
          {TIPO_OPTIONS.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>

        <div data-tour="metas-toggle-inactive" className="ml-auto">
          <InactiveToggle
            value={showInactive}
            onChange={v => { setShowInactive(v); setCurrentPage(1); }}
          />
        </div>

        <button
          onClick={loadMetas}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block flex-1 overflow-auto px-6 py-4">
        <div
          data-tour="metas-table"
          className="bg-white rounded-xl border border-gray-200 overflow-hidden page-animate page-animate-delay-1"
        >
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 grid" style={{ gridTemplateColumns: 'repeat(' + (isAdmin ? '7' : '6') + ', minmax(0, 1fr))' }}>
            <div className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vendedor</div>
            <div className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</div>
            <div className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Período</div>
            <div className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Meta</div>
            <div className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Vigencia</div>
            <div className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Estado</div>
            {isAdmin && <div className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Acciones</div>}
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando metas..." />
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Vendedor</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Período</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Meta</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Vigencia</th>
                <th className="text-center px-4 py-3 text-gray-500 font-medium">Estado</th>
                {isAdmin && <th className="text-center px-4 py-3 text-gray-500 font-medium">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.length === 0 && !loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="text-center py-12 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Target className="w-8 h-8 text-gray-300" weight="duotone" />
                      {searchTerm || filterTipo
                        ? 'Sin resultados para los filtros aplicados'
                        : 'No hay metas registradas'}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((meta, i) => (
                  <tr
                    key={meta.id}
                    className={`hover:bg-gray-50 transition-colors page-animate`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {meta.usuarioNombre || `Usuario #${meta.usuarioId}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[meta.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                        {TIPO_LABELS[meta.tipo] ?? meta.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {PERIODO_LABELS[meta.periodo] ?? meta.periodo}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {meta.tipo === 'ventas'
                        ? formatCurrency(meta.monto)
                        : formatNumber(meta.monto)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span>{formatDate(meta.fechaInicio)} – {formatDate(meta.fechaFin)}</span>
                        {meta.autoRenovar && (
                          <RefreshCw className="w-3 h-3 text-blue-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <ActiveToggle
                          isActive={meta.activo}
                          isLoading={togglingId === meta.id}
                          onToggle={() => handleToggle(meta)}
                        />
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${meta.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {meta.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(meta)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(meta.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="mt-4">
            <ListPagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filtered.length}
              pageSize={pageSize}
            />
          </div>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden flex-1 overflow-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        )}
        {!loading && paginated.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" weight="duotone" />
            {searchTerm || filterTipo
              ? 'Sin resultados para los filtros aplicados'
              : 'No hay metas registradas'}
          </div>
        )}
        <div className={`transition-opacity duration-200 ${loading ? "opacity-50" : "opacity-100"} space-y-3`}>
        {paginated.map((meta, i) => (
          <div
            key={meta.id}
            className="bg-white border border-gray-200 rounded-xl p-4 space-y-3 page-animate"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {meta.usuarioNombre || `Usuario #${meta.usuarioId}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLORS[meta.tipo] ?? 'bg-gray-100 text-gray-700'}`}>
                    {TIPO_LABELS[meta.tipo] ?? meta.tipo}
                  </span>
                  <span className="text-xs text-gray-500">{PERIODO_LABELS[meta.periodo]}</span>
                </div>
              </div>
              {isAdmin && (
                <ActiveToggle
                  isActive={meta.activo}
                  isLoading={togglingId === meta.id}
                  onToggle={() => handleToggle(meta)}
                />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Objetivo</p>
                <p className="font-semibold text-gray-900">
                  {meta.tipo === 'ventas' ? formatCurrency(meta.monto) : formatNumber(meta.monto)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-0.5">Vigencia</p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-gray-600">{formatDate(meta.fechaInicio)} – {formatDate(meta.fechaFin)}</p>
                  {meta.autoRenovar && (
                    <RefreshCw className="w-3 h-3 text-blue-500" />
                  )}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                <button
                  onClick={() => openEdit(meta)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => setConfirmDeleteId(meta.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
        </div>

        {totalPages > 1 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filtered.length}
            pageSize={pageSize}
          />
        )}
      </div>

      {/* Create / Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingMeta ? 'Editar meta' : 'Nueva meta'}
        icon={<Target className="w-5 h-5" weight="duotone" />}
        isDirty={isDirty}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleFormSubmit(onSubmit as Parameters<typeof handleFormSubmit>[0])} className="flex flex-col gap-5 p-6">

          {/* Vendedor */}
          <div data-tour="metas-drawer-vendedor">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Vendedor {!editingMeta && <span className="text-red-500">*</span>}
            </label>
            {!editingMeta ? (
              <>
                <select
                  value={watchedUsuarioId || ''}
                  onChange={e => setValue('usuarioId', Number(e.target.value), { shouldValidate: true })}
                  className="w-full h-10 border border-gray-300 rounded-lg text-sm px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar vendedor...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
                {errors.usuarioId && (
                  <p className="text-red-500 text-xs mt-1">{errors.usuarioId.message}</p>
                )}
              </>
            ) : (
              <div className="h-10 border border-gray-200 rounded-lg text-sm px-3 flex items-center text-gray-500 bg-gray-50">
                {editingMeta.usuarioNombre}
              </div>
            )}
          </div>

          {/* Tipo */}
          <div data-tour="metas-drawer-tipo">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de meta <span className="text-red-500">*</span>
            </label>
            <select
              {...register('tipo')}
              className="w-full h-10 border border-gray-300 rounded-lg text-sm px-3 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TIPO_OPTIONS.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.tipo && <p className="text-red-500 text-xs mt-1">{errors.tipo.message}</p>}
          </div>

          {/* Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Período <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {PERIODO_OPTIONS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue('periodo', p.value as 'semanal' | 'mensual', { shouldValidate: true })}
                  className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-colors ${
                    watchedPeriodo === p.value
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div data-tour="metas-drawer-monto">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {watchedTipo === 'ventas'
                ? 'Monto objetivo ($)'
                : watchedTipo === 'pedidos'
                  ? 'Pedidos objetivo (#)'
                  : 'Visitas objetivo (#)'}
              <span className="text-red-500"> *</span>
            </label>
            <input
              type="number"
              step={watchedTipo === 'ventas' ? '0.01' : '1'}
              min="0"
              {...register('monto', { valueAsNumber: true })}
              className="w-full h-10 border border-gray-300 rounded-lg text-sm px-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={watchedTipo === 'ventas' ? '50000.00' : '20'}
            />
            {errors.monto && <p className="text-red-500 text-xs mt-1">{errors.monto.message}</p>}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3" data-tour="metas-drawer-fechas">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Inicio <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                mode="date"
                value={watch('fechaInicio')}
                onChange={(val) => setValue('fechaInicio', val, { shouldValidate: true, shouldDirty: true })}
              />
              {errors.fechaInicio && (
                <p className="text-red-500 text-xs mt-1">{errors.fechaInicio.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Fin <span className="text-red-500">*</span>
              </label>
              <DateTimePicker
                mode="date"
                value={watch('fechaFin')}
                onChange={(val) => setValue('fechaFin', val, { shouldValidate: true, shouldDirty: true })}
                min={watch('fechaInicio')}
              />
              {errors.fechaFin && (
                <p className="text-red-500 text-xs mt-1">{errors.fechaFin.message}</p>
              )}
            </div>
          </div>

          {/* Auto-renovar */}
          <div data-tour="metas-drawer-autorenovar" className="flex items-start gap-3 py-1">
            <input
              type="checkbox"
              id="autoRenovar"
              {...register('autoRenovar')}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="autoRenovar" className="text-sm">
              <span className="font-medium text-gray-700">Auto-renovar</span>
              <p className="text-xs text-gray-500 mt-0.5">
                Al vencer, se crea automaticamente una nueva meta con los mismos valores para el siguiente periodo.
              </p>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2" data-tour="metas-drawer-actions">
            <Button type="button" variant="outline" onClick={closeDrawer} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="success" disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2">
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingMeta ? 'Guardar Cambios' : 'Crear Meta'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 page-animate">
            <h3 className="font-semibold text-gray-900 mb-2">Eliminar meta</h3>
            <p className="text-sm text-gray-600 mb-6">¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setConfirmDeleteId(null)} className="flex-1">
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteLoading} className="flex-1 flex items-center justify-center gap-2">
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageHeader>
  );
}
