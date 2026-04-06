'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { getInitials } from '@/lib/utils';

type ProspectFilter = 'todos' | 'clientes' | 'prospectos';

export default function ClientsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const canManageProspects = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'SUPERVISOR';

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
  const [prospectActionLoading, setProspectActionLoading] = useState<string | null>(null);

  // Filtros
  const [selectedZona, setSelectedZona] = useState<number | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [prospectFilter, setProspectFilter] = useState<ProspectFilter>('todos');

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
        esProspecto: prospectFilter === 'prospectos' ? true : prospectFilter === 'clientes' ? false : undefined,
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
  }, [currentPage, searchTerm, showInactive, selectedZona, selectedCategoria, prospectFilter]);

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

  const handleAprobarProspecto = async (client: Client) => {
    try {
      setProspectActionLoading(client.id);
      await clientService.aprobarProspecto(parseInt(client.id));
      toast.success(`"${client.name}" aprobado como cliente`);
      setClients(prev => prev.map(c =>
        c.id === client.id ? { ...c, esProspecto: false } : c
      ));
      if (prospectFilter === 'prospectos') {
        setClients(prev => prev.filter(c => c.id !== client.id));
      }
    } catch (err) {
      console.error('Error al aprobar prospecto:', err);
      toast.error('Error al aprobar el prospecto');
    } finally {
      setProspectActionLoading(null);
    }
  };

  const handleRechazarProspecto = async (client: Client) => {
    if (!window.confirm(`¿Estás seguro de rechazar al prospecto "${client.name}"? Se eliminará del sistema.`)) return;
    try {
      setProspectActionLoading(client.id);
      await clientService.rechazarProspecto(parseInt(client.id));
      toast.success(`Prospecto "${client.name}" rechazado`);
      setClients(prev => prev.filter(c => c.id !== client.id));
    } catch (err) {
      console.error('Error al rechazar prospecto:', err);
      toast.error('Error al rechazar el prospecto');
    } finally {
      setProspectActionLoading(null);
    }
  };

  // Sort state
  const [sortKey, setSortKey] = useState('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  const sortedClients = useMemo(() => {
    const sorted = [...clients];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'zoneName': cmp = (a.zoneName || '').localeCompare(b.zoneName || ''); break;
        case 'categoryName': cmp = (a.categoryName || '').localeCompare(b.categoryName || ''); break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [clients, sortKey, sortDir]);

  // Column definitions
  const columns = useMemo<DataGridColumn<Client>[]>(() => [
    {
      key: 'name',
      label: 'Cliente',
      sortable: true,
      width: 'flex',
      cellRenderer: (client) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] font-medium">{getInitials(client.name)}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-medium text-gray-900 truncate">{client.name} ({client.code})</span>
              {client.esProspecto && (
                <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">Prospecto</span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 truncate">{client.email || client.phone || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'zoneName',
      label: 'Zona',
      sortable: true,
      width: 100,
      cellRenderer: (client) => <span className="text-[13px] text-gray-900">{client.zoneName || 'Sin zona'}</span>,
    },
    {
      key: 'categoryName',
      label: 'Categoría',
      sortable: true,
      width: 130,
      cellRenderer: (client) => <span className="text-[13px] text-gray-900">{client.categoryName || 'Sin categoría'}</span>,
    },
    {
      key: 'balance',
      label: 'Saldo',
      width: 90,
      hiddenOnMobile: true,
      cellRenderer: () => <span className="text-[13px] text-gray-400">—</span>,
    },
    {
      key: 'creditLimit',
      label: 'Lim. crédito',
      width: 110,
      hiddenOnMobile: true,
      cellRenderer: () => <span className="text-[13px] text-gray-400">—</span>,
    },
    {
      key: 'isActive',
      label: 'Activo',
      width: 50,
      align: 'center',
      cellRenderer: (client) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActiveToggle
            isActive={client.isActive}
            onToggle={() => handleToggleActive(client)}
            disabled={loading}
            isLoading={togglingId === client.id}
            title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
          />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: 100,
      align: 'center',
      cellRenderer: (client) => (
        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          {client.esProspecto && canManageProspects && (
            <>
              <button
                onClick={() => handleAprobarProspecto(client)}
                disabled={loading || prospectActionLoading === client.id}
                className="p-1 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                title="Aprobar prospecto"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </button>
              <button
                onClick={() => handleRechazarProspecto(client)}
                disabled={loading || prospectActionLoading === client.id}
                className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="Rechazar prospecto"
              >
                <XCircle className="w-4 h-4 text-red-500" />
              </button>
            </>
          )}
          <button
            onClick={() => handleEditClient(client)}
            disabled={loading}
            className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
            title="Editar"
          >
            <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
          </button>
        </div>
      ),
    },
  ], [loading, togglingId, canManageProspects, prospectActionLoading]);

  const visibleIds = sortedClients.map(c => parseInt(c.id));
  const batch = useBatchOperations({
    visibleIds,
    clearDeps: [currentPage, searchTerm, selectedZona, selectedCategoria, showInactive, prospectFilter],
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
        {/* Prospect Filter Chips */}
        <div className="flex items-center gap-1.5">
          {([
            { key: 'todos', label: 'Todos' },
            { key: 'clientes', label: 'Clientes' },
            { key: 'prospectos', label: 'Prospectos' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setProspectFilter(key); setCurrentPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                prospectFilter === key
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

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

        {/* Clients DataGrid */}
        <div data-tour="clients-table">
          <DataGrid<Client>
            columns={columns}
            data={sortedClients}
            keyExtractor={(c) => parseInt(c.id)}
            loading={loading}
            loadingMessage="Cargando clientes..."
            emptyIcon={<Users className="w-10 h-10" />}
            emptyTitle="No hay clientes"
            emptyMessage={searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'Crea tu primer cliente para comenzar'}
            sort={{
              key: sortKey,
              direction: sortDir,
              onSort: handleSort,
            }}
            selection={{
              selectedIds: batch.selectedIds as unknown as Set<string | number>,
              onToggle: (id) => batch.handleToggleSelect(id as number),
              onSelectAll: batch.handleSelectAllVisible,
              onClearAll: batch.handleClearSelection,
            }}
            pagination={{
              currentPage,
              totalPages,
              totalItems: totalClients,
              pageSize,
              onPageChange: setCurrentPage,
            }}
            mobileCardRenderer={(client) => (
              <div className={`${!client.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded bg-gray-900 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {getInitials(client.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">{client.name}</span>
                      {client.esProspecto && (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">Prospecto</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{client.code}</div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActiveToggle
                      isActive={client.isActive}
                      onToggle={() => handleToggleActive(client)}
                      disabled={loading}
                      isLoading={togglingId === client.id}
                      title={client.isActive ? 'Desactivar cliente' : 'Activar cliente'}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">{client.zoneName || 'Sin zona'}</span>
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium">{client.categoryName || 'Sin categoría'}</span>
                </div>
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {client.esProspecto && canManageProspects && (
                    <>
                      <button onClick={() => handleAprobarProspecto(client)} disabled={loading || prospectActionLoading === client.id} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-700 hover:bg-green-50 rounded disabled:opacity-50 transition-colors" title="Aprobar prospecto">
                        <CheckCircle className="w-3.5 h-3.5" /><span>Aprobar</span>
                      </button>
                      <button onClick={() => handleRechazarProspecto(client)} disabled={loading || prospectActionLoading === client.id} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors" title="Rechazar prospecto">
                        <XCircle className="w-3.5 h-3.5" /><span>Rechazar</span>
                      </button>
                    </>
                  )}
                  <button onClick={() => handleEditClient(client)} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-amber-400" /><span>Editar</span>
                  </button>
                </div>
              </div>
            )}
          />
        </div>

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
