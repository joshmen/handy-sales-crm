import { api } from '@/lib/api';
import { AxiosError } from 'axios';

export interface NotificationPreferences {
  id: number;
  userId: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  desktopNotifications: boolean;
  emailOrderUpdates: boolean;
  emailInventoryAlerts: boolean;
  emailWeeklyReports: boolean;
  pushOrderUpdates: boolean;
  pushInventoryAlerts: boolean;
  pushRouteReminders: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  tenantId: number;
  createdDate: string;
  createdBy: number;
  lastModifiedDate?: string;
  lastModifiedBy?: number;
}

export interface SaveNotificationPreferencesRequest {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  desktopNotifications: boolean;
  emailOrderUpdates?: boolean;
  emailInventoryAlerts?: boolean;
  emailWeeklyReports?: boolean;
  pushOrderUpdates?: boolean;
  pushInventoryAlerts?: boolean;
  pushRouteReminders?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

// --- Notification DTOs (match backend NotificationDtos.cs) ---

export interface NotificationDto {
  id: number;
  titulo: string;
  mensaje: string;
  tipo: string;
  status: string;
  data?: Record<string, string>;
  enviadoEn?: string;
  leidoEn?: string;
  creadoEn: string;
}

export interface NotificationPaginatedResult {
  items: NotificationDto[];
  totalItems: number;
  noLeidas: number;
  pagina: number;
  tamanoPagina: number;
  totalPaginas: number;
}

export interface NotificationFilters {
  tipo?: string;
  noLeidas?: boolean;
  pagina?: number;
  tamanoPagina?: number;
}

class NotificationService {
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    try {
      const response = await api.get<NotificationPreferences>('/api/notification-preferences');

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error('Get notification preferences failed:', error);
      let errorMessage = 'Error al obtener las preferencias de notificación';

      if (error instanceof Error) {
        if (error.name === 'AxiosError') {
          const axiosError = error as AxiosError<{ message?: string; title?: string }>;
          if (axiosError.response?.status === 401) {
            errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente.';
          } else if (axiosError.response) {
            errorMessage =
              axiosError.response?.data?.message ||
              axiosError.response?.data?.title ||
              `Error ${axiosError.response?.status}`;
          }
        }
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  // --- Notification CRUD methods ---

  async getNotifications(filters?: NotificationFilters): Promise<ApiResponse<NotificationPaginatedResult>> {
    try {
      const params = new URLSearchParams();
      if (filters?.tipo) params.append('tipo', filters.tipo);
      if (filters?.noLeidas !== undefined) params.append('noLeidas', String(filters.noLeidas));
      if (filters?.pagina) params.append('pagina', String(filters.pagina));
      if (filters?.tamanoPagina) params.append('tamanoPagina', String(filters.tamanoPagina));

      const qs = params.toString();
      const { data } = await api.get<NotificationPaginatedResult>(
        `/api/notificaciones${qs ? `?${qs}` : ''}`
      );
      return { success: true, data, error: null };
    } catch {
      return { success: false, data: null, error: 'Error al obtener notificaciones' };
    }
  }

  async getUnreadCount(): Promise<ApiResponse<number>> {
    try {
      const { data } = await api.get<{ noLeidas: number }>('/api/notificaciones/no-leidas/count');
      return { success: true, data: data.noLeidas, error: null };
    } catch {
      return { success: false, data: null, error: 'Error al obtener conteo' };
    }
  }

  async markAsRead(id: number): Promise<ApiResponse<void>> {
    try {
      await api.post(`/api/notificaciones/${id}/leer`);
      return { success: true, data: null, error: null };
    } catch {
      return { success: false, data: null, error: 'Error al marcar como leída' };
    }
  }

  async markAllAsRead(): Promise<ApiResponse<{ marcadas: number }>> {
    try {
      const { data } = await api.post<{ marcadas: number }>('/api/notificaciones/leer-todas');
      return { success: true, data, error: null };
    } catch {
      return { success: false, data: null, error: 'Error al marcar todas' };
    }
  }

  async deleteNotification(id: number): Promise<ApiResponse<void>> {
    try {
      await api.delete(`/api/notificaciones/${id}`);
      return { success: true, data: null, error: null };
    } catch {
      return { success: false, data: null, error: 'Error al eliminar notificación' };
    }
  }

  // --- Preferences methods ---

  async savePreferences(data: SaveNotificationPreferencesRequest): Promise<ApiResponse<NotificationPreferences>> {
    try {
      const response = await api.post<NotificationPreferences>('/api/notification-preferences', data);

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      console.error('Save notification preferences failed:', error);
      let errorMessage = 'Error al guardar las preferencias de notificación';

      if (error instanceof Error) {
        if (error.name === 'AxiosError') {
          const axiosError = error as AxiosError<{ message?: string; title?: string }>;
          if (axiosError.response?.status === 401) {
            errorMessage = 'No autorizado. Por favor, inicie sesión nuevamente.';
          } else if (axiosError.response) {
            errorMessage =
              axiosError.response?.data?.message ||
              axiosError.response?.data?.title ||
              `Error ${axiosError.response?.status}`;
          }
        }
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }
}

export const notificationService = new NotificationService();