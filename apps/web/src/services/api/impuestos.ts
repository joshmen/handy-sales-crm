import { api, handleApiError } from '@/lib/api';

export interface TasaImpuesto {
  id: number;
  tenantId: number;
  nombre: string;
  /** Decimal — 0.16 = 16%. */
  tasa: number;
  esDefault: boolean;
  activo: boolean;
  productosCount: number;
}

export interface TasaImpuestoCreateRequest {
  nombre: string;
  tasa: number;
  esDefault?: boolean;
}

export interface TasaImpuestoUpdateRequest {
  nombre?: string;
  tasa?: number;
  esDefault?: boolean;
  activo?: boolean;
}

class ImpuestosService {
  private readonly basePath = '/api/impuestos';

  async getTasas(incluirInactivas = false): Promise<TasaImpuesto[]> {
    try {
      const response = await api.get<TasaImpuesto[]>(
        `${this.basePath}?incluirInactivas=${incluirInactivas}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getTasa(id: number): Promise<TasaImpuesto> {
    try {
      const response = await api.get<TasaImpuesto>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createTasa(data: TasaImpuestoCreateRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateTasa(id: number, data: TasaImpuestoUpdateRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteTasa(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const impuestosService = new ImpuestosService();
