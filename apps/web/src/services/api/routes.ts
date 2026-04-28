import { api, handleApiError } from '@/lib/api';

// Backend DTOs (matching the API)
export interface ZonaResumenDto {
  id: number;
  nombre: string;
}

export interface RutaListaDto {
  id: number;
  usuarioId: number;
  nombre: string;
  usuarioNombre: string;
  /** Legacy: nombre de la primera zona. Listas que muestran todas usan `zonas`. */
  zonaNombre?: string;
  /** Multi-zona: lista de zonas para mostrar como chips. */
  zonas?: ZonaResumenDto[];
  fecha: string;
  estado: number;
  estadoNombre: string;
  totalParadas: number;
  paradasCompletadas: number;
  kilometrosEstimados?: number;
  horaInicioEstimada?: string;
  horaFinEstimada?: string;
  activo: boolean;
}

export interface RutasPaginadasResponse {
  items: RutaListaDto[];
  totalCount: number;
}

// Frontend interfaces
export interface RouteListItem {
  id: number;
  usuarioId: number;
  nombre: string;
  usuarioNombre: string;
  zonaNombre: string;
  fecha: Date;
  estado: number;
  estadoNombre: string;
  totalParadas: number;
  paradasCompletadas: number;
  kilometrosEstimados?: number;
  horaInicioEstimada?: string;
  horaFinEstimada?: string;
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
    usuarioId: dto.usuarioId,
    nombre: dto.nombre,
    usuarioNombre: dto.usuarioNombre,
    zonaNombre: dto.zonaNombre || '',
    fecha: new Date(dto.fecha),
    estado: dto.estado,
    estadoNombre: dto.estadoNombre,
    totalParadas: dto.totalParadas,
    paradasCompletadas: dto.paradasCompletadas,
    kilometrosEstimados: dto.kilometrosEstimados,
    horaInicioEstimada: dto.horaInicioEstimada,
    horaFinEstimada: dto.horaFinEstimada,
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

  async addPedidosBatch(rutaId: number, pedidoIds: number[]): Promise<AsignarPedidosBatchResult> {
    try {
      const response = await api.post<AsignarPedidosBatchResult>(
        `${this.basePath}/${rutaId}/carga/pedidos/batch`,
        { pedidoIds },
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async removePedidosBatch(rutaId: number, pedidoIds: number[]): Promise<RemoverPedidosBatchResult> {
    try {
      const response = await api.post<RemoverPedidosBatchResult>(
        `${this.basePath}/${rutaId}/carga/pedidos/batch-remove`,
        { pedidoIds },
      );
      return response.data;
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

  // === Templates ===

  async getTemplates(): Promise<RouteTemplate[]> {
    try {
      const response = await api.get<RouteTemplate[]>(`${this.basePath}/templates`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async createTemplate(data: RouteTemplateCreate): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}/templates`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateTemplate(id: number, data: RouteTemplateUpdate): Promise<void> {
    try {
      await api.put(`${this.basePath}/templates/${id}`, data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async deleteTemplate(id: number): Promise<void> {
    try {
      await api.delete(`${this.basePath}/templates/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async duplicateTemplate(id: number): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}/templates/${id}/duplicar`, {});
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async instantiateTemplate(id: number, data: InstantiateTemplateRequest): Promise<{ id: number }> {
    try {
      const response = await api.post<{ id: number }>(`${this.basePath}/templates/${id}/instanciar`, data);
      return response.data;
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
  /** Legacy: primera zona. Frontend nuevo usa `zonas`. */
  zonaId?: number;
  /** Legacy: nombre de la primera zona. */
  zonaNombre?: string;
  /** Multi-zona: lista completa de zonas que cubre la ruta. */
  zonas?: ZonaResumenDto[];
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
  /** Legacy single-zone. Frontend nuevo prefiere zonaIds. */
  zonaId?: number | null;
  /** Multi-zona: lista de IDs de zonas. Si se manda gana sobre zonaId. */
  zonaIds?: number[] | null;
  nombre: string;
  descripcion?: string;
  fecha: string;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
  notas?: string;
}

export interface RouteUpdateRequest {
  usuarioId?: number;
  /** Legacy. */
  zonaId?: number | null;
  /** Multi-zona: si se manda (incluso lista vacía), reemplaza el set de zonas. */
  zonaIds?: number[] | null;
  nombre?: string;
  descripcion?: string;
  fecha?: string;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
  notas?: string;
}

// Resultado de asignación batch de pedidos a una ruta. Tolerante a fallos
// parciales: cada pedido reporta success o motivo de fallo.
export interface AsignarPedidoFallo {
  pedidoId: number;
  motivo: string;
}

export interface AsignarPedidosBatchResult {
  asignados: number[];
  fallidos: AsignarPedidoFallo[];
  totalAsignados: number;
  totalFallidos: number;
}

export interface RemoverPedidosBatchResult {
  removidos: number[];
  fallidos: AsignarPedidoFallo[];
  totalRemovidos: number;
  totalFallidos: number;
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

// Template interfaces
export interface RouteTemplate {
  id: number;
  nombre: string;
  descripcion?: string;
  zonaNombre?: string;
  zonaId?: number;
  totalParadas: number;
  kilometrosEstimados?: number;
  activo: boolean;
  creadoEn: string;
}

export interface RouteTemplateCreate {
  nombre: string;
  descripcion?: string;
  zonaId?: number | null;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
  notas?: string;
  esTemplate: boolean;
}

export interface RouteTemplateUpdate {
  nombre?: string;
  descripcion?: string;
  zonaId?: number | null;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
  notas?: string;
}

export interface InstantiateTemplateRequest {
  usuarioId: number;
  fecha: string;
  horaInicioEstimada?: string | null;
  horaFinEstimada?: string | null;
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

/** Translation keys for route status — resolve via useTranslations('routes.status') */
export const ESTADO_RUTA_KEYS: Record<number, string> = {
  0: 'planned',
  1: 'inProgress',
  2: 'completed',
  3: 'cancelled',
  4: 'pendingAccept', // i18n key existente — antes decia 'pendingAcceptance' y mostraba la key literal
  5: 'loadAccepted',
  6: 'closed',
};

/** @deprecated Use ESTADO_RUTA_KEYS + useTranslations('routes.status') instead */
export const ESTADO_RUTA_LABELS: Record<number, string> = {
  0: 'Planificada',
  1: 'En progreso',
  2: 'Completada',
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
