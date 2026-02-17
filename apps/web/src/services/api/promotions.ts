// src/services/api/promotions.ts
import { api, handleApiError } from '@/lib/api';

// ============ TIPOS DEL BACKEND ============

export interface PromocionProductoInfo {
  productoId: number;
  productoNombre: string;
  productoCodigo?: string;
}

export interface PromocionDto {
  id: number;
  nombre: string;
  descripcion: string;
  descuentoPorcentaje: number;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
  productos: PromocionProductoInfo[];
}

export interface PromocionCreateRequest {
  nombre: string;
  descripcion: string;
  productoIds: number[];
  descuentoPorcentaje: number;
  fechaInicio: string;
  fechaFin: string;
}

// ============ SERVICIO ============

class PromotionService {
  private readonly basePath = '/promociones';

  async getPromotions(): Promise<PromocionDto[]> {
    try {
      const response = await api.get<PromocionDto[]>(this.basePath);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getById(id: number): Promise<PromocionDto> {
    try {
      const response = await api.get<PromocionDto>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async create(data: PromocionCreateRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async update(id: number, data: PromocionCreateRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async delete(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggleActive(id: number, activo: boolean): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/activo`, { activo });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async batchToggleActive(ids: number[], activo: boolean): Promise<{ actualizados: number }> {
    try {
      const response = await api.patch<{ actualizados: number }>(`${this.basePath}/batch-toggle`, { ids, activo });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const promotionService = new PromotionService();
export default promotionService;
