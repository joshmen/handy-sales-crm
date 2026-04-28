'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Plus, Trash2, ChevronUp, ChevronDown, MapPin, Loader2, Search,
} from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { Modal } from '@/components/ui/Modal';
import { routeService, RouteStop } from '@/services/api/routes';
import { clientService } from '@/services/api/clients';
import type { RouteTabProps } from './types';

const STOPS_PER_PAGE = 10;

/**
 * Tab Paradas: lista de stops + reordering + add/remove. Modal AddStop
 * embebido. Auto-fetch de clientes al montar (para alimentar el modal).
 */
export function ParadasTab({ route, isEditable, onRefetch }: RouteTabProps) {
  const t = useTranslations('routes');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();

  // Pagination + selection
  const [stopsPage, setStopsPage] = useState(1);
  const [selectedStopIds, setSelectedStopIds] = useState<Set<number>>(new Set());
  const [batchRemovingStops, setBatchRemovingStops] = useState(false);

  // AddStop modal state
  const [isAddStopOpen, setIsAddStopOpen] = useState(false);
  const [clientsRaw, setClientsRaw] = useState<{ value: string; label: string; zoneId?: number; zoneName?: string }[]>([]);
  const [stopForm, setStopForm] = useState({ duracion: 30 });
  const [selectedStopClienteIds, setSelectedStopClienteIds] = useState<Set<number>>(new Set());
  const [stopSearch, setStopSearch] = useState('');
  const [batchAddingStops, setBatchAddingStops] = useState(false);

  const sortedStops = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);
  const assignedClientIds = new Set(sortedStops.map((s) => String(s.clienteId)));

  const routeZonaIds = new Set<number>(
    route.zonas?.length ? route.zonas.map((z) => z.id) : route.zonaId ? [route.zonaId] : []
  );
  const routeZonaNombres = (
    route.zonas?.length ? route.zonas.map((z) => z.nombre) : route.zonaNombre ? [route.zonaNombre] : []
  ).join(', ');

  const fetchClients = useCallback(async () => {
    try {
      const response = await clientService.getClients({ limit: 500, isActive: true });
      const items = response.clients.map((c) => ({
        value: c.id,
        label: c.zoneName ? `${c.name} · ${c.zoneName}` : c.name,
        zoneId: c.zoneId,
        zoneName: c.zoneName,
      }));
      setClientsRaw(items);
    } catch {
      console.error('Error al cargar clientes');
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const closeAddStopModal = () => {
    setIsAddStopOpen(false);
    setSelectedStopClienteIds(new Set());
    setStopSearch('');
  };

  const toggleStopClienteSelected = (clienteId: number) => {
    setSelectedStopClienteIds((prev) => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  };

  const handleAddStopsBatch = async () => {
    const ids = Array.from(selectedStopClienteIds);
    if (ids.length === 0) {
      toast.error(t('detail.selectClient'));
      return;
    }
    setBatchAddingStops(true);
    try {
      const result = await routeService.addParadasBatch(route.id, ids, stopForm.duracion || 30);
      if (result.totalAgregadas > 0 && result.totalFallidas === 0) {
        toast.success(t('detail.stopsBatchAdded', { count: result.totalAgregadas }));
      } else if (result.totalAgregadas > 0 && result.totalFallidas > 0) {
        toast.success(
          t('detail.stopsBatchPartial', { ok: result.totalAgregadas, failed: result.totalFallidas })
        );
      } else {
        toast.error(t('detail.errorAddingStop'));
      }
      closeAddStopModal();
      await onRefetch();
    } catch (err) {
      showApiError(err, t('detail.errorAddingStop'));
    } finally {
      setBatchAddingStops(false);
    }
  };

  const handleDeleteStop = async (detalleId: number) => {
    try {
      await routeService.deleteParada(route.id, detalleId);
      toast.success(t('detail.stopDeleted'));
      setSelectedStopIds((prev) => {
        const next = new Set(prev);
        next.delete(detalleId);
        return next;
      });
      await onRefetch();
    } catch (err) {
      showApiError(err, t('detail.errorDeletingStop'));
    }
  };

  const toggleStopSelected = (detalleId: number) => {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      if (next.has(detalleId)) next.delete(detalleId);
      else next.add(detalleId);
      return next;
    });
  };

  const handleRemoveSelectedStops = async () => {
    const ids = Array.from(selectedStopIds);
    if (ids.length === 0) return;
    setBatchRemovingStops(true);
    try {
      const result = await routeService.removeParadasBatch(route.id, ids);
      setSelectedStopIds(new Set());
      if (result.totalRemovidas > 0 && result.totalFallidas === 0) {
        toast.success(t('detail.stopsBatchRemoved', { count: result.totalRemovidas }));
      } else if (result.totalRemovidas > 0 && result.totalFallidas > 0) {
        toast.success(
          t('detail.stopsBatchRemovedPartial', {
            ok: result.totalRemovidas,
            failed: result.totalFallidas,
          })
        );
      } else {
        toast.error(t('detail.errorDeletingStop'));
      }
      await onRefetch();
    } catch (err) {
      showApiError(err, t('detail.errorDeletingStop'));
    } finally {
      setBatchRemovingStops(false);
    }
  };

  const handleMoveStop = async (stop: RouteStop, direction: 'up' | 'down') => {
    const sorted = [...route.detalles].sort((a, b) => a.ordenVisita - b.ordenVisita);
    const idx = sorted.findIndex((s) => s.id === stop.id);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === sorted.length - 1)) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const newOrder = sorted.map((s) => s.id);
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    try {
      await routeService.reorderParadas(route.id, newOrder);
      await onRefetch();
    } catch (err) {
      showApiError(err, t('detail.errorReordering'));
    }
  };

  const getParadaBadge = (estado: number) => {
    switch (estado) {
      case 0: return { label: t('detail.stopPending'), cls: 'bg-surface-3 text-foreground/70' };
      case 1: return { label: t('detail.stopEnRoute'), cls: 'bg-blue-100 text-blue-600' };
      case 2: return { label: t('detail.stopVisited'), cls: 'bg-green-100 text-green-600' };
      case 3: return { label: t('detail.stopSkipped'), cls: 'bg-red-100 text-red-600' };
      default: return { label: t('status.unknown'), cls: 'bg-surface-3 text-foreground/70' };
    }
  };

  // Pagination
  const totalPagesStops = Math.max(1, Math.ceil(sortedStops.length / STOPS_PER_PAGE));
  const safeStopsPage = Math.min(stopsPage, totalPagesStops);
  const startIdxStops = (safeStopsPage - 1) * STOPS_PER_PAGE;
  const pageStops = sortedStops.slice(startIdxStops, startIdxStops + STOPS_PER_PAGE);
  const allStopsOnPageSelected = pageStops.length > 0 && pageStops.every((s) => selectedStopIds.has(s.id));

  const toggleSelectAllStopsOnPage = () => {
    setSelectedStopIds((prev) => {
      const next = new Set(prev);
      if (allStopsOnPageSelected) pageStops.forEach((s) => next.delete(s.id));
      else pageStops.forEach((s) => next.add(s.id));
      return next;
    });
  };

  // Available clients (filtered + grouped suggested vs other)
  const availableClientsAll = clientsRaw.filter((c) => !assignedClientIds.has(c.value));
  const suggestedClients = routeZonaIds.size > 0
    ? availableClientsAll.filter((c) => c.zoneId != null && routeZonaIds.has(c.zoneId))
    : [];
  const otherClients = routeZonaIds.size > 0
    ? availableClientsAll.filter((c) => c.zoneId == null || !routeZonaIds.has(c.zoneId))
    : availableClientsAll;
  const groupedClientOptions: { value: string; label: string; isDivider?: boolean }[] = [];
  if (suggestedClients.length > 0) {
    groupedClientOptions.push({ value: '__divider_suggested', label: `── ${t('detail.suggestedFromZones')} ──`, isDivider: true });
    groupedClientOptions.push(...suggestedClients.map(({ value, label }) => ({ value, label })));
  }
  if (otherClients.length > 0) {
    if (suggestedClients.length > 0) {
      groupedClientOptions.push({ value: '__divider_other', label: `── ${t('detail.otherZones')} ──`, isDivider: true });
    }
    groupedClientOptions.push(...otherClients.map(({ value, label }) => ({ value, label })));
  }
  const availableClients = groupedClientOptions;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          {t('columns.stops')} ({route.totalParadas})
        </h2>
        <div className="flex items-center gap-2">
          {isEditable && selectedStopIds.size > 0 && (
            <button
              onClick={handleRemoveSelectedStops}
              disabled={batchRemovingStops}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {batchRemovingStops ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {t('detail.removeSelectedCount', { count: selectedStopIds.size })}
            </button>
          )}
          {isEditable && sortedStops.length > 0 && (
            <button
              onClick={() => setIsAddStopOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('detail.addStop')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center gap-3 bg-surface-1 px-4 h-10 border-b border-border-subtle">
          {isEditable && sortedStops.length > 0 && (
            <div className="w-[28px] flex items-center justify-center">
              <input
                type="checkbox"
                checked={allStopsOnPageSelected}
                onChange={toggleSelectAllStopsOnPage}
                aria-label={t('detail.selectAll')}
                className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
              />
            </div>
          )}
          <div className="w-[50px] text-xs font-semibold text-foreground/70 text-center">#</div>
          <div className="flex-1 min-w-[160px] text-xs font-semibold text-foreground/70">{t('detail.client')}</div>
          <div className="w-[200px] text-xs font-semibold text-foreground/70">{tc('address')}</div>
          <div className="w-[60px] text-xs font-semibold text-foreground/70 text-center">{t('detail.minutes')}</div>
          <div className="w-[90px] text-xs font-semibold text-foreground/70 text-center">{t('columns.status')}</div>
          {isEditable && (
            <div className="w-[90px] text-xs font-semibold text-foreground/70 text-center">{tc('actions')}</div>
          )}
        </div>

        {/* Table Body */}
        {sortedStops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <MapPin className="w-12 h-12 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground/80 mb-1">{t('detail.noStops')}</p>
            <p className="text-xs text-muted-foreground mb-3">{t('detail.addClientsHint')}</p>
            {isEditable && (
              <button
                onClick={() => setIsAddStopOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('detail.addStop')}
              </button>
            )}
          </div>
        ) : (
          <>
            {pageStops.map((stop) => {
              const idxAbs = sortedStops.findIndex((s) => s.id === stop.id);
              const paradaBadge = getParadaBadge(stop.estado);
              const isSelected = selectedStopIds.has(stop.id);
              return (
                <div
                  key={stop.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border-subtle transition-colors ${
                    isSelected ? 'bg-green-50 dark:bg-green-950/30' : 'hover:bg-surface-1'
                  }`}
                >
                  {isEditable && (
                    <div className="w-[28px] flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStopSelected(stop.id)}
                        aria-label={`Seleccionar parada ${stop.id}`}
                        className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                      />
                    </div>
                  )}
                  <div className="w-[50px] text-center">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-surface-3 text-[11px] font-medium text-foreground/70">
                      {stop.ordenVisita}
                    </span>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-[13px] font-medium text-foreground truncate">{stop.clienteNombre}</p>
                    {stop.notas && <p className="text-[11px] text-muted-foreground truncate">{stop.notas}</p>}
                  </div>
                  <div className="w-[200px]">
                    <p className="text-[13px] text-foreground/70 truncate">{stop.clienteDireccion || '-'}</p>
                  </div>
                  <div className="w-[60px] text-center">
                    <span className="text-[13px] text-foreground/70">{stop.duracionEstimadaMinutos || 30}</span>
                  </div>
                  <div className="w-[90px] text-center">
                    <span className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${paradaBadge.cls}`}>
                      {paradaBadge.label}
                    </span>
                  </div>
                  {isEditable && (
                    <div className="w-[90px] flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleMoveStop(stop, 'up')}
                        disabled={idxAbs === 0}
                        className="p-1 text-muted-foreground hover:text-foreground/70 disabled:opacity-30 rounded"
                        title={t('detail.moveUp')}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveStop(stop, 'down')}
                        disabled={idxAbs === sortedStops.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground/70 disabled:opacity-30 rounded"
                        title={t('detail.moveDown')}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStop(stop.id)}
                        className="p-1 text-muted-foreground hover:text-red-600 rounded"
                        title={tc('delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPagesStops > 1 && (
              <div className="flex items-center justify-between px-4 py-2 bg-surface-1 border-t border-border-subtle">
                <span className="text-xs text-muted-foreground">
                  {t('detail.paginationRange', {
                    from: startIdxStops + 1,
                    to: Math.min(startIdxStops + STOPS_PER_PAGE, sortedStops.length),
                    total: sortedStops.length,
                  })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setStopsPage((p) => Math.max(1, p - 1))}
                    disabled={safeStopsPage <= 1}
                    className="px-2 py-1 text-xs font-medium border border-border-subtle rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-2"
                  >
                    {t('detail.previous')}
                  </button>
                  <span className="text-xs text-foreground/70 px-2">
                    {safeStopsPage} / {totalPagesStops}
                  </span>
                  <button
                    onClick={() => setStopsPage((p) => Math.min(totalPagesStops, p + 1))}
                    disabled={safeStopsPage >= totalPagesStops}
                    className="px-2 py-1 text-xs font-medium border border-border-subtle rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-2"
                  >
                    {t('detail.next')}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* AddStop Modal — multi-select */}
      <Modal
        isOpen={isAddStopOpen}
        onClose={() => !batchAddingStops && closeAddStopModal()}
        title={t('detail.addStops', { defaultValue: 'Agregar paradas' })}
        size="lg"
      >
        <div className="space-y-4">
          {routeZonaIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200">
              <span className="mr-1">📍</span>
              {t('detail.zoneInfoNote', {
                zones: routeZonaNombres,
                defaultValue: `Esta ruta cubre las zonas: ${routeZonaNombres}. Te sugerimos clientes de esas zonas arriba, pero puedes agregar clientes de cualquier zona.`,
              })}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={stopSearch}
              onChange={(e) => setStopSearch(e.target.value)}
              placeholder={t('detail.searchClient')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground/80 mb-1">
              {t('detail.estimatedDuration')}
            </label>
            <input
              type="number"
              value={stopForm.duracion}
              onChange={(e) => setStopForm({ duracion: parseInt(e.target.value) || 30 })}
              className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {(() => {
            const filtered = availableClients
              .filter((c) => !c.value.startsWith('__divider'))
              .filter((c) => !assignedClientIds.has(c.value))
              .filter((c) => !stopSearch || c.label.toLowerCase().includes(stopSearch.toLowerCase()));
            const allSelected = filtered.length > 0 && filtered.every((c) => selectedStopClienteIds.has(parseInt(c.value)));
            const toggleSelectAll = () => {
              setSelectedStopClienteIds((prev) => {
                const next = new Set(prev);
                if (allSelected) filtered.forEach((c) => next.delete(parseInt(c.value)));
                else filtered.forEach((c) => next.add(parseInt(c.value)));
                return next;
              });
            };

            return (
              <>
                {filtered.length > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                      />
                      {allSelected ? t('detail.deselectAll') : t('detail.selectAll')}
                    </label>
                    {selectedStopClienteIds.size > 0 && (
                      <span className="text-xs font-medium text-foreground">
                        {t('detail.selectedCount', { count: selectedStopClienteIds.size })}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filtered.map((c) => {
                    const id = parseInt(c.value);
                    const isSelected = selectedStopClienteIds.has(id);
                    return (
                      <label
                        key={c.value}
                        className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                            : 'border-border-subtle hover:bg-surface-1'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStopClienteSelected(id)}
                          className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                        />
                        <span className="text-[13px] text-foreground flex-1">{c.label}</span>
                      </label>
                    );
                  })}
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {t('detail.noClientsAvailable', { defaultValue: 'No hay clientes disponibles' })}
                    </p>
                  )}
                </div>
              </>
            );
          })()}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={closeAddStopModal}
              disabled={batchAddingStops}
              className="px-4 py-2 text-sm font-medium text-foreground/80 border border-border-default rounded-md hover:bg-surface-1 disabled:opacity-50"
            >
              {t('detail.cancel')}
            </button>
            <button
              onClick={handleAddStopsBatch}
              disabled={batchAddingStops || selectedStopClienteIds.size === 0}
              className="px-4 py-2 text-sm font-medium text-success-foreground bg-success rounded-md hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {batchAddingStops && <Loader2 className="w-4 h-4 animate-spin" />}
              {selectedStopClienteIds.size > 0
                ? t('detail.addStopsCount', {
                    count: selectedStopClienteIds.size,
                    defaultValue: `Agregar ${selectedStopClienteIds.size} parada${selectedStopClienteIds.size === 1 ? '' : 's'}`,
                  })
                : t('detail.add')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
