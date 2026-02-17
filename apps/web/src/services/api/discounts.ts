// src/services/api/discounts.ts
import { api, handleApiError } from '@/lib/api';
import {
  Discount,
  DiscountType,
  DiscountMethod,
  DiscountStatus,
  CreateDiscountDto,
  UpdateDiscountDto,
  DiscountFilters
} from '@/types/discounts';

// ============ TIPOS DEL BACKEND ============

export interface DiscountDto {
  id: number;
  nombre: string;
  descripcion?: string;
  tipoDescuento: 'Global' | 'PorProducto';
  productoId?: number;
  productoNombre?: string;
  cantidadMinima: number;
  cantidadMaxima?: number;
  porcentajeDescuento: number;
  activo: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface CreateDiscountRequest {
  nombre: string;
  descripcion?: string;
  tipoDescuento: 'Global' | 'PorProducto';
  productoId?: number;
  cantidadMinima: number;
  cantidadMaxima?: number;
  porcentajeDescuento: number;
  activo?: boolean;
  fechaInicio?: string;
  fechaFin?: string;
}

export type UpdateDiscountRequest = Partial<CreateDiscountRequest>;

// ============ SERVICIO ============

class DiscountService {
  private readonly basePath = '/descuentos';

  async getDiscounts(): Promise<DiscountDto[]> {
    try {
      const response = await api.get<DiscountDto[]>(this.basePath);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getDiscountById(id: number): Promise<DiscountDto> {
    try {
      const response = await api.get<DiscountDto>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getDiscountsByProduct(productoId: number): Promise<DiscountDto[]> {
    try {
      const response = await api.get<DiscountDto[]>(
        `${this.basePath}/por-producto/${productoId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createDiscount(data: CreateDiscountRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateDiscount(id: number, data: UpdateDiscountRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteDiscount(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Helpers para filtrar en el cliente
  getActiveDiscounts(discounts: DiscountDto[]): DiscountDto[] {
    const now = new Date();
    return discounts.filter(d => {
      if (!d.activo) return false;
      if (d.fechaInicio && new Date(d.fechaInicio) > now) return false;
      if (d.fechaFin && new Date(d.fechaFin) < now) return false;
      return true;
    });
  }

  getGlobalDiscounts(discounts: DiscountDto[]): DiscountDto[] {
    return discounts.filter(d => d.tipoDescuento === 'Global');
  }

  getProductDiscounts(discounts: DiscountDto[]): DiscountDto[] {
    return discounts.filter(d => d.tipoDescuento === 'PorProducto');
  }

  // Calcular descuento aplicable para una cantidad
  calculateDiscount(
    discounts: DiscountDto[],
    quantity: number,
    productoId?: number
  ): DiscountDto | null {
    const activeDiscounts = this.getActiveDiscounts(discounts);

    // Primero buscar descuento por producto
    if (productoId) {
      const productDiscount = activeDiscounts.find(d =>
        d.tipoDescuento === 'PorProducto' &&
        d.productoId === productoId &&
        quantity >= d.cantidadMinima &&
        (!d.cantidadMaxima || quantity <= d.cantidadMaxima)
      );
      if (productDiscount) return productDiscount;
    }

    // Luego buscar descuento global
    const globalDiscount = activeDiscounts.find(d =>
      d.tipoDescuento === 'Global' &&
      quantity >= d.cantidadMinima &&
      (!d.cantidadMaxima || quantity <= d.cantidadMaxima)
    );

    return globalDiscount || null;
  }
}

export const discountService = new DiscountService();
export default discountService;
