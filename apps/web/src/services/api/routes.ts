import { api, handleApiError } from '@/lib/api';

// Backend DTOs (matching the API)
export interface RutaListaDto {
  id: number;
  nombre: string;
  usuarioNombre: string;
  zonaNombre?: string;
  fecha: string;
  estado: number;
  estadoNombre: string;
  totalParadas: number;
  paradasCompletadas: number;
  kilometrosEstimados?: number;
  activo: boolean;
}

export interface RutasPaginadasResponse {
  items: RutaListaDto[];
  totalCount: number;
}

// Frontend interfaces
export interface RouteListItem {
  id: number;
  nombre: string;
  usuarioNombre: string;
  zonaNombre: string;
  fecha: Date;
  estado: number;
  estadoNombre: string;
  totalParadas: number;
  paradasCompletadas: number;
  kilometrosEstimados?: number;
  activo: boolean;
}

export interface RouteListParams {
  page?: number;
  limit?: number;
  search?: string;
  estado?: number;
  zonaId?: number;
  usuarioId?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  mostrarInactivos?: boolean;
}

export interface RouteListResponse {
  items: RouteListItem[];
  total: number;
  page: number;
  limit: number;
}

function mapRutaToRouteItem(dto: RutaListaDto): RouteListItem {
  return {
    id: dto.id,
    nombre: dto.nombre,
    usuarioNombre: dto.usuarioNombre,
    zonaNombre: dto.zonaNombre || '',
    fecha: new Date(dto.fecha),
    estado: dto.estado,
    estadoNombre: dto.estadoNombre,
    totalParadas: dto.totalParadas,
    paradasCompletadas: dto.paradasCompletadas,
    kilometrosEstimados: dto.kilometrosEstimados,
    activo: dto.activo,
  };
}

class RouteService {
  private readonly basePath = '/rutas';

