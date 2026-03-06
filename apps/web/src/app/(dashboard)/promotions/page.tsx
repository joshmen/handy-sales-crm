'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
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
  Minus,
  X,
  Loader2,
  Tag,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { Megaphone } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { useFormatters } from '@/hooks/useFormatters';

interface ProductoSimple {
  id: number;
  nombre: string;
}

const promotionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
  productoIds: z.array(z.number()).min(1, 'Selecciona al menos un producto'),
  descuentoPorcentaje: z.number().min(1, 'Mínimo 1%').max(100, 'Máximo 100%'),
  fechaInicio: z.string().min(1, 'La fecha de inicio es requerida'),
  fechaFin: z.string().min(1, 'La fecha de fin es requerida'),
}).refine(data => !data.fechaFin || !data.fechaInicio || data.fechaFin > data.fechaInicio, {
  message: 'La fecha de fin debe ser posterior a la de inicio',
  path: ['fechaFin'],
});

type PromotionFormData = z.infer<typeof promotionSchema>;

export default function PromotionsPage() {
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
      toast.error('No se pudieron cargar las promociones');
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

  // Batch operations
  const visibleIds = paginatedPromotions.map(p => p.id);
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
        `${ids.length} promocion${ids.length > 1 ? 'es' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''} exitosamente`
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
      toast.error('Error al cambiar el estado de las promociones');
      batch.setBatchLoading(false);
      await fetchPromotions();
    }
  };

  const handleRefresh = () => {
    fetchPromotions();
    toast.success('Promociones actualizadas');
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
        toast.success('Promocion actualizada exitosamente');
      } else {
        await api.post('/promociones', dto);
        toast.success('Promocion creada exitosamente');
      }

      setIsModalOpen(false);
      await fetchPromotions();
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } }; message?: string };
      const msg = e?.response?.data?.message || e?.message || 'Ocurrio un error';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  });

  const handleToggleActive = async (promo: PromocionDto) => {
    try {
      setTogglingId(promo.id);
      const newActivo = !promo.activo;
      await promotionService.toggleActive(promo.id, newActivo);
      toast.success(newActivo ? 'Promocion activada' : 'Promocion desactivada');
      // Optimistic update
      if (!showInactive && !newActivo) {
        setPromotions(prev => prev.filter(p => p.id !== promo.id));
      } else {
        setPromotions(prev => prev.map(p =>
          p.id === promo.id ? { ...p, activo: newActivo } : p
        ));
      }
    } catch (error: unknown) {
      const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
      await fetchPromotions();
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return _fmtDate(dateStr, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isExpired = (fechaFin: string) => {
    if (!fechaFin) return false;
    return new Date(fechaFin) < new Date();
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Promociones' },
      ]}
      title="Promociones"
      actions={
        <>
          <div className="relative" data-tour="promotions-import-export">
            <button
              onClick={() => setShowDataMenu(!showDataMenu)}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Importar / Exportar</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {showDataMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  <button
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('promociones'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-500" />
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => { setIsImportOpen(true); setShowDataMenu(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-500" />
                    Importar CSV
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            data-tour="promotions-create-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva promoción</span>
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
            placeholder="Buscar promoción..."
            dataTour="promotions-search"
          />

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
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
          entityLabel="promociones"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          )}
          {!loading && paginatedPromotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Gift className="w-12 h-12 text-yellow-300 mb-3" />
              <p className="text-sm text-gray-500 mb-3">No hay promociones</p>
              <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">
                <Plus className="w-4 h-4" /> Nueva promocion
              </button>
            </div>
          ) : (
            paginatedPromotions.map((promo) => (
              <div key={promo.id} className={`bg-white border border-gray-200 rounded-lg p-4 ${!promo.activo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => batch.handleToggleSelect(promo.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        batch.selectedIds.has(promo.id) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                      }`}
                    >
                      {batch.selectedIds.has(promo.id) && <Check className="w-3 h-3" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-purple-600" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{promo.nombre}</p>
                      {promo.descripcion && <p className="text-xs text-gray-500 truncate">{promo.descripcion}</p>}
                    </div>
                  </div>
                  <ActiveToggle
                    isActive={promo.activo}
                    onToggle={() => handleToggleActive(promo)}
                    disabled={loading}
                    isLoading={togglingId === promo.id}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Package className="w-3 h-3 text-blue-400" /> {promo.productos?.length || 0} productos</span>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{promo.descuentoPorcentaje}%</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3 text-violet-500" />
                  <span>{formatDate(promo.fechaInicio)} - {formatDate(promo.fechaFin)}</span>
                  {isExpired(promo.fechaFin) && <span className="text-red-500 ml-1">Vencida</span>}
                </div>
                <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
                  <button onClick={() => handleOpenEdit(promo)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" /> Editar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div data-tour="promotions-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[800px]">
            <div className="w-[28px] flex items-center justify-center">
              <button
                onClick={batch.handleSelectAllVisible}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  batch.allVisibleSelected
                    ? 'bg-green-600 border-green-600 text-white'
                    : batch.someVisibleSelected
                    ? 'bg-green-100 border-green-600'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {batch.allVisibleSelected ? (
                  <Check className="w-3 h-3" />
                ) : batch.someVisibleSelected ? (
                  <Minus className="w-3 h-3 text-green-600" />
                ) : null}
              </button>
            </div>
            <div className="flex-1 min-w-[150px] text-[11px] font-medium text-gray-500 uppercase">Nombre</div>
            <div className="w-[200px] text-[11px] font-medium text-gray-500 uppercase">Productos</div>
            <div className="w-[80px] text-[11px] font-medium text-gray-500 uppercase text-center">Descuento</div>
            <div className="w-[200px] text-[11px] font-medium text-gray-500 uppercase">Vigencia</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
            <div className="w-8"></div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando promociones..." />

            {!loading && paginatedPromotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Gift className="w-16 h-16 text-yellow-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay promociones</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Crea tu primera promocion especial para comenzar
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Nueva promocion
                </button>
              </div>
            ) : (
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedPromotions.map((promo) => (
                  <div
                    key={promo.id}
                    className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[800px] ${
                      !promo.activo ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => batch.handleToggleSelect(promo.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(promo.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(promo.id) && <Check className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Nombre */}
                    <div className="flex-1 min-w-[150px]">
                      <div className="text-[13px] font-medium text-gray-900 truncate">{promo.nombre}</div>
                      {promo.descripcion && (
                        <div className="text-xs text-gray-500 truncate mt-0.5">{promo.descripcion}</div>
                      )}
                    </div>

                    {/* Productos */}
                    <div className="w-[200px]">
                      {promo.productos && promo.productos.length > 0 ? (
                        <div className="group relative">
                          <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span className="text-[13px] text-gray-700">
                              {promo.productos.length === 1
                                ? promo.productos[0].productoNombre
                                : `${promo.productos.length} productos`}
                            </span>
                          </div>
                          {/* Hover tooltip with full product list */}
                          <div className="invisible group-hover:visible absolute z-20 left-0 top-full mt-1 w-56 bg-gray-900 text-white text-xs rounded-lg shadow-lg p-2 max-h-[200px] overflow-y-auto">
                            <div className="font-medium text-gray-300 mb-1 px-1">{promo.productos.length} producto{promo.productos.length !== 1 ? 's' : ''}:</div>
                            {promo.productos.map((prod) => (
                              <div key={prod.productoId} className="flex items-center gap-1.5 px-1 py-0.5 rounded hover:bg-gray-800">
                                <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="truncate">{prod.productoNombre}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400">Sin productos</span>
                      )}
                    </div>

                    {/* Descuento */}
                    <div className="w-[80px] text-center">
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[13px] font-medium text-blue-700 bg-blue-50 rounded-full">
                        {promo.descuentoPorcentaje}%
                      </span>
                    </div>

                    {/* Vigencia */}
                    <div className="w-[200px]">
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                        <span>{formatDate(promo.fechaInicio)} - {formatDate(promo.fechaFin)}</span>
                      </div>
                      {isExpired(promo.fechaFin) && (
                        <span className="text-[11px] text-red-500 ml-5">Vencida</span>
                      )}
                    </div>

                    {/* Toggle Activo */}
                    <div className="w-[50px] flex items-center justify-center">
                      <ActiveToggle
                        isActive={promo.activo}
                        onToggle={() => handleToggleActive(promo)}
                        disabled={loading}
                        isLoading={togglingId === promo.id}
                      />
                    </div>

                    {/* Editar */}
                    <div className="w-8 flex items-center justify-center">
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        disabled={loading}
                        className="p-1 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="promociones"
          loading={loading}
        />
      </div>

      {/* Batch Confirm Modal */}
      <BatchConfirmModal
        isOpen={batch.isBatchConfirmOpen}
        onClose={batch.closeBatchConfirm}
        onConfirm={handleBatchToggle}
        action={batch.batchAction}
        selectedCount={batch.selectedCount}
        entityLabel="promocion"
        loading={batch.batchLoading}
        consequenceActivate="Las promociones activadas volverán a estar disponibles."
        consequenceDeactivate="Las promociones desactivadas no estarán disponibles."
      />

      {/* Create/Edit Drawer */}
      <Drawer
        ref={drawerRef}
        isOpen={isModalOpen}
        onClose={() => !actionLoading && setIsModalOpen(false)}
        title={editingPromotion ? 'Editar Promoción' : 'Nueva Promoción'}
        icon={<Tag className="w-5 h-5 text-amber-500" />}
        width="lg"
        isDirty={isDirty}
        onSave={handleSubmit}
        footer={
          <div className="flex justify-end gap-3" data-tour="promotions-drawer-actions">
            <button
              onClick={() => drawerRef.current?.requestClose()}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingPromotion ? 'Guardar cambios' : 'Crear promocion'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} data-tour="promotion-form" className="px-6 py-6 space-y-4">
          <div data-tour="promotions-drawer-name">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              {...register('nombre')}
              placeholder="Ej: Promo Verano 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div data-tour="promotions-drawer-description">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <input
              type="text"
              {...register('descripcion')}
              placeholder="Descripcion de la promocion..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div data-tour="promotions-drawer-products">
            <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Productos <span className="text-red-500">*</span> <HelpTooltip tooltipKey="promo-products" /></label>
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
              placeholder={watch('productoIds').length > 0 ? 'Agregar otro producto...' : 'Seleccionar productos...'}
              searchPlaceholder="Buscar producto..."
              emptyMessage="No hay mas productos disponibles"
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
            {errors.productoIds && <p className="text-red-500 text-xs mt-1">{errors.productoIds.message}</p>}
            <p className="text-xs text-gray-400 mt-1">{watch('productoIds').length} de {productos.length} producto{watch('productoIds').length !== 1 ? 's' : ''} seleccionado{watch('productoIds').length !== 1 ? 's' : ''}</p>
          </div>

          <div data-tour="promotions-drawer-discount">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descuento (%) <span className="text-red-500">*</span></label>
            <input
              type="number"
              min="1"
              max="100"
              {...register('descuentoPorcentaje', { valueAsNumber: true })}
              placeholder="Ej: 15"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.descuentoPorcentaje && <p className="text-red-500 text-xs mt-1">{errors.descuentoPorcentaje.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4" data-tour="promotions-drawer-dates">
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Fecha inicio <span className="text-red-500">*</span> <HelpTooltip tooltipKey="promo-dates" /></label>
              <input
                type="date"
                {...register('fechaInicio')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.fechaInicio && <p className="text-red-500 text-xs mt-1">{errors.fechaInicio.message}</p>}
            </div>
            <div>
              <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Fecha fin <span className="text-red-500">*</span></label>
              <input
                type="date"
                {...register('fechaFin')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.fechaFin && <p className="text-red-500 text-xs mt-1">{errors.fechaFin.message}</p>}
            </div>
          </div>
        </form>
      </Drawer>

      <CsvImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        entity="promociones"
        entityLabel="promociones"
        onSuccess={() => fetchPromotions()}
      />
    </PageHeader>
  );
}
