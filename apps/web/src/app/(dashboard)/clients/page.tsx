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
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { TabBar } from '@/components/ui/TabBar';
import { useBatchOperations } from '@/hooks/useBatchOperations';
import { BatchActionBar } from '@/components/shared/BatchActionBar';
import { BatchConfirmModal } from '@/components/shared/BatchConfirmModal';
import {
  Plus,
  Pencil,
  Upload,
  Download,
  ChevronDown,
  Users,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { SearchBar } from '@/components/common/SearchBar';
import { InactiveToggle } from '@/components/ui/InactiveToggle';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ActiveToggle } from '@/components/ui/ActiveToggle';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { NameAvatar } from '@/components/ui/NameAvatar';
import { SoftBadge } from '@/components/ui/SoftBadge';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

type ProspectFilter = 'todos' | 'clientes' | 'prospectos';

export default function ClientsPage() {
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const tn = useTranslations('nav');
  const router = useRouter();
  const { formatCurrency } = useFormatters();
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const isVendedor = userRole === 'VENDEDOR';
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
      setError(t('errorLoadingRetry'));
      toast.error(t('errorLoading'));
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
      toast.success(newActive ? t('clientActivated') : t('clientDeactivated'));
      if (!showInactive && !newActive) {
        setClients(prev => prev.filter(c => c.id !== client.id));
      } else {
        setClients(prev => prev.map(c =>
          c.id === client.id ? { ...c, isActive: newActive } : c
        ));
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      toast.error(t('errorChangingStatus'));
    } finally {
      setTogglingId(null);
    }
  };

  const handleAprobarProspecto = async (client: Client) => {
    try {
      setProspectActionLoading(client.id);
      await clientService.aprobarProspecto(parseInt(client.id));
      toast.success(t('prospectApproved', { name: client.name }));
      setClients(prev => prev.map(c =>
        c.id === client.id ? { ...c, esProspecto: false } : c
      ));
      if (prospectFilter === 'prospectos') {
        setClients(prev => prev.filter(c => c.id !== client.id));
      }
    } catch (err) {
      console.error('Error al aprobar prospecto:', err);
      toast.error(t('errorApprovingProspect'));
    } finally {
      setProspectActionLoading(null);
    }
  };

  // Reemplaza window.confirm() nativo (feo en móvil/desktop) por Modal.
  const [rejectClient, setRejectClient] = useState<Client | null>(null);

  const openRejectProspecto = (client: Client) => {
    setRejectClient(client);
  };

  const confirmRejectProspecto = async () => {
    if (!rejectClient) return;
    const client = rejectClient;
    try {
      setProspectActionLoading(client.id);
      await clientService.rechazarProspecto(parseInt(client.id));
      toast.success(t('prospectRejected', { name: client.name }));
      setClients(prev => prev.filter(c => c.id !== client.id));
      setRejectClient(null);
    } catch (err) {
      console.error('Error al rechazar prospecto:', err);
      toast.error(t('errorRejectingProspect'));
    } finally {
      setProspectActionLoading(null);
    }
  };

  const handleRechazarProspecto = openRejectProspecto;

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

  // Column definitions — espejo del ClientsPage del mockup Claude Design:
  // Cliente (Avatar 32 + nombre + zona subtítulo) · Nivel (badge categoría) · [Vendedor]
  // · Pedidos 30d (centro) · Saldo (rojo si >0 / "Al día" verde) · acciones.
  const columns = useMemo<DataGridColumn<Client>[]>(() => {
    const cols: DataGridColumn<Client>[] = [
      {
        key: 'name',
        label: t('columns.client'),
        sortable: true,
        width: 'flex',
        cellRenderer: (client) => (
          <div className="flex items-center gap-2.5 min-w-0">
            <NameAvatar name={client.name} size={32} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-foreground truncate">{client.name}</span>
                {client.esProspecto && (
                  <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">{tc('prospect')}</span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">{client.zoneName || t('noZone')}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'categoryName',
        label: t('columns.level'),
        sortable: true,
        width: 130,
        hiddenOnMobile: true,
        cellRenderer: (client) => client.categoryName
          ? <SoftBadge tone="primary">{client.categoryName}</SoftBadge>
          : <span className="text-[13px] text-muted-foreground">{t('noCategory')}</span>,
      },
    ];
    // Vendedor: el mockup oculta esta columna para el rol vendedor (ve solo su cartera).
    if (!isVendedor) {
      cols.push({
        key: 'vendedor',
        label: t('columns.vendor'),
        width: 140,
        hiddenOnMobile: true,
        cellRenderer: (client) => <span className="text-[13px] text-muted-foreground truncate block">{client.vendedorName || '—'}</span>,
      });
    }
    cols.push(
      {
        key: 'pedidos30d',
        label: t('columns.orders30d'),
        width: 100,
        align: 'center',
        hiddenOnMobile: true,
        cellRenderer: (client) => <span className="text-[13px] text-foreground tabular-nums">{client.pedidos30d ?? 0}</span>,
      },
      {
        key: 'saldo',
        label: t('columns.balance'),
        width: 110,
        align: 'right',
        cellRenderer: (client) => (client.saldo ?? 0) > 0
          ? <span className="text-[13px] font-bold text-red-600 tabular-nums">{formatCurrency(client.saldo ?? 0)}</span>
          : <span className="text-[13px] font-semibold text-green-600">{t('upToDate')}</span>,
      },
      {
        key: 'actions',
        label: t('columns.actions'),
        width: 100,
        align: 'center',
        cellRenderer: (client) => (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            {client.esProspecto && canManageProspects && (
              <>
                <button
                  onClick={() => handleAprobarProspecto(client)}
                  disabled={loading || prospectActionLoading === client.id}
                  className="p-1 hover:bg-primary/5 rounded transition-colors disabled:opacity-50"
                  title={t('approveProspect')}
                  data-testid={`approve-prospect-${client.id}`}
                >
                  <CheckCircle className="w-4 h-4 text-primary" />
                </button>
                <button
                  onClick={() => handleRechazarProspecto(client)}
                  disabled={loading || prospectActionLoading === client.id}
                  className="p-1 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title={t('rejectProspect')}
                  data-testid={`reject-prospect-${client.id}`}
                >
                  <XCircle className="w-4 h-4 text-red-500" />
                </button>
              </>
            )}
            <button
              onClick={() => handleEditClient(client)}
              disabled={loading}
              className="p-1 hover:bg-amber-50 rounded transition-colors disabled:opacity-50"
              title={tc('edit')}
              data-testid={`edit-client-${client.id}`}
            >
              <Pencil className="w-4 h-4 text-amber-400 hover:text-amber-600" />
            </button>
          </div>
        ),
      },
    );
    return cols;
  }, [loading, canManageProspects, prospectActionLoading, isVendedor, formatCurrency, t, tc]);

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
        t('batchSuccess', { count: ids.length, plural: ids.length > 1 ? 's' : '', action: activo ? tc('activate').toLowerCase() : tc('deactivate').toLowerCase() })
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
      toast.error(t('errorBatchToggle'));
      batch.setBatchLoading(false);
    }
  };

  return (
      <PageHeader
        section="catalogo"
        breadcrumbs={[
          { label: tc('home'), href: '/dashboard' },
          { label: tn('sectionCatalog') },
          { label: t('title') },
        ]}
        title={t('title')}
        subtitle={totalClients > 0 ? t('subtitleCartera', { count: totalClients }) : undefined}
        actions={
          <>
            <div className="relative" data-tour="clients-import-export">
              <button
                onClick={() => setShowDataMenu(!showDataMenu)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-foreground border border-border-strong bg-card rounded-full hover:bg-surface-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">{tc('importExport')}</span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </button>
              {showDataMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowDataMenu(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-surface-2 border border-border-subtle rounded-lg shadow-lg z-20 py-1">
                    <button
                      onClick={async () => { setShowDataMenu(false); try { await exportToCsv('clientes'); toast.success(tc('csvDownloaded')); } catch { toast.error(tc('errorExporting')); } }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-500" />
                      {tc('exportCsv')}
                    </button>
                    <button
                      onClick={() => { setShowDataMenu(false); setIsImportOpen(true); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground/80 hover:bg-surface-1"
                    >
                      <Upload className="w-3.5 h-3.5 text-blue-500" />
                      {tc('importCsv')}
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="wbPrimary" data-tour="clients-add-btn" onClick={handleCreateClient}>
              <Plus className="w-4 h-4 mr-2" />
              <span>{t('newClient')}</span>
            </Button>
          </>
        }
      >
        <div className="space-y-5">
        {/* Tabs (TabBar subrayado, índigo catálogo) — estado real: prospecto. 'all' mapea a 'todos'. */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 lg:flex-1" data-tour="clients-prospect-filter">
            <TabBar
              items={[
                { id: 'all', label: t('filters.all') },
                { id: 'clientes', label: t('filters.clients') },
                { id: 'prospectos', label: t('filters.prospects') },
              ]}
              value={prospectFilter === 'todos' ? 'all' : prospectFilter}
              onChange={(id) => { setProspectFilter(id === 'all' ? 'todos' : (id as ProspectFilter)); setCurrentPage(1); }}
            />
          </div>
          <div className="w-full sm:w-72 lg:w-80" data-tour="clients-search">
            <SearchBar
              value={searchTerm}
              onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
              placeholder={t('searchPlaceholder')}
              className="w-full"
            />
          </div>
        </div>

        {/* Filtros secundarios (zona, categoría) + inactivos — zona/categoría
            no están cubiertos por las pestañas, así que se conservan como filtros reales. */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="min-w-[150px] max-w-[250px]" data-tour="clients-zone-filter">
            <SearchableSelect
              options={zonas.map(z => ({ value: z.id, label: z.nombre }))}
              value={selectedZona}
              onChange={(val) => { setSelectedZona(val ? Number(val) : null); setCurrentPage(1); }}
              placeholder={t('filters.allZones')}
              searchPlaceholder={t('filters.searchZone')}
            />
          </div>
          <div className="min-w-[150px] max-w-[260px]" data-tour="clients-category-filter">
            <SearchableSelect
              options={categorias.map(c => ({ value: c.id, label: c.nombre }))}
              value={selectedCategoria}
              onChange={(val) => { setSelectedCategoria(val ? Number(val) : null); setCurrentPage(1); }}
              placeholder={t('filters.allCategories')}
              searchPlaceholder={t('filters.searchCategory')}
            />
          </div>

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
          entityLabel={t('title').toLowerCase()}
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
            loadingMessage={t('loadingClients')}
            emptyIcon={<Users className="w-10 h-10" />}
            emptyTitle={t('emptyTitle')}
            emptyMessage={searchTerm ? t('emptySearchMessage') : t('emptyMessage')}
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
            onRowClick={(client) => router.push(`/clients/${client.id}`)}
            mobileCardRenderer={(client) => (
              <div className={`${!client.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-3 mb-2">
                  <NameAvatar name={client.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground truncate">{client.name}</span>
                      {client.esProspecto && (
                        <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded flex-shrink-0">{tc('prospect')}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{client.zoneName || t('noZone')}</div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()} data-testid={`delete-client-${client.id}`}>
                    <ActiveToggle
                      isActive={client.isActive}
                      onToggle={() => handleToggleActive(client)}
                      disabled={loading}
                      isLoading={togglingId === client.id}
                      title={client.isActive ? t('deactivateClient') : t('activateClient')}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {client.categoryName && <SoftBadge tone="primary">{client.categoryName}</SoftBadge>}
                  {(client.saldo ?? 0) > 0
                    ? <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold">{formatCurrency(client.saldo ?? 0)}</span>
                    : <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-600 text-xs font-semibold">{t('upToDate')}</span>}
                </div>
                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  {client.esProspecto && canManageProspects && (
                    <>
                      <button onClick={() => handleAprobarProspecto(client)} disabled={loading || prospectActionLoading === client.id} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-primary hover:bg-primary/5 rounded disabled:opacity-50 transition-colors" title="Aprobar prospecto" data-testid={`approve-prospect-${client.id}`}>
                        <CheckCircle className="w-3.5 h-3.5" /><span>{tc('approve')}</span>
                      </button>
                      <button onClick={() => handleRechazarProspecto(client)} disabled={loading || prospectActionLoading === client.id} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded disabled:opacity-50 transition-colors" title={t('rejectProspect')} data-testid={`reject-prospect-${client.id}`}>
                        <XCircle className="w-3.5 h-3.5" /><span>{tc('reject')}</span>
                      </button>
                    </>
                  )}
                  <button onClick={() => handleEditClient(client)} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-amber-600 hover:bg-amber-50 rounded disabled:opacity-50 transition-colors" data-testid={`edit-client-${client.id}`}>
                    <Pencil className="w-3.5 h-3.5 text-amber-400" /><span>{tc('edit')}</span>
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
          entityLabel={t('title').toLowerCase()}
          onSuccess={() => fetchClients()}
        />

        {/* Batch Confirm Modal */}
        <BatchConfirmModal
          isOpen={batch.isBatchConfirmOpen}
          onClose={batch.closeBatchConfirm}
          onConfirm={handleBatchToggle}
          action={batch.batchAction}
          selectedCount={batch.selectedCount}
          entityLabel={t('title').toLowerCase()}
          loading={batch.batchLoading}
        />

        {/* Modal rechazar prospecto (reemplaza window.confirm() nativo) */}
        <Modal
          isOpen={rejectClient !== null}
          onClose={() => { if (!prospectActionLoading) setRejectClient(null); }}
          title={tc('confirm') || 'Confirmar'}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-text-primary">
              {rejectClient ? t('confirmRejectProspect', { name: rejectClient.name }) : ''}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectClient(null)}
                disabled={prospectActionLoading !== null}
              >
                {tc('cancel')}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmRejectProspecto}
                disabled={prospectActionLoading !== null}
              >
                {prospectActionLoading !== null ? tc('loading') : (t('rejectProspect') || 'Rechazar')}
              </Button>
            </div>
          </div>
        </Modal>

      </PageHeader>
  );
}
