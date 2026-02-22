import { api } from './client';
import type { ApiResponse, PaginatedApiResponse, MobileCliente } from '@/types';
import type { ClienteCreateRequest } from '@/types/client';

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
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  }

  async getById(id: number): Promise<MobileCliente> {
    const response = await api.get<ApiResponse<MobileCliente>>(
      `${this.basePath}/${id}`
    );
    return response.data.data;
  }

  async getLocation(id: number) {
    const response = await api.get<ApiResponse<{ latitud: number; longitud: number; direccion: string }>>(
      `${this.basePath}/${id}/ubicacion`
    );
    return response.data.data;
  }

  async create(data: ClienteCreateRequest): Promise<MobileCliente> {
    const response = await api.post<ApiResponse<MobileCliente>>(
      this.basePath,
      data
    );
    return response.data.data;
  }

  async getNearby(latitud: number, longitud: number, radioKm: number) {
    const response = await api.get<ApiResponse<MobileCliente[]>>(
      `${this.basePath}/cercanos?latitud=${latitud}&longitud=${longitud}&radioKm=${radioKm}`
    );
    return response.data.data;
  }
}

export const clientesApi = new MobileClientesApi();
