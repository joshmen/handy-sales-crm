import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  PaginatedApiResponseSchema,
  MobileClienteSchema,
  ClienteLocationSchema,
} from './schemas';
import { z } from 'zod';
import type { ApiResponse, PaginatedApiResponse, MobileCliente } from '@/types';
import type { ClienteCreateRequest } from '@/types/client';

const ClienteResponseSchema = ApiResponseSchema(MobileClienteSchema);
const ClienteListResponseSchema = PaginatedApiResponseSchema(MobileClienteSchema);
const ClienteLocationResponseSchema = ApiResponseSchema(ClienteLocationSchema);
const ClienteArrayResponseSchema = ApiResponseSchema(z.array(MobileClienteSchema));

interface ClientListParams {
  busqueda?: string;
  zonaId?: number;
  pagina?: number;
  porPagina?: number;
}

class MobileClientesApi {
  private basePath = '/api/mobile/clientes';

  async list(params: ClientListParams = {}) {
    const qs = new URLSearchParams();
    qs.append('pagina', String(params.pagina || 1));
    qs.append('porPagina', String(params.porPagina || 20));
    if (params.busqueda) qs.append('busqueda', params.busqueda);
    if (params.zonaId) qs.append('zonaId', String(params.zonaId));

    const response = await api.get<PaginatedApiResponse<MobileCliente>>(
      `${this.basePath}?${qs}`
    );
    const validated = validateResponse(
      ClienteListResponseSchema,
      response.data,
      'GET /api/mobile/clientes'
    );
    return {
      data: validated.data,
      pagination: validated.pagination,
    };
  }

  async getById(id: number): Promise<MobileCliente> {
    const response = await api.get<ApiResponse<MobileCliente>>(
      `${this.basePath}/${id}`
    );
    const validated = validateResponse(
      ClienteResponseSchema,
      response.data,
      `GET /api/mobile/clientes/${id}`
    );
    return validated.data;
  }

  async getLocation(id: number) {
    const response = await api.get<ApiResponse<{ latitud: number; longitud: number; direccion: string }>>(
      `${this.basePath}/${id}/ubicacion`
    );
    const validated = validateResponse(
      ClienteLocationResponseSchema,
      response.data,
      `GET /api/mobile/clientes/${id}/ubicacion`
    );
    return validated.data;
  }

  async create(data: ClienteCreateRequest): Promise<MobileCliente> {
    const response = await api.post<ApiResponse<MobileCliente>>(
      this.basePath,
      data
    );
    const validated = validateResponse(
      ClienteResponseSchema,
      response.data,
      'POST /api/mobile/clientes'
    );
    return validated.data;
  }

  async update(id: number, data: ClienteCreateRequest): Promise<MobileCliente> {
    const response = await api.put<ApiResponse<MobileCliente>>(
      `${this.basePath}/${id}`,
      data
    );
    const validated = validateResponse(
      ClienteResponseSchema,
      response.data,
      `PUT /api/mobile/clientes/${id}`
    );
    return validated.data;
  }

  async getNearby(latitud: number, longitud: number, radioKm: number) {
    const response = await api.get<ApiResponse<MobileCliente[]>>(
      `${this.basePath}/cercanos?latitud=${latitud}&longitud=${longitud}&radioKm=${radioKm}`
    );
    const validated = validateResponse(
      ClienteArrayResponseSchema,
      response.data,
      'GET /api/mobile/clientes/cercanos'
    );
    return validated.data;
  }
}

export const clientesApi = new MobileClientesApi();
