'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/contexts/SignalRContext';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { OrderForm, OrderFormHandle } from '@/components/orders/OrderForm';
import { Order } from '@/types/orders';
import { Client, ClientType, Product, UserRole } from '@/types';
import { orderService, OrderListItem } from '@/services/api/orders';
import { clientService } from '@/services/api/clients';
import { productService } from '@/services/api/products';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import {
  Plus,
  RefreshCw,
  FileText,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import { ListPagination } from '@/components/ui/ListPagination';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/Button';
import { ShoppingCart as ShoppingCartIcon, Receipt } from '@phosphor-icons/react';
import { SearchBar } from '@/components/common/SearchBar';
import { TableLoadingOverlay } from '@/components/ui/TableLoadingOverlay';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFormatters } from '@/hooks/useFormatters';

// Mapeo de estados de API a estados del componente
const estadoToStatus: Record<string, Order['status']> = {
  'Borrador': 'draft',
  'Confirmado': 'confirmed',
  'EnRuta': 'en_route',
  'Entregado': 'delivered',
  'Cancelado': 'cancelled',
  // Legacy: old states map to confirmed for backwards compat
  'Enviado': 'confirmed',
  'EnProceso': 'confirmed',
};

const statusLabels: Record<string, string> = {
  'draft': 'Borrador',
  'confirmed': 'Confirmado',
  'en_route': 'En Ruta',
  'delivered': 'Entregado',
  'cancelled': 'Cancelado',
};

// Dot color + subtle text — no pastel backgrounds
const statusDotColors: Record<string, string> = {
  'draft': 'bg-gray-400 ring-2 ring-gray-200 ring-offset-1',
  'confirmed': 'bg-blue-500 ring-2 ring-blue-200 ring-offset-1',
  'en_route': 'bg-cyan-500 ring-2 ring-cyan-200 ring-offset-1',
  'delivered': 'bg-emerald-500',
  'cancelled': 'bg-red-400',
};
const statusTextColors: Record<string, string> = {
  'draft': 'text-gray-500',
  'confirmed': 'text-blue-700',
  'en_route': 'text-cyan-700',
  'delivered': 'text-emerald-700',
  'cancelled': 'text-red-500',
};
// Left border accent for rows needing attention
const statusBorderColors: Record<string, string> = {
  'draft': 'border-l-gray-300',
  'confirmed': 'border-l-blue-400',
  'en_route': 'border-l-cyan-400',
  'delivered': '',
  'cancelled': '',
};

// Transition map: given the raw API estado, returns the primary forward action
function getNextAction(apiEstado?: string): { label: string; action: string; colorClasses: string } | null {
  switch (apiEstado) {
    case 'Borrador':
      return { label: 'Confirmar', action: 'confirmar', colorClasses: 'border border-blue-300 text-blue-700 hover:bg-blue-50' };
    case 'Confirmado':
      return { label: 'Enviar a Ruta', action: 'en-ruta', colorClasses: 'border border-cyan-300 text-cyan-700 hover:bg-cyan-50' };
    case 'EnRuta':
      return { label: 'Entregar', action: 'entregar', colorClasses: 'bg-emerald-600 text-white hover:bg-emerald-700' };
    default:
      return null;
  }
}

// Non-terminal states that can be cancelled
const cancellableEstados = new Set(['Borrador', 'Confirmado', 'EnRuta']);

