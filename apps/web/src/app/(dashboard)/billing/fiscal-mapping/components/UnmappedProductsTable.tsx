'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Check, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { UnmappedProduct } from '@/types/billing';

interface UnmappedProductsTableProps {
  unmapped: UnmappedProduct[];
  loading: boolean;
  selectedIds: Set<number>;
  unmappedPage: number;
  unmappedTotalPages: number;
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
  onSetUnmappedPage: (updater: (p: number) => number) => void;
}

export function UnmappedProductsTable({
  unmapped,
  loading,
  selectedIds,
  unmappedPage,
  unmappedTotalPages,
  onToggleSelect,
  onEdit,
  onSetUnmappedPage,
}: UnmappedProductsTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="w-10 px-4 py-3" />
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Producto</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Código de Barras</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unidad</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave ProdServ SAT</th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clave Unidad SAT</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Estado</th>
              <th className="text-center px-4 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {unmapped.map(u => (
              <tr key={u.productoId} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Seleccionar ${u.nombre}`}
                    checked={selectedIds.has(u.productoId)}
                    onChange={() => onToggleSelect(u.productoId)}
                    className="rounded border-border text-green-600 focus:ring-green-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{u.nombre}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                  {u.codigoBarra || '\u2014'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.unidadNombre}
                  {u.unidadAbreviatura && (
                    <span className="text-xs ml-1">({u.unidadAbreviatura})</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.claveSatActual ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted font-mono text-sm">
                      {u.claveSatActual}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs">Sin asignar</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.unidadClaveSat ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-muted font-mono text-sm">
                      {u.unidadClaveSat}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 text-xs">Sin asignar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    Sin Mapear
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onEdit({
                      productoId: u.productoId,
                      nombre: u.nombre,
                      codigoBarra: u.codigoBarra ?? undefined,
                      unidad: u.unidadNombre,
                      currentProdServ: u.claveSatActual ?? undefined,
                      currentUnidad: u.unidadClaveSat ?? undefined,
                      hasMapping: false,
                    })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-1"
                    aria-label={`Asignar mapeo a ${u.nombre}`}
                    title="Asignar mapeo fiscal"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    Asignar
                  </button>
                </td>
              </tr>
            ))}
            {unmapped.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
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
                onChange={() => onToggleSelect(u.productoId)}
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
              <p className="text-xs text-muted-foreground font-mono mb-2">Codigo: {u.codigoBarra}</p>
            )}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">ProdServ:</span>
                {u.claveSatActual ? (
                  <span className="block font-mono text-sm px-2 py-0.5 rounded bg-muted w-fit">
                    {u.claveSatActual}
                  </span>
                ) : (
                  <span className="block text-amber-600 dark:text-amber-400 text-xs">Sin asignar</span>
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Unidad:</span>
                {u.unidadClaveSat ? (
                  <span className="block font-mono text-sm px-2 py-0.5 rounded bg-muted w-fit">
                    {u.unidadClaveSat}
                  </span>
                ) : (
                  <span className="block text-amber-600 dark:text-amber-400 text-xs">Sin asignar</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => onEdit({
                  productoId: u.productoId,
                  nombre: u.nombre,
                  codigoBarra: u.codigoBarra ?? undefined,
                  unidad: u.unidadNombre,
                  currentProdServ: u.claveSatActual ?? undefined,
                  currentUnidad: u.unidadClaveSat ?? undefined,
                  hasMapping: false,
                })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-green-50 dark:hover:bg-green-900/20 text-muted-foreground hover:text-green-600 transition-colors"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Asignar
              </button>
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
              onClick={() => onSetUnmappedPage(p => Math.max(1, p - 1))}
              disabled={unmappedPage <= 1}
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetUnmappedPage(p => Math.min(unmappedTotalPages, p + 1))}
              disabled={unmappedPage >= unmappedTotalPages}
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
