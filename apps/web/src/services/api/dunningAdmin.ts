import { api, handleApiError } from '@/lib/api';

// ============ ENUMS (espejo del backend, serializados como NUMERO) ============

/** Espeja Domain.Entities.EtapaCobranza. Valores numericos del enum backend. */
export enum EtapaCobranza {
  Reintento1 = 0,
  Reintento2 = 1,
  AvisoFinal = 2,
  Suspension = 3,
}

/** Espeja Domain.Entities.EstadoCobranza. Valores numericos del enum backend. */
export enum EstadoCobranza {
  Activo = 0,
  Recuperado = 1,
  Perdido = 2,
}

// ============ TIPOS (camelCase, reflejan CobranzaDto / CobranzaResumenDto) ============

export interface CobranzaDto {
  id: number;
  tenantId: number;
  empresa: string;
  monto: number;
  motivo: string;
  intentos: number;
  etapa: EtapaCobranza;
  proximoPasoEn: string | null;
  estado: EstadoCobranza;
  creadoEn: string;
  actualizadoEn: string | null;
}

export interface CobranzaResumenDto {
  items: CobranzaDto[];
  fallidos: number;
  montoEnRiesgo: number;
  recuperadoMes: number;
  /** Viene 0..1 desde el backend; convertir a % en la UI. */
  tasa: number;
}

// ============ SERVICIO ============

class DunningAdminService {
  private basePath = '/api/superadmin/dunning';

  async getResumen(): Promise<CobranzaResumenDto> {
    try {
      const res = await api.get<CobranzaResumenDto>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getById(id: number): Promise<CobranzaDto> {
    try {
      const res = await api.get<CobranzaDto>(`${this.basePath}/${id}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async reintento(id: number): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/reintento`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async contactado(id: number): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/contactado`);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async recuperado(id: number): Promise<void> {
    try {
      await api.patch(`${this.basePath}/${id}/recuperado`);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const dunningAdminService = new DunningAdminService();
