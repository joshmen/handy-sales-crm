import { api } from './client';
import type {
  ApiResponse,
  PaginatedApiResponse,
  MobilePedido,
  PedidoCreateRequest,
  DetallePedidoCreateRequest,
  MobileDetallePedido,
} from '@/types';

interface OrderListParams {
  estado?: number;
  pagina?: number;
  porPagina?: number;
}

class MobilePedidosApi {
  private basePath = '/api/mobile/pedidos';

  async misPedidos(params: OrderListParams = {}) {
    const qs = new URLSearchParams();
    qs.append('pagina', String(params.pagina || 1));
    qs.append('porPagina', String(params.porPagina || 20));
    if (params.estado !== undefined) qs.append('estado', String(params.estado));

    const response = await api.get<PaginatedApiResponse<MobilePedido>>(
      `${this.basePath}/mis-pedidos?${qs}`
    );
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  }

  async getById(id: number): Promise<MobilePedido> {
    const response = await api.get<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}`
    );
    return response.data.data;
  }

  async getByCliente(clienteId: number) {
    const response = await api.get<ApiResponse<MobilePedido[]>>(
      `${this.basePath}/cliente/${clienteId}`
    );
    return response.data.data;
  }

  async create(data: PedidoCreateRequest): Promise<MobilePedido> {
    const response = await api.post<ApiResponse<MobilePedido>>(
      this.basePath,
      data
    );
    return response.data.data;
  }

  async update(id: number, data: Partial<PedidoCreateRequest>): Promise<MobilePedido> {
    const response = await api.put<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}`,
      data
    );
    return response.data.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async enviar(id: number): Promise<MobilePedido> {
    const response = await api.post<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}/enviar`
    );
    return response.data.data;
  }

  async cancelar(id: number, razon: string): Promise<MobilePedido> {
    const response = await api.post<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}/cancelar`,
      { razon }
    );
    return response.data.data;
  }

  async addProducto(pedidoId: number, data: DetallePedidoCreateRequest): Promise<MobileDetallePedido> {
    const response = await api.post<ApiResponse<MobileDetallePedido>>(
      `${this.basePath}/${pedidoId}/productos`,
      data
    );
    return response.data.data;
  }

  async updateProducto(pedidoId: number, detalleId: number, data: Partial<DetallePedidoCreateRequest>): Promise<MobileDetallePedido> {
    const response = await api.put<ApiResponse<MobileDetallePedido>>(
      `${this.basePath}/${pedidoId}/productos/${detalleId}`,
      data
    );
    return response.data.data;
  }

  async removeProducto(pedidoId: number, detalleId: number): Promise<void> {
    await api.delete(`${this.basePath}/${pedidoId}/productos/${detalleId}`);
  }
}

export const pedidosApi = new MobilePedidosApi();
