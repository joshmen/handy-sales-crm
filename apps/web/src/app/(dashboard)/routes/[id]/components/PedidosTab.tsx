'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Package, Loader2, Search } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { Modal } from '@/components/ui/Modal';
import { useFormatters } from '@/hooks/useFormatters';
import { api } from '@/lib/api';
import { routeService } from '@/services/api/routes';
import type { RouteTabPropsWithPedidos, PedidoOption } from './types';

const ASSIGNED_PER_PAGE = 10;

/**
 * Tab Pedidos: tabla de pedidos asignados (preventa) + modal para agregar.
 * Self-contained: maneja paginación, multi-select, y batch operations.
 */
export function PedidosTab({ route, isEditable, onRefetch, pedidos, setPedidos }: RouteTabPropsWithPedidos) {
  const t = useTranslations('routes');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();
  const { formatCurrency } = useFormatters();

  // Pagination + selection
  const [assignedPage, setAssignedPage] = useState(1);
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<Set<number>>(new Set());
  const [batchRemoving, setBatchRemoving] = useState(false);

  // AddPedido modal state
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [availablePedidos, setAvailablePedidos] = useState<PedidoOption[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [pedidoSearch, setPedidoSearch] = useState('');
  const [selectedPedidoIds, setSelectedPedidoIds] = useState<Set<number>>(new Set());
  const [batchAssigning, setBatchAssigning] = useState(false);

  const handleOpenAddPedido = async () => {
    setIsPedidoModalOpen(true);
    setPedidoSearch('');
    setLoadingPedidos(true);
    try {
      const [confirmedRes, enProcesoRes] = await Promise.all([
        api.get<{ items: PedidoOption[] }>('/pedidos?pagina=1&tamanoPagina=100&estado=Confirmado&excluirAsignadosARutas=true'),
        api.get<{ items: PedidoOption[] }>('/pedidos?pagina=1&tamanoPagina=100&estado=EnProceso&excluirAsignadosARutas=true'),
      ]);
      const confirmed = Array.isArray(confirmedRes.data) ? confirmedRes.data : confirmedRes.data.items || [];
      const enProceso = Array.isArray(enProcesoRes.data) ? enProcesoRes.data : enProcesoRes.data.items || [];
      const all = [...confirmed, ...enProceso];
      const assignedIds = new Set(pedidos.map((p) => p.pedidoId));
      setAvailablePedidos(all.filter((p) => !assignedIds.has(p.id)));
    } catch {
      toast.error(t('detail.errorLoadingOrders'));
    } finally {
      setLoadingPedidos(false);
    }
  };

  const togglePedidoSelected = (pedidoId: number) => {
    setSelectedPedidoIds((prev) => {
      const next = new Set(prev);
      if (next.has(pedidoId)) next.delete(pedidoId);
      else next.add(pedidoId);
      return next;
    });
  };

  const closePedidoModal = () => {
    setIsPedidoModalOpen(false);
    setSelectedPedidoIds(new Set());
    setPedidoSearch('');
  };

  const handleAssignSelectedPedidos = async () => {
    const ids = Array.from(selectedPedidoIds);
    if (ids.length === 0) return;
    setBatchAssigning(true);
    try {
      const result = await routeService.addPedidosBatch(route.id, ids);
      const pedidosData = await routeService.getPedidosAsignados(route.id);
      setPedidos(pedidosData);

      if (result.totalAsignados > 0 && result.totalFallidos === 0) {
        toast.success(t('detail.ordersBatchAssigned', { count: result.totalAsignados }));
      } else if (result.totalAsignados > 0 && result.totalFallidos > 0) {
        toast.success(t('detail.ordersBatchPartial', { ok: result.totalAsignados, failed: result.totalFallidos }));
      } else {
        toast.error(t('detail.errorAssigningOrder'));
      }
      closePedidoModal();
    } catch (err) {
      showApiError(err, t('detail.errorAssigningOrder'));
    } finally {
      setBatchAssigning(false);
    }
  };

  const handleRemovePedido = async (pedidoId: number) => {
    try {
      await routeService.removePedido(route.id, pedidoId);
      toast.success(t('detail.orderRemoved'));
      const pedidosData = await routeService.getPedidosAsignados(route.id);
      setPedidos(pedidosData);
      setSelectedAssignedIds((prev) => {
        const next = new Set(prev);
        next.delete(pedidoId);
        return next;
      });
    } catch (err) {
      showApiError(err, t('detail.errorRemovingOrder'));
    }
  };

  const toggleAssignedSelected = (pedidoId: number) => {
    setSelectedAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pedidoId)) next.delete(pedidoId);
      else next.add(pedidoId);
      return next;
    });
  };

  const handleRemoveSelectedPedidos = async () => {
    const ids = Array.from(selectedAssignedIds);
    if (ids.length === 0) return;
    setBatchRemoving(true);
    try {
      const result = await routeService.removePedidosBatch(route.id, ids);
      const pedidosData = await routeService.getPedidosAsignados(route.id);
      setPedidos(pedidosData);
      setSelectedAssignedIds(new Set());

      if (result.totalRemovidos > 0 && result.totalFallidos === 0) {
        toast.success(t('detail.ordersBatchRemoved', { count: result.totalRemovidos }));
      } else if (result.totalRemovidos > 0 && result.totalFallidos > 0) {
        toast.success(t('detail.ordersBatchRemovedPartial', {
          ok: result.totalRemovidos,
          failed: result.totalFallidos,
        }));
      } else {
        toast.error(t('detail.errorRemovingOrder'));
      }
    } catch (err) {
      showApiError(err, t('detail.errorRemovingOrder'));
    } finally {
      setBatchRemoving(false);
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(pedidos.length / ASSIGNED_PER_PAGE));
  const safePage = Math.min(assignedPage, totalPages);
  const startIdx = (safePage - 1) * ASSIGNED_PER_PAGE;
  const pagePedidos = pedidos.slice(startIdx, startIdx + ASSIGNED_PER_PAGE);
  const allOnPageSelected = pagePedidos.length > 0 && pagePedidos.every((p) => selectedAssignedIds.has(p.pedidoId));

  const toggleSelectAllOnPage = () => {
    setSelectedAssignedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pagePedidos.forEach((p) => next.delete(p.pedidoId));
      else pagePedidos.forEach((p) => next.add(p.pedidoId));
      return next;
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">{t('detail.assignedOrders')}</h2>
          <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
            {pedidos.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isEditable && selectedAssignedIds.size > 0 && (
            <button
              onClick={handleRemoveSelectedPedidos}
              disabled={batchRemoving}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {batchRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              {t('detail.removeSelectedCount', { count: selectedAssignedIds.size })}
            </button>
          )}
          {isEditable && pedidos.length > 0 && (
            <button
              onClick={handleOpenAddPedido}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('detail.assignOrder')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-2 border border-border-subtle rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 bg-surface-1 px-4 h-10 border-b border-border-subtle">
          {isEditable && pedidos.length > 0 && (
            <div className="w-[28px] flex items-center justify-center">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                onChange={toggleSelectAllOnPage}
                aria-label={t('detail.selectAll')}
                className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
              />
            </div>
          )}
          <div className="w-[100px] text-xs font-semibold text-foreground/70">{t('detail.orderNumber')}</div>
          <div className="flex-1 min-w-[160px] text-xs font-semibold text-foreground/70">{t('detail.client')}</div>
          <div className="w-[120px] text-xs font-semibold text-foreground/70 text-right">{t('detail.amount')}</div>
          <div className="w-[60px] text-xs font-semibold text-foreground/70 text-center">{t('detail.products')}</div>
          <div className="w-[110px] text-xs font-semibold text-foreground/70 text-center">{t('columns.status')}</div>
          {isEditable && (
            <div className="w-[70px] text-xs font-semibold text-foreground/70 text-center">{tc('actions')}</div>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/60 mb-3" />
            <p className="text-sm font-medium text-foreground/80 mb-1">{t('detail.noOrders')}</p>
            <p className="text-xs text-muted-foreground mb-3">{t('detail.assignConfirmedOrders')}</p>
            {isEditable && (
              <button
                onClick={handleOpenAddPedido}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('detail.assignOrder')}
              </button>
            )}
          </div>
        ) : (
          <>
            {pagePedidos.map((p) => {
              const isSelected = selectedAssignedIds.has(p.pedidoId);
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-border-subtle transition-colors ${
                    isSelected ? 'bg-green-50 dark:bg-green-950/30' : 'hover:bg-surface-1'
                  }`}
                >
                  {isEditable && (
                    <div className="w-[28px] flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleAssignedSelected(p.pedidoId)}
                        aria-label={`Seleccionar pedido ${p.pedidoId}`}
                        className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                      />
                    </div>
                  )}
                  <div className="w-[100px]">
                    <span className="text-[13px] font-medium text-foreground">#{p.pedidoId}</span>
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-[13px] font-medium text-foreground truncate">{p.clienteNombre}</p>
                  </div>
                  <div className="w-[120px] text-right">
                    <span className="text-[13px] text-foreground/70">{formatCurrency(p.montoTotal)}</span>
                  </div>
                  <div className="w-[60px] text-center">
                    <span className="text-[13px] text-foreground/70">{p.totalProductos}</span>
                  </div>
                  <div className="w-[110px] text-center">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-green-100 text-green-600">
                      {p.estadoNombre}
                    </span>
                  </div>
                  {isEditable && (
                    <div className="w-[70px] flex items-center justify-center">
                      <button
                        onClick={() => handleRemovePedido(p.pedidoId)}
                        className="p-1 text-muted-foreground hover:text-red-600 rounded"
                        title={t('detail.removeOrder')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-2 bg-surface-1 border-t border-border-subtle">
                <span className="text-xs text-muted-foreground">
                  {t('detail.paginationRange', {
                    from: startIdx + 1,
                    to: Math.min(startIdx + ASSIGNED_PER_PAGE, pedidos.length),
                    total: pedidos.length,
                  })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setAssignedPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="px-2 py-1 text-xs font-medium border border-border-subtle rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-2"
                  >
                    {t('detail.previous')}
                  </button>
                  <span className="text-xs text-foreground/70 px-2">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setAssignedPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
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

      {/* AddPedido Modal */}
      <Modal isOpen={isPedidoModalOpen} onClose={closePedidoModal} title={t('detail.assignOrderToRoute')} size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={pedidoSearch}
              onChange={(e) => setPedidoSearch(e.target.value)}
              placeholder={t('detail.searchOrderPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {loadingPedidos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (() => {
            const filteredPedidos = availablePedidos.filter((p) => {
              if (!pedidoSearch) return true;
              const search = pedidoSearch.toLowerCase();
              return (
                p.numeroPedido?.toLowerCase().includes(search) ||
                p.clienteNombre?.toLowerCase().includes(search) ||
                p.id.toString().includes(search)
              );
            });
            const allSelected = filteredPedidos.length > 0 && filteredPedidos.every((p) => selectedPedidoIds.has(p.id));

            const toggleSelectAll = () => {
              setSelectedPedidoIds((prev) => {
                const next = new Set(prev);
                if (allSelected) filteredPedidos.forEach((p) => next.delete(p.id));
                else filteredPedidos.forEach((p) => next.add(p.id));
                return next;
              });
            };

            return (
              <>
                {filteredPedidos.length > 0 && (
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
                    {selectedPedidoIds.size > 0 && (
                      <span className="text-xs font-medium text-foreground">
                        {t('detail.selectedCount', { count: selectedPedidoIds.size })}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredPedidos.map((p) => {
                    const isSelected = selectedPedidoIds.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                            : 'border-border-subtle hover:bg-surface-1'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePedidoSelected(p.id)}
                          className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <span className="text-[13px] font-medium text-foreground">
                            #{p.numeroPedido || p.id}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {p.clienteNombre || t('detail.noClient')}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {formatCurrency(p.total || 0)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                  {filteredPedidos.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      {t('detail.noConfirmedOrders')}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={closePedidoModal}
                    disabled={batchAssigning}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-border-subtle bg-surface-1 text-foreground hover:bg-surface-2 disabled:opacity-50"
                  >
                    {t('detail.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignSelectedPedidos}
                    disabled={selectedPedidoIds.size === 0 || batchAssigning}
                    className="px-4 py-1.5 text-xs font-medium rounded bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {batchAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                    {selectedPedidoIds.size > 0
                      ? t('detail.assignSelectedCount', { count: selectedPedidoIds.size })
                      : t('detail.assignSelected')}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>
    </div>
  );
}
