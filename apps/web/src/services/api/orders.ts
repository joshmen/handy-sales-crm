// src/services/api/orders.ts
import { api, handleApiError, ApiResponse } from '@/lib/api';
import { Order, OrderItem, OrderStatus, OrderFilters } from '@/types';

// ============ TIPOS ============

export interface OrdersListResponse {
  items: OrderListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface OrderListItem {
  id: number;
  numeroPedido: string;
  clienteId: number;
  clienteNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  estado: OrderStatus;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  fechaPedido: string;
  fechaEntregaEstimada?: string;
  totalProductos: number;
  creadoEn: string;
}

export interface OrderDetail {
  id: number;
  numeroPedido: string;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  usuarioId: number;
  usuarioNombre: string;
  estado: OrderStatus;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  fechaPedido: string;
  fechaEntregaEstimada?: string;
  fechaEntregaReal?: string;
  notas?: string;
  notasInternas?: string;
  detalles: OrderDetailItem[];
  creadoEn: string;
  actualizadoEn?: string;
}

export interface OrderDetailItem {
  id: number;
  productoId: number;
  productoNombre: string;
  productoCodigo: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
}

export interface CreateOrderDto {
  clienteId: number;
  fechaEntregaEstimada?: string;
  notas?: string;
  notasInternas?: string;
  detalles: CreateOrderDetailDto[];
}

export interface CreateOrderDetailDto {
  productoId: number;
  cantidad: number;
  precioUnitario?: number;
  descuento?: number;
}

export interface UpdateOrderDto {
  fechaEntregaEstimada?: string;
  notas?: string;
  notasInternas?: string;
}

export interface OrderFilterParams {
  clienteId?: number;
  usuarioId?: number;
  estado?: string;
  fechaInicio?: string;
  fechaFin?: string;
  busqueda?: string;
  page?: number;
  pageSize?: number;
}

// ============ SERVICIO ============

class OrderService {
  private readonly basePath = '/pedidos';

  // CRUD Basico
  async getOrders(params: OrderFilterParams = {}): Promise<OrdersListResponse> {
    try {
      const queryParams = new URLSearchParams();
      // Map frontend param names to backend (Spanish) param names
      const paramMap: Record<string, string> = {
        page: 'pagina',
        pageSize: 'tamanoPagina',
        estado: 'estado',
        clienteId: 'clienteId',
        usuarioId: 'usuarioId',
        fechaInicio: 'fechaDesde',
        fechaFin: 'fechaHasta',
        busqueda: 'busqueda',
      };
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const backendKey = paramMap[key] || key;
          queryParams.append(backendKey, value.toString());
        }
      });

      const response = await api.get<{ items: OrderListItem[]; totalItems: number; pagina: number; tamanoPagina: number }>(
        `${this.basePath}?${queryParams.toString()}`
      );
      // Map backend response to frontend format
      const data = response.data;
      return {
        items: data.items,
        totalCount: data.totalItems,
        page: data.pagina,
        pageSize: data.tamanoPagina,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getOrderById(id: number): Promise<OrderDetail> {
    try {
      const response = await api.get<OrderDetail>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getOrderByNumber(numeroPedido: string): Promise<OrderDetail> {
    try {
      const response = await api.get<OrderDetail>(`${this.basePath}/numero/${numeroPedido}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createOrder(data: CreateOrderDto): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateOrder(id: number, data: UpdateOrderDto): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteOrder(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Filtros especificos
  async getOrdersByClient(clienteId: number): Promise<OrderListItem[]> {
    try {
      const response = await api.get<OrderListItem[]>(`${this.basePath}/cliente/${clienteId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getMyOrders(): Promise<OrderListItem[]> {
    try {
      const response = await api.get<OrderListItem[]>(`${this.basePath}/mis-pedidos`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getOrdersByUser(usuarioId: number): Promise<OrderListItem[]> {
    try {
      const response = await api.get<OrderListItem[]>(`${this.basePath}/usuario/${usuarioId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Cambios de estado (workflow)
  async sendOrder(id: number): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(`${this.basePath}/${id}/enviar`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async confirmOrder(id: number): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(`${this.basePath}/${id}/confirmar`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async processOrder(id: number): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(`${this.basePath}/${id}/procesar`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async sendToRoute(id: number): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(`${this.basePath}/${id}/en-ruta`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deliverOrder(id: number, notas?: string): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(
        `${this.basePath}/${id}/entregar`,
        { notas }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cancelOrder(id: number, notas?: string): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(
        `${this.basePath}/${id}/cancelar`,
        { notas }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Gestion de detalles (lineas de pedido)
  async addOrderDetail(pedidoId: number, detail: CreateOrderDetailDto): Promise<{ mensaje: string }> {
    try {
      const response = await api.post<{ mensaje: string }>(
        `${this.basePath}/${pedidoId}/detalles`,
        detail
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateOrderDetail(
    pedidoId: number,
    detalleId: number,
    detail: CreateOrderDetailDto
  ): Promise<void> {
    try {
      await api.put(`${this.basePath}/${pedidoId}/detalles/${detalleId}`, detail);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteOrderDetail(pedidoId: number, detalleId: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${pedidoId}/detalles/${detalleId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const orderService = new OrderService();
export default orderService;
