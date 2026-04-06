'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BatchAutocomplete } from './SatAutocomplete';
import { searchCatalogoProdServ, searchCatalogoUnidad } from '@/services/api/billing';
import type { CatalogoProdServItem, CatalogoUnidadItem } from '@/types/billing';

interface BatchAssignModalProps {
  selectedCount: number;
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
  saving,
  batchProdServ,
  batchUnidad,
  onBatchProdServChange,
  onBatchUnidadChange,
  onAssign,
  onClose,
}: BatchAssignModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
          <h3 id="batch-assign-title" className="text-lg font-semibold text-foreground">Asignación Masiva</h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
            <XIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Asignar la misma clave SAT a {selectedCount} producto{selectedCount > 1 ? 's' : ''} seleccionado{selectedCount > 1 ? 's' : ''}.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Clave ProdServ SAT
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
              placeholder="Buscar clave ProdServ..."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Clave Unidad SAT
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
              placeholder="Buscar clave unidad..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={onAssign}
            disabled={saving || (!batchProdServ && !batchUnidad)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Asignar
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
