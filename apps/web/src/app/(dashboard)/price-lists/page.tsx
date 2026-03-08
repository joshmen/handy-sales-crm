'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Pencil,
  Loader2,
  Check,
  Minus,
  ListOrdered,
  RefreshCw,
  Download,
  Upload,
  ChevronDown,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { CurrencyDollar } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
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
  const paginatedLists = filteredLists.slice(
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
        toast.success(`Lista "${data.nombre}" actualizada exitosamente`);
      } else {
        await api.post('/listas-precios', data);
        toast.success(`Lista "${data.nombre}" creada exitosamente`);
      }

      setShowListForm(false);
      await loadPriceLists();
    } catch (error: unknown) {
      console.error('Error al guardar lista:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al guardar la lista de precios';
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
    } catch (error: unknown) {
      console.error('Error al cambiar estado:', error);
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado de la lista';
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
        `${ids.length} lista${ids.length > 1 ? 's' : ''} ${activo ? 'activada' : 'desactivada'}${ids.length > 1 ? 's' : ''} exitosamente`
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
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Error al cambiar el estado de las listas';
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
    if (days === 0) return 'hoy';
    if (days === 1) return 'hace un día';
    if (days < 7) return `hace ${days} días`;
    if (days < 30) return `hace ${Math.floor(days / 7)} semanas`;
    return _fmtDate(date);
  };

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Inicio', href: '/dashboard' },
        { label: 'Listas de precios' },
      ]}
      title="Listas de precios"
      actions={
        <>
          <div className="relative" data-tour="pricelists-import-export">
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
                    onClick={async () => { setShowDataMenu(false); try { await exportToCsv('listas-precios'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
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
            data-tour="pricelists-new-btn"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva lista</span>
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
            placeholder="Buscar lista de precios..."
            dataTour="pricelists-search"
          />
          <button
            onClick={loadPriceLists}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div data-tour="pricelists-toggle-inactive" className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
              label="Mostrar inactivas"
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
                    onClick={() => batch.handleToggleSelect(list.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      batch.selectedIds.has(list.id)
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {batch.selectedIds.has(list.id) && <Check className="w-3 h-3" />}
                  </button>

                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium flex-shrink-0">
                    <CurrencyDollar className="w-5 h-5 text-green-600" weight="duotone" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {list.nombre}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{list.descripcion || 'Sin descripción'}</div>
                  </div>

                  <ActiveToggle
                    isActive={list.activo}
                    onToggle={() => handleToggleActive(list)}
                    disabled={loading}
                    isLoading={togglingId === list.id}
                  />
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
          <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[700px]">
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
            <div className="w-[60px] text-[11px] font-medium text-gray-500 uppercase">ID</div>
            <div className="flex-1 text-[11px] font-medium text-gray-500 uppercase">Nombre</div>
            <div className="flex-1 text-[11px] font-medium text-gray-500 uppercase">Descripción</div>
            <div className="w-[140px] text-[11px] font-medium text-gray-500 uppercase">Modificación</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
            <div className="w-8"></div>
          </div>

          {/* Table Body */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} message="Cargando listas..." />

            {/* Empty State */}
            {!loading && paginatedLists.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 py-20">
                <CurrencyDollar className="w-16 h-16 text-green-300 mb-4" weight="duotone" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay listas de precios</h3>
                <p className="text-sm text-gray-500 text-center">
                  {searchTerm
                    ? 'No se encontraron resultados para tu búsqueda'
                    : 'Crea tu primera lista de precios para comenzar'}
                </p>
              </div>
            ) : (
              /* Table Rows */
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {paginatedLists.map((list) => (
                  <div
                    key={list.id}
                    className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[700px] ${
                      !list.activo ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="w-[28px] flex items-center justify-center">
                      <button
                        onClick={() => batch.handleToggleSelect(list.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          batch.selectedIds.has(list.id)
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-500'
                        }`}
                      >
                        {batch.selectedIds.has(list.id) && <Check className="w-3 h-3" />}
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
                      <ActiveToggle
                        isActive={list.activo}
                        onToggle={() => handleToggleActive(list)}
                        disabled={loading}
                        isLoading={togglingId === list.id}
                      />
                    </div>
                    <div className="w-8 flex justify-center">
                      <button
                        onClick={() => handleOpenEdit(list)}
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
        {(paginatedLists.length > 0 || loading) && totalItems > 0 && (
          <ListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="listas de precios"
            loading={loading}
            className="pt-4"
          />
        )}
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
        consequenceDeactivate="Las listas desactivadas no aparecerán en las listas activas."
        consequenceActivate="Las listas activadas volverán a aparecer en las listas activas."
      />

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
          <div data-tour="pricelists-drawer-actions" className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()} disabled={savingList}>
              Cancelar
            </Button>
            <Button type="button" variant="success" onClick={handleSaveList} disabled={savingList} className="flex items-center gap-2">
              {savingList && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingList ? 'Guardar Cambios' : 'Crear Lista'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveList} data-tour="pricelist-form" className="p-6 space-y-4">
          <div data-tour="pricelists-drawer-name">
            <Input
              id="nombre"
              label={<>Nombre <span className="text-red-500">*</span></>}
              type="text"
              {...register('nombre')}
              placeholder="Ej: Lista mayoreo, Lista minorista..."
              error={errors.nombre?.message}
            />
          </div>
          <div data-tour="pricelists-drawer-description">
            <Input
              id="descripcion"
              label="Descripción"
              type="text"
              {...register('descripcion')}
              placeholder="Descripción opcional de la lista"
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
