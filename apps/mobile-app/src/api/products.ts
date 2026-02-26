import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  PaginatedApiResponseSchema,
  MobileProductoSchema,
  ProductStockSchema,
} from './schemas';
import type {
  ApiResponse,
  PaginatedApiResponse,
  MobileProducto,
  ProductStock,
} from '@/types';

const ProductoResponseSchema = ApiResponseSchema(MobileProductoSchema);
const ProductoListResponseSchema = PaginatedApiResponseSchema(MobileProductoSchema);
const StockResponseSchema = ApiResponseSchema(ProductStockSchema);

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
    const validated = validateResponse(
      ProductoListResponseSchema,
      response.data,
      'GET /api/mobile/productos'
    );
    return {
      data: validated.data,
      pagination: validated.pagination,
    };
  }

  async getById(id: number): Promise<MobileProducto> {
    const response = await api.get<ApiResponse<MobileProducto>>(
      `${this.basePath}/${id}`
    );
    const validated = validateResponse(
      ProductoResponseSchema,
      response.data,
      `GET /api/mobile/productos/${id}`
    );
    return validated.data;
  }

  async getStock(id: number): Promise<ProductStock> {
    const response = await api.get<ApiResponse<ProductStock>>(
      `${this.basePath}/${id}/stock`
    );
    const validated = validateResponse(
      StockResponseSchema,
      response.data,
      `GET /api/mobile/productos/${id}/stock`
    );
    return validated.data;
  }

  async getByBarcode(codigo: string): Promise<MobileProducto> {
    const response = await api.get<ApiResponse<MobileProducto>>(
      `${this.basePath}/codigo/${encodeURIComponent(codigo)}`
    );
    const validated = validateResponse(
      ProductoResponseSchema,
      response.data,
      `GET /api/mobile/productos/codigo/${codigo}`
    );
    return validated.data;
  }
}

export const productosApi = new MobileProductosApi();
