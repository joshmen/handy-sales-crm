import { api } from '@/lib/api';
import { AxiosError } from 'axios';

export interface UserProfile {
  id: number;
  nombre: string;
  email: string;
  tenantId: number;
  esAdmin: boolean;
  esSuperAdmin: boolean;
  avatarUrl?: string;
  role?: string;
}

export interface UpdateProfileRequest {
  email?: string;
  nombre?: string;
  password?: string;
}

// Note: Preferences are not supported by the current backend
// This interface is kept for future implementation
export interface UpdatePreferencesRequest {
  language?: string;
  timezone?: string;
  theme?: string;
  compactMode?: boolean;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  smsNotifications?: boolean;
}

export interface ChangePasswordRequest {
  password: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

export interface TwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  remainingRecoveryCodes: number;
}

export interface TwoFactorSetupResponse {
  qrCodeBase64: string;
  manualKey: string;
  otpauthUri: string;
}

export interface TwoFactorEnableResponse {
  enabled: boolean;
  recoveryCodes: string[];
}

class ProfileService {
  private async request<T>(
    endpoint: string,
    options: { method?: string; data?: unknown } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let response;
      const { method = 'GET', data } = options;

      switch (method) {
        case 'GET':
          response = await api.get<T>(endpoint);
          break;
        case 'PUT':
          response = await api.put<T>(endpoint, data);
          break;
        case 'POST':
          response = await api.post<T>(endpoint, data);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      let errorMessage = 'Error desconocido';

      if (error instanceof Error) {
        if (error.name === 'AxiosError') {
          const axiosError = error as AxiosError<{ message?: string; title?: string }>;
          const status = axiosError.response?.status;

          // Silently handle 404 errors - endpoint may not exist yet
          if (status === 404) {
            return {
              success: false,
              data: null,
              error: null,
            };
          }

          if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
            errorMessage =
              'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.';
          } else if (axiosError.response) {
            errorMessage =
              axiosError.response?.data?.message ||
              axiosError.response?.data?.title ||
              axiosError.message ||
              `Error ${axiosError.response?.status}`;
          } else {
            errorMessage = axiosError.message || 'Error de conexión con el servidor';
          }
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        data: null,
        error: errorMessage,
      };
    }
  }

  async getProfile(userId: string): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(`/api/profile`, { method: 'GET' });
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileRequest
  ): Promise<ApiResponse<UserProfile>> {
    return this.request<UserProfile>(`/api/usuarios/${userId}`, {
      method: 'PUT',
      data,
    });
  }

  // Note: Preferences are not currently supported by the backend
  async updatePreferences(
    userId: string,
    data: UpdatePreferencesRequest
  ): Promise<ApiResponse<UserProfile>> {
    // This would need to be implemented when backend supports preferences
    return {
      success: false,
      data: null,
      error: 'Las preferencias no están soportadas actualmente por el backend',
    };
  }

  async changePassword(userId: string, data: ChangePasswordRequest): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/usuarios/${userId}`, {
      method: 'PUT',
      data,
    });
  }

  async uploadAvatar(userId: string, file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post<{ avatarUrl: string }>('/api/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: { avatarUrl: response.data.avatarUrl },
        error: null,
      };
    } catch {
      return {
        success: false,
        data: null,
        error: 'Error al subir la imagen',
      };
    }
  }

  async deleteAvatar(userId: string): Promise<ApiResponse<void>> {
    try {
      const response = await api.delete('/api/profile/avatar');

      return {
        success: true,
        data: null,
        error: null,
      };
    } catch {
      return {
        success: false,
        data: null,
        error: 'Error al eliminar la imagen',
      };
    }
  }

  async uploadCompanyLogo(file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<{ url: string }>('/api/images/company-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return {
        success: true,
        data: { logoUrl: response.data.url },
        error: null,
      };
    } catch {
      return {
        success: false,
        data: null,
        error: 'Error al subir el logo',
      };
    }
  }

  // ─── 2FA TOTP Methods ───

  async get2FAStatus(): Promise<ApiResponse<TwoFactorStatus>> {
    return this.request<TwoFactorStatus>('/api/2fa/status', { method: 'GET' });
  }

  async setup2FA(): Promise<ApiResponse<TwoFactorSetupResponse>> {
    return this.request<TwoFactorSetupResponse>('/api/2fa/setup', { method: 'POST' });
  }

  async enable2FA(code: string): Promise<ApiResponse<TwoFactorEnableResponse>> {
    return this.request<TwoFactorEnableResponse>('/api/2fa/enable', {
      method: 'POST',
      data: { code },
    });
  }

  async disable2FA(code: string): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>('/api/2fa/disable', {
      method: 'POST',
      data: { code },
    });
  }

  async regenerateRecoveryCodes(code: string): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/api/2fa/recovery-codes/regenerate', {
      method: 'POST',
      data: { code },
    });
  }
}

export const profileService = new ProfileService();
