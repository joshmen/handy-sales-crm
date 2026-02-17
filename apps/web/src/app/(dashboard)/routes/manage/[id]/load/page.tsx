'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, RutaCargaItem, PedidoAsignado, ESTADO_RUTA_LABELS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { Modal } from '@/components/ui/Modal';
import {
  Save,
  RefreshCw,
  Loader2,
  Trash2,
  Plus,
  Package,
  Truck,
  DollarSign,
  Send,
  Search,
  User,
} from 'lucide-react';

interface ProductoOption {
  id: number;
  nombre: string;
  codigoBarra: string;
  precioBase: number;
}

export default function LoadInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const rutaId = Number(params.id);

  const [ruta, setRuta] = useState<RouteDetail | null>(null);
  const [carga, setCarga] = useState<RutaCargaItem[]>([]);
  const [pedidos, setPedidos] = useState<PedidoAsignado[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Efectivo
  const [efectivoInicial, setEfectivoInicial] = useState<string>('');
  const [comentarios, setComentarios] = useState('');

  // Add product
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [selectedProducto, setSelectedProducto] = useState<string>('');
  const [cantidadVenta, setCantidadVenta] = useState<string>('1');
  const [precioVenta, setPrecioVenta] = useState<string>('');

  // Add pedido modal
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [availablePedidos, setAvailablePedidos] = useState<any[]>([]);
  const [pedidoSearch, setPedidoSearch] = useState('');
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [rutaData, cargaData, pedidosData] = await Promise.all([
        routeService.getRuta(rutaId),
        routeService.getCarga(rutaId),
        routeService.getPedidosAsignados(rutaId),
      ]);
      setRuta(rutaData);
      setCarga(cargaData);
      setPedidos(pedidosData);
      setEfectivoInicial(rutaData.efectivoInicial?.toString() || '');
      setComentarios(rutaData.comentariosCarga || '');
    } catch (err) {
      console.error('Error:', err);
      toast.error('Error al cargar datos de la ruta');
    } finally {
      setLoading(false);
    }
  }, [rutaId]);

  const fetchProductos = async () => {
    try {
      const response = await api.get<{ items: ProductoOption[] }>('/productos?pagina=1&tamanoPagina=500');
      setProductos(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchProductos();
  }, [fetchData]);

  const handleSaveEfectivo = async () => {
    try {
      setSaving(true);
      await routeService.updateEfectivoInicial(rutaId, parseFloat(efectivoInicial) || 0, comentarios || undefined);
      toast.success('Efectivo inicial actualizado');
    } catch (err) {
      toast.error('Error al guardar efectivo');
    } finally {
      setSaving(false);
    }
  };

  const handleAddProducto = async () => {
    if (!selectedProducto || !cantidadVenta) {
      toast.error('Selecciona un producto y cantidad');
      return;
    }
    try {
      const prod = productos.find(p => p.id.toString() === selectedProducto);
      await routeService.addProductoVenta(rutaId, {
        productoId: parseInt(selectedProducto),
        cantidad: parseInt(cantidadVenta),
        precioUnitario: parseFloat(precioVenta) || prod?.precioBase || 0,
      });
      toast.success('Producto agregado');
      setSelectedProducto('');
      setCantidadVenta('1');
      setPrecioVenta('');
      const updated = await routeService.getCarga(rutaId);
      setCarga(updated);
    } catch (err: any) {
      toast.error(err?.message || 'Error al agregar producto');
    }
  };

  const handleRemoveProducto = async (productoId: number) => {
    try {
      await routeService.removeProductoCarga(rutaId, productoId);
      toast.success('Producto removido');
      const updated = await routeService.getCarga(rutaId);
      setCarga(updated);
    } catch (err) {
      toast.error('Error al remover producto');
    }
  };

  const handleOpenAddPedido = async () => {
    setIsPedidoModalOpen(true);
    setLoadingPedidos(true);
    try {
      const response = await api.get<{ items: any[] }>('/pedidos?pagina=1&tamanoPagina=100&estado=2');
      setAvailablePedidos(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingPedidos(false);
    }
  };

  const handleAddPedido = async (pedidoId: number) => {
    try {
      await routeService.addPedido(rutaId, pedidoId);
      toast.success('Pedido asignado');
      setIsPedidoModalOpen(false);
      const [cargaData, pedidosData] = await Promise.all([
        routeService.getCarga(rutaId),
        routeService.getPedidosAsignados(rutaId),
      ]);
      setCarga(cargaData);
      setPedidos(pedidosData);
    } catch (err: any) {
      toast.error(err?.message || 'Error al asignar pedido');
    }
  };

  const handleRemovePedido = async (pedidoId: number) => {
    try {
      await routeService.removePedido(rutaId, pedidoId);
      toast.success('Pedido removido');
      const [cargaData, pedidosData] = await Promise.all([
        routeService.getCarga(rutaId),
        routeService.getPedidosAsignados(rutaId),
      ]);
      setCarga(cargaData);
      setPedidos(pedidosData);
    } catch (err) {
      toast.error('Error al remover pedido');
    }
  };

  const handleEnviarACarga = async () => {
    if (!confirm('Se enviará la carga al vendedor. ¿Continuar?')) return;
    try {
      setSending(true);
      // Save efectivo first
      await routeService.updateEfectivoInicial(rutaId, parseFloat(efectivoInicial) || 0, comentarios || undefined);
      await routeService.enviarACarga(rutaId);
      toast.success('Ruta enviada a carga exitosamente');
      router.push('/routes/manage');
    } catch (err: any) {
      toast.error(err?.message || 'Error al enviar a carga');
    } finally {
      setSending(false);
    }
  };

  // Computed
  const totalEntregas = pedidos.length;
  const totalProductos = carga.length;
  const totalAsignado = carga.reduce((sum, c) => sum + c.cantidadTotal * c.precioUnitario, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-sm text-gray-500">Cargando...</span>
        </div>
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Ruta no encontrada</p>
      </div>
    );
  }

  const estadoBadge = ESTADO_RUTA_LABELS[ruta.estado] || 'Desconocido';
  const estadoColor = ESTADO_RUTA_COLORS[ruta.estado] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white px-8 py-6 border-b border-gray-200">
        <Breadcrumb items={[
          { label: 'Rutas', href: '/routes/manage' },
          { label: 'Admin. rutas', href: '/routes/manage' },
          { label: 'Cargar inventario de ruta' },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Cargar inventario de ruta
            </h1>
            <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${estadoColor}`}>
              {estadoBadge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveEfectivo}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div data-tour="routes-load-stats" className="flex items-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-600">Entregas: <strong>{totalEntregas}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-600">Productos: <strong>{totalProductos}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-600">Total asignado: <strong>${totalAsignado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong></span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 overflow-auto">
        {/* Section 1: User & Cash */}
        <div data-tour="routes-load-user-section" className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Asigna la ruta a un usuario</h2>

          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{ruta.usuarioNombre}</p>
              <p className="text-xs text-gray-500">Vendedor asignado</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Efectivo inicial ($)</label>
              <input
                type="number"
                value={efectivoInicial}
                onChange={(e) => setEfectivoInicial(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Comentarios</label>
              <input
                type="text"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder="Comentarios de la carga..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pedidos */}
        <div data-tour="routes-load-pedidos" className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">Asignar pedidos para entrega</h2>
              <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                {pedidos.length}
              </span>
            </div>
            <button
              onClick={handleOpenAddPedido}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar pedidos
            </button>
          </div>

          {pedidos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No hay pedidos asignados</p>
          ) : (
            <div className="space-y-2">
              {pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-[13px] font-medium text-gray-900">Pedido #{p.pedidoId}</span>
                    <span className="text-xs text-gray-500 ml-2">{p.clienteNombre}</span>
                    <span className="text-xs text-gray-400 ml-2">${p.montoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <button
                    onClick={() => handleRemovePedido(p.pedidoId)}
                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Add Products */}
        <div data-tour="routes-load-add-products" className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Asignar productos para venta</h2>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-700 mb-1">Producto</label>
              <SearchableSelect
                options={productos.map(p => ({ value: p.id.toString(), label: `${p.nombre} (${p.codigoBarra})` }))}
                value={selectedProducto}
                onChange={(val) => {
                  setSelectedProducto(val ? String(val) : '');
                  const prod = productos.find(p => p.id.toString() === String(val));
                  if (prod) setPrecioVenta(prod.precioBase.toString());
                }}
                placeholder="Buscar producto..."
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad</label>
              <input
                type="number"
                value={cantidadVenta}
                onChange={(e) => setCantidadVenta(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio</label>
              <input
                type="number"
                value={precioVenta}
                onChange={(e) => setPrecioVenta(e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={handleAddProducto}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar
            </button>
          </div>
        </div>

        {/* Section 4: Consolidated Table */}
        <div data-tour="routes-load-consolidated" className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Total asignado a la ruta (pedidos y venta)</h2>

          {carga.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No hay productos cargados a esta ruta</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Producto</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Asig. entrega</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Asig. venta</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Total</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600">Disponible</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Precio</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Total $</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-gray-600 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {carga.map((item) => (
                    <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <span className="text-[13px] text-gray-900">{item.productoNombre}</span>
                        {item.productoSku && (
                          <span className="text-[10px] text-gray-400 ml-2">{item.productoSku}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center text-[13px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.cantidadEntrega}
                      </td>
                      <td className="py-2 px-3 text-center text-[13px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.cantidadVenta}
                      </td>
                      <td className="py-2 px-3 text-center text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {item.cantidadTotal}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[13px] ${(item.disponible ?? 0) < item.cantidadTotal ? 'text-red-600 font-medium' : 'text-gray-600'}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {item.disponible ?? '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-[13px] text-gray-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        ${item.precioUnitario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right text-[13px] font-medium text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        ${(item.cantidadTotal * item.precioUnitario).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => handleRemoveProducto(item.productoId)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200">
                    <td colSpan={3} className="py-2 px-3 text-right text-xs font-semibold text-gray-600">Totales:</td>
                    <td className="py-2 px-3 text-center text-[13px] font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {carga.reduce((s, c) => s + c.cantidadTotal, 0)}
                    </td>
                    <td></td>
                    <td></td>
                    <td className="py-2 px-3 text-right text-[13px] font-bold text-green-600" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      ${totalAsignado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer: Enviar a carga */}
        {ruta.estado === 0 && (
          <div className="flex justify-end pt-4">
            <button
              data-tour="routes-load-submit"
              onClick={handleEnviarACarga}
              disabled={sending || carga.length === 0}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar a carga
            </button>
          </div>
        )}
      </div>

      {/* Add Pedido Modal */}
      <Modal
        isOpen={isPedidoModalOpen}
        onClose={() => setIsPedidoModalOpen(false)}
        title="Asignar pedidos para entrega"
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={pedidoSearch}
              onChange={(e) => setPedidoSearch(e.target.value)}
              placeholder="Buscar pedido..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {loadingPedidos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {availablePedidos
                .filter(p => {
                  if (!pedidoSearch) return true;
                  const search = pedidoSearch.toLowerCase();
                  return (
                    p.numeroPedido?.toLowerCase().includes(search) ||
                    p.clienteNombre?.toLowerCase().includes(search)
                  );
                })
                .map((p) => {
                  const alreadyAssigned = pedidos.some(assigned => assigned.pedidoId === p.id);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-3 py-2 border border-gray-100 rounded-lg hover:bg-gray-50">
                      <div>
                        <span className="text-[13px] font-medium text-gray-900">#{p.numeroPedido || p.id}</span>
                        <span className="text-xs text-gray-500 ml-2">{p.clienteNombre || 'Sin cliente'}</span>
                        <span className="text-xs text-gray-400 ml-2">${(p.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <button
                        onClick={() => handleAddPedido(p.id)}
                        disabled={alreadyAssigned}
                        className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                          alreadyAssigned
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {alreadyAssigned ? 'Asignado' : 'Asignar'}
                      </button>
                    </div>
                  );
                })}
              {availablePedidos.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No hay pedidos confirmados disponibles</p>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
