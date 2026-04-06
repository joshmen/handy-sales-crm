'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X as XIcon, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { BatchAutocomplete } from './SatAutocomplete';
import { searchCatalogoProdServ, searchCatalogoUnidad } from '@/services/api/billing';
import type { CatalogoProdServItem, CatalogoUnidadItem } from '@/types/billing';

export interface EditingProduct {
  productoId: number;
  nombre: string;
  codigoBarra?: string;
  unidad?: string;
  currentProdServ?: string;
  currentUnidad?: string;
  hasMapping: boolean;
}

interface MapeoEditModalProps {
  product: EditingProduct;
  onSave: (productoId: number, claveProdServ: string, claveUnidad: string) => Promise<void>;
  onDelete: (productoId: number) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

export function MapeoEditModal({ product, onSave, onDelete, onClose, saving }: MapeoEditModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [claveProdServ, setClaveProdServ] = useState(product.currentProdServ || '');
  const [claveUnidad, setClaveUnidad] = useState(product.currentUnidad || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const canSave = claveProdServ.trim() && claveUnidad.trim();
  const hasChanges = claveProdServ !== (product.currentProdServ || '') || claveUnidad !== (product.currentUnidad || '');

  const handleClose = () => {
    if (hasChanges) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleCloseRef = useRef(handleClose);
  handleCloseRef.current = handleClose;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus first input
  useEffect(() => {
    const timer = setTimeout(() => {
      const firstInput = dialogRef.current?.querySelector<HTMLElement>('input');
      firstInput?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={handleClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mapeo-edit-title"
        className="bg-card border border-border rounded-xl p-6 w-full max-w-md mx-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <h3 id="mapeo-edit-title" className="text-lg font-semibold text-foreground">Mapeo Fiscal</h3>
          <button onClick={handleClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground p-1">
            <XIcon className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Product info */}
        <div className="mb-5 rounded-lg bg-muted/50 border border-border px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">{product.nombre}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {product.codigoBarra && <span>Código: {product.codigoBarra}</span>}
            {product.unidad && <span>Unidad: {product.unidad}</span>}
          </div>
        </div>

        {/* Clave ProdServ SAT */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Clave ProdServ SAT *
          </label>
          {claveProdServ && (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded border border-green-200 dark:border-green-800">
                {claveProdServ}
              </span>
              <button
                onClick={() => setClaveProdServ('')}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Quitar clave ProdServ"
              >
                Cambiar
              </button>
            </div>
          )}
          {!claveProdServ && (
            <BatchAutocomplete<CatalogoProdServItem>
              value={claveProdServ}
              onChange={setClaveProdServ}
              searchFn={searchCatalogoProdServ}
              renderLabel={(item: CatalogoProdServItem) => `${item.clave} — ${item.descripcion}`}
              placeholder="Buscar clave ProdServ..."
            />
          )}
        </div>

        {/* Clave Unidad SAT */}
        <div className="mb-6">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Clave Unidad SAT *
          </label>
          {claveUnidad && (
            <div className="mb-1.5 flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded border border-green-200 dark:border-green-800">
                {claveUnidad}
              </span>
              <button
                onClick={() => setClaveUnidad('')}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label="Quitar clave unidad"
              >
                Cambiar
              </button>
            </div>
          )}
          {!claveUnidad && (
            <BatchAutocomplete<CatalogoUnidadItem>
              value={claveUnidad}
              onChange={setClaveUnidad}
              searchFn={searchCatalogoUnidad}
              renderLabel={(item: CatalogoUnidadItem) => `${item.clave} — ${item.nombre}`}
              placeholder="Buscar clave unidad..."
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          {/* Delete */}
          <div>
            {product.hasMapping && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar mapeo
              </button>
            )}
            {product.hasMapping && confirmDelete && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDelete(product.productoId)}
                  disabled={saving}
                  className="text-xs font-medium text-red-600 hover:text-red-700"
                >
                  {saving ? 'Eliminando...' : 'Confirmar eliminar'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Save / Cancel */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={() => onSave(product.productoId, claveProdServ, claveUnidad)}
              disabled={saving || !canSave || (!hasChanges && product.hasMapping)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
        </div>
      </div>

      {/* Confirm discard changes */}
      {confirmDiscard && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setConfirmDiscard(false)}>
          <div className="bg-card border border-border rounded-xl p-5 w-full max-w-sm mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
            <h4 className="text-sm font-semibold text-foreground mb-2">Cambios sin guardar</h4>
            <p className="text-sm text-muted-foreground mb-4">Tienes cambios sin guardar. ¿Deseas descartarlos?</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDiscard(false)}>
                Seguir editando
              </Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={onClose}>
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
