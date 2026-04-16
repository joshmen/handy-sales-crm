'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X as XIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BatchAutocomplete } from './SatAutocomplete';
import { searchCatalogoProdServ, searchCatalogoUnidad } from '@/services/api/billing';
import type { CatalogoProdServItem, CatalogoUnidadItem } from '@/types/billing';

interface BatchAssignModalProps {
  selectedCount: number;
  selectedProductNames?: string[];
  saving: boolean;
  batchProdServ: string;
  batchUnidad: string;
  onBatchProdServChange: (value: string) => void;
  onBatchUnidadChange: (value: string) => void;
  onAssign: () => void;
  onClose: () => void;
}

export function BatchAssignModal({
  selectedCount,
  selectedProductNames,
  saving,
  batchProdServ,
  batchUnidad,
  onBatchProdServChange,
  onBatchUnidadChange,
  onAssign,
  onClose,
}: BatchAssignModalProps) {
  const t = useTranslations('billing.fiscalMapping');
  const tc = useTranslations('common');
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = dialogRef.current?.querySelector('input');
      if (firstInput) firstInput.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-assign-title"
        className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="batch-assign-title" className="text-lg font-semibold text-foreground">{t('batchAssignTitle')}</h3>
          <button onClick={onClose} aria-label={t('close')} className="text-muted-foreground hover:text-foreground">
            <XIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {t('batchAssignDesc', { count: selectedCount })}
        </p>
        {selectedProductNames && selectedProductNames.length > 0 && (
          <div className="mb-4 max-h-24 overflow-y-auto rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {selectedProductNames.length <= 5
              ? selectedProductNames.join(', ')
              : `${selectedProductNames.slice(0, 5).join(', ')} + ${selectedProductNames.length - 5} más`}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('prodServLabel')}
            </label>
            {batchProdServ && (
              <div className="mb-1 px-2 py-1 text-xs font-mono bg-muted rounded border border-border inline-block">
                {batchProdServ}
              </div>
            )}
            <BatchAutocomplete<CatalogoProdServItem>
              value={batchProdServ}
              onChange={onBatchProdServChange}
              searchFn={searchCatalogoProdServ}
              renderLabel={(item: CatalogoProdServItem) => `${item.clave} \u2014 ${item.descripcion}`}
              placeholder={t('searchProdServ')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              {t('unitLabel')}
            </label>
            {batchUnidad && (
              <div className="mb-1 px-2 py-1 text-xs font-mono bg-muted rounded border border-border inline-block">
                {batchUnidad}
              </div>
            )}
            <BatchAutocomplete<CatalogoUnidadItem>
              value={batchUnidad}
              onChange={onBatchUnidadChange}
              searchFn={searchCatalogoUnidad}
              renderLabel={(item: CatalogoUnidadItem) => `${item.clave} \u2014 ${item.nombre}`}
              placeholder={t('searchUnit')}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button
            onClick={onAssign}
            disabled={saving || (!batchProdServ && !batchUnidad)}
            className="bg-success hover:bg-success/90 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t('assign')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
