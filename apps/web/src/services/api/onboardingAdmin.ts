import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

/**
 * Etapas del pipeline de onboarding. El backend serializa el enum C#
 * `EtapaOnboarding` como NUMERO (int), por eso aqui es `number`:
 *   0 Solicitud | 1 Datos fiscales | 2 CSD/Finkok | 3 Plan y pago | 4 Activa
 */
export type EtapaOnboarding = 0 | 1 | 2 | 3 | 4;

export interface CasoOnboardingDto {
  id: number;
  tenantId: number;
  empresa: string;
  etapa: EtapaOnboarding;
  responsableUsuarioId: number | null;
  planTentativo: string | null;
  entroEtapaEn: string;
  diasEnEtapa: number;
  notas: string | null;
}

export interface CasoOnboardingResumenDto {
  items: CasoOnboardingDto[];
  enProceso: number;
  esperandoDocs: number;
  listas: number;
  activadasMes: number;
}

export interface ActualizarEtapaDto {
  etapa: EtapaOnboarding;
}

export interface AsignarResponsableDto {
  responsableUsuarioId: number;
}

// ============ SERVICIO ============

class OnboardingAdminService {
  private basePath = '/api/superadmin/onboarding';

  async getResumen(): Promise<CasoOnboardingResumenDto> {
    try {
      const res = await api.get<CasoOnboardingResumenDto>(`${this.basePath}/`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cambiarEtapa(id: number, etapa: EtapaOnboarding): Promise<void> {
    try {
      const dto: ActualizarEtapaDto = { etapa };
      await api.patch(`${this.basePath}/${id}/etapa`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async asignarResponsable(id: number, responsableUsuarioId: number): Promise<void> {
    try {
      const dto: AsignarResponsableDto = { responsableUsuarioId };
      await api.patch(`${this.basePath}/${id}/responsable`, dto);
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const onboardingAdminService = new OnboardingAdminService();
