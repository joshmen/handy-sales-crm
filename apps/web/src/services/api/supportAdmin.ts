import { api, handleApiError } from '@/lib/api';

// ============ ENUMS (el backend serializa como NUMERO) ============

/** Canal del ticket. 0 Web, 1 Mail. */
export type CanalTicket = 0 | 1;
/** Prioridad del ticket. 0 Baja, 1 Media, 2 Alta, 3 Urgente. */
export type PrioridadTicket = 0 | 1 | 2 | 3;
/** Estado del ticket. 0 Abierto, 1 Pendiente, 2 Resuelto, 3 Cerrado. */
export type EstadoTicket = 0 | 1 | 2 | 3;

// ============ TIPOS (camelCase, reflejan los DTOs del backend) ============

export interface TicketSoporteDto {
  id: number;
  tenantId: number;
  creadoPorUsuarioId: number;
  asunto: string;
  categoria: string | null;
  canal: CanalTicket;
  prioridad: PrioridadTicket;
  asignadoAUsuarioId: number | null;
  estado: EstadoTicket;
  slaVenceEn: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
}

export interface MensajeTicketSoporteDto {
  id: number;
  ticketId: number;
  autorUsuarioId: number | null;
  esOperador: boolean;
  esInterno: boolean;
  cuerpo: string;
  creadoEn: string;
}

export interface TicketDetalleDto {
  id: number;
  tenantId: number;
  creadoPorUsuarioId: number;
  asunto: string;
  categoria: string | null;
  canal: CanalTicket;
  prioridad: PrioridadTicket;
  asignadoAUsuarioId: number | null;
  estado: EstadoTicket;
  slaVenceEn: string | null;
  creadoEn: string;
  actualizadoEn: string | null;
  mensajes: MensajeTicketSoporteDto[];
}

export interface SupportKpisDto {
  abiertos: number | null;
  sinAsignar: number | null;
  slaRiesgo: number | null;
  csat: string;
}

export interface SupportListResponse {
  kpis: SupportKpisDto;
  tickets: TicketSoporteDto[];
}

export interface ActualizarTicketDto {
  asignadoAUsuarioId?: number | null;
  estado?: EstadoTicket | null;
  prioridad?: PrioridadTicket | null;
}

export interface ResponderTicketDto {
  cuerpo: string;
  esInterno?: boolean;
}

// ============ SERVICIO (solo el grupo SuperAdmin) ============

class SupportAdminService {
  private basePath = '/api/superadmin/support';

  async getAll(): Promise<SupportListResponse> {
    try {
      const res = await api.get<SupportListResponse>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getById(id: number): Promise<TicketDetalleDto> {
    try {
      const res = await api.get<TicketDetalleDto>(`${this.basePath}/${id}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async actualizar(id: number, dto: ActualizarTicketDto): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async responder(id: number, dto: ResponderTicketDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(`${this.basePath}/${id}/mensajes`, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const supportAdminService = new SupportAdminService();
