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

  async confirmar(id: number): Promise<void> {
    await api.post(`${this.basePath}/${id}/confirmar`);
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

  /**
   * B.1 eager-save (fix prod 2026-06-04). Dispara después de crear el pedido
   * en WDB local. Idempotente vía mobileRecordId. NO bloquea UI — el caller
   * debe usarlo con .catch(noop) en fire-and-forget. Si falla por red caída,
   * el sync push normal eventualmente persistirá el pedido al server.
   */
  async eagerSave(payload: PedidoEagerSavePayload): Promise<PedidoEagerSaveResult> {
    const response = await api.post<ApiResponse<PedidoEagerSaveResult>>(
      `${this.basePath}/eager-save`,
      payload,
    );
    const body = response.data;
    if (!body || body.success === false || !body.data) {
      throw new Error(body?.message || 'Eager-save fallo');
    }
    return body.data;
  }
}

export const pedidosApi = new MobilePedidosApi();

// B.1 eager-save payload shape — espejo de PedidoEagerSaveDto del backend.
// Mantenido aquí (no en @/types) porque es exclusivo de la durabilidad path,
// no del CRUD normal de pedidos.
export interface PedidoEagerSaveDetallePayload {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  impuesto: number;
  total: number;
}

export interface PedidoEagerSavePayload {
  mobileRecordId: string;
  clienteId: number;
  fechaPedido: string; // ISO UTC
  tipoVenta: number;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  notas?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  detalles: PedidoEagerSaveDetallePayload[];
}

export interface PedidoEagerSaveResult {
  serverId: number;
  mobileRecordId: string;
  ackedAt: string; // ISO UTC
  estado: number;
  idempotent: boolean;
}
