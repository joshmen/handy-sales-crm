import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============
// Reflejan AnaliticaDto del backend (HandySuites.Application/Analytics/DTOs).
// El backend serializa a JSON camelCase. churn/conversion/porcentajeActivo y
// los churn por plan vienen como FRACCION 0..1 (multiplicar por 100 para %).

export interface EmbudoDto {
  pruebas: number;
  activaron: number;
  pago: number;
  retenidas: number;
}

export interface ChurnPorPlanDto {
  plan: string;
  churn: number;
}

export interface CohorteDto {
  mes: string;
  totalInicial: number;
  porcentajeActivo: number;
}

export interface MovimientoMrrDto {
  nuevas: number;
  expansion: number | null;
  contraccion: number | null;
  churn: number;
  final: number;
}

export interface AnaliticaDto {
  mrr: number;
  arr: number;
  churn: number;
  conversion: number;
  embudo: EmbudoDto;
  churnPorPlan: ChurnPorPlanDto[];
  cohortes: CohorteDto[];
  ltv: number | null;
  cac: number | null;
  movimientoMrr: MovimientoMrrDto;
}

// ============ SERVICIO ============

class SaasAnalyticsService {
  private basePath = '/api/superadmin/analytics';

  async getAnalytics(): Promise<AnaliticaDto> {
    try {
      const res = await api.get<AnaliticaDto>(`${this.basePath}/`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const saasAnalyticsService = new SaasAnalyticsService();
