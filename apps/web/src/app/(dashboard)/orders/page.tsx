'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Drawer, DrawerHandle } from '@/components/ui/Drawer';
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
  Tag,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  Search,
  FileText,
  Edit,
  Trash2,
  Eye,
  ClipboardList,
  ShoppingCart,
  Check,
  Loader2,
} from 'lucide-react';
import { ShoppingCart as ShoppingCartIcon } from '@phosphor-icons/react';

// Mapeo de estados de API a estados del componente
const estadoToStatus: Record<string, Order['status']> = {
  'Borrador': 'draft',
  'Enviado': 'pending',
  'Confirmado': 'confirmed',
  'EnProceso': 'in_progress',
  'EnRuta': 'in_progress',
  'Entregado': 'delivered',
  'Cancelado': 'cancelled',
};

const statusLabels: Record<string, string> = {
  'draft': 'Borrador',
  'pending': 'Pendiente',
  'confirmed': 'Confirmado',
  'in_progress': 'En proceso',
  'delivered': 'Entregado',
  'cancelled': 'Cancelado',
};

const statusColors: Record<string, string> = {
  'draft': 'bg-gray-100 text-gray-600',
  'pending': 'bg-yellow-100 text-yellow-600',
  'confirmed': 'bg-blue-100 text-blue-600',
  'in_progress': 'bg-purple-100 text-purple-600',
  'delivered': 'bg-green-100 text-green-600',
  'cancelled': 'bg-red-100 text-red-600',
};

function mapApiOrderToOrder(apiOrder: OrderListItem): Order {
  const status = estadoToStatus[apiOrder.estado] || 'pending';

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
    createdAt: new Date(apiOrder.creadoEn),
    updatedAt: new Date(apiOrder.creadoEn),
  };
}

interface UsuarioOption {
  id: number;
  nombre: string;
}

