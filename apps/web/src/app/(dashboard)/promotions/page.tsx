'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { PromocionDto, PromocionCreateRequest, promotionService } from '@/services/api/promotions';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Gift,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  Package,
  Power,
  PowerOff,
  Check,
  Minus,
  X,
  Loader2,
  Tag,
} from 'lucide-react';
import { Megaphone } from '@phosphor-icons/react';
import { HelpTooltip } from '@/components/help/HelpTooltip';

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
  const drawerRef = useRef<DrawerHandle>(null);
  const [promotions, setPromotions] = useState<PromocionDto[]>([]);
  const [productos, setProductos] = useState<ProductoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<PromocionDto | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingPromotion, setDeletingPromotion] = useState<PromocionDto | null>(null);

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
    return true;
  });

  // Pagination
  const totalItems = filteredPromotions.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedPromotions = filteredPromotions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Multi-select handlers
  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    const visibleIds = paginatedPromotions.map(p => p.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));

    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        visibleIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleOpenBatchAction = (action: 'activate' | 'deactivate') => {
    setBatchAction(action);
    setIsBatchConfirmOpen(true);
  };

  const handleBatchToggle = async () => {
    if (selectedIds.size === 0) return;

    try {
      setBatchLoading(true);
      const ids = Array.from(selectedIds);
      const activo = batchAction === 'activate';

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

      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de las promociones');
      await fetchPromotions();
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage, showInactive]);

  // Computed selection state
  const visibleIds = paginatedPromotions.map(p => p.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

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
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.message || 'Ocurrio un error';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  });

  const handleDelete = async () => {
    if (!deletingPromotion) return;
    try {
      setActionLoading(true);
      await api.delete(`/promociones/${deletingPromotion.id}`);
      toast.success('Promocion eliminada');
      setIsDeleteConfirmOpen(false);
      setDeletingPromotion(null);
      await fetchPromotions();
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error al eliminar';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

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
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Error al cambiar estado';
      toast.error(msg);
      await fetchPromotions();
    } finally {
      setTogglingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isExpired = (fechaFin: string) => {
    if (!fechaFin) return false;
    return new Date(fechaFin) < new Date();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Promociones' },
        ]} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Promociones
          </h1>
          <div className="flex items-center gap-2">
            <button
              data-tour="promotions-create-btn"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva promoción</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {/* Toggle para mostrar inactivos */}
          <div data-tour="promotions-toggle-inactive" className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-gray-600">Mostrar inactivos</span>
            <button
              onClick={() => { setShowInactive(!showInactive); setCurrentPage(1); }}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                showInactive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={showInactive ? 'Mostrando todas las promociones' : 'Solo promociones activas'}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 ${
                showInactive ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Selection Action Bar */}
        {selectedCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-700">
                {selectedCount} seleccionada{selectedCount > 1 ? 's' : ''}
              </span>
              {selectedCount < totalItems && (
                <span className="text-xs text-blue-500">
                  de {totalItems} promociones
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenBatchAction('deactivate')}
                disabled={batchLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                <PowerOff className="w-3 h-3" />
                <span>Desactivar</span>
              </button>
              <button
                onClick={() => handleOpenBatchAction('activate')}
                disabled={batchLoading}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-600 bg-white border border-green-200 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                <Power className="w-3 h-3" />
                <span>Activar</span>
              </button>
              <button
                onClick={handleClearSelection}
                className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Cancelar</span>
              </button>
            </div>
          </div>
        )}

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
              <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700">
                <Plus className="w-4 h-4" /> Nueva promocion
              </button>
            </div>
          ) : (
            paginatedPromotions.map((promo) => (
              <div key={promo.id} className={`bg-white border border-gray-200 rounded-lg p-4 ${!promo.activo ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => handleToggleSelect(promo.id)}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedIds.has(promo.id) ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'
                      }`}
                    >
                      {selectedIds.has(promo.id) && <Check className="w-3 h-3" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Megaphone className="w-5 h-5 text-purple-600" weight="duotone" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{promo.nombre}</p>
                      {promo.descripcion && <p className="text-xs text-gray-500 truncate">{promo.descripcion}</p>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(promo)}
                    disabled={togglingId === promo.id}
                    className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${promo.activo ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${promo.activo ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
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
                  <button onClick={() => { setDeletingPromotion(promo); setIsDeleteConfirmOpen(true); }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" /> Eliminar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div data-tour="promotions-table" className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto">
          {/* Table Header */}
          <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[800px]">
            <div className="w-[28px] flex items-center justify-center">
              <button
                onClick={handleSelectAllVisible}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  allVisibleSelected
                    ? 'bg-green-600 border-green-600 text-white'
                    : someVisibleSelected
                    ? 'bg-green-100 border-green-600'
                    : 'border-gray-300 hover:border-green-500'
                }`}
              >
                {allVisibleSelected ? (
                  <Check className="w-3 h-3" />
                ) : someVisibleSelected ? (
                  <Minus className="w-3 h-3 text-green-600" />
                ) : null}
              </button>
            </div>
            <div className="flex-1 min-w-[150px] text-xs font-semibold text-gray-600">Nombre</div>
            <div className="w-[200px] text-xs font-semibold text-gray-600">Productos</div>
            <div className="w-[80px] text-xs font-semibold text-gray-600 text-center">Descuento</div>
            <div className="w-[200px] text-xs font-semibold text-gray-600">Vigencia</div>
            <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
            <div className="w-[80px] text-xs font-semibold text-gray-600 text-center">Acciones</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="text-sm text-gray-500">Cargando promociones...</span>
                </div>
              </div>
            )}

            {!loading && paginatedPromotions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <Gift className="w-16 h-16 text-yellow-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay promociones</h3>
                <p className="text-sm text-gray-500 text-center mb-4">
                  Crea tu primera promocion especial para comenzar
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
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
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[800px] ${
                      !promo.activo ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSelect(promo.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedIds.has(promo.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {selectedIds.has(promo.id) && <Check className="w-3 h-3" />}
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
                      <button
                        onClick={() => handleToggleActive(promo)}
                        disabled={togglingId === promo.id || loading}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                          promo.activo ? 'bg-green-500' : 'bg-gray-300'
                        } ${togglingId === promo.id ? 'opacity-50' : ''}`}
                        title={promo.activo ? 'Desactivar' : 'Activar'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                          promo.activo ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                          {promo.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                        </span>
                      </button>
                    </div>

                    {/* Acciones */}
                    <div className="w-[80px] flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        disabled={loading}
                        className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                        title="Editar"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setDeletingPromotion(promo); setIsDeleteConfirmOpen(true); }}
                        disabled={loading}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalItems > pageSize && (
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Mostrando {startItem}-{endItem} de {totalItems} promociones
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  disabled={loading}
                  className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                    page === currentPage ? 'bg-green-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || loading}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Confirm Modal */}
      {isBatchConfirmOpen && (
        <Modal
          isOpen={isBatchConfirmOpen}
          onClose={() => setIsBatchConfirmOpen(false)}
          title={`${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} promocion${selectedCount > 1 ? 'es' : ''}?`}
        >
          <div className="py-4">
            <p className="text-gray-500">
              Estas seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
              <strong>{selectedCount}</strong> promocion{selectedCount > 1 ? 'es' : ''} seleccionada{selectedCount > 1 ? 's' : ''}?
              {batchAction === 'deactivate' && ' Las promociones desactivadas no estaran disponibles.'}
              {batchAction === 'activate' && ' Las promociones activadas volveran a estar disponibles.'}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setIsBatchConfirmOpen(false)}
              disabled={batchLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleBatchToggle}
              disabled={batchLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${
                batchAction === 'deactivate'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {batchLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              {batchAction === 'activate' ? 'Activar' : 'Desactivar'} ({selectedCount})
            </button>
          </div>
        </Modal>
      )}

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
          <div className="flex justify-end gap-3">
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
        <div data-tour="promotion-form" className="px-6 py-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
            <input
              type="text"
              {...register('nombre')}
              placeholder="Ej: Promo Verano 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <input
              type="text"
              {...register('descripcion')}
              placeholder="Descripcion de la promocion..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
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

          <div>
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

          <div className="grid grid-cols-2 gap-4">
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
        </div>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => !actionLoading && setIsDeleteConfirmOpen(false)}
        title="Eliminar promocion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Estas seguro que deseas eliminar la promocion <strong>{deletingPromotion?.nombre}</strong>? Esta accion no se puede deshacer.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
