import { api, handleApiError } from '@/lib/api';

// Soporte (lado tenant). El SA gestiona los tickets en /admin/support; aqui el
// usuario de la empresa crea y consulta SUS tickets (el backend los auto-acota
// por tenant con el global query filter).

export type CanalTicket = 0 | 1; // 0 Web, 1 Mail
export type PrioridadTicket = 0 | 1 | 2 | 3; // Baja, Media, Alta, Urgente
export type EstadoTicket = 0 | 1 | 2 | 3; // Abierto, Pendiente, Resuelto, Cerrado

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

export interface TicketDetalleDto extends TicketSoporteDto {
  mensajes: MensajeTicketSoporteDto[];
}

export interface CrearTicketDto {
  asunto: string;
  categoria?: string | null;
  canal: CanalTicket;
  prioridad: PrioridadTicket;
  cuerpo: string;
}

class SupportService {
  private basePath = '/api/support/tickets';

  async getMisTickets(): Promise<TicketSoporteDto[]> {
    try {
      const res = await api.get<TicketSoporteDto[]>(this.basePath);
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

  async crear(dto: CrearTicketDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(this.basePath, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async responder(id: number, cuerpo: string): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(`${this.basePath}/${id}/mensajes`, { cuerpo });
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const supportService = new SupportService();

export const ESTADO_TICKET_LABEL: Record<EstadoTicket, string> = {
  0: 'Abierto',
  1: 'Pendiente',
  2: 'Resuelto',
  3: 'Cerrado',
};

export const PRIORIDAD_TICKET_LABEL: Record<PrioridadTicket, string> = {
  0: 'Baja',
  1: 'Media',
  2: 'Alta',
  3: 'Urgente',
};

export const PRIORIDAD_TICKET_OPTIONS: { value: PrioridadTicket; label: string }[] = [
  { value: 0, label: 'Baja' },
  { value: 1, label: 'Media' },
  { value: 2, label: 'Alta' },
  { value: 3, label: 'Urgente' },
];