export default function OrdersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN';

  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [activeTab, setActiveTab] = useState<'lista' | 'mapa'>('lista');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const orderFormRef = useRef<OrderFormHandle>(null);
  const drawerRef = useRef<DrawerHandle>(null);
  const [formIsDirty, setFormIsDirty] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioOption[]>([]);

  // Calcular total de montos
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { page: number; pageSize: number; usuarioId?: number } = { page: currentPage, pageSize };
      if (filterUser !== 'all') params.usuarioId = parseInt(filterUser);
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
  }, [currentPage, filterUser]);

  const fetchFormData = useCallback(async () => {
    try {
      const [clientsResponse, productsResponse] = await Promise.all([
        clientService.getClients({ limit: 100 }),
        productService.getProducts({ limit: 100 }),
      ]);
      setClients(clientsResponse.clients || []);
      setProducts(productsResponse.products || []);
    } catch (err) {
      console.error('Error al cargar datos del formulario:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchFormData();
  }, [fetchOrders, fetchFormData]);

  // Cargar lista de vendedores (solo para admin)
  useEffect(() => {
    if (!isAdmin) return;
    api.get<{ items: UsuarioOption[] } | UsuarioOption[]>('/usuarios?pagina=1&tamanoPagina=500')
      .then(res => {
        const data = res.data;
        const items = Array.isArray(data) ? data : data.items || [];
        setUsuarios(items);
      })
      .catch(() => {});
  }, [isAdmin]);

  const handleCreateOrder = () => {
    setEditingOrder(null);
    setShowOrderForm(true);
  };

  const handleEditOrder = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setEditingOrder(order);
      setShowOrderForm(true);
    }
  };

  const handleViewDetails = async (orderId: string) => {
    try {
      const orderDetail = await orderService.getOrderById(parseInt(orderId));
      toast.info(`Pedido ${orderDetail.numeroPedido} - Total: $${orderDetail.total.toFixed(2)}`);
    } catch (err) {
      toast.error('Error al cargar los detalles del pedido');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pedido?')) {
      try {
        await orderService.deleteOrder(parseInt(orderId));
        setOrders(orders.filter(o => o.id !== orderId));
        toast.success('Pedido eliminado correctamente');
      } catch (err) {
        toast.error('Error al eliminar el pedido');
      }
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
        toast.success('Pedido creado correctamente');
      }
      await fetchOrders();
      setShowOrderForm(false);
      setEditingOrder(null);
    } catch (err) {
      toast.error('Error al guardar el pedido');
    }
  };

  const handleRefresh = () => {
    fetchOrders();
    toast.success('Lista actualizada');
  };

  // Pagination
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
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
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="bg-white px-4 py-4 sm:px-8 sm:py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-[13px] mb-4">
            <span className="text-gray-500">Tablero</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-900">Pedidos</span>
          </div>

          {/* Title Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3" data-tour="orders-total">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                Pedidos
              </h1>
              <span className="text-base text-gray-600">
                $ {totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                data-tour="orders-create-btn"
                onClick={handleCreateOrder}
                className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo pedido</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                <Tag className="w-4 h-4 text-amber-500" />
                <span>Promociones</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                <Download className="w-4 h-4 text-emerald-500" />
                <span>Descargar</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex items-center gap-3 mb-4">
            {/* Date Filter */}
            <button data-tour="orders-date-filter" className="flex items-center justify-between gap-2 px-3 py-2 h-10 min-w-[260px] text-[11px] text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
              <span>03/05/2025 00:00:00 - 03/05/2025 23:59:59</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {/* Users Filter - solo visible para Admin */}
            {isAdmin && (
            <div className="flex-1" data-tour="orders-user-filter">
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

            {/* More Filters Button */}
            <button className="flex items-center gap-2 px-4 py-2 h-10 text-[13px] font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
              <Filter className="w-4 h-4 text-violet-500" />
              <span>Más filtros</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 h-10 text-[13px] font-medium text-white bg-green-600 rounded hover:bg-green-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 text-blue-500" />
              <span>Actualizar</span>
            </button>
          </div>

          {/* Tabs Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setActiveTab('lista')}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === 'lista'
                    ? 'text-green-600 border-green-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Lista
              </button>
              <button
                onClick={() => setActiveTab('mapa')}
                className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  activeTab === 'mapa'
                    ? 'text-green-600 border-green-600'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                Mapa
              </button>
            </div>
            <div className="relative w-64" data-tour="orders-search">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="text"
                placeholder="Buscar pedido por ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {error && (
            <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button onClick={fetchOrders} className="ml-4 underline hover:no-underline">
                Reintentar
              </button>
            </div>
          )}

          <div className="px-4 py-4 sm:px-8 sm:py-6">
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
                    Cambia los filtros o{' '}
                    <span className="text-green-600 cursor-pointer" onClick={handleCreateOrder}>
                      crea un pedido
                    </span>
                  </p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    {/* Row 1: Icon + Order number + status */}
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <ShoppingCartIcon className="w-5 h-5 text-blue-600" weight="duotone" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {order.code}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{order.client.name}</p>
                      </div>
                      <span className={`px-2 py-1 text-[11px] font-medium rounded-full whitespace-nowrap ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    {/* Row 2: Metrics */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-2.5">
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-gray-900">
                          ${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                      </span>
                      <span>•</span>
                      <span>{order.orderDate.toLocaleDateString('es-MX')}</span>
                      <span>•</span>
                      <span>{order.user.name}</span>
                    </div>
                    {/* Row 3: Actions */}
                    <div className="flex items-center justify-end gap-1 border-t border-gray-100 pt-2">
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
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Orders Table */}
            <div className="hidden sm:block bg-white border border-gray-200 rounded-lg overflow-x-auto" data-tour="orders-table">
              {/* Table Header - Always visible */}
              <div className="flex items-center bg-gray-50 px-4 h-10 border-b border-gray-200 min-w-[820px]">
                <div className="w-[100px] text-xs font-semibold text-gray-700"># Pedido</div>
                <div className="flex-1 text-xs font-semibold text-gray-700">Cliente</div>
                <div className="w-[120px] text-xs font-semibold text-gray-700">Vendedor</div>
                <div className="w-[100px] text-xs font-semibold text-gray-700">Fecha</div>
                <div className="w-[100px] text-xs font-semibold text-gray-700">Estado</div>
                <div className="w-[100px] text-xs font-semibold text-gray-700 text-right">Total</div>
                <div className="w-[100px] text-xs font-semibold text-gray-700 text-center">Acciones</div>
              </div>

              {/* Table Body - With loading overlay */}
              <div className="relative min-h-[200px]">
                {/* Loading Overlay */}
                {loading && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center transition-opacity duration-200">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      <span className="text-sm text-gray-500">Cargando pedidos...</span>
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!loading && filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <FileText className="w-16 h-16 text-violet-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron resultados</h3>
                    <p className="text-sm text-gray-500 text-center">
                      Cambia los filtros o{' '}
                      <span className="text-green-600 cursor-pointer">captura un pedido desde tu teléfono</span>
                      . También puedes{' '}
                      <span className="text-green-600 cursor-pointer" onClick={handleCreateOrder}>crear un pedido</span>
                    </p>
                  </div>
                ) : (
                  /* Table Rows - With opacity transition */
                  <div className={`transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors min-w-[820px]"
                  >
                    <div className="w-[100px] text-[13px] text-gray-900 font-medium">
                      {order.code}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] text-gray-900">{order.client.name}</div>
                    </div>
                    <div className="w-[120px] text-[13px] text-gray-600">
                      {order.user.name}
                    </div>
                    <div className="w-[100px] text-[13px] text-gray-600">
                      {order.orderDate.toLocaleDateString('es-MX')}
                    </div>
                    <div className="w-[100px]">
                      <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <div className="w-[100px] text-[13px] text-gray-900 font-medium text-right">
                      ${order.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="w-[100px] flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="p-1.5 hover:bg-blue-50 rounded transition-colors"
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4 text-blue-400 hover:text-blue-600" />
                      </button>
                      <button
                        onClick={() => handleEditOrder(order.id)}
                        className="p-1.5 hover:bg-green-50 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-amber-400 hover:text-amber-600" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-red-400 hover:text-red-600" />
                      </button>
                    </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination - Always visible when there are orders */}
            {(filteredOrders.length > 0 || loading) && totalItems > 0 && (
              <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-4 transition-opacity duration-200 ${loading ? 'opacity-60' : 'opacity-100'}`}>
                <span className="text-sm text-gray-500" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Mostrando {startItem}-{endItem} de {totalItems} pedidos
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1 || loading}
                    className="px-3 py-2 border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {getPageNumbers().map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() => typeof page === 'number' && !loading && setCurrentPage(page)}
                        disabled={page === '...' || loading}
                        className={`min-w-[32px] px-2 py-1 text-sm rounded-md transition-colors ${
                          page === currentPage
                            ? 'bg-green-600 text-white'
                            : page === '...'
                            ? 'text-gray-400 cursor-default'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages || loading}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
            <button
              type="button"
              onClick={() => drawerRef.current?.requestClose()}
              className="px-5 py-2.5 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => orderFormRef.current?.submit()}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              {editingOrder ? 'Actualizar Pedido' : 'Crear Pedido'}
            </button>
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
