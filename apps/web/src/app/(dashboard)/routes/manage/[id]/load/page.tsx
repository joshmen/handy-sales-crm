'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { routeService, RouteDetail, RutaCargaItem, PedidoAsignado, ESTADO_RUTA, ESTADO_RUTA_KEYS, ESTADO_RUTA_COLORS } from '@/services/api/routes';
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
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';

interface ProductoOption {
  id: number;
  nombre: string;
  codigoBarra: string;
  precioBase: number;
}

interface PedidoOption {
  id: number;
  numeroPedido?: string;
  clienteNombre?: string;
  total?: number;
}

export default function LoadInventoryPage() {
  const { formatCurrency, formatDate } = useFormatters();
  const t = useTranslations('routes.load');
  const tr = useTranslations('routes');
  const ts = useTranslations('routes.status');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();
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

  // Add pedido modal — multi-select
  const [isPedidoModalOpen, setIsPedidoModalOpen] = useState(false);
  const [availablePedidos, setAvailablePedidos] = useState<PedidoOption[]>([]);
  const [pedidoSearch, setPedidoSearch] = useState('');
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [selectedPedidoIds, setSelectedPedidoIds] = useState<Set<number>>(new Set());
  const [batchAssigning, setBatchAssigning] = useState(false);

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
      toast.error(t('errorLoadingData'));
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
      toast.success(t('cashUpdated'));
    } catch (err) {
      showApiError(err, t('errorSavingCash'));
    } finally {
      setSaving(false);
    }
  };

  const handleAddProducto = async () => {
    if (!selectedProducto || !cantidadVenta) {
      toast.error(t('selectProductAndQuantity'));
      return;
    }
    try {
      const prod = productos.find(p => p.id.toString() === selectedProducto);
      await routeService.addProductoVenta(rutaId, {
        productoId: parseInt(selectedProducto),
        cantidad: parseInt(cantidadVenta),
        precioUnitario: parseFloat(precioVenta) || prod?.precioBase || 0,
      });
      toast.success(t('productAdded'));
      setSelectedProducto('');
      setCantidadVenta('1');
      setPrecioVenta('');
      const updated = await routeService.getCarga(rutaId);
      setCarga(updated);
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || t('errorAddingProduct'));
    }
  };

  const handleRemoveProducto = async (productoId: number) => {
    try {
      await routeService.removeProductoCarga(rutaId, productoId);
      toast.success(t('productRemoved'));
      const updated = await routeService.getCarga(rutaId);
      setCarga(updated);
    } catch (err) {
      showApiError(err, t('errorRemovingProduct'));
    }
  };

  const handleOpenAddPedido = async () => {
    setIsPedidoModalOpen(true);
    setLoadingPedidos(true);
    try {
      const response = await api.get<{ items: PedidoOption[] }>('/pedidos?pagina=1&tamanoPagina=100&estado=2');
      setAvailablePedidos(Array.isArray(response.data) ? response.data : response.data.items || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoadingPedidos(false);
    }
  };

  const togglePedidoSelected = (pedidoId: number) => {
    setSelectedPedidoIds(prev => {
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

  const handleAssignSelected = async () => {
    const ids = Array.from(selectedPedidoIds);
    if (ids.length === 0) return;
    setBatchAssigning(true);
    try {
      const result = await routeService.addPedidosBatch(rutaId, ids);
      const [cargaData, pedidosData] = await Promise.all([
        routeService.getCarga(rutaId),
        routeService.getPedidosAsignados(rutaId),
      ]);
      setCarga(cargaData);
      setPedidos(pedidosData);

      if (result.totalAsignados > 0 && result.totalFallidos === 0) {
        toast.success(t('ordersBatchAssigned', { count: result.totalAsignados }));
      } else if (result.totalAsignados > 0 && result.totalFallidos > 0) {
        toast.success(t('ordersBatchPartial', {
          ok: result.totalAsignados,
          failed: result.totalFallidos,
        }));
      } else {
        toast.error(t('errorAssigningOrder'));
      }

      closePedidoModal();
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || t('errorAssigningOrder'));
    } finally {
      setBatchAssigning(false);
    }
  };

  const handleRemovePedido = async (pedidoId: number) => {
    try {
      await routeService.removePedido(rutaId, pedidoId);
      toast.success(t('orderRemoved'));
      const [cargaData, pedidosData] = await Promise.all([
        routeService.getCarga(rutaId),
        routeService.getPedidosAsignados(rutaId),
      ]);
      setCarga(cargaData);
      setPedidos(pedidosData);
    } catch (err) {
      showApiError(err, t('errorRemovingOrder'));
    }
  };

  const [showSendModal, setShowSendModal] = useState(false);

  const handleEnviarACarga = () => {
    // Reemplaza confirm() nativo por Modal (feedback del user).
    setShowSendModal(true);
  };

  const submitEnviarACarga = async () => {
    try {
      setSending(true);
      // Save efectivo first
      await routeService.updateEfectivoInicial(rutaId, parseFloat(efectivoInicial) || 0, comentarios || undefined);
      await routeService.enviarACarga(rutaId);
      toast.success(t('sentSuccess'));
      setShowSendModal(false);
      router.push('/routes');
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : null) || t('errorSending'));
    } finally {
      setSending(false);
    }
  };

  // Computed
  const totalEntregas = pedidos.length;
  const totalProductos = carga.length;
  const totalAsignado = carga.reduce((sum, c) => sum + c.cantidadTotal * c.precioUnitario, 0);
  // Read-only once the vendor has accepted the load or route is in progress/completed/closed
  const isReadOnly = ruta ? ruta.estado >= ESTADO_RUTA.CargaAceptada : false;
  const canSendToCarga = ruta ? (ruta.estado === ESTADO_RUTA.Planificada || ruta.estado === ESTADO_RUTA.PendienteAceptar) : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <span className="text-sm text-muted-foreground">{t('loadingData')}</span>
        </div>
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">{t('notFound')}</p>
      </div>
    );
  }

  const estadoBadge = ESTADO_RUTA_KEYS[ruta.estado] ? ts(ESTADO_RUTA_KEYS[ruta.estado]) : ts('unknown');
  const estadoColor = ESTADO_RUTA_COLORS[ruta.estado] || 'bg-surface-3 text-foreground';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-surface-2 px-8 py-6 border-b border-border-subtle">
        <Breadcrumb items={[
          { label: tr('title'), href: '/routes' },
          { label: ruta.nombre, href: `/routes/${ruta.id}` },
          { label: t('breadcrumbLabel') },
        ]} />

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {t('title')}
            </h1>
            <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-medium rounded-full ${estadoColor}`}>
              {estadoBadge}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                onClick={handleSaveEfectivo}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {tc('save')}
              </button>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-foreground/70 border border-border-subtle rounded hover:bg-surface-1 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div data-tour="routes-load-stats" className="flex items-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-foreground/70">{t('deliveries')} <strong>{totalEntregas}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-foreground/70">{t('products')} <strong>{totalProductos}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-foreground/70">{t('totalAssigned')} <strong>{formatCurrency(totalAsignado)}</strong></span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-8 py-6 space-y-6 overflow-auto">
        {/* Section 1: User & Cash */}
        <div data-tour="routes-load-user-section" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('assignRouteToUser')}</h2>

          <div className="flex items-center gap-4 mb-4 p-3 bg-surface-1 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{ruta.usuarioNombre}</p>
              <p className="text-xs text-muted-foreground">{t('assignedVendor')}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">{t('initialCash')}</label>
              <input
                type="number"
                value={efectivoInicial}
                onChange={(e) => setEfectivoInicial(e.target.value)}
                placeholder="0.00"
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-surface-3 disabled:text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground/80 mb-1">{t('comments')}</label>
              <input
                type="text"
                value={comentarios}
                onChange={(e) => setComentarios(e.target.value)}
                placeholder={t('commentsPlaceholder')}
                disabled={isReadOnly}
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-surface-3 disabled:text-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pedidos */}
        <div data-tour="routes-load-pedidos" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{t('assignOrdersForDelivery')}</h2>
              <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-100 text-blue-700">
                {pedidos.length}
              </span>
            </div>
            {!isReadOnly && (
              <button
                onClick={handleOpenAddPedido}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t('addOrders')}
              </button>
            )}
          </div>

          {pedidos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t('noOrdersAssigned')}</p>
          ) : (
            <div className="space-y-2">
              {pedidos.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-surface-1 rounded-lg">
                  <div>
                    <span className="text-[13px] font-medium text-foreground">{t('orderNumber', { id: p.pedidoId })}</span>
                    <span className="text-xs text-muted-foreground ml-2">{p.clienteNombre}</span>
                    <span className="text-xs text-muted-foreground ml-2">{formatCurrency(p.montoTotal)}</span>
                  </div>
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRemovePedido(p.pedidoId)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Add Products (hidden when read-only) */}
        {!isReadOnly && (
        <div data-tour="routes-load-add-products" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('assignProductsForSale')}</h2>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-foreground/80 mb-1">{t('productLabel')}</label>
              <SearchableSelect
                options={productos.map(p => ({ value: p.id.toString(), label: `${p.nombre} (${p.codigoBarra})` }))}
                value={selectedProducto}
                onChange={(val) => {
                  setSelectedProducto(val ? String(val) : '');
                  const prod = productos.find(p => p.id.toString() === String(val));
                  if (prod) setPrecioVenta(prod.precioBase.toString());
                }}
                placeholder={t('searchProduct')}
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-medium text-foreground/80 mb-1">{t('quantity')}</label>
              <input
                type="number"
                value={cantidadVenta}
                onChange={(e) => setCantidadVenta(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-border-default rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-foreground/80 mb-1">{t('price')}</label>
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
              {t('add')}
            </button>
          </div>
        </div>
        )}

        {/* Section 4: Consolidated Table */}
        <div data-tour="routes-load-consolidated" className="bg-surface-2 border border-border-subtle rounded-lg p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">{t('totalAssignedToRoute')}</h2>

          {carga.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">{t('noProductsLoaded')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnProduct')}</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnDeliveryAssigned')}</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnSaleAssigned')}</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnTotal')}</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnAvailable')}</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnPrice')}</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-foreground/70">{t('columnTotalAmount')}</th>
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
                      <td className="py-2 px-3 text-center text-[13px] text-foreground/70">
                        {item.cantidadEntrega}
                      </td>
                      <td className="py-2 px-3 text-center text-[13px] text-foreground/70">
                        {item.cantidadVenta}
                      </td>
                      <td className="py-2 px-3 text-center text-[13px] font-medium text-foreground">
                        {item.cantidadTotal}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[13px] ${(item.disponible ?? 0) < item.cantidadTotal ? 'text-red-600 font-medium' : 'text-foreground/70'}`}>
                          {item.disponible ?? '-'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-[13px] text-foreground/70">
                        {formatCurrency(item.precioUnitario)}
                      </td>
                      <td className="py-2 px-3 text-right text-[13px] font-medium text-foreground">
                        {formatCurrency(item.cantidadTotal * item.precioUnitario)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {!isReadOnly && (
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
                    <td colSpan={3} className="py-2 px-3 text-right text-xs font-semibold text-foreground/70">{t('totalsLabel')}</td>
                    <td className="py-2 px-3 text-center text-[13px] font-bold text-foreground">
                      {carga.reduce((s, c) => s + c.cantidadTotal, 0)}
                    </td>
                    <td></td>
                    <td></td>
                    <td className="py-2 px-3 text-right text-[13px] font-bold text-green-600">
                      {formatCurrency(totalAsignado)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Footer: Enviar a carga */}
        {canSendToCarga && (
          <div className="flex justify-end pt-4">
            <button
              data-tour="routes-load-submit"
              onClick={handleEnviarACarga}
              disabled={sending || carga.length === 0}
              className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {t('sendToLoad')}
            </button>
          </div>
        )}
      </div>

      {/* Add Pedido Modal — multi-select */}
      <Modal
        isOpen={isPedidoModalOpen}
        onClose={closePedidoModal}
        title={t('assignOrdersForDelivery')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={pedidoSearch}
              onChange={(e) => setPedidoSearch(e.target.value)}
              placeholder={t('searchOrder')}
              className="w-full pl-9 pr-3 py-2 text-xs border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {loadingPedidos ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : (() => {
            const filteredPedidos = availablePedidos.filter(p => {
              if (!pedidoSearch) return true;
              const search = pedidoSearch.toLowerCase();
              return (
                p.numeroPedido?.toLowerCase().includes(search) ||
                p.clienteNombre?.toLowerCase().includes(search)
              );
            });
            const selectablePedidos = filteredPedidos.filter(
              p => !pedidos.some(a => a.pedidoId === p.id)
            );
            const allSelectableSelected = selectablePedidos.length > 0
              && selectablePedidos.every(p => selectedPedidoIds.has(p.id));

            const toggleSelectAll = () => {
              setSelectedPedidoIds(prev => {
                const next = new Set(prev);
                if (allSelectableSelected) {
                  selectablePedidos.forEach(p => next.delete(p.id));
                } else {
                  selectablePedidos.forEach(p => next.add(p.id));
                }
                return next;
              });
            };

            return (
              <>
                {selectablePedidos.length > 0 && (
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                      />
                      {allSelectableSelected ? t('deselectAll') : t('selectAll')}
                    </label>
                    {selectedPedidoIds.size > 0 && (
                      <span className="text-xs font-medium text-foreground">
                        {t('selectedCount', { count: selectedPedidoIds.size })}
                      </span>
                    )}
                  </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {filteredPedidos.map((p) => {
                    const alreadyAssigned = pedidos.some(a => a.pedidoId === p.id);
                    const isSelected = selectedPedidoIds.has(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 border rounded-lg transition-colors ${
                          alreadyAssigned
                            ? 'border-border-subtle bg-surface-2 cursor-not-allowed opacity-60'
                            : isSelected
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/30 cursor-pointer'
                              : 'border-border-subtle hover:bg-surface-1 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={alreadyAssigned || isSelected}
                          disabled={alreadyAssigned}
                          onChange={() => !alreadyAssigned && togglePedidoSelected(p.id)}
                          className="w-4 h-4 rounded border-border-subtle text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <span className="text-[13px] font-medium text-foreground">#{p.numeroPedido || p.id}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.clienteNombre || t('noClient')}</span>
                          <span className="text-xs text-muted-foreground ml-2">{formatCurrency(p.total || 0)}</span>
                        </div>
                        {alreadyAssigned && (
                          <span className="text-xs text-muted-foreground">{t('assigned')}</span>
                        )}
                      </label>
                    );
                  })}
                  {filteredPedidos.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">{t('noConfirmedOrders')}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={closePedidoModal}
                    disabled={batchAssigning}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-border-subtle bg-surface-1 text-foreground hover:bg-surface-2 disabled:opacity-50"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={handleAssignSelected}
                    disabled={selectedPedidoIds.size === 0 || batchAssigning}
                    className="px-4 py-1.5 text-xs font-medium rounded bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {batchAssigning && <Loader2 className="w-3 h-3 animate-spin" />}
                    {selectedPedidoIds.size > 0
                      ? t('assignSelectedCount', { count: selectedPedidoIds.size })
                      : t('assignSelected')}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </Modal>

      {/* Modal: confirmar envío a carga (reemplaza confirm() nativo). */}
      <Modal
        isOpen={showSendModal}
        onClose={() => { if (!sending) setShowSendModal(false); }}
        title={t('sendToLoadTitle', { defaultValue: 'Enviar a carga' })}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">{t('confirmSendToLoad')}</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSendModal(false)}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-foreground/80 bg-surface-2 border border-border-default rounded-lg hover:bg-surface-1 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitEnviarACarga}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-white bg-success rounded-lg hover:bg-success/90 disabled:opacity-50 flex items-center gap-2"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('sendAction', { defaultValue: 'Enviar a carga' })}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
