import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============
// El backend serializa los DTOs C# a JSON camelCase.
// SubscripcionDto: Empresa, Plan, Mrr (decimal), Ciclo, ProximaRenovacion (DateTime?),
// Metodo (string, default "Sin datos"), Estado (string).

export interface SubscripcionDto {
  empresa: string;
  plan: string;
  mrr: number;
  ciclo: string;
  /** ISO date string o null cuando no hay fecha de renovacion. */
  proximaRenovacion: string | null;
  metodo: string;
  estado: string;
}

export interface SubscripcionesResumenDto {
  items: SubscripcionDto[];
  mrr: number;
  arr: number;
  activas: number;
  renovaciones7d: number;
}

// ============ SERVICIO ============

class SubscriptionsAdminService {
  private basePath = '/api/superadmin/subscriptions';

  async getResumen(): Promise<SubscripcionesResumenDto> {
    try {
      const res = await api.get<SubscripcionesResumenDto>(this.basePath);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const subscriptionsAdminService = new SubscriptionsAdminService();
