// src/services/api/impersonation.ts
import { api, handleApiError } from '@/lib/api';
import {
  StartImpersonationRequest,
  StartImpersonationResponse,
  CurrentImpersonationState,
  ImpersonationHistoryFilter,
  ImpersonationHistoryResponse,
  ImpersonationSession,
  LogImpersonationActionRequest,
} from '@/types/impersonation';

const BASE_URL = '/impersonation';

/**
 * Servicio de impersonación para SUPER_ADMIN.
 * Permite acceder temporalmente a cuentas de tenants con auditoría completa.
 */
export const impersonationService = {
  /**
   * Inicia una sesión de impersonación.
   * Requiere justificación obligatoria.
   */
  async startSession(data: StartImpersonationRequest): Promise<StartImpersonationResponse> {
    try {
      const response = await api.post<StartImpersonationResponse>(`${BASE_URL}/start`, {
        targetTenantId: data.targetTenantId,
        reason: data.reason,
        ticketNumber: data.ticketNumber,
        accessLevel: data.accessLevel || 'READ_ONLY',
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Termina la sesión de impersonación activa.
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      await api.post(`${BASE_URL}/end`, { sessionId });
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtiene el estado actual de impersonación.
   */
  async getCurrentState(): Promise<CurrentImpersonationState> {
    try {
      const response = await api.get<CurrentImpersonationState>(`${BASE_URL}/current`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Registra una acción durante la impersonación (para auditoría).
   */
  async logAction(data: LogImpersonationActionRequest): Promise<void> {
    try {
      await api.post(`${BASE_URL}/log-action`, data);
    } catch (error) {
      // No lanzar error para no interrumpir el flujo del usuario
      console.error('Error logging impersonation action:', error);
    }
  },

  /**
   * Obtiene el historial de sesiones de impersonación.
   */
  async getHistory(filter: ImpersonationHistoryFilter): Promise<ImpersonationHistoryResponse> {
    try {
      const params = new URLSearchParams();
      if (filter.superAdminId) params.append('superAdminId', filter.superAdminId.toString());
      if (filter.targetTenantId) params.append('targetTenantId', filter.targetTenantId.toString());
      if (filter.fromDate) params.append('fromDate', filter.fromDate);
      if (filter.toDate) params.append('toDate', filter.toDate);
      if (filter.status) params.append('status', filter.status);
      params.append('page', (filter.page || 1).toString());
      params.append('pageSize', (filter.pageSize || 20).toString());

      const response = await api.get<ImpersonationHistoryResponse>(
        `${BASE_URL}/history?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtiene los detalles de una sesión específica.
   */
  async getSessionDetails(sessionId: string): Promise<ImpersonationSession> {
    try {
      const response = await api.get<ImpersonationSession>(`${BASE_URL}/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Obtiene el historial de impersonación para el tenant actual (Admin only).
   * Usa endpoint separado que auto-filtra por tenant.
   */
  async getTenantHistory(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    fromDate?: string;
    toDate?: string;
  } = {}): Promise<ImpersonationHistoryResponse> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', (params.page || 1).toString());
      queryParams.append('pageSize', (params.pageSize || 10).toString());
      if (params.status) queryParams.append('status', params.status);
      if (params.fromDate) queryParams.append('fromDate', params.fromDate);
      if (params.toDate) queryParams.append('toDate', params.toDate);

      const response = await api.get<ImpersonationHistoryResponse>(
        `/api/impersonation-history?${queryParams.toString()}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Extiende la sesión de impersonación actual (máximo 1 hora adicional).
   */
  async extendSession(sessionId: string, additionalMinutes: number = 30): Promise<void> {
    try {
      await api.post(`${BASE_URL}/extend`, { sessionId, additionalMinutes });
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
