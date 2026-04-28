'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { useFormatters } from '@/hooks/useFormatters';
import { api } from '@/lib/api';
import { routeService, RutaCargaItem } from '@/services/api/routes';
import type { RouteTabProps, ProductoOption } from './types';

interface CargaTabProps extends RouteTabProps {
  /** Carga compartida con el shell (para que ResumenTab la pueda mostrar en stats). */
  carga: RutaCargaItem[];
  setCarga: (carga: RutaCargaItem[]) => void;
}

/**
 * Tab Carga: agregar productos para venta directa + tabla consolidada de
 * todo lo que viaja en el camión (entregas + ventas). Port simplificado del
 * /manage/[id]/load (la sección Usuario+Efectivo y Pedidos viven en otros tabs).
 */
export function CargaTab({ route, isEditable, onRefetch, carga, setCarga }: CargaTabProps) {
  const tl = useTranslations('routes.load');
  const showApiError = useApiErrorToast();
  const { formatCurrency } = useFormatters();

  // Add product
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<string>('');
  const [cantidadVenta, setCantidadVenta] = useState<string>('1');
  const [precioVenta, setPrecioVenta] = useState<string>('');

  const fetchProductos = useCallback(async () => {
    try {
      const response = await api.get<{ items: ProductoOption[] }>('/productos?pagina=1&tamanoPagina=500');
      setProductos(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const handleAddProducto = async () => {
    if (!selectedProducto || !cantidadVenta) {
      toast.error(tl('selectProductAndQuantity'));
      return;
    }
    try {
      const prod = productos.find((p) => p.id.toString() === selectedProducto);
      await routeService.addProductoVenta(route.id, {
        productoId: parseInt(selectedProducto),
        cantidad: parseInt(cantidadVenta),
        precioUnitario: parseFloat(precioVenta) || prod?.precioBase || 0,
      });
      toast.success(tl('productAdded'));
      setSelectedProducto('');
      setCantidadVenta('1');
      setPrecioVenta('');
      const updated = await routeService.getCarga(route.id);
      setCarga(updated);
      await onRefetch();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || tl('errorAddingProduct'));
    }
  };

  const handleRemoveProducto = async (productoId: number) => {
    try {
      await routeService.removeProductoCarga(route.id, productoId);
      toast.success(tl('productRemoved'));
      const updated = await routeService.getCarga(route.id);
      setCarga(updated);
      await onRefetch();
    } catch (err) {
      showApiError(err, tl('errorRemovingProduct'));
    }
  };

  const totalAsignado = carga.reduce((sum, c) => sum + c.cantidadTotal * c.precioUnitario, 0);

  return (
    <div className="space-y-6">
      {/* Add Products (hidden when read-only) */}
      {isEditable && (
        <div className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{tl('assignProductsForSale')}</h2>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground/80 mb-1">{tl('productLabel')}</label>
              <SearchableSelect
                options={productos.map((p) => ({ value: p.id.toString(), label: `${p.nombre} (${p.codigoBarra})` }))}
                value={selectedProducto}
                onChange={(val) => {
                  setSelectedProducto(val ? String(val) : '');
                  const prod = productos.find((p) => p.id.toString() === String(val));
                  if (prod) setPrecioVenta(prod.precioBase.toString());
                }}
                placeholder={tl('searchProduct')}
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-foreground/80 mb-1">{tl('quantity')}</label>
              <input
                type="number"
                value={cantidadVenta}
                onChange={(e) => setCantidadVenta(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-foreground/80 mb-1">{tl('price')}</label>
              <input
                type="number"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleAddProducto}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {tl('add')}
            </button>
          </div>
        </div>
      )}

      {/* Consolidated Table */}
      <div className="bg-surface-2 border border-border-subtle rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">{tl('totalAssignedToRoute')}</h2>

        {carga.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">{tl('noProductsLoaded')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnProduct')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnDeliveryAssigned')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnSaleAssigned')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnTotal')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnAvailable')}</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnPrice')}</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-foreground/70">{tl('columnTotalAmount')}</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {carga.map((item) => (
                  <tr key={item.id} className="border-b border-border-subtle hover:bg-surface-1">
                    <td className="py-2 px-3">
                      <span className="text-[13px] text-foreground">{item.productoNombre}</span>
                      {item.productoSku && (
                        <span className="text-[10px] text-muted-foreground ml-2">{item.productoSku}</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-[13px] text-foreground/70">{item.cantidadEntrega}</td>
                    <td className="py-2 px-3 text-center text-[13px] text-foreground/70">{item.cantidadVenta}</td>
                    <td className="py-2 px-3 text-center text-[13px] font-medium text-foreground">{item.cantidadTotal}</td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`text-[13px] ${
                          (item.disponible ?? 0) < item.cantidadTotal ? 'text-red-600 font-medium' : 'text-foreground/70'
                        }`}
                      >
                        {item.disponible ?? '-'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-[13px] text-foreground/70">{formatCurrency(item.precioUnitario)}</td>
                    <td className="py-2 px-3 text-right text-[13px] font-medium text-foreground">
                      {formatCurrency(item.cantidadTotal * item.precioUnitario)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {isEditable && (
                        <button
                          onClick={() => handleRemoveProducto(item.productoId)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-subtle">
                  <td colSpan={3} className="py-2 px-3 text-right text-xs font-semibold text-foreground/70">
                    {tl('totalsLabel')}
                  </td>
                  <td className="py-2 px-3 text-center text-[13px] font-bold text-foreground">
                    {carga.reduce((s, c) => s + c.cantidadTotal, 0)}
                  </td>
                  <td></td>
                  <td></td>
                  <td className="py-2 px-3 text-right text-[13px] font-bold text-green-600">{formatCurrency(totalAsignado)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
