// src/services/api/deliveries.ts
// Servicio para seguimiento de entregas - combina datos de rutas y pedidos
import { api, handleApiError } from '@/lib/api';
import { DeliveryStatus } from '@/types';

// ============ Backend DTOs ============

// Rutas de vendedor
interface RutaListaDto {
  id: number;
  nombre: string;
  usuarioNombre: string;
  zonaNombre?: string;
  fecha: string;
  estado: string;
  estadoNombre: string;
  totalParadas: number;
  paradasCompletadas: number;
  kilometrosEstimados?: number;
}

interface RutaDetalleDto {
  id: number;
  rutaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  clienteLatitud?: number;
  clienteLongitud?: number;
  ordenVisita: number;
  horaEstimadaLlegada?: string;
  duracionEstimadaMinutos?: number;
  horaLlegadaReal?: string;
  horaSalidaReal?: string;
  estado: string;
  estadoNombre: string;
  visitaId?: number;
  pedidoId?: number;
  notas?: string;
  razonOmision?: string;
  distanciaDesdeAnterior?: number;
}

interface RutaVendedorDto {
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
  estado: string;
  estadoNombre: string;
  kilometrosEstimados?: number;
  kilometrosReales?: number;
  notas?: string;
  totalParadas: number;
  paradasCompletadas: number;
  paradasPendientes: number;
  detalles: RutaDetalleDto[];
  creadoEn: string;
}

interface RutaPaginatedResult {
  items: RutaListaDto[];
  totalCount: number;
}

// Pedidos
interface PedidoListaDto {
  id: number;
  numeroPedido: string;
  clienteId: number;
  clienteNombre: string;
  usuarioNombre: string;
  fechaPedido: string;
  fechaEntregaEstimada?: string;
  estado: string;
  estadoNombre: string;
  total: number;
  totalItems: number;
}

interface PedidoPaginatedResult {
  items: PedidoListaDto[];
  totalItems: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

// ============ Frontend Types ============

export interface RouteItem {
  id: number;
  nombre: string;
  usuarioNombre: string;
  zonaNombre?: string;
  fecha: Date;
  estado: string;
  totalParadas: number;
  paradasCompletadas: number;
  paradasPendientes: number;
  kilometrosEstimados?: number;
  detalles: RouteStopItem[];
}

export interface RouteStopItem {
  id: number;
  rutaId: number;
  clienteId: number;
  clienteNombre: string;
  clienteDireccion?: string;
  ordenVisita: number;
  estado: string;
  pedidoId?: number;
  notas?: string;
}

export interface DeliveryOrderItem {
  id: number;
  numeroPedido: string;
  clienteId: number;
  clienteNombre: string;
  usuarioNombre: string;
  fechaPedido: Date;
  fechaEntregaEstimada?: Date;
  estado: string;
  total: number;
  totalItems: number;
}

export interface DeliveryFilterParams {
  usuarioId?: number;
  zonaId?: number;
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  pagina?: number;
  tamanoPagina?: number;
}

export interface DeliveryStats {
  totalPendientes: number;
  totalEnRuta: number;
  totalCompletadas: number;
  totalCanceladas: number;
  porcentajeCompletado: number;
}

// ============ Mapping Functions ============

function mapRutaToRouteItem(dto: RutaVendedorDto): RouteItem {
  return {
    id: dto.id,
    nombre: dto.nombre,
    usuarioNombre: dto.usuarioNombre,
    zonaNombre: dto.zonaNombre,
    fecha: new Date(dto.fecha),
    estado: dto.estadoNombre,
    totalParadas: dto.totalParadas,
    paradasCompletadas: dto.paradasCompletadas,
    paradasPendientes: dto.paradasPendientes,
    kilometrosEstimados: dto.kilometrosEstimados,
    detalles: dto.detalles.map(d => ({
      id: d.id,
      rutaId: d.rutaId,
      clienteId: d.clienteId,
      clienteNombre: d.clienteNombre,
      clienteDireccion: d.clienteDireccion,
      ordenVisita: d.ordenVisita,
      estado: d.estadoNombre,
      pedidoId: d.pedidoId,
      notas: d.notas,
    })),
  };
}

function mapPedidoToDeliveryOrder(dto: PedidoListaDto): DeliveryOrderItem {
  return {
    id: dto.id,
    numeroPedido: dto.numeroPedido,
    clienteId: dto.clienteId,
    clienteNombre: dto.clienteNombre,
    usuarioNombre: dto.usuarioNombre,
    fechaPedido: new Date(dto.fechaPedido),
    fechaEntregaEstimada: dto.fechaEntregaEstimada ? new Date(dto.fechaEntregaEstimada) : undefined,
    estado: dto.estadoNombre,
    total: dto.total,
    totalItems: dto.totalItems,
  };
}

// ============ Service ============

class DeliveryService {
  private readonly rutasPath = '/rutas';
  private readonly pedidosPath = '/pedidos';