function mapApiOrderToOrder(apiOrder: OrderListItem): Order {
  const estadoStr = apiOrder.estadoNombre || String(apiOrder.estado);
  const status = estadoToStatus[estadoStr] || 'draft';

  return {
    id: apiOrder.id.toString(),
    code: apiOrder.numeroPedido,
    clientId: apiOrder.clienteId.toString(),
    client: {
      id: apiOrder.clienteId.toString(),
      name: apiOrder.clienteNombre,
      email: '',
      phone: '',
      address: '',
      type: ClientType.MINORISTA,
      isActive: true,
      code: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    userId: apiOrder.usuarioId.toString(),
    user: {
      id: apiOrder.usuarioId.toString(),
      name: apiOrder.usuarioNombre,
      email: '',
      role: UserRole.VENDEDOR,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    status,
    priority: 'normal',
    orderDate: new Date(apiOrder.fechaPedido),
    deliveryDate: apiOrder.fechaEntregaEstimada ? new Date(apiOrder.fechaEntregaEstimada) : undefined,
    items: Array(apiOrder.totalProductos).fill({
      id: '0',
      orderId: apiOrder.id.toString(),
      productId: '0',
      product: {
        id: '0',
        name: 'Producto',
        code: '',
        description: '',
        price: 0,
        stock: 0,
        category: '',
        isActive: true,
        images: [],
        minStock: 0,
        unit: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      total: 0,
    }),
    subtotal: apiOrder.subtotal,
    tax: apiOrder.impuestos,
    discount: apiOrder.descuento,
    total: apiOrder.total,
    notes: '',
    paymentMethod: 'cash',
    paymentStatus: 'pending',
    tipoVenta: apiOrder.tipoVenta,
    tipoVentaNombre: apiOrder.tipoVentaNombre,
    apiEstado: estadoStr,
    createdAt: new Date(apiOrder.creadoEn),
    updatedAt: new Date(apiOrder.creadoEn),
  };
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

export default function OrdersPage() {
  const { formatCurrency, formatDate } = useFormatters();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const canAdvanceOrders = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'SUPERVISOR';

  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [tipoVentaFilter, setTipoVentaFilter] = useState<'' | '0' | '1'>('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const orderFormRef = useRef<OrderFormHandle>(null);
  const drawerRef = useRef<DrawerHandle>(null);
  const formDataLoaded = useRef(false);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);
  const router = useRouter();

  // Calcular total de montos
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { page: number; pageSize: number; usuarioId?: number; tipoVenta?: number; estado?: string; fechaInicio?: string; fechaFin?: string } = { page: currentPage, pageSize };
      if (filterUser !== 'all') params.usuarioId = parseInt(filterUser);
      if (tipoVentaFilter !== '') params.tipoVenta = parseInt(tipoVentaFilter);
      if (estadoFilter) params.estado = estadoFilter;
      if (fechaDesde) params.fechaInicio = fechaDesde;
      if (fechaHasta) params.fechaFin = fechaHasta;
      const response = await orderService.getOrders(params);
      const mappedOrders = response.items.map(mapApiOrderToOrder);
      setOrders(mappedOrders);
      setTotalItems(response.totalCount);
      setTotalPages(Math.ceil(response.totalCount / response.pageSize));
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError('Error al cargar los pedidos. Intenta de nuevo.');
      toast.error('Error al cargar los pedidos');
    } finally {
      setLoading(false);
    }
  }, [currentPage, filterUser, tipoVentaFilter, estadoFilter, fechaDesde, fechaHasta]);

  const fetchFormData = useCallback(async () => {
    // Load clients and products independently so one failure doesn't block the other
    try {
      const clientsResponse = await clientService.getClients({ limit: 100 });
      setClients(clientsResponse.clients || []);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    }
    try {
      const productsResponse = await productService.getProducts({ limit: 100 });
      setProducts(productsResponse.products || []);
    } catch (err) {
      console.error('Error al cargar productos:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time: refresh orders when mobile creates/updates pedidos
  const { on, off } = useSignalR();
  useEffect(() => {
    const handleUpdate = (...args: unknown[]) => {
      const data = args[0] as { tipo?: string } | undefined;
      if (!data?.tipo || data.tipo === 'pedido' || data.tipo === 'sync') fetchOrders();
    };
    on('DashboardUpdate', handleUpdate);
    on('PedidoCreated', handleUpdate);
    return () => {
      off('DashboardUpdate', handleUpdate);
      off('PedidoCreated', handleUpdate);
    };
  }, [on, off, fetchOrders]);

  // Cargar lista de vendedores (solo para admin)
  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/api/usuarios?pagina=1&tamanoPagina=500')
      .then(res => {
        const data = res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setUsuarios(items);
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleCreateOrder = async () => {
    if (!formDataLoaded.current) {
      await fetchFormData();
      formDataLoaded.current = true;
    }
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  const handleEditOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      if (!formDataLoaded.current) {
        await fetchFormData();
        formDataLoaded.current = true;
      }
      setEditingOrder(order);
      setShowOrderForm(true);
    }
  };

  const handleViewDetails = async (orderId: string) => {
    try {
      const orderDetail = await orderService.getOrderById(parseInt(orderId));
      toast.info(`Pedido ${orderDetail.numeroPedido} - Total: $${orderDetail.total.toFixed(2)}`);
    } catch (_err) {
      toast.error('Error al cargar los detalles del pedido');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      try {
        await orderService.deleteOrder(parseInt(orderId));
        setOrders(orders.filter(o => o.id !== orderId));
        toast.success('Pedido eliminado correctamente');
      } catch (_err) {
        toast.error('Error al eliminar el pedido');
      }
    }
  };

  const handleFacturar = (orderId: string) => {
    router.push(`/billing/pre-factura?pedidoId=${orderId}`);
  };

  const handleAdvanceStatus = async (orderId: string, action: string) => {
    const id = parseInt(orderId);
    try {
      switch (action) {
        case 'confirmar': await orderService.confirmOrder(id); break;
        case 'en-ruta': await orderService.sendToRoute(id); break;
        case 'entregar': await orderService.deliverOrder(id); break;
      }
      toast.success('Estado actualizado');
      fetchOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado';
      toast.error(message);
    }
  };

  const handleCancelOrderStatus = async (orderId: string) => {
    const reason = window.prompt('Motivo de cancelación (opcional):');
    if (reason === null) return; // User clicked Cancel on the prompt
    const id = parseInt(orderId);
    try {
      await orderService.cancelOrder(id, reason || undefined);
      toast.success('Pedido cancelado');
      fetchOrders();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cancelar pedido';
      toast.error(message);
    }
  };

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    try {
      if (editingOrder) {
        await orderService.updateOrder(parseInt(editingOrder.id), {
          fechaEntregaEstimada: orderData.deliveryDate?.toISOString(),
          notas: orderData.notes,
        });
        toast.success('Pedido actualizado correctamente');
      } else {
        const createData = {
          clienteId: parseInt(orderData.clientId || '0'),
          tipoVenta: orderData.tipoVenta ?? 0,
          fechaEntregaEstimada: orderData.deliveryDate?.toISOString(),
          notas: orderData.notes,
          detalles: orderData.items?.map(item => ({
            productoId: parseInt(item.productId),
            cantidad: item.quantity,
            precioUnitario: item.unitPrice,
            descuento: item.discount,
          })) || [],
        };
        await orderService.createOrder(createData);
        const tipoMsg = orderData.tipoVenta === 1 ? 'Venta directa creada y entregada' : 'Pedido creado correctamente';
        toast.success(tipoMsg);
      }
      await fetchOrders();
      setShowOrderForm(false);
      setEditingOrder(null);
    } catch (_err) {
      toast.error('Error al guardar el pedido');
    }
  };

  const handleRefresh = () => {
    fetchOrders();
    toast.success('Lista actualizada');
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Inicio', href: '/dashboard' },
          { label: 'Pedidos' },
        ]}
        title="Pedidos"
        subtitle={totalItems > 0 ? `${totalItems} pedido${totalItems !== 1 ? 's' : ''}` : undefined}
        actions={
          <>
            <ExportButton entity="pedidos" label="Exportar" params={{ desde: fechaDesde, hasta: fechaHasta }} />
            <button
              data-tour="orders-create-btn"
              onClick={handleCreateOrder}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo pedido</span>
            </button>
          </>
        }
      >
          {error && (
            <div className="mb-4">
              <ErrorBanner error={error} onRetry={fetchOrders} />
            </div>
          )}

          {/* Search */}
          <div className="mb-3 w-full sm:w-1/2 lg:w-1/3" data-tour="orders-search">
            <SearchBar
              value={searchTerm}
              onChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
              placeholder="Buscar pedido por número o cliente..."
              className="w-full"
            />
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Date Filters */}
            <div data-tour="orders-date-filter">
              <DateTimePicker
                compact
                mode="date"
                value={fechaDesde}
                onChange={(val) => { setFechaDesde(val); setCurrentPage(1); }}
                placeholder="Desde"
              />
            </div>
            <div>
              <DateTimePicker
                compact
                mode="date"
                value={fechaHasta}
                onChange={(val) => { setFechaHasta(val); setCurrentPage(1); }}
                placeholder="Hasta"
                min={fechaDesde}
              />
            </div>

            {/* Estado Filter */}
            <select
              data-tour="orders-estado-filter"
              value={estadoFilter}
              onChange={(e) => { setEstadoFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 h-10 text-[13px] text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Confirmado">Confirmado</option>
              <option value="EnRuta">En Ruta</option>
              <option value="Entregado">Entregado</option>
              <option value="Cancelado">Cancelado</option>
            </select>

            {/* Users Filter - solo visible para Admin */}
            {isAdmin && (
            <div className="min-w-[200px] max-w-[260px]" data-tour="orders-user-filter">
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todos los vendedores' },
                  ...usuarios.map(u => ({ value: u.id.toString(), label: u.nombre })),
                ]}
                value={filterUser}
                onChange={(val) => { setFilterUser(val ? String(val) : 'all'); setCurrentPage(1); }}
                placeholder="Todos los vendedores"
              />
            </div>
            )}

            {/* Tipo Venta Filter */}
            <select
              data-tour="orders-tipo-filter"
              value={tipoVentaFilter}
              onChange={(e) => { setTipoVentaFilter(e.target.value as '' | '0' | '1'); setCurrentPage(1); }}
              className="px-3 py-2 h-10 text-[13px] text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Todos los tipos</option>
              <option value="0">Preventa</option>
              <option value="1">Venta Directa</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
              )}
              {!loading && filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileText className="w-12 h-12 text-violet-300 mb-3" />
                  <p className="text-sm text-gray-500 mb-3">No hay pedidos</p>
                  <p className="text-xs text-gray-400 text-center px-4">
                    Crea pedidos desde la app móvil
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => {
                  const nextAction = getNextAction(order.apiEstado);
                  const canCancel = cancellableEstados.has(order.apiEstado || '');
                  return (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer" onClick={() => handleEditOrder(order.id)}>
                    {/* Row 1: Icon + Order number + status */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCartIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.code}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{order.client.name}</p>
                      </div>
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${statusDotColors[order.status]}`} />
                        <span className={`text-[11px] font-medium whitespace-nowrap ${statusTextColors[order.status]}`}>{statusLabels[order.status]}</span>
                      </span>
                    </div>
                    {/* TipoVenta */}
                    <div className="flex justify-end mt-1">
                      <span className={`text-[10px] font-medium ${
                        order.tipoVenta === 1 ? 'text-emerald-600' : 'text-gray-400'
                      }`}>
                        {order.tipoVenta === 1 ? 'Venta Directa' : 'Preventa'}
                      </span>
                    </div>
                    {/* Row 2: Metrics */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2.5">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-900">
                          ${formatCurrency(order.total)}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{formatDate(order.orderDate)}</span>
                      <span>•</span>
                      <span>{order.user.name}</span>
                    </div>
                    {/* Row 3: Actions */}
                    <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400 hover:text-blue-600" /> Ver
                      </button>
                      <button
                        onClick={() => handleEditOrder(order.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                      >
                        <Edit className="w-3.5 h-3.5 text-amber-400 hover:text-amber-600" /> Editar
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400 hover:text-red-600" /> Eliminar
                      </button>
                      {order.status === 'delivered' && (
                        <button
                          onClick={() => handleFacturar(order.id)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-500" weight="bold" />
                          Facturar
                        </button>
                      )}
                    </div>
                    {/* Row 4: Status advancement */}
                    {canAdvanceOrders && (nextAction || canCancel) && (
                      <div className="flex items-center gap-2 border-t border-gray-100 pt-2 mt-1" onClick={(e) => e.stopPropagation()}>
                        {nextAction && (
                          <button
                            onClick={() => handleAdvanceStatus(order.id, nextAction.action)}
                            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${nextAction.colorClasses}`}
                          >
                            <ChevronRight className="w-3 h-3" />
                            {nextAction.label}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancelOrderStatus(order.id)}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            <X className="w-3 h-3" />
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>

            {/* Orders Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto" data-tour="orders-table">
              {/* Table Header */}
              <div className="flex items-center bg-gray-50/80 px-4 h-9 border-b border-gray-200 text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                <div className="w-4 shrink-0 mr-2" />
                <div className="w-[150px] shrink-0"># Pedido</div>
                <div className="flex-1 min-w-[100px] max-w-[300px]">Cliente</div>
                <div className="w-[140px] shrink-0 hidden xl:block">Vendedor</div>
                <div className="w-[75px] shrink-0">Fecha</div>
                <div className="w-[90px] shrink-0">Estado</div>
                <div className="w-[85px] shrink-0 hidden lg:block">Tipo</div>
                <div className="w-[90px] shrink-0 text-right pr-4">Total</div>
                <div className="w-[180px] shrink-0 text-center border-l-2 border-gray-200 pl-3">Acciones</div>
              </div>

              {/* Table Body - With loading overlay */}
              <div className="relative min-h-[200px]">
                <TableLoadingOverlay loading={loading} message="Cargando pedidos..." />

                {/* Empty State */}
                {!loading && filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <FileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron resultados</h3>
                    <p className="text-sm text-gray-500 text-center">
                      Crea pedidos desde la app móvil
                    </p>
                  </div>
                ) : (
                  /* Table Rows - With opacity transition */
                  <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    {filteredOrders.map((order) => {
                      const nextAction = getNextAction(order.apiEstado);
                      const canCancel = cancellableEstados.has(order.apiEstado || '');
                      return (
                  <div
                    key={order.id}
                    className={`flex items-center px-4 py-2 border-b border-gray-100 border-l-4 hover:bg-gray-50/70 transition-colors cursor-pointer ${statusBorderColors[order.status]}`}
                    onClick={() => handleEditOrder(order.id)}
                  >
                    {/* Status dot */}
                    <div className="w-4 shrink-0 mr-2 flex justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${statusDotColors[order.status]}`} />
                    </div>
                    <div className="w-[150px] shrink-0 text-[13px] text-gray-800 font-mono">
                      {order.code}
                    </div>
                    <div className="flex-1 min-w-[100px] max-w-[300px]">
                      <div className="text-[13px] text-gray-900 font-medium truncate">{order.client.name}</div>
                    </div>
                    <div className="w-[140px] shrink-0 text-[13px] text-gray-500 truncate hidden xl:block">
                      {order.user.name}
                    </div>
                    <div className="w-[75px] shrink-0 text-[12px] text-gray-500 whitespace-nowrap tabular-nums">
                      {order.orderDate.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                    </div>
                    <div className="w-[90px] shrink-0">
                      <span className={`text-[12px] font-medium whitespace-nowrap ${statusTextColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <div className="w-[85px] shrink-0 hidden lg:block">
                      <span className={`text-[12px] whitespace-nowrap ${
                        order.tipoVenta === 1 ? 'text-emerald-600' : 'text-gray-500'
                      }`}>
                        {order.tipoVenta === 1 ? 'V. Directa' : 'Preventa'}
                      </span>
                    </div>
                    <div className="w-[90px] shrink-0 text-[13px] text-gray-900 font-semibold text-right pr-4 whitespace-nowrap tabular-nums">
                      {formatCurrency(order.total)}
                    </div>
                    <div className="w-[180px] shrink-0 flex items-center justify-center gap-2 border-l-2 border-gray-200 pl-3" onClick={(e) => e.stopPropagation()}>
                      {/* Primary action */}
                      {canAdvanceOrders && nextAction && (
                        <button
                          onClick={() => handleAdvanceStatus(order.id, nextAction.action)}
                          className={`flex items-center gap-0.5 text-[11px] px-2.5 py-1 rounded font-semibold transition-colors whitespace-nowrap ${nextAction.colorClasses}`}
                        >
                          {nextAction.label}
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <button
                          onClick={() => handleFacturar(order.id)}
                          className="text-[11px] px-2.5 py-1 rounded font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-colors whitespace-nowrap"
                        >
                          Facturar
                        </button>
                      )}
                      {/* Secondary actions — grouped */}
                      <div className="flex items-center gap-0.5 border border-gray-200 rounded-md px-0.5 py-0.5">
                        {canAdvanceOrders && canCancel && (
                          <button
                            onClick={() => handleCancelOrderStatus(order.id)}
                            className="p-1 hover:bg-red-50 rounded transition-colors"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1 hover:bg-red-50 rounded transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination - Always visible when there are orders */}
            {(filteredOrders.length > 0 || loading) && totalItems > 0 && (
              <ListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="pedidos"
                loading={loading}
                className="pt-4"
              />
            )}
      </PageHeader>

      {/* Drawer lateral para crear/editar pedidos */}
      <Drawer
        ref={drawerRef}
        isOpen={showOrderForm}
        onClose={() => {
          setShowOrderForm(false);
          setEditingOrder(null);
          setFormIsDirty(false);
        }}
        title={editingOrder ? 'Editar Pedido' : 'Nuevo Pedido'}
        icon={<ShoppingCart className="w-5 h-5 text-green-600" />}
        width="lg"
        isDirty={formIsDirty}
        onSave={() => orderFormRef.current?.submit()}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()}>
              Cancelar
            </Button>
            <Button type="button" variant="success" onClick={() => orderFormRef.current?.submit()} className="flex items-center gap-2">
              {editingOrder ? 'Guardar Cambios' : 'Crear Pedido'}
            </Button>
          </div>
        }
      >
        <OrderForm
          ref={orderFormRef}
          order={editingOrder}
          clients={clients}
          products={products}
          onSave={handleSaveOrder}
          onCancel={() => {
            setShowOrderForm(false);
            setEditingOrder(null);
          }}
          onDirtyChange={setFormIsDirty}
        />
      </Drawer>
    </>
  );
}
