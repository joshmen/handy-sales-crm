import { api, handleApiError } from '@/lib/api';

// Backend DTOs (matching the API)
export interface MovimientoInventarioListaDto {
  id: number;
  productoId: number;
  productoNombre?: string;
  productoCodigo?: string;
  tipoMovimiento: string;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo?: string;
  usuarioNombre?: string;
  creadoEn: string;
}

export interface MovimientoInventarioDto {
  id: number;
  productoId: number;
  productoNombre?: string;
  productoCodigo?: string;
  tipoMovimiento: string;
  cantidad: number;
  cantidadAnterior: number;
  cantidadNueva: number;
  motivo?: string;
  comentario?: string;
  usuarioId: number;
  usuarioNombre?: string;
  referenciaId?: number;
  referenciaTipo?: string;
  creadoEn: string;
}

export interface MovimientoInventarioPaginadoDto {
  items: MovimientoInventarioListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

// Frontend interfaces
export interface InventoryMovement {
  id: number;
  productId: number;
  productName: string;
  productCode: string;
  movementType: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  quantity: number;
  previousStock?: number;
  newStock?: number;
  reason?: string;
  comment?: string;
  userId?: number;
  userName?: string;
  referenceId?: number;
  referenceType?: string;
  createdAt: Date;
}

export interface InventoryMovementListParams {
  page?: number;
  limit?: number;
  search?: string;
  productId?: number;
  movementType?: string;
  reason?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InventoryMovementListResponse {
  items: InventoryMovement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateInventoryMovementRequest {
  productoId: number;
  tipoMovimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  motivo?: string;
  comentario?: string;
}

// Map backend DTO to frontend InventoryMovement
function mapMovimientoToMovement(dto: MovimientoInventarioListaDto): InventoryMovement {
  return {
    id: dto.id,
    productId: dto.productoId,
    productName: dto.productoNombre || '',
    productCode: dto.productoCodigo || '',
    movementType: dto.tipoMovimiento as 'ENTRADA' | 'SALIDA' | 'AJUSTE',
    quantity: dto.cantidad,
    previousStock: dto.cantidadAnterior,
    newStock: dto.cantidadNueva,
    reason: dto.motivo,
    userName: dto.usuarioNombre,
    createdAt: new Date(dto.creadoEn),
  };
}

function mapMovimientoDetailToMovement(dto: MovimientoInventarioDto): InventoryMovement {
  return {
    id: dto.id,
    productId: dto.productoId,
    productName: dto.productoNombre || '',
    productCode: dto.productoCodigo || '',
    movementType: dto.tipoMovimiento as 'ENTRADA' | 'SALIDA' | 'AJUSTE',
    quantity: dto.cantidad,
    previousStock: dto.cantidadAnterior,
    newStock: dto.cantidadNueva,
    reason: dto.motivo,
    comment: dto.comentario,
    userId: dto.usuarioId,
    userName: dto.usuarioNombre,
    referenceId: dto.referenciaId,
    referenceType: dto.referenciaTipo,
    createdAt: new Date(dto.creadoEn),
  };
}

class InventoryMovementService {
  private readonly basePath = '/movimientos-inventario';

  async getMovements(params: InventoryMovementListParams = {}): Promise<InventoryMovementListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('pagina', params.page.toString());
      if (params.limit) queryParams.append('tamanoPagina', params.limit.toString());
      if (params.search) queryParams.append('busqueda', params.search);
      if (params.productId) queryParams.append('productoId', params.productId.toString());
      if (params.movementType) queryParams.append('tipoMovimiento', params.movementType);
      if (params.reason) queryParams.append('motivo', params.reason);
      if (params.dateFrom) queryParams.append('fechaDesde', params.dateFrom);
      if (params.dateTo) queryParams.append('fechaHasta', params.dateTo);

      const response = await api.get<MovimientoInventarioPaginadoDto>(
        `${this.basePath}?${queryParams.toString()}`
      );

      const data = response.data;
      return {
        items: data.items.map(mapMovimientoToMovement),
        total: data.totalItems,
        page: data.pagina,
        limit: data.tamanoPagina,
        totalPages: data.totalPaginas,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getMovementById(id: number): Promise<InventoryMovement> {
    try {
      const response = await api.get<MovimientoInventarioDto>(`${this.basePath}/${id}`);
      return mapMovimientoDetailToMovement(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getMovementsByProduct(productId: number, limit: number = 10): Promise<InventoryMovement[]> {
    try {
      const response = await api.get<MovimientoInventarioListaDto[]>(
        `${this.basePath}/por-producto/${productId}?limite=${limit}`
      );
      return response.data.map(mapMovimientoToMovement);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createMovement(data: CreateInventoryMovementRequest): Promise<{ id: number; success: boolean; error?: string }> {
    try {
      const response = await api.post<{ id: number }>(
        this.basePath,
        data
      );
      return {
        id: response.data.id,
        success: true,
      };
    } catch (error: unknown) {
      // Extract backend error message from 400 responses
      const axiosErr = error as { response?: { status?: number; data?: { message?: string } } };
      if (axiosErr?.response?.status === 400 && axiosErr.response.data?.message) {
        return {
          id: 0,
          success: false,
          error: axiosErr.response.data.message,
        };
      }
      throw handleApiError(error);
    }
  }
}

export const inventoryMovementService = new InventoryMovementService();
export default inventoryMovementService;
