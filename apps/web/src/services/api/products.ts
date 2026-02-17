import { api, handleApiError } from '@/lib/api';
import { Product } from '@/types';

// Backend DTOs (Spanish)
interface ProductoListaDto {
  id: number;
  nombre: string;
  codigoBarra: string;
  descripcion?: string;
  imagenUrl?: string;
  familiaNombre?: string;
  categoriaNombre?: string;
  unidadNombre?: string;
  precioBase: number;
  cantidadActual: number;
  stockMinimo: number;
  activo: boolean;
}

interface ProductoDto {
  id: number;
  nombre: string;
  codigoBarra: string;
  descripcion: string;
  imagenUrl?: string;
  familiaId: number;
  categoraId: number;
  unidadMedidaId: number;
  precioBase: number;
  activo: boolean;
}

interface ProductoPaginatedResult {
  items: ProductoListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

// Frontend interfaces
export interface ProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  familyId?: number;
  isActive?: boolean;
}

export interface ProductsListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateProductRequest {
  nombre: string;
  codigoBarra: string;
  descripcion?: string;
  familiaId: number;
  categoraId: number;
  unidadMedidaId: number;
  precioBase: number;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  id: number;
}

// Map backend DTO to frontend Product type
function mapProductoToProduct(dto: ProductoListaDto): Product {
  return {
    id: dto.id.toString(),
    code: dto.codigoBarra,
    name: dto.nombre,
    description: dto.descripcion,
    category: dto.categoriaNombre || '',
    family: dto.familiaNombre,
    unit: dto.unidadNombre || '',
    price: dto.precioBase,
    stock: dto.cantidadActual,
    minStock: dto.stockMinimo,
    isActive: dto.activo,
    images: dto.imagenUrl ? [dto.imagenUrl] : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mapProductoDtoToProduct(dto: ProductoDto): Product {
  return {
    id: dto.id.toString(),
    code: dto.codigoBarra,
    name: dto.nombre,
    description: dto.descripcion,
    category: '',
    unit: '',
    price: dto.precioBase,
    stock: 0,
    minStock: 0,
    isActive: dto.activo,
    images: dto.imagenUrl ? [dto.imagenUrl] : [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class ProductService {
  private readonly basePath = '/productos';

  async getProducts(params: ProductsListParams = {}): Promise<ProductsListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('pagina', params.page.toString());
      if (params.limit) queryParams.append('tamanoPagina', params.limit.toString());
      if (params.search) queryParams.append('busqueda', params.search);
      if (params.categoryId) queryParams.append('categoriaId', params.categoryId.toString());
      if (params.familyId) queryParams.append('familiaId', params.familyId.toString());
      if (params.isActive !== undefined) queryParams.append('activo', params.isActive.toString());

      const response = await api.get<ProductoPaginatedResult>(
        `${this.basePath}?${queryParams.toString()}`
      );

      const data = response.data;
      return {
        products: data.items.map(mapProductoToProduct),
        total: data.totalItems,
        page: data.pagina,
        limit: data.tamanoPagina,
        totalPages: data.totalPaginas,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getProductById(id: string | number): Promise<Product> {
    try {
      const response = await api.get<ProductoDto>(`${this.basePath}/${id}`);
      return mapProductoDtoToProduct(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createProduct(productData: CreateProductRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(this.basePath, productData);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateProduct(id: number, productData: Partial<CreateProductRequest>): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, productData);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteProduct(id: string | number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await this.getProducts({ search: query, limit: 50 });
    return response.products;
  }

  async toggleActive(id: string | number, activo: boolean): Promise<void> {
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

  async uploadProductImage(id: string | number, file: File): Promise<{ imageUrl: string }> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post<{ imageUrl: string }>(
        `${this.basePath}/${id}/imagen`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteProductImage(id: string | number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${id}/imagen`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const productService = new ProductService();
export default productService;
