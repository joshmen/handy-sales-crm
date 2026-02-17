'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { toast } from '@/hooks/useToast';
import { api } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  Pencil,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  Minus,
  X,
  Power,
  PowerOff,
  ListOrdered,
} from 'lucide-react';
import { CurrencyDollar } from '@phosphor-icons/react';

interface ListaPrecio {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}

interface ListaPrecioForm {
  nombre: string;
  descripcion: string;
}

const formSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string(),
});
type FormData = z.infer<typeof formSchema>;

export default function PriceListsPage() {
  // State
  const [priceLists, setPriceLists] = useState<ListaPrecio[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingList, setSavingList] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Drawer ref
  const drawerRef = useRef<DrawerHandle>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

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
      toast.error('No se pudieron cargar las listas de precios');
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

  // Pagination
  const totalItems = filteredLists.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginatedLists = filteredLists.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page and clear selection when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds(new Set());
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
        toast.success(`Lista "${data.nombre}" actualizada exitosamente`);
      } else {
        await api.post('/listas-precios', data);
        toast.success(`Lista "${data.nombre}" creada exitosamente`);
      }

      setShowListForm(false);
      await loadPriceLists();
    } catch (error: any) {
      console.error('Error al guardar lista:', error);
      const message = error?.response?.data?.message || 'Error al guardar la lista de precios';
      toast.error(message);
    } finally{
      setSavingList(false);
    }
  });

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
      toast.success(newActivo ? 'Lista activada' : 'Lista desactivada');
      if (!showInactive && !newActivo) {
        setPriceLists(prev => prev.filter(l => l.id !== list.id));
      } else {
        setPriceLists(prev => prev.map(l =>
          l.id === list.id ? { ...l, activo: newActivo } : l
        ));
      }
    } catch (error: any) {
      console.error('Error al cambiar estado:', error);
      const message = error?.response?.data?.message || 'Error al cambiar el estado de la lista';
      toast.error(message);
    } finally {
      setTogglingId(null);
    }
  };

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
    const visibleIds = paginatedLists.map(l => l.id);
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

      await api.patch('/listas-precios/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} lista${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      setIsBatchConfirmOpen(false);
      setSelectedIds(new Set());
      if (!showInactive && !activo) {
        setPriceLists(prev => prev.filter(l => !ids.includes(l.id)));
      } else {
        setPriceLists(prev => prev.map(l =>
          ids.includes(l.id) ? { ...l, activo } : l
        ));
      }
    } catch (error: any) {
      console.error('Error en batch toggle:', error);
      const message = error?.response?.data?.message || 'Error al cambiar el estado de las listas';
      toast.error(message);
    } finally {
      setBatchLoading(false);
    }
  };

  // Clear selection when page changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [currentPage]);

  // Computed selection state
  const visibleIds = paginatedLists.map(l => l.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  // Page numbers
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'hoy';
    if (days === 1) return 'hace un día';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
    return date.toLocaleDateString('es-MX');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-4 py-4 sm:px-8 sm:py-6 border-b border-gray-200">
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Listas de precios' },
        ]} />

        {/* Title Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Listas de precios
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-tour="pricelists-new-btn"
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva lista</span>
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-4 py-4 sm:px-8 sm:py-6 space-y-4 overflow-auto">
        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="relative w-64" data-tour="pricelists-search">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Buscar lista de precios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Toggle para mostrar inactivas */}
          <div className="flex items-center gap-2 ml-auto" data-tour="pricelists-toggle-inactive">
            <span className="text-xs text-gray-600">Mostrar inactivas</span>
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                showInactive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={showInactive ? 'Mostrando todas las listas' : 'Solo listas activas'}
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
                  de {totalItems} listas
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
          {!loading && paginatedLists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CurrencyDollar className="w-12 h-12 text-green-300 mb-3" weight="duotone" />
              <p className="text-sm text-gray-500">No hay listas de precios</p>
            </div>
          ) : (
            paginatedLists.map((list) => (
              <div
                key={list.id}
                className={`border border-gray-200 rounded-lg p-3 bg-white ${
                  !list.activo ? 'opacity-60' : ''
                }`}
              >
                {/* Row 1: Checkbox + Icon + Name/Description + Toggle */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => handleToggleSelect(list.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedIds.has(list.id)
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {selectedIds.has(list.id) && <Check className="w-3 h-3" />}
                  </button>

                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    <CurrencyDollar className="w-5 h-5 text-green-600" weight="duotone" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {list.nombre}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{list.descripcion || 'Sin descripción'}</div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(list)}
                    disabled={togglingId === list.id || loading}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 flex-shrink-0 ${
                      list.activo ? 'bg-green-500' : 'bg-gray-300'
                    } ${togglingId === list.id ? 'opacity-50' : ''}`}
                    title={list.activo ? 'Desactivar lista' : 'Activar lista'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                      list.activo ? 'translate-x-4' : 'translate-x-0'
                    }`}>
                      {list.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                    </span>
                  </button>
                </div>

                {/* Row 2: Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-600 text-xs font-medium">
                    {formatDate(list.actualizadoEn || list.creadoEn)}
                  </span>
                </div>

                {/* Row 3: Actions */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleOpenEdit(list)}
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                    <span>Editar</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Table */}
        <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto" data-tour="pricelists-table">
          {/* Table Header */}
          <div className="flex items-center gap-3 bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[700px]">
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
            <div className="w-[60px] text-xs font-semibold text-gray-600">ID</div>
            <div className="flex-1 text-xs font-semibold text-gray-600">Nombre</div>
            <div className="flex-1 text-xs font-semibold text-gray-600">Descripción</div>
            <div className="w-[140px] text-xs font-semibold text-gray-600">Última modificación</div>
            <div className="w-[50px] text-xs font-semibold text-gray-600 text-center">Activo</div>
            <div className="w-[45px] text-xs font-semibold text-gray-600 text-center">Editar</div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="text-sm text-gray-500">Cargando listas...</span>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && paginatedLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <CurrencyDollar className="w-16 h-16 text-green-300 mb-4" weight="duotone" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay listas de precios</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron listas con ese término'
                    : 'Crea tu primera lista de precios para comenzar'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleOpenCreate}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva lista de precios
                  </button>
                )}
              </div>
            ) : (
              /* Table Rows */
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedLists.map((list) => (
                  <div
                    key={list.id}
                    className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[700px] ${
                      !list.activo ? 'bg-gray-50' : ''
                    }`}
                  >
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => handleToggleSelect(list.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          selectedIds.has(list.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {selectedIds.has(list.id) && <Check className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="w-[60px] text-[13px] font-mono text-gray-500">
                      {list.id}
                    </div>
                    <div className="flex-1 text-[13px] font-medium text-gray-900">
                      {list.nombre}
                    </div>
                    <div className="flex-1 text-[13px] text-gray-500 truncate pr-4">
                      {list.descripcion || '-'}
                    </div>
                    <div className="w-[140px] text-[13px] text-gray-500">
                      {formatDate(list.actualizadoEn || list.creadoEn)}
                    </div>
                    <div className="w-[50px] flex items-center justify-center">
                      <button
                        onClick={() => handleToggleActive(list)}
                        disabled={togglingId === list.id || loading}
                        className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 ${
                          list.activo ? 'bg-green-500' : 'bg-gray-300'
                        } ${togglingId === list.id ? 'opacity-50' : ''}`}
                        title={list.activo ? 'Desactivar lista' : 'Activar lista'}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform duration-200 flex items-center justify-center ${
                          list.activo ? 'translate-x-4' : 'translate-x-0'
                        }`}>
                          {list.activo ? <Check className="w-2.5 h-2.5 text-green-600" /> : <X className="w-2.5 h-2.5 text-gray-400" />}
                        </span>
                      </button>
                    </div>
                    <div className="w-[45px] flex items-center justify-center">
                      <button
                        onClick={() => handleOpenEdit(list)}
                        disabled={loading}
                        className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
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
        {(paginatedLists.length > 0 || loading) && totalItems > 0 && (
          <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
            <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Mostrando {startItem}-{endItem} de {totalItems} listas
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1 || loading}
                className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) => (
                  <button
                    key={idx}
                    onClick={() => typeof page === 'number' && !loading && setCurrentPage(page)}
                    disabled={page === '...' || loading}
                    className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                      page === currentPage
                        ? 'bg-green-600 text-white'
                        : page === '...'
                        ? 'text-gray-400 cursor-default'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

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
          title={`¿${batchAction === 'activate' ? 'Activar' : 'Desactivar'} ${selectedCount} lista${selectedCount > 1 ? 's' : ''}?`}
        >
          <div className="py-4">
            <p className="text-gray-500">
              ¿Estás seguro de que deseas {batchAction === 'activate' ? 'activar' : 'desactivar'}{' '}
              <strong>{selectedCount}</strong> lista{selectedCount > 1 ? 's' : ''} seleccionada{selectedCount > 1 ? 's' : ''}?
              {batchAction === 'deactivate' && ' Las listas desactivadas no aparecerán en las listas activas.'}
              {batchAction === 'activate' && ' Las listas activadas volverán a aparecer en las listas activas.'}
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
        isOpen={showListForm}
        onClose={handleCancelForm}
        title={editingList ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
        icon={<ListOrdered className="w-5 h-5" />}
        width="sm"
        isDirty={isDirty}
        onSave={handleSaveList}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => drawerRef.current?.requestClose()}
              disabled={savingList}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveList}
              disabled={savingList}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {savingList && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingList ? 'Guardar Cambios' : 'Crear Lista'}
            </button>
          </div>
        }
      >
        <form onSubmit={handleSaveList} data-tour="pricelist-form" className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('nombre')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Ej: Lista mayoreo, Lista minorista..."
            />
            {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              {...register('descripcion')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="Descripción opcional de la lista"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
