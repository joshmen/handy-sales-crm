'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AutocompleteDropdown } from './SatAutocomplete';
import { searchCatalogoProdServ, searchCatalogoUnidad } from '@/services/api/billing';
import type { MapeoFiscalProducto, CatalogoProdServItem, CatalogoUnidadItem } from '@/types/billing';

export interface EditingCell {
  productoId: number;
  field: 'claveProdServ' | 'claveUnidad';
}

interface MappedProductsTableProps {
  mappings: MapeoFiscalProducto[];
  loading: boolean;
  selectedIds: Set<number>;
  editingCell: EditingCell | null;
  mappingsPage: number;
  mappingsTotalPages: number;
  onToggleSelect: (id: number) => void;
  onSetEditingCell: (cell: EditingCell | null) => void;
  onInlineSelect: (
    productoId: number,
    field: 'claveProdServ' | 'claveUnidad',
    clave: string,
    existingMapping?: MapeoFiscalProducto,
  ) => void;
  onSetMappingsPage: (updater: (p: number) => number) => void;
}

export function MappedProductsTable({
  mappings,
  loading,
  selectedIds,
  editingCell,
  mappingsPage,
  mappingsTotalPages,
  onToggleSelect,
  onSetEditingCell,
  onInlineSelect,
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
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripcion Fiscal</th>
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
                    onChange={() => onToggleSelect(m.productoId)}
                    className="rounded border-border text-green-600 focus:ring-green-500"
                  />
                </td>
                <td className="px-4 py-3 font-medium tabular-nums">{m.productoId}</td>
                <td className="px-4 py-3">
                  {editingCell?.productoId === m.productoId && editingCell.field === 'claveProdServ' ? (
                    <AutocompleteDropdown<CatalogoProdServItem>
                      value={m.claveProdServ}
                      onSelect={item => onInlineSelect(m.productoId, 'claveProdServ', item.clave, m)}
                      onClose={() => onSetEditingCell(null)}
                      searchFn={searchCatalogoProdServ}
                      renderLabel={item => item.descripcion}
                      placeholder="Buscar clave..."
                    />
                  ) : (
                    <button
                      onClick={() => onSetEditingCell({ productoId: m.productoId, field: 'claveProdServ' })}
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
                      onSelect={item => onInlineSelect(m.productoId, 'claveUnidad', item.clave, m)}
                      onClose={() => onSetEditingCell(null)}
                      searchFn={searchCatalogoUnidad}
                      renderLabel={item => item.nombre}
                      placeholder="Buscar unidad..."
                    />
                  ) : (
                    <button
                      onClick={() => onSetEditingCell({ productoId: m.productoId, field: 'claveUnidad' })}
                      className="font-mono text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors cursor-pointer"
                      title="Click para editar"
                    >
                      {m.claveUnidad}
                    </button>
                  )}
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
                <button
                  onClick={() => onSetEditingCell({ productoId: m.productoId, field: 'claveProdServ' })}
                  className="block font-mono text-green-600 dark:text-green-400"
                >
                  {m.claveProdServ}
                </button>
                {editingCell?.productoId === m.productoId && editingCell.field === 'claveProdServ' && (
                  <AutocompleteDropdown<CatalogoProdServItem>
                    value={m.claveProdServ}
                    onSelect={item => onInlineSelect(m.productoId, 'claveProdServ', item.clave, m)}
                    onClose={() => onSetEditingCell(null)}
                    searchFn={searchCatalogoProdServ}
                    renderLabel={item => item.descripcion}
                    placeholder="Buscar clave..."
                  />
                )}
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Unidad:</span>
                <button
                  onClick={() => onSetEditingCell({ productoId: m.productoId, field: 'claveUnidad' })}
                  className="block font-mono text-green-600 dark:text-green-400"
                >
                  {m.claveUnidad}
                </button>
                {editingCell?.productoId === m.productoId && editingCell.field === 'claveUnidad' && (
                  <AutocompleteDropdown<CatalogoUnidadItem>
                    value={m.claveUnidad}
                    onSelect={item => onInlineSelect(m.productoId, 'claveUnidad', item.clave, m)}
                    onClose={() => onSetEditingCell(null)}
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
            Pagina {mappingsPage} de {mappingsTotalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetMappingsPage(p => Math.max(1, p - 1))}
              disabled={mappingsPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetMappingsPage(p => Math.min(mappingsTotalPages, p + 1))}
              disabled={mappingsPage >= mappingsTotalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
