'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Client } from '@/types';
import { clientService } from '@/services/api/clients';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { PageHeader } from '@/components/layout/PageHeader';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { exportToCsv } from '@/services/api/importExport';
import { CsvImportModal } from '@/components/shared/CsvImportModal';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import {
  Plus,
  Pencil,
  Upload,
  Download,
  ChevronDown,
  RefreshCw,
  Check,
  Minus,
  Loader2,
  Users,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { getInitials } from '@/lib/utils';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showDataMenu, setShowDataMenu] = useState(false);

  // Filtros
  const [selectedZona, setSelectedZona] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Catálogos para filtros
  const [zonas, setZonas] = useState<{ id: number; nombre: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: number; nombre: string }[]>([]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await clientService.getClients({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        isActive: showInactive ? undefined : true,
        zoneId: selectedZona || undefined,
        categoryId: selectedCategoria || undefined,
      });
      setClients(response.clients);
      setTotalClients(response.total);
      setTotalPages(response.totalPages);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
      setError('Error al cargar los clientes. Intenta de nuevo.');
      toast.error('Error al cargar los clientes');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, showInactive, selectedZona, selectedCategoria]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Cargar catálogos para filtros
  useEffect(() => {
    Promise.all([
      api.get<{ id: number; nombre: string }[]>('/zonas').catch(() => ({ data: [] })),
      api.get<{ id: number; nombre: string }[]>('/categorias-clientes').catch(() => ({ data: [] })),
    ]).then(([zonasRes, categoriasRes]) => {
      setZonas(zonasRes.data);
      setCategorias(categoriasRes.data);
    });
  }, []);

  const handleCreateClient = () => {
    router.push('/clients/new');
  };

  const handleEditClient = (client: Client) => {
    router.push(`/clients/${client.id}/edit`);
  };

  // Individual toggle active/inactive
  const handleToggleActive = async (client: Client) => {
    try {
      setTogglingId(client.id);
      const newActive = !client.isActive;
      await api.patch(`/clientes/${client.id}/activo`, { activo: newActive });
      toast.success(newActive ? 'Cliente activado' : 'Cliente desactivado');
      if (!showInactive && !newActive) {
        setClients(prev => prev.filter(c => c.id !== client.id));
      } else {
        setClients(prev => prev.map(c =>
          c.id === client.id ? { ...c, isActive: newActive } : c
        ));
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error('Error al cambiar el estado del cliente');
    } finally {
      setTogglingId(null);
    }
  };

  const visibleIds = clients.map(c => parseInt(c.id));
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, selectedZona, selectedCategoria, showInactive],
  });

  const handleBatchToggle = async () => {
    if (batch.selectedIds.size === 0) return;

    try {
      batch.setBatchLoading(true);
      const ids = Array.from(batch.selectedIds);
      const activo = batch.batchAction === 'activate';

      await api.patch('/clientes/batch-toggle', { ids, activo });

      toast.success(
        `${ids.length} cliente${ids.length > 1 ? 's' : ''} ${activo ? 'activado' : 'desactivado'}${ids.length > 1 ? 's' : ''} exitosamente`
      );

      batch.completeBatch();
      if (!showInactive && !activo) {
        setClients(prev => prev.filter(c => !ids.includes(parseInt(c.id))));
      } else {
        setClients(prev => prev.map(c =>
          ids.includes(parseInt(c.id)) ? { ...c, isActive: activo } : c
        ));
      }
    } catch (error) {
      console.error('Error en batch toggle:', error);
      toast.error('Error al cambiar el estado de los clientes');
      batch.setBatchLoading(false);
    }
  };

  return (
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Clientes' },
        ]}
        title="Clientes"
        subtitle={totalClients > 0 ? `${totalClients} cliente${totalClients !== 1 ? 's' : ''}` : undefined}
        actions={
          <>
            <div className="relative" data-tour="clients-import-export">
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
                      onClick={async () => { setShowDataMenu(false); try { await exportToCsv('clientes'); toast.success('Archivo CSV descargado'); } catch { toast.error('Error al exportar datos'); } }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      Exportar CSV
                    </button>
                    <button
                      onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
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
              data-tour="clients-add-btn"
              onClick={handleCreateClient}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo cliente</span>
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
            placeholder="Buscar cliente..."
            dataTour="clients-search"
          />
          <div className="min-w-[150px] max-w-[250px]" data-tour="clients-zone-filter">
            <SearchableSelect
              options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
              value={selectedZona}
              onChange={(val) => { setSelectedZona(val ? Number(val) : null); setCurrentPage(1); }}
              placeholder="Todas las zonas"
              searchPlaceholder="Buscar zona..."
            />
          </div>
          <div className="min-w-[150px] max-w-[260px]" data-tour="clients-category-filter">
            <SearchableSelect
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
              value={selectedCategoria}
              onChange={(val) => { setSelectedCategoria(val ? Number(val) : null); setCurrentPage(1); }}
              placeholder="Todas las categorías"
              searchPlaceholder="Buscar categoría..."
            />
          </div>
          <button
            onClick={fetchClients}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          <div data-tour="clients-toggle-inactive" className="ml-auto">
            <InactiveToggle
              value={showInactive}
              onChange={(v) => { setShowInactive(v); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* Error message */}
        <ErrorBanner error={error} onRetry={fetchClients} />

        {/* Selection Action Bar */}
        <BatchActionBar
          selectedCount={batch.selectedCount}
          totalItems={totalClients}
          entityLabel="clientes"
          onActivate={() => batch.openBatchAction('activate')}
          onDeactivate={() => batch.openBatchAction('deactivate')}
          onClear={batch.handleClearSelection}
          loading={batch.batchLoading}
        />

        {/* Mobile Card View */}
        <div className="sm:hidden space-y-3">
          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              <span className="text-sm text-gray-500 mt-2">Cargando...</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && clients.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <div className="text-center">
                <p className="text-lg font-medium">No hay clientes</p>
                <p className="text-sm mt-1">
                  {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primer cliente'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={handleCreateClient}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar Cliente
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Client Cards */}
          {!loading && clients.map((client) => (
            <div
              key={client.id}
              className={`border border-gray-200 rounded-lg p-3 bg-white ${
                !client.isActive ? 'opacity-60' : ''
              }`}
            >
              {/* Row 1: Checkbox + Avatar + Name/Code + Toggle */}
              <div className="flex items-center gap-3 mb-2">
                {/* Checkbox */}
                <button
                  onClick={() => batch.handleToggleSelect(parseInt(client.id))}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    batch.selectedIds.has(parseInt(client.id))
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-300 hover:border-green-500'
                  }`}
                >
                  {batch.selectedIds.has(parseInt(client.id)) && <Check className="w-3 h-3" />}
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 rounded bg-gray-900 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {getInitials(client.name)}
                </div>

                {/* Name and Code */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {client.name}
                  </div>
                  <div className="text-xs text-gray-500">{client.code}</div>
                </div>

                {/* Toggle Active */}
                <ActiveToggle
                  isActive={client.isActive}
                  onToggle={() => handleToggleActive(client)}
                  disabled={loading}
                  isLoading={togglingId === client.id}
                  title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
                />
              </div>

              {/* Row 2: Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {/* Zone Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                  {client.zoneName || 'Sin zona'}
                </span>

                {/* Category Badge */}
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">
                  {client.categoryName || 'Sin categoría'}
                </span>
              </div>

              {/* Row 3: Actions */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleEditClient(client)}
                  disabled={loading}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Clients Table - Desktop */}
        <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden overflow-x-auto" data-tour="clients-table">
          {/* Table Header - Always visible */}
          <div className="flex items-center gap-3 bg-gray-50 px-5 h-10 border-b border-gray-200 min-w-[900px]">
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
            <div className="flex-1 min-w-[250px] text-[11px] font-medium text-gray-500 uppercase">Cliente</div>
            <div className="w-[100px] text-[11px] font-medium text-gray-500 uppercase">Zona</div>
            <div className="w-[130px] text-[11px] font-medium text-gray-500 uppercase">Categoría</div>
            <div className="w-[90px] text-[11px] font-medium text-gray-500 uppercase hidden md:block">Saldo</div>
            <div className="w-[110px] text-[11px] font-medium text-gray-500 uppercase hidden lg:block">Lim. crédito</div>
            <div className="w-[50px] text-[11px] font-medium text-gray-500 uppercase text-center">Activo</div>
            <div className="w-8"></div>
          </div>

          {/* Table Body - With loading overlay */}
          <div className="relative min-h-[200px]">
            <TableLoadingOverlay loading={loading} />

            {/* Empty State */}
            {!loading && clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white text-gray-400">
                <Users className="w-16 h-16 text-gray-300 mb-4" />
                <div className="text-center">
                  <p className="text-lg font-medium">No hay clientes</p>
                  <p className="text-sm">
                    {searchTerm ? 'No se encontraron resultados' : 'Comienza agregando tu primer cliente'}
                  </p>
                  {!searchTerm && (
                    <button
                      onClick={handleCreateClient}
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <Plus className="w-4 h-4" />
                      Agregar Cliente
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Table Rows - With opacity transition */
              <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                {clients.map((client) => (
                <div
                  key={client.id}
                  className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors min-w-[900px] ${
                    !client.isActive ? 'bg-gray-50' : ''
                  }`}
                >
                  {/* Checkbox column */}
                  <div className="w-[28px] flex items-center justify-center">
                    <button
                      onClick={() => batch.handleToggleSelect(parseInt(client.id))}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        batch.selectedIds.has(parseInt(client.id))
                          ? 'bg-green-600 border-green-600 text-white'
                          : 'border-gray-300 hover:border-green-500'
                      }`}
                    >
                      {batch.selectedIds.has(parseInt(client.id)) && <Check className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Cliente column */}
                  <div className="flex-1 min-w-[250px] flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[11px] font-medium">
                        {getInitials(client.name)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-gray-900 truncate">
                        {client.name} ({client.code})
                      </div>
                      <div className="text-[11px] text-gray-500 truncate">
                        {client.email || client.phone || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Zona column */}
                  <div className="w-[100px]">
                    <span className="text-[13px] text-gray-900">
                      {client.zoneName || 'Sin zona'}
                    </span>
                  </div>

                  {/* Categoria column */}
                  <div className="w-[130px]">
                    <span className="text-[13px] text-gray-900">
                      {client.categoryName || 'Sin categoría'}
                    </span>
                  </div>

                  {/* Saldo column */}
                  <div className="w-[90px] hidden md:block">
                    <span className="text-[13px] text-gray-400">
                      —
                    </span>
                  </div>

                  {/* Limite crédito column */}
                  <div className="w-[110px] hidden lg:block">
                    <span className="text-[13px] text-gray-400">
                      —
                    </span>
                  </div>

                  {/* Toggle active column */}
                  <div className="w-[50px] flex items-center justify-center">
                    <ActiveToggle
                      isActive={client.isActive}
                      onToggle={() => handleToggleActive(client)}
                      disabled={loading}
                      isLoading={togglingId === client.id}
                      title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
                    />
                  </div>

                  {/* Edit column */}
                  <div className="w-8 flex justify-center">
                    <button
                      onClick={() => handleEditClient(client)}
                      disabled={loading}
                      className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                    </button>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </div>

        <ListPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalClients}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="clientes"
          loading={loading}
        />

          </div>

        {/* CSV Import Modal */}
        <CsvImportModal
          isOpen={isImportOpen}
          onClose={() => setIsImportOpen(false)}
          entity="clientes"
          entityLabel="clientes"
          onSuccess={() => fetchClients()}
        />

        {/* Batch Confirm Modal */}
        <BatchConfirmModal
          isOpen={batch.isBatchConfirmOpen}
          onClose={batch.closeBatchConfirm}
          onConfirm={handleBatchToggle}
          action={batch.batchAction}
          selectedCount={batch.selectedCount}
          entityLabel="clientes"
          loading={batch.batchLoading}
        />

      </PageHeader>
  );
}
