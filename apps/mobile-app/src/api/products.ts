import { api } from './client';
import type {
  ApiResponse,
  PaginatedApiResponse,
  MobileProducto,
  ProductStock,
} from '@/types';

interface ProductListParams {
  busqueda?: string;
  categoriaId?: number;
  familiaId?: number;
  pagina?: number;
  porPagina?: number;
}

class MobileProductosApi {
  private basePath = '/api/mobile/productos';

  async list(params: ProductListParams = {}) {
    const qs = new URLSearchParams();
    qs.append('pagina', String(params.pagina || 1));
    qs.append('porPagina', String(params.porPagina || 20));
    if (params.busqueda) qs.append('busqueda', params.busqueda);
    if (params.categoriaId) qs.append('categoriaId', String(params.categoriaId));
    if (params.familiaId) qs.append('familiaId', String(params.familiaId));

    const response = await api.get<PaginatedApiResponse<MobileProducto>>(
      `${this.basePath}?${qs}`
    );
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  }

  async getById(id: number): Promise<MobileProducto> {
    const response = await api.get<ApiResponse<MobileProducto>>(
      `${this.basePath}/${id}`
    );
    return response.data.data;
  }

  async getStock(id: number): Promise<ProductStock> {
    const response = await api.get<ApiResponse<ProductStock>>(
      `${this.basePath}/${id}/stock`
    );
    return response.data.data;
  }

  async getByBarcode(codigo: string): Promise<MobileProducto> {
    const response = await api.get<ApiResponse<MobileProducto>>(
      `${this.basePath}/codigo/${encodeURIComponent(codigo)}`
    );
    return response.data.data;
  }
}

export const productosApi = new MobileProductosApi();
