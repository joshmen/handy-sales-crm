// src/services/api/priceLists.ts
import { api, handleApiError } from '@/lib/api';
import { PriceList, PriceListProduct, CreatePriceListDto, UpdatePriceListDto } from '@/types/price-lists';

// ============ TIPOS DEL BACKEND ============

export interface PriceListDto {
  id: number;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  esDefault: boolean;
  cantidadProductos: number;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface ProductPriceDto {
  id: number;
  listaPrecioId: number;
  listaPrecioNombre: string;
  productoId: number;
  productoNombre: string;
  productoCodigo: string;
  precio: number;
  precioAnterior?: number;
  activo: boolean;
  creadoEn: string;
  actualizadoEn?: string;
}

export interface CreatePriceListRequest {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
  esDefault?: boolean;
}

export type UpdatePriceListRequest = Partial<CreatePriceListRequest>;

export interface CreateProductPriceRequest {
  listaPrecioId: number;
  productoId: number;
  precio: number;
  activo?: boolean;
}

export interface UpdateProductPriceRequest {
  precio: number;
  activo?: boolean;
}

// ============ SERVICIO LISTAS DE PRECIOS ============

class PriceListService {
  private readonly basePath = '/listas-precios';

  async getPriceLists(): Promise<PriceListDto[]> {
    try {
      const response = await api.get<PriceListDto[]>(this.basePath);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getPriceListById(id: number): Promise<PriceListDto> {
    try {
      const response = await api.get<PriceListDto>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createPriceList(data: CreatePriceListRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updatePriceList(id: number, data: UpdatePriceListRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deletePriceList(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggleActive(id: number, activo: boolean): Promise<{ actualizado: boolean }> {
    try {
      const response = await api.patch<{ actualizado: boolean }>(`${this.basePath}/${id}/activo`, { activo });
      return response.data;
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

  // Helpers
  getActivePriceLists(lists: PriceListDto[]): PriceListDto[] {
    return lists.filter(l => l.activo);
  }

  getDefaultPriceList(lists: PriceListDto[]): PriceListDto | undefined {
    return lists.find(l => l.esDefault);
  }
}

// ============ SERVICIO PRECIOS POR PRODUCTO ============

class ProductPriceService {
  private readonly basePath = '/precios';

  async getProductPrices(): Promise<ProductPriceDto[]> {
    try {
      const response = await api.get<ProductPriceDto[]>(this.basePath);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getProductPriceById(id: number): Promise<ProductPriceDto> {
    try {
      const response = await api.get<ProductPriceDto>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getProductPricesByList(listaPrecioId: number): Promise<ProductPriceDto[]> {
    try {
      const response = await api.get<ProductPriceDto[]>(
        `${this.basePath}/por-lista/${listaPrecioId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createProductPrice(data: CreateProductPriceRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateProductPrice(id: number, data: UpdateProductPriceRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteProductPrice(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // Helpers
  getPriceForProduct(
    prices: ProductPriceDto[],
    productoId: number,
    listaPrecioId?: number
  ): ProductPriceDto | undefined {
    return prices.find(p =>
      p.productoId === productoId &&
      p.activo &&
      (!listaPrecioId || p.listaPrecioId === listaPrecioId)
    );
  }
}

export const priceListService = new PriceListService();
export const productPriceService = new ProductPriceService();

export default {
  priceLists: priceListService,
  productPrices: productPriceService
};
