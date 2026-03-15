'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Settings2, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { BrandedLoadingScreen } from '@/components/ui/BrandedLoadingScreen';
import { toast } from '@/hooks/useToast';
import { extractBillingError } from '@/lib/billingApi';
import {
  getFiscalMappings,
  getUnmappedProducts,
  upsertFiscalMapping,
  batchUpsertFiscalMappings,
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
import { DefaultsPanel } from './components/DefaultsPanel';
import type { EditingCell } from './components/MappedProductsTable';

// ─── Types ───

type TabKey = 'todos' | 'sin-mapear';

// ─── Main Page ───

export default function FiscalMappingPage() {
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
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

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
      toast({ title: 'Error al cargar mapeos fiscales', description: apiError.message, variant: 'destructive' });
    }
  }, [mappingsPage]);

  const loadUnmapped = useCallback(async () => {
    try {
      const data = await getUnmappedProducts(unmappedPage, pageSize);
      setUnmapped(data.items ?? []);
      setUnmappedTotal(data.totalCount ?? 0);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: 'Error al cargar productos sin mapear', description: apiError.message, variant: 'destructive' });
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

  const handleInlineSelect = async (
    productoId: number,
    field: 'claveProdServ' | 'claveUnidad',
    clave: string,
    existingMapping?: MapeoFiscalProducto,
    existingUnmapped?: UnmappedProduct,
  ) => {
    setEditingCell(null);
    setSaving(true);
    try {
      const request: UpsertMapeoFiscalRequest = {
        productoId,
        claveProdServ: field === 'claveProdServ'
          ? clave
          : (existingMapping?.claveProdServ || existingUnmapped?.claveSatActual || defaults.claveProdServDefault || '01010101'),
        claveUnidad: field === 'claveUnidad'
          ? clave
          : (existingMapping?.claveUnidad || existingUnmapped?.unidadClaveSat || defaults.claveUnidadDefault || 'H87'),
      };
      await upsertFiscalMapping(request);
      toast({ title: 'Mapeo actualizado' });
      await Promise.all([loadMappings(), loadUnmapped()]);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: 'Error al guardar mapeo', description: apiError.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDefaults = async () => {
    if (!defaults.claveProdServDefault && !defaults.claveUnidadDefault) {
      toast({ title: 'Ingresa al menos un valor predeterminado', variant: 'destructive' });
      return;
    }
    setSavingDefaults(true);
    try {
      await setFiscalDefaults(defaults);
      toast({ title: 'Valores predeterminados guardados' });
      setDefaultsEditProdServ(false);
      setDefaultsEditUnidad(false);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: 'Error al guardar valores predeterminados', description: apiError.message, variant: 'destructive' });
    } finally {
      setSavingDefaults(false);
    }
  };

  const handleBatchAssign = async () => {
    if (selectedIds.size === 0) return;
    if (!batchProdServ && !batchUnidad) {
      toast({ title: 'Selecciona al menos una clave SAT', variant: 'destructive' });
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
      toast({ title: `${selectedIds.size} productos actualizados` });
      setSelectedIds(new Set());
      setShowBatchAssign(false);
      setBatchProdServ('');
      setBatchUnidad('');
      await Promise.all([loadMappings(), loadUnmapped()]);
    } catch (err) {
      const apiError = extractBillingError(err);
      toast({ title: 'Error en asignacion masiva', description: apiError.message, variant: 'destructive' });
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

  if (loading && mappings.length === 0 && unmapped.length === 0) return <BrandedLoadingScreen />;

  const currentIds = activeTab === 'todos'
    ? mappings.map(m => m.productoId)
    : unmapped.map(u => u.productoId);

  return (
    <PageHeader
      breadcrumbs={[
        { label: 'Facturaci\u00f3n', href: '/billing' },
        { label: 'Mapeo Fiscal' },
      ]}
      title="Mapeo Fiscal"
      subtitle="Asignar c\u00f3digos SAT a productos para facturaci\u00f3n"
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              onClick={() => setShowBatchAssign(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Asignar a {selectedIds.size} productos
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setShowDefaults(!showDefaults)}
          >
            <Settings2 className="w-4 h-4 mr-2" />
            Predeterminados
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
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab('todos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'todos'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Todos ({mappingsTotal})
        </button>
        <button
          onClick={() => setActiveTab('sin-mapear')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sin-mapear'
              ? 'border-green-600 text-green-600 dark:text-green-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Sin Mapear
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
            Seleccionar todos
          </label>
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ─── Todos Tab: Mapped Products Table ─── */}
      {activeTab === 'todos' && (
        <MappedProductsTable
          mappings={mappings}
          loading={loading}
          selectedIds={selectedIds}
          editingCell={editingCell}
          mappingsPage={mappingsPage}
          mappingsTotalPages={mappingsTotalPages}
          onToggleSelect={toggleSelect}
          onSetEditingCell={setEditingCell}
          onInlineSelect={(productoId, field, clave, existingMapping) =>
            handleInlineSelect(productoId, field, clave, existingMapping)
          }
          onSetMappingsPage={setMappingsPage}
        />
      )}

      {/* ─── Sin Mapear Tab: Unmapped Products Table ─── */}
      {activeTab === 'sin-mapear' && (
        <UnmappedProductsTable
          unmapped={unmapped}
          loading={loading}
          selectedIds={selectedIds}
          editingCell={editingCell}
          unmappedPage={unmappedPage}
          unmappedTotalPages={unmappedTotalPages}
          onToggleSelect={toggleSelect}
          onSetEditingCell={setEditingCell}
          onInlineSelect={(productoId, field, clave, existingUnmapped) =>
            handleInlineSelect(productoId, field, clave, undefined, existingUnmapped)
          }
          onSetUnmappedPage={setUnmappedPage}
        />
      )}

      {/* Loading overlay */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm z-50">
          <Loader2 className="w-4 h-4 animate-spin text-green-600" />
          Guardando...
        </div>
      )}
    </PageHeader>
  );
}