  async getRutas(params: RouteListParams = {}): Promise<RouteListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.page) queryParams.append('pagina', params.page.toString());
      if (params.limit) queryParams.append('tamanoPagina', params.limit.toString());
      if (params.search) queryParams.append('busqueda', params.search);
      if (params.estado !== undefined && params.estado !== null) queryParams.append('estado', params.estado.toString());
      if (params.zonaId) queryParams.append('zonaId', params.zonaId.toString());
      if (params.usuarioId) queryParams.append('usuarioId', params.usuarioId.toString());
      if (params.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
      if (params.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
      if (params.mostrarInactivos) queryParams.append('mostrarInactivos', 'true');

      const response = await api.get<RutasPaginadasResponse>(
        `${this.basePath}?${queryParams.toString()}`
      );

      const data = response.data;
      return {
        items: data.items.map(mapRutaToRouteItem),
        total: data.totalCount,
        page: params.page || 1,
        limit: params.limit || 20,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async toggleActivo(id: number, activo: boolean): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/activo`, { activo });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async batchToggleActivo(ids: number[], activo: boolean): Promise<{ affected: number }> {
    try {
      const response = await api.patch<{ affected: number }>(`${this.basePath}/batch-toggle`, { ids, activo });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createRuta(data: RouteCreateRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateRuta(id: number, data: RouteUpdateRequest): Promise<void> {
    try {
      await api.put(`${this.basePath}/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getRuta(id: number): Promise<RouteDetail> {
    try {
      const response = await api.get<RouteDetail>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async addParada(rutaId: number, data: AddStopRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}/${rutaId}/paradas`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteParada(rutaId: number, detalleId: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${rutaId}/paradas/${detalleId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async reorderParadas(rutaId: number, ordenDetalleIds: number[]): Promise<void> {
    try {
      await api.post(`${this.basePath}/${rutaId}/paradas/reordenar`, { ordenDetalleIds });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async iniciarRuta(id: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/iniciar`, {});
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async completarRuta(id: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/completar`, {});
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cancelarRuta(id: number, motivo?: string): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/cancelar`, { motivo });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // === Carga de inventario ===

  async getCarga(rutaId: number): Promise<RutaCargaItem[]> {
    try {
      const response = await api.get<RutaCargaItem[]>(`${this.basePath}/${rutaId}/carga`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async addProductoVenta(rutaId: number, data: { productoId: number; cantidad: number; precioUnitario?: number }): Promise<void> {
    try {
      await api.post(`${this.basePath}/${rutaId}/carga/productos`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async removeProductoCarga(rutaId: number, productoId: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${rutaId}/carga/productos/${productoId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getPedidosAsignados(rutaId: number): Promise<PedidoAsignado[]> {
    try {
      const response = await api.get<PedidoAsignado[]>(`${this.basePath}/${rutaId}/carga/pedidos`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async addPedido(rutaId: number, pedidoId: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${rutaId}/carga/pedidos`, { pedidoId });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async removePedido(rutaId: number, pedidoId: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/${rutaId}/carga/pedidos/${pedidoId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateEfectivoInicial(rutaId: number, monto: number, comentarios?: string): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${rutaId}/carga/efectivo`, { monto, comentarios });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async enviarACarga(rutaId: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${rutaId}/carga/enviar`, {});
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // === Cierre de ruta ===

  async getResumenCierre(rutaId: number): Promise<CierreResumen> {
    try {
      const response = await api.get<CierreResumen>(`${this.basePath}/${rutaId}/cierre/resumen`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getRetornoInventario(rutaId: number): Promise<RetornoItem[]> {
    try {
      const response = await api.get<RetornoItem[]>(`${this.basePath}/${rutaId}/cierre/retorno`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateRetorno(rutaId: number, productoId: number, data: { mermas: number; recAlmacen: number; cargaVehiculo: number }): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${rutaId}/cierre/retorno/${productoId}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cerrarRuta(rutaId: number, data: CerrarRutaRequest): Promise<void> {
    try {
      await api.post(`${this.basePath}/${rutaId}/cierre/cerrar`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

// Detail interfaces
export interface RouteDetail {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  zonaId?: number;
  zonaNombre?: string;
  nombre: string;
  descripcion?: string;
  fecha: string;
  horaInicioEstimada?: string;
  horaFinEstimada?: string;
  horaInicioReal?: string;
  horaFinReal?: string;
  estado: number;
  estadoNombre: string;
  kilometrosEstimados?: number;
  kilometrosReales?: number;
  notas?: string;
  efectivoInicial?: number;
  comentariosCarga?: string;
  montoRecibido?: number;
  totalParadas: number;
  paradasCompletadas: number;
  paradasPendientes: number;
  detalles: RouteStop[];
  creadoEn: string;
}

export interface RouteStop {
  id: number;
  rutaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  ordenVisita: number;
  horaEstimadaLlegada?: string;
  duracionEstimadaMinutos?: number;
  horaLlegadaReal?: string;
  horaSalidaReal?: string;
  estado: number;
  estadoNombre: string;
  visitaId?: number;
  pedidoId?: number;
  notas?: string;
  razonOmision?: string;
}

export interface AddStopRequest {
  clienteId: number;
  ordenVisita: number;
  horaEstimadaLlegada?: string;
  duracionEstimadaMinutos?: number;
  notas?: string;
}

export interface RouteCreateRequest {
  usuarioId: number;
  zonaId?: number | null;
  nombre: string;
  descripcion?: string;
  fecha: string;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
  notas?: string;
}

export interface RouteUpdateRequest {
  zonaId?: number | null;
  nombre?: string;
  descripcion?: string;
  fecha?: string;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
  notas?: string;
}

// Carga de inventario interfaces
export interface RutaCargaItem {
  id: number;
  productoId: number;
  productoNombre: string;
  productoSku?: string;
  cantidadEntrega: number;
  cantidadVenta: number;
  cantidadTotal: number;
  precioUnitario: number;
  montoTotal: number;
  disponible?: number;
}

export interface PedidoAsignado {
  id: number;
  pedidoId: number;
  clienteNombre: string;
  fechaPedido: string;
  montoTotal: number;
  totalProductos: number;
  estado: number;
  estadoNombre: string;
}

// Cierre de ruta interfaces
export interface CierreResumen {
  ventasContado: number;
  ventasContadoCount: number;
  entregasCobradas: number;
  entregasCobradasCount: number;
  cobranzaAdeudos: number;
  cobranzaAdeudosCount: number;
  ventasCredito: number;
  ventasCreditoCount: number;
  entregasCredito: number;
  entregasCreditoCount: number;
  entregasContadoSaldoFavor: number;
  entregasContadoSaldoFavorCount: number;
  pedidosPreventa: number;
  pedidosPreventaCount: number;
  devoluciones: number;
  devolucionesCount: number;
  valorRuta: number;
  efectivoInicial: number;
  aRecibir: number;
  recibido?: number;
  diferencia?: number;
}

export interface RetornoItem {
  id: number;
  productoId: number;
  productoNombre: string;
  productoSku?: string;
  ventasMonto: number;
  cantidadInicial: number;
  vendidos: number;
  entregados: number;
  devueltos: number;
  mermas: number;
  recAlmacen: number;
  cargaVehiculo: number;
  diferencia: number;
}

export interface CerrarRutaRequest {
  montoRecibido: number;
  retornos?: {
    productoId: number;
    mermas: number;
    recAlmacen: number;
    cargaVehiculo: number;
  }[];
}

// Estado constants
export const ESTADO_RUTA = {
  Planificada: 0,
  EnProgreso: 1,
  Completada: 2,
  Cancelada: 3,
  PendienteAceptar: 4,
  CargaAceptada: 5,
  Cerrada: 6,
} as const;

export const ESTADO_RUTA_LABELS: Record<number, string> = {
  0: 'Planificada',
  1: 'En progreso',
  2: 'Terminada',
  3: 'Cancelada',
  4: 'Pendiente de aceptar',
  5: 'Carga aceptada',
  6: 'Cerrada',
};

export const ESTADO_RUTA_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-800',
  1: 'bg-cyan-100 text-cyan-800',
  2: 'bg-green-100 text-green-800',
  3: 'bg-red-100 text-red-800',
  4: 'bg-yellow-100 text-yellow-800',
  5: 'bg-blue-100 text-blue-800',
  6: 'bg-emerald-100 text-emerald-800',
};

export const routeService = new RouteService();
export default routeService;
