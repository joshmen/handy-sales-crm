'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Check, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { MapeoFiscalProducto } from '@/types/billing';

interface MappedProductsTableProps {
  mappings: MapeoFiscalProducto[];
  loading: boolean;
  selectedIds: Set<number>;
  mappingsPage: number;
  mappingsTotalPages: number;
  onToggleSelect: (id: number) => void;
  onEdit: (product: {
    productoId: number;
    nombre: string;
    codigoBarra?: string;
    unidad?: string;
    currentProdServ?: string;
    currentUnidad?: string;
    hasMapping: boolean;
  }) => void;
  onDelete: (productoId: number) => void;
  onSetMappingsPage: (updater: (p: number) => number) => void;
}

export function MappedProductsTable({
  mappings,
  loading,
  selectedIds,
  mappingsPage,
  mappingsTotalPages,
  onToggleSelect,
  onEdit,
  onDelete,
  onSetMappingsPage,
}: MappedProductsTableProps) {
  return (
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
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mappings.map(m => (
              <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar producto ${m.productoId}`}
                    checked={selectedIds.has(m.productoId)}
                    onChange={() => onToggleSelect(m.productoId)}
                    className="rounded border-border text-green-600 focus:ring-green-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium tabular-nums">{m.productoId}</span>
                  {m.productoNombre && (
                    <span className="ml-2 text-muted-foreground text-xs">{m.productoNombre}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted font-mono text-sm">
                    {m.claveProdServ}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted font-mono text-sm">
                    {m.claveUnidad}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {m.descripcionFiscal || '\u2014'}
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
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit({
                        productoId: m.productoId,
                        nombre: m.productoNombre || 'Producto #' + m.productoId,
                        currentProdServ: m.claveProdServ,
                        currentUnidad: m.claveUnidad,
                        hasMapping: true,
                      })}
                      className="p-1.5 rounded-md hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
                      aria-label={`Editar mapeo de ${m.productoNombre || m.productoId}`}
                      title="Editar mapeo"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(m.productoId)}
                      className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
                      aria-label={`Eliminar mapeo de ${m.productoNombre || m.productoId}`}
                      title="Eliminar mapeo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {mappings.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
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
                onChange={() => onToggleSelect(m.productoId)}
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
                <span className="block font-mono text-sm px-2 py-0.5 rounded bg-muted w-fit">
                  {m.claveProdServ}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Unidad:</span>
                <span className="block font-mono text-sm px-2 py-0.5 rounded bg-muted w-fit">
                  {m.claveUnidad}
                </span>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => onEdit({
                  productoId: m.productoId,
                  nombre: m.productoNombre || 'Producto #' + m.productoId,
                  currentProdServ: m.claveProdServ,
                  currentUnidad: m.claveUnidad,
                  hasMapping: true,
                })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-amber-50 dark:hover:bg-amber-900/20 text-muted-foreground hover:text-amber-600 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Editar
              </button>
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
              onClick={() => onSetMappingsPage(p => Math.max(1, p - 1))}
              disabled={mappingsPage <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetMappingsPage(p => Math.min(mappingsTotalPages, p + 1))}
              disabled={mappingsPage >= mappingsTotalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
