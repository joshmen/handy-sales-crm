import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  PaginatedApiResponseSchema,
  MobilePedidoSchema,
  MobileDetallePedidoSchema,
} from './schemas';
import { z } from 'zod';
import type {
  ApiResponse,
  PaginatedApiResponse,
  MobilePedido,
  PedidoCreateRequest,
  DetallePedidoCreateRequest,
  MobileDetallePedido,
} from '@/types';

const PedidoResponseSchema = ApiResponseSchema(MobilePedidoSchema);
const PedidoListResponseSchema = PaginatedApiResponseSchema(MobilePedidoSchema);
const PedidoArrayResponseSchema = ApiResponseSchema(z.array(MobilePedidoSchema));
const DetalleResponseSchema = ApiResponseSchema(MobileDetallePedidoSchema);

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
    const validated = validateResponse(
      PedidoListResponseSchema,
      response.data,
      'GET /api/mobile/pedidos/mis-pedidos'
    );
    return {
      data: validated.data,
      pagination: validated.pagination,
    };
  }

  async getById(id: number): Promise<MobilePedido> {
    const response = await api.get<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}`
    );
    const validated = validateResponse(
      PedidoResponseSchema,
      response.data,
      `GET /api/mobile/pedidos/${id}`
    );
    return validated.data;
  }

  async getByCliente(clienteId: number) {
    const response = await api.get<ApiResponse<MobilePedido[]>>(
      `${this.basePath}/cliente/${clienteId}`
    );
    const validated = validateResponse(
      PedidoArrayResponseSchema,
      response.data,
      `GET /api/mobile/pedidos/cliente/${clienteId}`
    );
    return validated.data;
  }

  async create(data: PedidoCreateRequest): Promise<MobilePedido> {
    const response = await api.post<ApiResponse<MobilePedido>>(
      this.basePath,
      data
    );
    const validated = validateResponse(
      PedidoResponseSchema,
      response.data,
      'POST /api/mobile/pedidos'
    );
    return validated.data;
  }

  async update(id: number, data: Partial<PedidoCreateRequest>): Promise<MobilePedido> {
    const response = await api.put<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}`,
      data
    );
    const validated = validateResponse(
      PedidoResponseSchema,
      response.data,
      `PUT /api/mobile/pedidos/${id}`
    );
    return validated.data;
  }

  async delete(id: number): Promise<void> {
    await api.delete(`${this.basePath}/${id}`);
  }

  async enviar(id: number): Promise<MobilePedido> {
    const response = await api.post<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}/enviar`
    );
    const validated = validateResponse(
      PedidoResponseSchema,
      response.data,
      `POST /api/mobile/pedidos/${id}/enviar`
    );
    return validated.data;
  }

  async confirmar(id: number): Promise<void> {
    await api.post(`${this.basePath}/${id}/confirmar`);
  }

  async procesar(id: number): Promise<void> {
    await api.post(`${this.basePath}/${id}/procesar`);
  }

  async enRuta(id: number): Promise<void> {
    await api.post(`${this.basePath}/${id}/en-ruta`);
  }

  async entregar(id: number, notasEntrega?: string): Promise<void> {
    await api.post(`${this.basePath}/${id}/entregar`, { notasEntrega });
  }

  async cancelar(id: number, razon: string): Promise<MobilePedido> {
    const response = await api.post<ApiResponse<MobilePedido>>(
      `${this.basePath}/${id}/cancelar`,
      { razon }
    );
    const validated = validateResponse(
      PedidoResponseSchema,
      response.data,
      `POST /api/mobile/pedidos/${id}/cancelar`
    );
    return validated.data;
  }

  async addProducto(pedidoId: number, data: DetallePedidoCreateRequest): Promise<MobileDetallePedido> {
    const response = await api.post<ApiResponse<MobileDetallePedido>>(
      `${this.basePath}/${pedidoId}/productos`,
      data
    );
    const validated = validateResponse(
      DetalleResponseSchema,
      response.data,
      `POST /api/mobile/pedidos/${pedidoId}/productos`
    );
    return validated.data;
  }

  async updateProducto(pedidoId: number, detalleId: number, data: Partial<DetallePedidoCreateRequest>): Promise<MobileDetallePedido> {
    const response = await api.put<ApiResponse<MobileDetallePedido>>(
      `${this.basePath}/${pedidoId}/productos/${detalleId}`,
      data
    );
    const validated = validateResponse(
      DetalleResponseSchema,
      response.data,
      `PUT /api/mobile/pedidos/${pedidoId}/productos/${detalleId}`
    );
    return validated.data;
  }

  async removeProducto(pedidoId: number, detalleId: number): Promise<void> {
    await api.delete(`${this.basePath}/${pedidoId}/productos/${detalleId}`);
  }
}

export const pedidosApi = new MobilePedidosApi();
