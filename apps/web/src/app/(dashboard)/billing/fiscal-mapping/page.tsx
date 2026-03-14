'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X as XIcon, ChevronLeft, ChevronRight, Loader2, Settings2, Check, CheckCheck } from 'lucide-react';
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
  searchCatalogoProdServ,
  searchCatalogoUnidad,
} from '@/services/api/billing';
import type {
  MapeoFiscalProducto,
  UnmappedProduct,
  CatalogoProdServItem,
  CatalogoUnidadItem,
  DefaultsFiscalesTenant,
  UpsertMapeoFiscalRequest,
} from '@/types/billing';

// ─── Types ───

type TabKey = 'todos' | 'sin-mapear';

interface EditingCell {
  productoId: number;
  field: 'claveProdServ' | 'claveUnidad';
}

// ─── Autocomplete Dropdown ───

function AutocompleteDropdown<T extends { clave: string }>({
  value,
  onSelect,
  onClose,
  searchFn,
  renderLabel,
  placeholder,
}: {
  value: string;
  onSelect: (item: T) => void;
  onClose: () => void;
  searchFn: (q: string) => Promise<T[]>;
  renderLabel: (item: T) => string;
  placeholder: string;
}) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFn(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchFn]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Escape') onClose();
        }}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-sm border border-green-500 rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30"
      />
      {(results.length > 0 || loading) && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 max-h-60 overflow-auto bg-card border border-border rounded-lg shadow-lg">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Buscando...
            </div>
          )}
          {results.map(item => (
            <button
              key={item.clave}
              onClick={() => onSelect(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-0"
            >
              <span className="font-mono font-medium text-green-600 dark:text-green-400">{item.clave}</span>
              <span className="ml-2 text-muted-foreground">{renderLabel(item)}</span>
            </button>
          ))}
          {!loading && results.length === 0 && query.trim().length >= 2 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}

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
      toast({ title: 'Error en asignación masiva', description: apiError.message, variant: 'destructive' });
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
        { label: 'Facturación', href: '/billing' },
        { label: 'Mapeo Fiscal' },
      ]}
      title="Mapeo Fiscal"
      subtitle="Asignar códigos SAT a productos para facturación"
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
        <div className="mb-6 bg-card border border-border rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1">Valores Predeterminados del Tenant</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Se usan como respaldo cuando un producto no tiene mapeo fiscal asignado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default ProdServ */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Clave ProdServ SAT predeterminada
              </label>
              {defaultsEditProdServ ? (
                <AutocompleteDropdown<CatalogoProdServItem>
                  value={defaults.claveProdServDefault}
                  onSelect={item => {
                    setDefaults(prev => ({ ...prev, claveProdServDefault: item.clave }));
                    setDefaultsEditProdServ(false);
                  }}
                  onClose={() => setDefaultsEditProdServ(false)}
                  searchFn={searchCatalogoProdServ}
                  renderLabel={item => item.descripcion}
                  placeholder="Buscar clave ProdServ..."
                />
              ) : (
                <button
                  onClick={() => setDefaultsEditProdServ(true)}
                  className="w-full text-left px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:border-green-500 transition-colors"
                >
                  {defaults.claveProdServDefault ? (
                    <span className="font-mono">{defaults.claveProdServDefault}</span>
                  ) : (
                    <span className="text-muted-foreground">Click para seleccionar...</span>
                  )}
                </button>
              )}
            </div>

            {/* Default Unidad */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Clave Unidad SAT predeterminada
              </label>
              {defaultsEditUnidad ? (
                <AutocompleteDropdown<CatalogoUnidadItem>
                  value={defaults.claveUnidadDefault}
                  onSelect={item => {
                    setDefaults(prev => ({ ...prev, claveUnidadDefault: item.clave }));
                    setDefaultsEditUnidad(false);
                  }}
                  onClose={() => setDefaultsEditUnidad(false)}
                  searchFn={searchCatalogoUnidad}
                  renderLabel={item => item.nombre}
                  placeholder="Buscar clave unidad..."
                />
              ) : (
                <button
                  onClick={() => setDefaultsEditUnidad(true)}
                  className="w-full text-left px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground hover:border-green-500 transition-colors"
                >
                  {defaults.claveUnidadDefault ? (
                    <span className="font-mono">{defaults.claveUnidadDefault}</span>
                  ) : (
                    <span className="text-muted-foreground">Click para seleccionar...</span>
                  )}
                </button>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleSaveDefaults}
              disabled={savingDefaults}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {savingDefaults && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Predeterminados
            </Button>
          </div>
        </div>
      )}

      {/* ─── Batch Assign Modal ─── */}
      {showBatchAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Asignación Masiva</h3>
              <button onClick={() => setShowBatchAssign(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Asignar la misma clave SAT a {selectedIds.size} producto{selectedIds.size > 1 ? 's' : ''} seleccionado{selectedIds.size > 1 ? 's' : ''}.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Clave ProdServ SAT
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchProdServ}
                    readOnly
                    placeholder="Click para buscar..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground font-mono cursor-pointer"
                    onClick={() => {/* handled by autocomplete below */}}
                  />
                </div>
                <BatchAutocomplete
                  value={batchProdServ}
                  onChange={setBatchProdServ}
                  searchFn={searchCatalogoProdServ}
                  renderLabel={(item: CatalogoProdServItem) => `${item.clave} — ${item.descripcion}`}
                  placeholder="Buscar clave ProdServ..."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Clave Unidad SAT
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={batchUnidad}
                    readOnly
                    placeholder="Click para buscar..."
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground font-mono cursor-pointer"
                  />
                </div>
                <BatchAutocomplete
                  value={batchUnidad}
                  onChange={setBatchUnidad}
                  searchFn={searchCatalogoUnidad}
                  renderLabel={(item: CatalogoUnidadItem) => `${item.clave} — ${item.nombre}`}
                  placeholder="Buscar clave unidad..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBatchAssign(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleBatchAssign}
                disabled={saving || (!batchProdServ && !batchUnidad)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Asignar
              </Button>
            </div>
          </div>
        </div>
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
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-10 px-4 py-3" />
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto ID</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave ProdServ SAT</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave Unidad SAT</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción Fiscal</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(m => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(m.productoId)}
                        onChange={() => toggleSelect(m.productoId)}
                        className="rounded border-border text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium tabular-nums">{m.productoId}</td>
                    <td className="px-4 py-3">
                      {editingCell?.productoId === m.productoId && editingCell.field === 'claveProdServ' ? (
                        <AutocompleteDropdown<CatalogoProdServItem>
                          value={m.claveProdServ}
                          onSelect={item => handleInlineSelect(m.productoId, 'claveProdServ', item.clave, m)}
                          onClose={() => setEditingCell(null)}
                          searchFn={searchCatalogoProdServ}
                          renderLabel={item => item.descripcion}
                          placeholder="Buscar clave..."
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell({ productoId: m.productoId, field: 'claveProdServ' })}
                          className="font-mono text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                          title="Click para editar"
                        >
                          {m.claveProdServ}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.productoId === m.productoId && editingCell.field === 'claveUnidad' ? (
                        <AutocompleteDropdown<CatalogoUnidadItem>
                          value={m.claveUnidad}
                          onSelect={item => handleInlineSelect(m.productoId, 'claveUnidad', item.clave, m)}
                          onClose={() => setEditingCell(null)}
                          searchFn={searchCatalogoUnidad}
                          renderLabel={item => item.nombre}
                          placeholder="Buscar unidad..."
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell({ productoId: m.productoId, field: 'claveUnidad' })}
                          className="font-mono text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                          title="Click para editar"
                        >
                          {m.claveUnidad}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {m.descripcionFiscal || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="w-3 h-3 mr-1" />
                        Mapeado
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(m.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      No hay productos con mapeo fiscal
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards - Todos */}
          <div className="md:hidden space-y-3">
            {mappings.map(m => (
              <div key={m.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.productoId)}
                    onChange={() => toggleSelect(m.productoId)}
                    className="rounded border-border text-green-600 focus:ring-green-500"
                  />
                  <span className="font-medium text-sm">Producto #{m.productoId}</span>
                  <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Mapeado
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">ProdServ:</span>
                    <button
                      onClick={() => setEditingCell({ productoId: m.productoId, field: 'claveProdServ' })}
                      className="block font-mono text-green-600 dark:text-green-400"
                    >
                      {m.claveProdServ}
                    </button>
                    {editingCell?.productoId === m.productoId && editingCell.field === 'claveProdServ' && (
                      <AutocompleteDropdown<CatalogoProdServItem>
                        value={m.claveProdServ}
                        onSelect={item => handleInlineSelect(m.productoId, 'claveProdServ', item.clave, m)}
                        onClose={() => setEditingCell(null)}
                        searchFn={searchCatalogoProdServ}
                        renderLabel={item => item.descripcion}
                        placeholder="Buscar clave..."
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Unidad:</span>
                    <button
                      onClick={() => setEditingCell({ productoId: m.productoId, field: 'claveUnidad' })}
                      className="block font-mono text-green-600 dark:text-green-400"
                    >
                      {m.claveUnidad}
                    </button>
                    {editingCell?.productoId === m.productoId && editingCell.field === 'claveUnidad' && (
                      <AutocompleteDropdown<CatalogoUnidadItem>
                        value={m.claveUnidad}
                        onSelect={item => handleInlineSelect(m.productoId, 'claveUnidad', item.clave, m)}
                        onClose={() => setEditingCell(null)}
                        searchFn={searchCatalogoUnidad}
                        renderLabel={item => item.nombre}
                        placeholder="Buscar unidad..."
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {mappings.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No hay productos con mapeo fiscal
              </div>
            )}
          </div>

          {/* Pagination - Todos */}
          {mappingsTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted-foreground">
                Página {mappingsPage} de {mappingsTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMappingsPage(p => Math.max(1, p - 1))}
                  disabled={mappingsPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMappingsPage(p => Math.min(mappingsTotalPages, p + 1))}
                  disabled={mappingsPage >= mappingsTotalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Sin Mapear Tab: Unmapped Products Table ─── */}
      {activeTab === 'sin-mapear' && (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="w-10 px-4 py-3" />
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código Barra</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave ProdServ SAT</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave Unidad SAT</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
                </tr>
              </thead>
              <tbody>
                {unmapped.map(u => (
                  <tr key={u.productoId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(u.productoId)}
                        onChange={() => toggleSelect(u.productoId)}
                        className="rounded border-border text-green-600 focus:ring-green-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.nombre}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {u.codigoBarra || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.unidadNombre}
                      {u.unidadAbreviatura && (
                        <span className="text-xs ml-1">({u.unidadAbreviatura})</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.productoId === u.productoId && editingCell.field === 'claveProdServ' ? (
                        <AutocompleteDropdown<CatalogoProdServItem>
                          value={u.claveSatActual || ''}
                          onSelect={item => handleInlineSelect(u.productoId, 'claveProdServ', item.clave, undefined, u)}
                          onClose={() => setEditingCell(null)}
                          searchFn={searchCatalogoProdServ}
                          renderLabel={item => item.descripcion}
                          placeholder="Buscar clave ProdServ..."
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell({ productoId: u.productoId, field: 'claveProdServ' })}
                          className="text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                          title="Click para asignar"
                        >
                          {u.claveSatActual ? (
                            <span className="font-mono">{u.claveSatActual}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-xs">Asignar...</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editingCell?.productoId === u.productoId && editingCell.field === 'claveUnidad' ? (
                        <AutocompleteDropdown<CatalogoUnidadItem>
                          value={u.unidadClaveSat || ''}
                          onSelect={item => handleInlineSelect(u.productoId, 'claveUnidad', item.clave, undefined, u)}
                          onClose={() => setEditingCell(null)}
                          searchFn={searchCatalogoUnidad}
                          renderLabel={item => item.nombre}
                          placeholder="Buscar clave unidad..."
                        />
                      ) : (
                        <button
                          onClick={() => setEditingCell({ productoId: u.productoId, field: 'claveUnidad' })}
                          className="text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                          title="Click para asignar"
                        >
                          {u.unidadClaveSat ? (
                            <span className="font-mono">{u.unidadClaveSat}</span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-xs">Asignar...</span>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                        Sin Mapear
                      </span>
                    </td>
                  </tr>
                ))}
                {unmapped.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Check className="w-8 h-8 text-green-500" />
                        <span>Todos los productos tienen mapeo fiscal</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards - Sin Mapear */}
          <div className="md:hidden space-y-3">
            {unmapped.map(u => (
              <div key={u.productoId} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.productoId)}
                    onChange={() => toggleSelect(u.productoId)}
                    className="rounded border-border text-green-600 focus:ring-green-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">{u.nombre}</span>
                    <span className="text-xs text-muted-foreground">{u.unidadNombre}</span>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Sin Mapear
                  </span>
                </div>
                {u.codigoBarra && (
                  <p className="text-xs text-muted-foreground font-mono mb-2">Código: {u.codigoBarra}</p>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground">ProdServ:</span>
                    <button
                      onClick={() => setEditingCell({ productoId: u.productoId, field: 'claveProdServ' })}
                      className="block text-amber-600 dark:text-amber-400 text-xs"
                    >
                      {u.claveSatActual || 'Asignar...'}
                    </button>
                    {editingCell?.productoId === u.productoId && editingCell.field === 'claveProdServ' && (
                      <AutocompleteDropdown<CatalogoProdServItem>
                        value={u.claveSatActual || ''}
                        onSelect={item => handleInlineSelect(u.productoId, 'claveProdServ', item.clave, undefined, u)}
                        onClose={() => setEditingCell(null)}
                        searchFn={searchCatalogoProdServ}
                        renderLabel={item => item.descripcion}
                        placeholder="Buscar clave..."
                      />
                    )}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Unidad:</span>
                    <button
                      onClick={() => setEditingCell({ productoId: u.productoId, field: 'claveUnidad' })}
                      className="block text-amber-600 dark:text-amber-400 text-xs"
                    >
                      {u.unidadClaveSat || 'Asignar...'}
                    </button>
                    {editingCell?.productoId === u.productoId && editingCell.field === 'claveUnidad' && (
                      <AutocompleteDropdown<CatalogoUnidadItem>
                        value={u.unidadClaveSat || ''}
                        onSelect={item => handleInlineSelect(u.productoId, 'claveUnidad', item.clave, undefined, u)}
                        onClose={() => setEditingCell(null)}
                        searchFn={searchCatalogoUnidad}
                        renderLabel={item => item.nombre}
                        placeholder="Buscar unidad..."
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
            {unmapped.length === 0 && !loading && (
              <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
                <Check className="w-8 h-8 text-green-500" />
                Todos los productos tienen mapeo fiscal
              </div>
            )}
          </div>

          {/* Pagination - Sin Mapear */}
          {unmappedTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-muted-foreground">
                Página {unmappedPage} de {unmappedTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnmappedPage(p => Math.max(1, p - 1))}
                  disabled={unmappedPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUnmappedPage(p => Math.min(unmappedTotalPages, p + 1))}
                  disabled={unmappedPage >= unmappedTotalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
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

// ─── Batch Autocomplete (simplified for modal) ───

function BatchAutocomplete<T extends { clave: string }>({
  value,
  onChange,
  searchFn,
  renderLabel,
  placeholder,
}: {
  value: string;
  onChange: (clave: string) => void;
  searchFn: (q: string) => Promise<T[]>;
  renderLabel: (item: T) => string;
  placeholder: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchFn(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, searchFn]);

  return (
    <div className="mt-1">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
        />
      </div>
      {open && (results.length > 0 || loading) && (
        <div className="mt-1 max-h-40 overflow-auto bg-card border border-border rounded-lg shadow-sm">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Buscando...
            </div>
          )}
          {results.map(item => (
            <button
              key={item.clave}
              onClick={() => {
                onChange(item.clave);
                setQuery(renderLabel(item));
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors border-b border-border last:border-0 ${
                value === item.clave ? 'bg-green-50 dark:bg-green-900/20' : ''
              }`}
            >
              {renderLabel(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