  // ============ RUTAS ============

  async getRoutes(params: DeliveryFilterParams = {}): Promise<{ items: RouteItem[]; totalCount: number }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.usuarioId) queryParams.append('usuarioId', params.usuarioId.toString());
      if (params.zonaId) queryParams.append('zonaId', params.zonaId.toString());
      if (params.estado) queryParams.append('estado', params.estado);
      if (params.fechaDesde) queryParams.append('fechaDesde', params.fechaDesde);
      if (params.fechaHasta) queryParams.append('fechaHasta', params.fechaHasta);
      if (params.pagina) queryParams.append('pagina', params.pagina.toString());
      if (params.tamanoPagina) queryParams.append('tamanoPagina', params.tamanoPagina.toString());

      const response = await api.get<RutaPaginatedResult>(
        `${this.rutasPath}?${queryParams.toString()}`
      );

      // El endpoint de lista no devuelve detalles, solo datos básicos
      return {
        items: response.data.items.map(item => ({
          id: item.id,
          nombre: item.nombre,
          usuarioNombre: item.usuarioNombre,
          zonaNombre: item.zonaNombre,
          fecha: new Date(item.fecha),
          estado: item.estadoNombre,
          totalParadas: item.totalParadas,
          paradasCompletadas: item.paradasCompletadas,
          paradasPendientes: item.totalParadas - item.paradasCompletadas,
          kilometrosEstimados: item.kilometrosEstimados,
          detalles: [],
        })),
        totalCount: response.data.totalCount,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getRouteById(id: number): Promise<RouteItem> {
    try {
      const response = await api.get<RutaVendedorDto>(`${this.rutasPath}/${id}`);
      return mapRutaToRouteItem(response.data);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getTodayRoute(): Promise<RouteItem | null> {
    try {
      const response = await api.get<RutaVendedorDto>(`${this.rutasPath}/mi-ruta-hoy`);
      return mapRutaToRouteItem(response.data);
    } catch (error) {
      // Si no hay ruta, retorna null
      return null;
    }
  }

  async getPendingRoutes(): Promise<RouteItem[]> {
    try {
      const response = await api.get<RutaVendedorDto[]>(`${this.rutasPath}/mis-rutas-pendientes`);
      return response.data.map(mapRutaToRouteItem);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async startRoute(rutaId: number, coords?: { latitud: number; longitud: number }): Promise<boolean> {
    try {
      await api.post(`${this.rutasPath}/${rutaId}/iniciar`, coords);
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async completeRoute(rutaId: number, kilometrosReales?: number): Promise<boolean> {
    try {
      await api.post(`${this.rutasPath}/${rutaId}/completar`, null, {
        params: { kilometrosReales },
      });
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cancelRoute(rutaId: number, motivo?: string): Promise<boolean> {
    try {
      await api.post(`${this.rutasPath}/${rutaId}/cancelar`, { motivo });
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============ PARADAS ============

  async arriveAtStop(detalleId: number, coords: { latitud: number; longitud: number }): Promise<boolean> {
    try {
      await api.post(`${this.rutasPath}/paradas/${detalleId}/llegar`, coords);
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async leaveStop(detalleId: number, data?: { visitaId?: number; pedidoId?: number; notas?: string }): Promise<boolean> {
    try {
      await api.post(`${this.rutasPath}/paradas/${detalleId}/salir`, data);
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async skipStop(detalleId: number, razonOmision: string): Promise<boolean> {
    try {
      await api.post(`${this.rutasPath}/paradas/${detalleId}/omitir`, { razonOmision });
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============ PEDIDOS EN ENTREGA ============

  async getOrdersForDelivery(params: {
    estado?: string;
    fechaInicio?: string;
    fechaFin?: string;
    pagina?: number;
    tamanoPagina?: number;
  } = {}): Promise<{ items: DeliveryOrderItem[]; total: number; totalPages: number }> {
    try {
      const queryParams = new URLSearchParams();

      // Por defecto solo pedidos en estados de entrega
      if (!params.estado) {
        queryParams.append('estado', 'EnRuta');
      } else {
        queryParams.append('estado', params.estado);
      }

      if (params.fechaInicio) queryParams.append('fechaInicio', params.fechaInicio);
      if (params.fechaFin) queryParams.append('fechaFin', params.fechaFin);
      if (params.pagina) queryParams.append('pagina', params.pagina.toString());
      if (params.tamanoPagina) queryParams.append('tamanoPagina', params.tamanoPagina.toString());

      const response = await api.get<PedidoPaginatedResult>(
        `${this.pedidosPath}?${queryParams.toString()}`
      );

      return {
        items: response.data.items.map(mapPedidoToDeliveryOrder),
        total: response.data.totalItems,
        totalPages: response.data.totalPaginas,
      };
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async markOrderAsDelivered(pedidoId: number, notas?: string): Promise<boolean> {
    try {
      await api.post(`${this.pedidosPath}/${pedidoId}/entregar`, { notas });
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cancelOrder(pedidoId: number, notas: string): Promise<boolean> {
    try {
      await api.post(`${this.pedidosPath}/${pedidoId}/cancelar`, { notas });
      return true;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============ ESTADÍSTICAS ============

  async getDeliveryStats(params: DeliveryFilterParams = {}): Promise<DeliveryStats> {
    try {
      // Obtener rutas para calcular estadísticas
      const routes = await this.getRoutes(params);

      const stats: DeliveryStats = {
        totalPendientes: 0,
        totalEnRuta: 0,
        totalCompletadas: 0,
        totalCanceladas: 0,
        porcentajeCompletado: 0,
      };

      routes.items.forEach(route => {
        switch (route.estado) {
          case 'Pendiente':
          case 'Programada':
            stats.totalPendientes++;
            break;
          case 'EnProgreso':
          case 'Iniciada':
            stats.totalEnRuta++;
            break;
          case 'Completada':
            stats.totalCompletadas++;
            break;
          case 'Cancelada':
            stats.totalCanceladas++;
            break;
        }
      });

      const total = routes.items.length;
      stats.porcentajeCompletado = total > 0
        ? Math.round((stats.totalCompletadas / total) * 100)
        : 0;

      return stats;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // ============ HELPERS ============

  getStatusColor(estado: string): string {
    switch (estado) {
      case 'Pendiente':
      case 'Programada':
        return 'bg-gray-100 text-gray-800';
      case 'EnProgreso':
      case 'Iniciada':
        return 'bg-blue-100 text-blue-800';
      case 'Completada':
      case 'Entregado':
        return 'bg-green-100 text-green-800';
      case 'Cancelada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusLabel(estado: string): string {
    switch (estado) {
      case 'Pendiente':
        return 'Pendiente';
      case 'Programada':
        return 'Programada';
      case 'EnProgreso':
      case 'Iniciada':
        return 'En Progreso';
      case 'Completada':
        return 'Completada';
      case 'Cancelada':
        return 'Cancelada';
      case 'Entregado':
        return 'Entregado';
      case 'EnRuta':
        return 'En Ruta';
      default:
        return estado;
    }
  }
}

export const deliveryService = new DeliveryService();
export default deliveryService;
