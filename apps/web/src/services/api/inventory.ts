import { api, handleApiError } from '@/lib/api';
import { InventoryItem } from '@/types/inventory';

// Backend DTOs
interface InventarioListaDto {
  id: number;
  productoId: number;
  productoNombre?: string;
  productoCodigo?: string;
  productoImagenUrl?: string;
  productoUnidadMedida?: string;
  cantidadActual: number;
  stockMinimo: number;
  stockMaximo: number;
  bajoStock: boolean;
  actualizadoEn?: string;
}

interface InventarioPaginatedResult {
  items: InventarioListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

// Frontend interfaces
export interface InventoryListParams {
  page?: number;
  limit?: number;
  search?: string;
  lowStock?: boolean;
  productId?: number;
}

export interface InventoryListResponse {
  items: InventoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateInventoryRequest {
  cantidadActual: number;
  stockMinimo: number;
  stockMaximo: number;
}

export interface CreateInventoryRequest {
  productoId: number;
  cantidadActual: number;
  stockMinimo: number;
  stockMaximo: number;
}

// Map backend DTO to frontend InventoryItem
function mapInventarioToItem(dto: InventarioListaDto): InventoryItem {
  return {
    id: dto.id.toString(),
    productId: dto.productoId.toString(),
    warehouseQuantity: dto.cantidadActual,
    routeQuantity: 0,
    totalQuantity: dto.cantidadActual,
    minStock: dto.stockMinimo,
    maxStock: dto.stockMaximo,
    lastUpdated: dto.actualizadoEn ? new Date(dto.actualizadoEn) : new Date(),
    createdAt: new Date(),
    updatedAt: dto.actualizadoEn ? new Date(dto.actualizadoEn) : new Date(),
    product: {
      id: dto.productoId.toString(),
      code: dto.productoCodigo || '',
      name: dto.productoNombre || '',
      description: '',
      category: '',
      unit: dto.productoUnidadMedida || 'PZS',
      price: 0,
      stock: dto.cantidadActual,
      minStock: dto.stockMinimo,
      maxStock: dto.stockMaximo,
      isActive: true,
      images: dto.productoImagenUrl ? [dto.productoImagenUrl] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

class InventoryService {
  private readonly basePath = '/inventario';

  async getInventoryItems(params: InventoryListParams = {}): Promise<InventoryListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('pagina', params.page.toString());
      if (params.limit) queryParams.append('tamanoPagina', params.limit.toString());
      if (params.search) queryParams.append('busqueda', params.search);
      if (params.lowStock) queryParams.append('bajoStock', 'true');
      if (params.productId) queryParams.append('productoId', params.productId.toString());

      const response = await api.get<InventarioPaginatedResult>(
        `${this.basePath}?${queryParams.toString()}`
      );

      const data = response.data;
      return {
        items: data.items.map(mapInventarioToItem),
        total: data.totalItems,
        page: data.pagina,
        limit: data.tamanoPagina,
        totalPages: data.totalPaginas,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getInventoryById(id: number): Promise<InventoryItem> {
    try {
      const response = await api.get<InventarioListaDto>(`${this.basePath}/${id}`);
      return mapInventarioToItem(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getInventoryByProductId(productId: number): Promise<InventoryItem> {
    try {
      const response = await api.get<InventarioListaDto>(`${this.basePath}/por-producto/${productId}`);
      return mapInventarioToItem(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createInventory(data: CreateInventoryRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateInventory(id: number, data: UpdateInventoryRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteInventory(productId: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${productId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
