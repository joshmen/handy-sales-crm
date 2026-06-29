import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============
// El backend serializa los enums como NUMERO (int). Mapeamos a etiqueta en el front.

/** Severidad del incidente: 0 Menor, 1 Mayor, 2 Critico. */
export type SeveridadIncidente = 0 | 1 | 2;

/** Estado del incidente: 0 Investigando, 1 Identificado, 2 Monitoreando, 3 Resuelto. */
export type EstadoIncidente = 0 | 1 | 2 | 3;

export interface IncidenteActualizacionDto {
  id: number;
  incidenteId: number;
  mensaje: string;
  estado: EstadoIncidente;
  creadoEn: string;
}

export interface IncidenteDto {
  id: number;
  titulo: string;
  componente: string;
  severidad: SeveridadIncidente;
  estado: EstadoIncidente;
  iniciadoEn: string;
  resueltoEn: string | null;
  actualizaciones: IncidenteActualizacionDto[];
}

export interface CrearIncidenteDto {
  titulo: string;
  componente: string;
  severidad: SeveridadIncidente;
  estado: EstadoIncidente;
  mensajeInicial?: string | null;
}

export interface CrearActualizacionDto {
  mensaje: string;
  estado: EstadoIncidente;
}

export interface SaludServicioDto {
  nombre: string;
  estado: string;
  detalle: string;
}

// ============ ETIQUETAS ============

export const SEVERIDAD_LABEL: Record<SeveridadIncidente, string> = {
  0: 'Menor',
  1: 'Mayor',
  2: 'Critico',
};

export const ESTADO_INCIDENTE_LABEL: Record<EstadoIncidente, string> = {
  0: 'Investigando',
  1: 'Identificado',
  2: 'Monitoreando',
  3: 'Resuelto',
};

export const SEVERIDAD_OPTIONS: { value: SeveridadIncidente; label: string }[] = [
  { value: 0, label: 'Menor' },
  { value: 1, label: 'Mayor' },
  { value: 2, label: 'Critico' },
];

export const ESTADO_INCIDENTE_OPTIONS: { value: EstadoIncidente; label: string }[] = [
  { value: 0, label: 'Investigando' },
  { value: 1, label: 'Identificado' },
  { value: 2, label: 'Monitoreando' },
  { value: 3, label: 'Resuelto' },
];

// ============ SERVICIO ============

class StatusAdminService {
  private basePath = '/api/superadmin/system-status';

  async getIncidentes(): Promise<IncidenteDto[]> {
    try {
      const res = await api.get<IncidenteDto[]>(`${this.basePath}/incidentes`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getIncidenteById(id: number): Promise<IncidenteDto> {
    try {
      const res = await api.get<IncidenteDto>(`${this.basePath}/incidentes/${id}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async crearIncidente(dto: CrearIncidenteDto): Promise<{ id: number }> {
    try {
      const res = await api.post<{ id: number }>(`${this.basePath}/incidentes`, dto);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async agregarActualizacion(id: number, dto: CrearActualizacionDto): Promise<void> {
    try {
      await api.post(`${this.basePath}/incidentes/${id}/actualizaciones`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async resolverIncidente(id: number): Promise<void> {
    try {
      await api.patch(`${this.basePath}/incidentes/${id}/resolver`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getHealth(): Promise<SaludServicioDto[]> {
    try {
      const res = await api.get<SaludServicioDto[]>(`${this.basePath}/health`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const statusAdminService = new StatusAdminService();
