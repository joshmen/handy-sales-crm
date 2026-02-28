'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

interface UseBatchOperationsOptions {
  visibleIds: number[];
  clearDeps?: unknown[];
}

export function useBatchOperations({ visibleIds, clearDeps = [] }: UseBatchOperationsOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchAction, setBatchAction] = useState<'activate' | 'deactivate'>('deactivate');
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);

  const allVisibleSelected = useMemo(
    () => visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );
  const someVisibleSelected = useMemo(
    () => visibleIds.some(id => selectedIds.has(id)),
    [visibleIds, selectedIds]
  );
  const selectedCount = selectedIds.size;

  // Clear selection when filters/page change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setSelectedIds(new Set()); }, clearDeps);

  const handleToggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelectAllVisible = useCallback(() => {
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
  }, [visibleIds, selectedIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const openBatchAction = useCallback((action: 'activate' | 'deactivate') => {
    setBatchAction(action);
    setIsBatchConfirmOpen(true);
  }, []);

  const closeBatchConfirm = useCallback(() => {
    setIsBatchConfirmOpen(false);
  }, []);

  const completeBatch = useCallback(() => {
    setIsBatchConfirmOpen(false);
    setSelectedIds(new Set());
    setBatchLoading(false);
  }, []);

  return {
    selectedIds,
    batchAction,
    isBatchConfirmOpen,
    batchLoading,
    allVisibleSelected,
    someVisibleSelected,
    selectedCount,
    handleToggleSelect,
    handleSelectAllVisible,
    handleClearSelection,
    openBatchAction,
    closeBatchConfirm,
    completeBatch,
    setBatchLoading,
  };
}
