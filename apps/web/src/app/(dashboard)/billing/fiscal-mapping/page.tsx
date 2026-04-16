'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Settings2, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { toast } from '@/hooks/useToast';
import { extractBillingError } from '@/lib/billingApi';
import {
  getFiscalMappings,
  getUnmappedProducts,
  upsertFiscalMapping,
  batchUpsertFiscalMappings,
  deleteFiscalMapping,
  getFiscalDefaults,
  setFiscalDefaults,
} from '@/services/api/billing';
import type {
  MapeoFiscalProducto,
  UnmappedProduct,
  DefaultsFiscalesTenant,
  UpsertMapeoFiscalRequest,
} from '@/types/billing';

import { MappedProductsTable } from './components/MappedProductsTable';
import { UnmappedProductsTable } from './components/UnmappedProductsTable';
import { BatchAssignModal } from './components/BatchAssignModal';
import { MapeoEditModal, type EditingProduct } from './components/MapeoEditModal';
import { DefaultsPanel } from './components/DefaultsPanel';

// ─── Types ───

type TabKey = 'todos' | 'sin-mapear';

// ─── Main Page ───

export default function FiscalMappingPage() {
  const t = useTranslations('billing.fiscalMapping');
  const tBilling = useTranslations('billing');
  const tCommon = useTranslations('common');

  // Tab state
  const [activeTab, setActiveTab] = useState<TabKey>('todos');

  // "Todos" tab data
  const [mappings, setMappings] = useState<MapeoFiscalProducto[]>([]);
  const [mappingsTotal, setMappingsTotal] = useState(0);
  const [mappingsPage, setMappingsPage] = useState(1);

  // "Sin Mapear" tab data
  const [unmapped, setUnmapped] = useState<UnmappedProduct[]>([]);
  const [unmappedTotal, setUnmappedTotal] = useState(0);
  const [unmappedPage, setUnmappedPage] = useState(1);

  const pageSize = 50;

  // Shared state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);

  // Selection for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Batch assign dialog
  const [showBatchAssign, setShowBatchAssign] = useState(false);
  const [batchProdServ, setBatchProdServ] = useState('');
  const [batchUnidad, setBatchUnidad] = useState('');

  // Defaults section
  const [defaults, setDefaults] = useState<DefaultsFiscalesTenant>({
    claveProdServDefault: '',
    claveUnidadDefault: '',
  });
  const [showDefaults, setShowDefaults] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [defaultsEditProdServ, setDefaultsEditProdServ] = useState<boolean>(false);
  const [defaultsEditUnidad, setDefaultsEditUnidad] = useState<boolean>(false);

  // ─── Data Loading ───

  const loadMappings = useCallback(async () => {
    try {
      const data = await getFiscalMappings(mappingsPage, pageSize);
      setMappings(data.items ?? []);
      setMappingsTotal(data.totalCount ?? 0);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: t('errorLoadingMappings'), description: apiError.message, variant: 'destructive' });
    }
  }, [mappingsPage]);

  const loadUnmapped = useCallback(async () => {
    try {
      const data = await getUnmappedProducts(unmappedPage, pageSize);
      setUnmapped(data.items ?? []);
      setUnmappedTotal(data.totalCount ?? 0);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: t('errorLoadingUnmapped'), description: apiError.message, variant: 'destructive' });
    }
  }, [unmappedPage]);

  const loadDefaults = useCallback(async () => {
    try {
      const data = await getFiscalDefaults();
      setDefaults(data);
    } catch {
      // Defaults may not exist yet — that's OK
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadMappings(), loadUnmapped(), loadDefaults()]);
    setLoading(false);
  }, [loadMappings, loadUnmapped, loadDefaults]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Clear selection on tab/page change
  useEffect(() => { setSelectedIds(new Set()); }, [activeTab, mappingsPage, unmappedPage]);

  // ─── Handlers ───

  const handleSaveDefaults = async () => {
    if (!defaults.claveProdServDefault && !defaults.claveUnidadDefault) {
      toast({ title: t('enterDefaultValue'), variant: 'destructive' });
      return;
    }
    setSavingDefaults(true);
    try {
      await setFiscalDefaults(defaults);
      toast({ title: t('defaultsSaved') });
      setDefaultsEditProdServ(false);
      setDefaultsEditUnidad(false);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: t('errorSavingDefaults'), description: apiError.message, variant: 'destructive' });
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleDeleteMapping = async (productoId: number) => {
    try {
      setSaving(true);
      await deleteFiscalMapping(productoId);
      toast({ title: t('mappingDeleted') });
      await loadAll();
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: t('errorDeletingMapping'), description: apiError.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMapping = async (productoId: number, claveProdServ: string, claveUnidad: string) => {
    try {
      setSaving(true);
      await upsertFiscalMapping({ productoId, claveProdServ, claveUnidad });
      toast({ title: t('mappingSaved') });
      setEditingProduct(null);
      await loadAll();
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: t('errorSavingMapping'), description: apiError.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAndClose = async (productoId: number) => {
    await handleDeleteMapping(productoId);
    setEditingProduct(null);
  };

  const handleBatchAssign = async () => {
    if (selectedIds.size === 0) return;
    if (!batchProdServ && !batchUnidad) {
      toast({ title: t('selectSatKey'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const requests: UpsertMapeoFiscalRequest[] = Array.from(selectedIds).map(productoId => {
        // Find existing mapping data
        const existing = mappings.find(m => m.productoId === productoId);
        const unmappedItem = unmapped.find(u => u.productoId === productoId);
        return {
          productoId,
          claveProdServ: batchProdServ || existing?.claveProdServ || unmappedItem?.claveSatActual || defaults.claveProdServDefault || '01010101',
          claveUnidad: batchUnidad || existing?.claveUnidad || unmappedItem?.unidadClaveSat || defaults.claveUnidadDefault || 'H87',
        };
      });
      await batchUpsertFiscalMappings(requests);
      toast({ title: t('productsUpdated', { count: selectedIds.size }) });
      setSelectedIds(new Set());
      setShowBatchAssign(false);
      setBatchProdServ('');
      setBatchUnidad('');
      await Promise.all([loadMappings(), loadUnmapped()]);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: t('batchAssignError'), description: apiError.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (ids: number[]) => {
    const allSelected = ids.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  // ─── Pagination ───

  const mappingsTotalPages = Math.ceil(mappingsTotal / pageSize);
  const unmappedTotalPages = Math.ceil(unmappedTotal / pageSize);

  if (loading && mappings.length === 0 && unmapped.length === 0) return (
    <div role="status" className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" aria-hidden="true" />
      <span className="sr-only">{tCommon('loading')}</span>
    </div>
  );

  const currentIds = activeTab === 'todos'
    ? mappings.map(m => m.productoId)
    : unmapped.map(u => u.productoId);

  return (
    <PageHeader
      breadcrumbs={[
        { label: tBilling('title'), href: '/billing' },
        { label: t('title') },
      ]}
      title={t('title')}
      subtitle={t('subtitle')}
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              onClick={() => setShowBatchAssign(true)}
              className="bg-success hover:bg-success/90 text-white"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {t('assignToProducts', { count: selectedIds.size })}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowDefaults(!showDefaults)}
            aria-expanded={showDefaults}
            aria-controls="defaults-panel"
          >
            <Settings2 className="w-4 h-4 mr-2" />
            {t('defaults')}
          </Button>
        </div>
      }
    >
      {/* ─── Defaults Section ─── */}
      {showDefaults && (
        <DefaultsPanel
          defaults={defaults}
          savingDefaults={savingDefaults}
          defaultsEditProdServ={defaultsEditProdServ}
          defaultsEditUnidad={defaultsEditUnidad}
          onDefaultsChange={setDefaults}
          onSetDefaultsEditProdServ={setDefaultsEditProdServ}
          onSetDefaultsEditUnidad={setDefaultsEditUnidad}
          onSaveDefaults={handleSaveDefaults}
        />
      )}

      {/* ─── Batch Assign Modal ─── */}
      {showBatchAssign && (
        <BatchAssignModal
          selectedCount={selectedIds.size}
          selectedProductNames={
            Array.from(selectedIds).map(id => {
              const mapped = mappings.find(m => m.productoId === id);
              const unmappedItem = unmapped.find(u => u.productoId === id);
              return mapped?.productoNombre || unmappedItem?.nombre || `Producto #${id}`;
            })
          }
          saving={saving}
          batchProdServ={batchProdServ}
          batchUnidad={batchUnidad}
          onBatchProdServChange={setBatchProdServ}
          onBatchUnidadChange={setBatchUnidad}
          onAssign={handleBatchAssign}
          onClose={() => setShowBatchAssign(false)}
        />
      )}

      {/* ─── Tabs ─── */}
      <div role="tablist" aria-label={t('productView')} className="flex items-center gap-1 mb-4 border-b border-border">
        <button
          role="tab"
          aria-selected={activeTab === 'todos'}
          aria-controls="panel-todos"
          id="tab-todos"
          onClick={() => setActiveTab('todos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'todos'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('allTab')} ({mappingsTotal})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'sin-mapear'}
          aria-controls="panel-sin-mapear"
          id="tab-sin-mapear"
          onClick={() => setActiveTab('sin-mapear')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sin-mapear'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('unmappedTab')}
          {unmappedTotal > 0 && (
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
              {unmappedTotal}
            </span>
          )}
        </button>
      </div>

      {/* ─── Select All + Batch Bar ─── */}
      {currentIds.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={currentIds.length > 0 && currentIds.every(id => selectedIds.has(id))}
              onChange={() => toggleSelectAll(currentIds)}
              className="rounded border-border text-green-600 focus:ring-green-500"
            />
            {t('selectAll')}
          </label>
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {t('selectedCount', { count: selectedIds.size, plural: selectedIds.size > 1 ? 's' : '' })}
            </span>
          )}
        </div>
      )}

      {/* ─── Todos Tab: Mapped Products Table ─── */}
      {activeTab === 'todos' && (
        <div role="tabpanel" id="panel-todos" aria-labelledby="tab-todos">
        <MappedProductsTable
          mappings={mappings}
          loading={loading}
          selectedIds={selectedIds}
          mappingsPage={mappingsPage}
          mappingsTotalPages={mappingsTotalPages}
          onToggleSelect={toggleSelect}
          onEdit={setEditingProduct}
          onSetMappingsPage={setMappingsPage}
          onDelete={handleDeleteMapping}
        />
        </div>
      )}

      {/* ─── Sin Mapear Tab: Unmapped Products Table ─── */}
      {activeTab === 'sin-mapear' && (
        <div role="tabpanel" id="panel-sin-mapear" aria-labelledby="tab-sin-mapear">
        <UnmappedProductsTable
          unmapped={unmapped}
          loading={loading}
          selectedIds={selectedIds}
          unmappedPage={unmappedPage}
          unmappedTotalPages={unmappedTotalPages}
          onToggleSelect={toggleSelect}
          onEdit={setEditingProduct}
          onSetUnmappedPage={setUnmappedPage}
        />
        </div>
      )}

      {/* ─── Edit Modal ─── */}
      {editingProduct && (
        <MapeoEditModal
          product={editingProduct}
          onSave={handleSaveMapping}
          onDelete={handleDeleteAndClose}
          onClose={() => setEditingProduct(null)}
          saving={saving}
        />
      )}

      {/* Loading overlay */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm z-50">
          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
          {tCommon('saving')}
        </div>
      )}
    </PageHeader>
  );
}
