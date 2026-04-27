'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/contexts/SignalRContext';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { DateTimePicker } from '@/components/ui/DateTimePicker';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { OrderForm, OrderFormHandle } from '@/components/orders/OrderForm';
import { Order, OrderItem } from '@/types/orders';
import { Client, ClientType, Product, UserRole } from '@/types';
import { orderService, OrderListItem } from '@/services/api/orders';
import { clientService } from '@/services/api/clients';
import { productService } from '@/services/api/products';
import { api } from '@/lib/api';
import { toast } from '@/hooks/useToast';
import { useApiErrorToast } from '@/hooks/useApiErrorToast';
import {
  Plus,
  RefreshCw,
  FileText,
  Edit,
  Trash2,
  Eye,
  ShoppingCart,
  X,
  ChevronRight,
} from 'lucide-react';
import { ExportButton } from '@/components/shared/ExportButton';
import { Button } from '@/components/ui/Button';
import { ShoppingCart as ShoppingCartIcon, Receipt } from '@phosphor-icons/react';
import { getInvoicedOrders, type InvoicedOrder } from '@/services/api/billing';
import { SearchBar } from '@/components/common/SearchBar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataGrid, DataGridColumn } from '@/components/ui/DataGrid';
import { useFormatters } from '@/hooks/useFormatters';
import { useTranslations } from 'next-intl';

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
  'draft': 'bg-muted-foreground ring-2 ring-border-subtle ring-offset-1',
  'confirmed': 'bg-blue-500 ring-2 ring-blue-200 ring-offset-1',
  'en_route': 'bg-cyan-500 ring-2 ring-cyan-200 ring-offset-1',
  'delivered': 'bg-emerald-500',
  'cancelled': 'bg-red-400',
};
const statusTextColors: Record<string, string> = {
  'draft': 'text-muted-foreground',
  'confirmed': 'text-blue-700',
  'en_route': 'text-cyan-700',
  'delivered': 'text-emerald-700',
  'cancelled': 'text-red-500',
};
// Left border accent for rows needing attention
const statusBorderColors: Record<string, string> = {
  'draft': 'border-l-border-default',
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
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const showApiError = useApiErrorToast();
  const { formatCurrency, formatDate } = useFormatters();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';
  const canAdvanceOrders = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'SUPERVISOR';

  const [orders, setOrders] = useState<Order[]>([]);
  const [invoicedOrders, setInvoicedOrders] = useState<Record<number, InvoicedOrder>>({});
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isViewOnlyMode, setIsViewOnlyMode] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
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
      // Load invoiced orders (best-effort, don't block)
      getInvoicedOrders().then(data => {
        setInvoicedOrders(data);
      }).catch(err => {
        console.warn('Could not load invoiced orders:', err?.response?.status || err?.message);
      });
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
      setError(t('errorLoading'));
      toast.error(t('errorLoading'));
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
      .catch((err) => console.error('[Orders] failed to load usuarios for filter:', err));
  }, [isAdmin]);

  const handleCreateOrder = async () => {
    if (!formDataLoaded.current) {
      await fetchFormData();
      formDataLoaded.current = true;
    }
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  // Abre el drawer cargando el pedido completo (cliente, items reales, notas, totales).
  // Reglas de negocio (confirmar con backend PedidoService):
  //   - Solo estado 'Borrador' permite editar (PUT /pedidos: fechaEntrega, notas, notasInternas).
  //   - Los items solo se modifican vía endpoints /pedidos/{id}/detalles y solo en Borrador.
  //   - Para Confirmado/EnRuta/Entregado/Cancelado el drawer abre en modo solo-lectura.
  const openOrderDrawer = async (orderId: string, allowEdit: boolean) => {
    const listOrder = orders.find(o => o.id === orderId);
    if (!listOrder) return;

    if (!formDataLoaded.current) {
      await fetchFormData();
      formDataLoaded.current = true;
    }

    try {
      const detail = await orderService.getOrderById(parseInt(orderId));

      // Construye un Order con items reales provenientes del backend.
      // Usamos productos del catálogo cuando existen (para imágenes/unidades),
      // pero los datos primarios (nombre/precio/cantidad) siempre salen del detalle
      // del pedido — reflejan el "snapshot" del momento en que se creó.
      const detalleItems: OrderItem[] = detail.detalles.map(d => {
        const productoCatalogo = products.find(p => p.id === d.productoId.toString());
        const product: Product = productoCatalogo ?? {
          id: d.productoId.toString(),
          name: d.productoNombre,
          code: d.productoCodigo || '',
          description: '',
          price: d.precioUnitario,
          stock: 0,
          category: '',
          isActive: true,
          images: [],
          minStock: 0,
          unit: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return {
          id: d.id.toString(),
          orderId: detail.id.toString(),
          productId: d.productoId.toString(),
          product,
          quantity: d.cantidad,
          unitPrice: d.precioUnitario,
          discount: d.descuento,
          total: d.subtotal,
        };
      });

      const clientFromCatalog = clients.find(c => c.id === detail.clienteId.toString());
      const fullOrder: Order = {
        ...listOrder,
        client: clientFromCatalog ?? {
          ...listOrder.client,
          id: detail.clienteId.toString(),
          name: detail.clienteNombre,
          address: detail.clienteDireccion ?? '',
        },
        clientId: detail.clienteId.toString(),
        items: detalleItems,
        subtotal: detail.subtotal,
        tax: detail.impuestos,
        discount: detail.descuento,
        total: detail.total,
        notes: detail.notas ?? '',
        address: detail.clienteDireccion ?? '',
        deliveryDate: detail.fechaEntregaEstimada ? new Date(detail.fechaEntregaEstimada) : listOrder.deliveryDate,
      };

      // Si el caller pidió editar pero el estado no lo permite, degradamos a solo-lectura.
      const canEdit = allowEdit && listOrder.apiEstado === 'Borrador';
      if (allowEdit && !canEdit) {
        toast.info(t('orderReadOnlyBecauseNotDraft'));
      }

      setEditingOrder(fullOrder);
      setIsViewOnlyMode(!canEdit);
      setShowOrderForm(true);
    } catch (err) {
      showApiError(err, t('errorLoading'));
    }
  };

  const handleEditOrder = (orderId: string) => openOrderDrawer(orderId, true);
  const handleViewDetails = (orderId: string) => openOrderDrawer(orderId, false);

  const handleDeleteOrder = (orderId: string) => {
    // Reemplaza window.confirm() nativo por Modal (consistencia con cancelar y
    // rechazar-prospecto; feedback del user anterior).
    setDeleteOrderId(orderId);
  };

  const submitDeleteOrder = async () => {
    if (!deleteOrderId) return;
    setDeleteLoading(true);
    try {
      await orderService.deleteOrder(parseInt(deleteOrderId));
      setOrders(orders.filter(o => o.id !== deleteOrderId));
      toast.success(t('orderDeleted'));
      setDeleteOrderId(null);
    } catch (err) {
      showApiError(err, t('errorDeleting'));
    } finally {
      setDeleteLoading(false);
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
      toast.success(t('statusUpdated'));
      fetchOrders();
    } catch (err: unknown) {
      // ApiError es interface (objeto plano), no clase Error. El check `instanceof Error`
      // siempre fallaba y caía al fallback genérico, ocultando el mensaje específico
      // del backend (p.ej. "primero debe estar asignado a una ruta de vendedor activa").
      // useApiErrorToast lee directamente .message del objeto thrown sin instanceof.
      showApiError(err, tc('errorChangingStatus'));
    }
  };

  const handleCancelOrderStatus = (orderId: string) => {
    // Abre modal custom en lugar de window.prompt() nativo.
    setCancelOrderId(orderId);
    setCancelReasonText('');
  };

  const submitCancelOrder = async () => {
    if (!cancelOrderId) return;
    const id = parseInt(cancelOrderId);
    setCancelLoading(true);
    try {
      await orderService.cancelOrder(id, cancelReasonText.trim() || undefined);
      toast.success(t('orderCancelled'));
      setCancelOrderId(null);
      setCancelReasonText('');
      fetchOrders();
    } catch (err: unknown) {
      // Mismo bug que en handleAdvanceStatus: ApiError no es Error instance.
      showApiError(err, t('errorCancelling'));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleSaveOrder = async (orderData: Partial<Order>) => {
    try {
      if (editingOrder) {
        await orderService.updateOrder(parseInt(editingOrder.id), {
          fechaEntregaEstimada: orderData.deliveryDate?.toISOString(),
          notas: orderData.notes,
        });
        toast.success(t('orderUpdated'));
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
        const tipoMsg = orderData.tipoVenta === 1 ? t('directSaleCreated') : t('orderCreated');
        toast.success(tipoMsg);
      }
      await fetchOrders();
      setShowOrderForm(false);
      setEditingOrder(null);
    } catch (err) {
      showApiError(err, t('errorSaving'));
    }
  };

  const handleRefresh = () => {
    fetchOrders();
    toast.success(tc('listUpdated'));
  };

  // Sort state
  const [sortKey, setSortKey] = useState('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = useCallback((key: string) => {
    setSortDir(prev => sortKey === key ? (prev === 'asc' ? 'desc' : 'asc') : 'asc');
    setSortKey(key);
  }, [sortKey]);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' ||
      order.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.client.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'code': cmp = a.code.localeCompare(b.code); break;
        case 'client': cmp = a.client.name.localeCompare(b.client.name); break;
        case 'orderDate': cmp = a.orderDate.getTime() - b.orderDate.getTime(); break;
        case 'total': cmp = a.total - b.total; break;
        default: cmp = 0;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [filteredOrders, sortKey, sortDir]);

  // Column definitions
  const orderColumns = useMemo<DataGridColumn<Order>[]>(() => [
    {
      key: 'code',
      label: t('columns.orderNumber'),
      sortable: true,
      width: 150,
      cellRenderer: (order) => (
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDotColors[order.status]}`} />
          <span className="text-[13px] text-foreground font-mono">{order.code}</span>
        </div>
      ),
    },
    {
      key: 'client',
      label: t('columns.client'),
      sortable: true,
      width: 'flex',
      cellRenderer: (order) => (
        <div className="text-[13px] text-foreground font-medium truncate">{order.client.name}</div>
      ),
    },
    {
      key: 'vendor',
      label: t('columns.vendor'),
      width: 140,
      hiddenOnMobile: true,
      cellRenderer: (order) => <span className="text-[13px] text-muted-foreground truncate block">{order.user.name}</span>,
    },
    {
      key: 'orderDate',
      label: t('columns.date'),
      sortable: true,
      width: 120,
      cellRenderer: (order) => (
        <div className="text-[12px] text-muted-foreground whitespace-nowrap tabular-nums">
          <div>{order.orderDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div className="text-[11px] text-muted-foreground">{order.orderDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: t('columns.status'),
      width: 90,
      cellRenderer: (order) => (
        <span className={`text-[12px] font-medium whitespace-nowrap ${statusTextColors[order.status]}`}>
          {t(`status.${order.status === 'en_route' ? 'enRoute' : order.status}`)}
        </span>
      ),
    },
    {
      key: 'tipoVenta',
      label: t('columns.type'),
      width: 85,
      hiddenOnMobile: true,
      cellRenderer: (order) => (
        <span className={`text-[12px] whitespace-nowrap ${order.tipoVenta === 1 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {order.tipoVenta === 1 ? t('filters.directSale') : t('filters.preventa')}
        </span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      width: 90,
      align: 'right',
      cellRenderer: (order) => (
        <span className="text-[13px] text-foreground font-semibold whitespace-nowrap tabular-nums">
          {formatCurrency(order.total)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: tc('actions'),
      width: 180,
      align: 'center',
      cellRenderer: (order) => {
        const nextAction = getNextAction(order.apiEstado);
        const canCancel = cancellableEstados.has(order.apiEstado || '');
        return (
          <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
            {canAdvanceOrders && nextAction && (
              <button
                onClick={() => handleAdvanceStatus(order.id, nextAction.action)}
                className={`flex items-center gap-0.5 text-[11px] px-2.5 py-1 rounded font-semibold transition-colors whitespace-nowrap ${nextAction.colorClasses}`}
              >
                {nextAction.action === 'confirmar' ? t('actions.confirm') : nextAction.action === 'en-ruta' ? t('actions.sendToRoute') : t('actions.deliver')}
              </button>
            )}
            {order.status === 'delivered' && (() => {
              const inv = invoicedOrders[parseInt(order.id)];
              return inv ? (
                <button
                  onClick={() => router.push(`/billing/invoices/${inv.facturaId}`)}
                  className="text-[11px] px-2.5 py-1 rounded font-medium text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <FileText className="w-3 h-3" />
                  {t('actions.viewInvoice')}
                </button>
              ) : (
                <button
                  onClick={() => handleFacturar(order.id)}
                  className="text-[11px] px-2.5 py-1 rounded font-medium text-emerald-700 border border-emerald-200 hover:bg-emerald-50 transition-colors whitespace-nowrap"
                >
                  {t('actions.invoice')}
                </button>
              );
            })()}
            <div className="flex items-center gap-0.5 border border-border-subtle rounded-md px-0.5 py-0.5">
              {canAdvanceOrders && canCancel && (
                <button onClick={() => handleCancelOrderStatus(order.id)} className="p-1 hover:bg-red-50 rounded transition-colors" title={t('actions.cancelOrder')}>
                  <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                </button>
              )}
              <button onClick={() => handleDeleteOrder(order.id)} className="p-1 hover:bg-red-50 rounded transition-colors" title={tc('delete')}>
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
              </button>
            </div>
          </div>
        );
      },
    },
  ], [canAdvanceOrders, formatCurrency, invoicedOrders]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: tc('home'), href: '/dashboard' },
          { label: t('title') },
        ]}
        title={t('title')}
        subtitle={totalItems > 0 ? t('orderCount', { count: totalItems, plural: totalItems !== 1 ? 's' : '' }) : undefined}
        actions={
          <>
            <ExportButton entity="pedidos" params={{ desde: fechaDesde, hasta: fechaHasta }} />
            <button
              data-tour="orders-create-btn"
              onClick={handleCreateOrder}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newOrder')}</span>
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
              placeholder={t('searchPlaceholder')}
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
              className="px-3 py-2 h-10 text-[13px] text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">{t('filters.allStatuses')}</option>
              <option value="Borrador">{t('status.draft')}</option>
              <option value="Confirmado">{t('status.confirmed')}</option>
              <option value="EnRuta">{t('status.enRoute')}</option>
              <option value="Entregado">{t('status.delivered')}</option>
              <option value="Cancelado">{t('status.cancelled')}</option>
            </select>

            {/* Users Filter - solo visible para Admin */}
            {isAdmin && (
            <div className="min-w-[200px] max-w-[260px]" data-tour="orders-user-filter">
              <SearchableSelect
                options={[
                  { value: 'all', label: t('filters.allVendors') },
                  ...usuarios.map(u => ({ value: u.id.toString(), label: u.nombre })),
                ]}
                value={filterUser}
                onChange={(val) => { setFilterUser(val ? String(val) : 'all'); setCurrentPage(1); }}
                placeholder={t('filters.allVendors')}
              />
            </div>
            )}

            {/* Tipo Venta Filter */}
            <select
              data-tour="orders-tipo-filter"
              value={tipoVentaFilter}
              onChange={(e) => { setTipoVentaFilter(e.target.value as '' | '0' | '1'); setCurrentPage(1); }}
              className="px-3 py-2 h-10 text-[13px] text-foreground/80 border border-border-default rounded-lg hover:bg-surface-1 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">{t('filters.allTypes')}</option>
              <option value="0">{t('filters.preventa')}</option>
              <option value="1">{t('filters.directSale')}</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-medium text-success-foreground bg-success rounded-lg hover:bg-success/90 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tc('refresh')}</span>
            </button>
          </div>
            {/* Orders DataGrid */}
            <div data-tour="orders-table">
              <DataGrid<Order>
                columns={orderColumns}
                data={sortedOrders}
                keyExtractor={(o) => o.id}
                loading={loading}
                loadingMessage={t('loadingOrders')}
                emptyIcon={<FileText className="w-16 h-16" />}
                emptyTitle={t('emptyTitle')}
                emptyMessage={t('emptyMessage')}
                onRowClick={(order) => order.apiEstado === 'Borrador' ? handleEditOrder(order.id) : handleViewDetails(order.id)}
                sort={{
                  key: sortKey,
                  direction: sortDir,
                  onSort: handleSort,
                }}
                pagination={totalItems > 0 ? {
                  currentPage,
                  totalPages,
                  totalItems,
                  pageSize,
                  onPageChange: setCurrentPage,
                } : undefined}
                mobileCardRenderer={(order) => {
                  const nextAction = getNextAction(order.apiEstado);
                  const canCancel = cancellableEstados.has(order.apiEstado || '');
                  return (
                    <>
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <ShoppingCartIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{order.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{order.client.name}</p>
                        </div>
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${statusDotColors[order.status]}`} />
                          <span className={`text-[11px] font-medium whitespace-nowrap ${statusTextColors[order.status]}`}>{t(`status.${order.status === 'en_route' ? 'enRoute' : order.status}`)}</span>
                        </span>
                      </div>
                      <div className="flex justify-end mt-1">
                        <span className={`text-[10px] font-medium ${order.tipoVenta === 1 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                          {order.tipoVenta === 1 ? t('filters.directSale') : t('filters.preventa')}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2.5">
                        <span className="font-medium text-foreground">${formatCurrency(order.total)}</span>
                        <span>•</span>
                        <span>{formatDate(order.orderDate, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{order.user.name}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t border-border-subtle pt-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleViewDetails(order.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-blue-600 hover:bg-blue-50 rounded">
                          <Eye className="w-3.5 h-3.5 text-blue-400" /> {t('view')}
                        </button>
                        {/* Regla de negocio: editar y borrar solo en Borrador — backend rechaza cualquier otro estado con 400/409. */}
                        {order.apiEstado === 'Borrador' && (
                          <>
                            <button onClick={() => handleEditOrder(order.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-green-600 hover:bg-green-50 rounded">
                              <Edit className="w-3.5 h-3.5 text-amber-400" /> {t('editOrder')}
                            </button>
                            <button onClick={() => handleDeleteOrder(order.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5 text-red-400" /> {tc('delete')}
                            </button>
                          </>
                        )}
                        {order.status === 'delivered' && (() => {
                          const inv = invoicedOrders[parseInt(order.id)];
                          return inv ? (
                            <button onClick={() => router.push(`/billing/invoices/${inv.facturaId}`)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <FileText className="w-3.5 h-3.5 text-blue-500" /> {t('actions.viewInvoice')}
                            </button>
                          ) : (
                            <button onClick={() => handleFacturar(order.id)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-foreground/70 hover:text-emerald-600 hover:bg-emerald-50 rounded">
                              <Receipt className="w-3.5 h-3.5 text-emerald-500" weight="bold" /> {t('actions.invoice')}
                            </button>
                          );
                        })()}
                      </div>
                      {canAdvanceOrders && (nextAction || canCancel) && (
                        <div className="flex items-center gap-2 border-t border-border-subtle pt-2 mt-1" onClick={(e) => e.stopPropagation()}>
                          {nextAction && (
                            <button onClick={() => handleAdvanceStatus(order.id, nextAction.action)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${nextAction.colorClasses}`}>
                              <ChevronRight className="w-3 h-3" /> {nextAction.action === 'confirmar' ? t('actions.confirm') : nextAction.action === 'en-ruta' ? t('actions.sendToRoute') : t('actions.deliver')}
                            </button>
                          )}
                          {canCancel && (
                            <button onClick={() => handleCancelOrderStatus(order.id)} className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                              <X className="w-3 h-3" /> {t('actions.cancelOrder')}
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  );
                }}
              />
            </div>
      </PageHeader>

      {/* Drawer lateral para crear/editar pedidos */}
      <Drawer
        ref={drawerRef}
        isOpen={showOrderForm}
        onClose={() => {
          setShowOrderForm(false);
          setEditingOrder(null);
          setIsViewOnlyMode(false);
          setFormIsDirty(false);
        }}
        title={
          !editingOrder
            ? t('drawerTitleNew')
            : isViewOnlyMode
              ? t('drawerTitleView')
              : t('drawerTitleEdit')
        }
        icon={<ShoppingCart className="w-5 h-5 text-green-600" />}
        width="lg"
        isDirty={isViewOnlyMode ? false : formIsDirty}
        onSave={isViewOnlyMode ? undefined : () => orderFormRef.current?.submit()}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => drawerRef.current?.requestClose()}>
              {isViewOnlyMode ? tc('close') : tc('cancel')}
            </Button>
            {!isViewOnlyMode && (
              <Button type="button" variant="success" onClick={() => orderFormRef.current?.submit()} className="flex items-center gap-2">
                {editingOrder ? t('saveChanges') : t('createOrder')}
              </Button>
            )}
          </div>
        }
      >
        <OrderForm
          ref={orderFormRef}
          order={editingOrder}
          readOnly={isViewOnlyMode}
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

      {/* Modal: cancelar pedido con motivo (reemplaza window.prompt() nativo) */}
      <Modal
        isOpen={cancelOrderId !== null}
        onClose={() => {
          if (!cancelLoading) {
            setCancelOrderId(null);
            setCancelReasonText('');
          }
        }}
        title={t('cancelReason')}
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            autoFocus
            rows={3}
            className="w-full rounded-md border border-border-default bg-surface-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            placeholder={t('cancelReasonPlaceholder') || 'Motivo de la cancelación...'}
            value={cancelReasonText}
            onChange={(e) => setCancelReasonText(e.target.value)}
            disabled={cancelLoading}
          />
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCancelOrderId(null);
                setCancelReasonText('');
              }}
              disabled={cancelLoading}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={submitCancelOrder}
              disabled={cancelLoading}
            >
              {cancelLoading ? tc('loading') : t('confirmCancelOrder') || 'Cancelar pedido'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: confirmar eliminación de pedido Borrador (reemplaza window.confirm()). */}
      <Modal
        isOpen={deleteOrderId !== null}
        onClose={() => { if (!deleteLoading) setDeleteOrderId(null); }}
        title={tc('delete')}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">{t('confirmDelete')}</p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setDeleteOrderId(null)} disabled={deleteLoading}>
              {tc('cancel')}
            </Button>
            <Button type="button" variant="destructive" onClick={submitDeleteOrder} disabled={deleteLoading}>
              {deleteLoading ? tc('loading') : tc('delete')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
