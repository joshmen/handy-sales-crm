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
  costo?: number;
  cantidadActual: number;
  stockMinimo: number;
  activo: boolean;
  precioIncluyeIva?: boolean;
  tasaImpuestoId?: number | null;
  claveSat?: string | null;
  claveUnidad?: string | null;
  facturable: boolean;
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
  /** Costo unitario del producto (para reportes de margen/valorizado). */
  costo?: number;
  activo: boolean;
  /** Si true (default), precioBase ya incluye IVA. */
  precioIncluyeIva?: boolean;
  /** FK al catálogo TasasImpuesto. */
  tasaImpuestoId?: number | null;
  tasaImpuestoNombre?: string | null;
  tasaImpuestoTasa?: number | null;
  claveSat?: string | null;
  claveUnidad?: string | null;
  facturable: boolean;
}

interface ProductoPaginatedResult {
  items: ProductoListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
  sinClaveSatCount: number;
}

// Frontend interfaces
export interface ProductsListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: number;
  familyId?: number;
  isActive?: boolean;
  /** Tab "Sin clave SAT": solo facturables sin ClaveProdServ. */
  sinClaveSat?: boolean;
}

export interface ProductsListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** Conteo (a nivel tenant) de productos facturables sin clave SAT. */
  sinClaveSatCount: number;
}

export interface CreateProductRequest {
  nombre: string;
  codigoBarra: string;
  descripcion?: string;
  familiaId: number;
  categoraId: number;
  unidadMedidaId: number;
  precioBase: number;
  /** Costo unitario del producto (para reportes de margen/valorizado). */
  costo?: number;
  /** Si true (default), precioBase es lo que el cliente paga al final (IVA incluido). */
  precioIncluyeIva?: boolean;
  /** FK al catálogo TasasImpuesto. Si null, usa la tasa default del tenant. */
  tasaImpuestoId?: number | null;
  /** ClaveProdServ del SAT (opcional). */
  claveSat?: string | null;
  /** ClaveUnidad del SAT (opcional, ej. "H87"). */
  claveUnidad?: string | null;
  /** Si false, el producto no es facturable. */
  facturable?: boolean;
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
    cost: dto.costo,
    stock: dto.cantidadActual,
    minStock: dto.stockMinimo,
    isActive: dto.activo,
    images: dto.imagenUrl ? [dto.imagenUrl] : [],
    claveSat: dto.claveSat ?? undefined,
    claveUnidad: dto.claveUnidad ?? undefined,
    facturable: dto.facturable,
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
    cost: dto.costo,
    stock: 0,
    minStock: 0,
    isActive: dto.activo,
    images: dto.imagenUrl ? [dto.imagenUrl] : [],
    claveSat: dto.claveSat ?? undefined,
    claveUnidad: dto.claveUnidad ?? undefined,
    facturable: dto.facturable,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

class ProductService {
  private readonly basePath = '/productos';

  async getProducts(params: ProductsListParams & { signal?: AbortSignal } = {}): Promise<ProductsListResponse> {
    try {
      const { signal, ...rest } = params;
      const queryParams = new URLSearchParams();

      if (rest.page) queryParams.append('pagina', rest.page.toString());
      if (rest.limit) queryParams.append('tamanoPagina', rest.limit.toString());
      if (rest.search) queryParams.append('busqueda', rest.search);
      if (rest.categoryId) queryParams.append('categoriaId', rest.categoryId.toString());
      if (rest.familyId) queryParams.append('familiaId', rest.familyId.toString());
      if (rest.isActive !== undefined) queryParams.append('activo', rest.isActive.toString());
      if (rest.sinClaveSat) queryParams.append('sinClaveSat', 'true');

      const response = await api.get<ProductoPaginatedResult>(
        `${this.basePath}?${queryParams.toString()}`,
        { signal }
      );

      const data = response.data;
      return {
        products: data.items.map(mapProductoToProduct),
        total: data.totalItems,
        page: data.pagina,
        limit: data.tamanoPagina,
        totalPages: data.totalPaginas,
        sinClaveSatCount: data.sinClaveSatCount ?? 0,
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

  async deleteProduct(id: string | number, forzar = false): Promise<void> {
    try {
      const url = forzar
        ? `${this.basePath}/${id}?forzar=true`
        : `${this.basePath}/${id}`;
      await api.delete(url);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await this.getProducts({ search: query, limit: 50 });
    return response.products;
  }

  /** Asigna clave SAT (+ unidad opcional) en lote: por selección de IDs o por categoría. */
  async batchAsignarClaveSat(req: { ids?: number[]; categoriaId?: number; claveSat: string; claveUnidad?: string }): Promise<{ actualizados: number }> {
    try {
      const response = await api.patch<{ actualizados: number }>(`${this.basePath}/batch-clave-sat`, req);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
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
