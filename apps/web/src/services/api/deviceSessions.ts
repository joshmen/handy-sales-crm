// src/services/api/deviceSessions.ts
import { api, handleApiError } from '@/lib/api';

// ============ TIPOS ============

export interface DeviceSessionDto {
  id: number;
  usuarioId: number;
  usuarioNombre: string;
  deviceId: string;
  deviceName: string | null;
  deviceType: number; // 0=Unknown, 1=Web, 2=Android, 3=iOS, 4=Desktop
  deviceTypeNombre: string;
  deviceModel: string | null;
  osVersion: string | null;
  appVersion: string | null;
  ipAddress: string | null;
  status: number; // 0=Active, 1=LoggedOut, 2=Expired, 3=RevokedByAdmin, 4=RevokedByUser, 5=PendingUnbind, 6=Unbound
  statusNombre: string;
  lastActivity: string;
  loggedInAt: string;
  loggedOutAt: string | null;
  logoutReason: string | null;
  esSesionActual: boolean;
}

export interface DeviceSessionResumen {
  totalDispositivos: number;
  dispositivosActivos: number;
  dispositivosAndroid: number;
  dispositivosIOS: number;
  dispositivosWeb: number;
  ultimaActividad: string | null;
}

// ============ SERVICIO ============

class DeviceSessionService {
  private basePath = '/dispositivos';

  // --- Mis sesiones (usuario autenticado) ---

  async getMisSesiones(): Promise<DeviceSessionDto[]> {
    try {
      const res = await api.get<DeviceSessionDto[]>(`${this.basePath}/mis-sesiones`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getMiResumen(): Promise<DeviceSessionResumen> {
    try {
      const res = await api.get<DeviceSessionResumen>(`${this.basePath}/mi-resumen`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cerrarSesion(id: number, reason?: string): Promise<void> {
    try {
      await api.post(`${this.basePath}/${id}/cerrar`, { reason });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cerrarTodas(excluirActual = true, reason?: string): Promise<number> {
    try {
      const res = await api.post<{ cantidad: number }>(`${this.basePath}/cerrar-todas`, {
        excluirSesionActual: excluirActual,
        reason,
      });
      return res.data.cantidad;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  // --- Admin: gestionar sesiones de todos ---

  async getActiveSessions(): Promise<DeviceSessionDto[]> {
    try {
      const res = await api.get<DeviceSessionDto[]>(`${this.basePath}/admin/activas`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async getSessionsByUser(usuarioId: number): Promise<DeviceSessionDto[]> {
    try {
      const res = await api.get<DeviceSessionDto[]>(`${this.basePath}/admin/usuario/${usuarioId}`);
      return res.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async revokeSession(id: number, reason?: string): Promise<void> {
    try {
      await api.post(`${this.basePath}/admin/${id}/revocar`, { reason });
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async closeAllUserSessions(usuarioId: number, reason?: string): Promise<number> {
    try {
      const res = await api.post<{ cantidad: number }>(
        `${this.basePath}/admin/usuario/${usuarioId}/cerrar-todas`,
        { reason }
      );
      return res.data.cantidad;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async cleanExpiredSessions(diasInactividad = 30): Promise<number> {
    try {
      const res = await api.post<{ cantidad: number }>(
        `${this.basePath}/admin/limpiar-expiradas?diasInactividad=${diasInactividad}`
      );
      return res.data.cantidad;
    } catch (error) {
      throw handleApiError(error);
    }
  }
}

export const deviceSessionService = new DeviceSessionService();
