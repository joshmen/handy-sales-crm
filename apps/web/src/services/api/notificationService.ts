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