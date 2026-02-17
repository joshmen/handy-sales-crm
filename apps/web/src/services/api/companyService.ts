import { api } from '@/lib/api';
import { AxiosError } from 'axios';

// Global platform settings managed by SUPER_ADMIN
export interface GlobalSettings {
  id: string;
  platformName: string;
  platformLogo?: string;
  platformPrimaryColor: string;
  platformSecondaryColor: string;
  defaultLanguage: string;
  defaultTimezone: string;
  allowSelfRegistration: boolean;
  requireEmailVerification: boolean;
  maxUsersPerCompany?: number;
  maxStoragePerCompany?: number;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  updatedAt: Date;
  updatedBy?: string;
}

// Company-specific settings managed by ADMIN
export interface CompanySettings {
  id: string;
  tenantId: number;
  companyName: string;
  companyLogo?: string;
  companyPrimaryColor?: string;
  companySecondaryColor?: string;
  companyDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  postalCode?: string;
  timezone: string;
  currency: string;
  taxId?: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  maxUsers?: number;
  currentUsers: number;
  isActive: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

export interface UpdateGlobalSettingsRequest {
  platformName?: string;
  platformLogo?: string;
  platformPrimaryColor?: string;
  platformSecondaryColor?: string;
  defaultLanguage?: string;
  defaultTimezone?: string;
  allowSelfRegistration?: boolean;
  requireEmailVerification?: boolean;
  maxUsersPerCompany?: number;
  maxStoragePerCompany?: number;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
}

export interface UpdateCompanyRequest {
  companyName?: string;
  companyLogo?: string;
  companyPrimaryColor?: string;
  companySecondaryColor?: string;
  companyDescription?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  currency?: string;
  taxId?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

class CompanyService {
  private async request<T>(
    endpoint: string,
    options: { method?: string; data?: unknown; contentType?: string } = {}
  ): Promise<ApiResponse<T>> {
    try {
      let response;
      const { method = 'GET', data, contentType } = options;

      // Handle FormData - let browser set Content-Type with boundary
      const isFormData = data instanceof FormData;
      let config: {
        headers?: Record<string, string>;
        transformRequest?: ((data: FormData) => FormData)[];
      } = {};

      if (isFormData) {
        // For FormData, we need to delete Content-Type to let browser set it
        // But we must preserve other headers like Authorization
        config = {
          headers: {
            // Don't set Content-Type at all for FormData
            // The browser will set it with the correct boundary
          },
          transformRequest: [(data: FormData) => data],
        };
      } else if (contentType) {
        config = { headers: { 'Content-Type': contentType } };
      }

      switch (method) {
        case 'GET':
          response = await api.get<T>(endpoint, config);
          break;
        case 'PUT':
          response = await api.put<T>(endpoint, data, config);
          break;
        case 'POST':
          response = await api.post<T>(endpoint, data, config);
          break;
        case 'DELETE':
          response = await api.delete<T>(endpoint, config);
          break;
        case 'PATCH':
          response = await api.patch<T>(endpoint, data, config);
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
              error: null, // Don't show error for missing endpoints
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

  // Global Settings (SUPER_ADMIN only)
  async getGlobalSettings(): Promise<ApiResponse<GlobalSettings>> {
    return this.request<GlobalSettings>('/api/global-settings', { method: 'GET' });
  }

  async updateGlobalSettings(
    data: UpdateGlobalSettingsRequest
  ): Promise<ApiResponse<GlobalSettings>> {
    return this.request<GlobalSettings>('/api/global-settings', {
      method: 'PUT',
      data,
    });
  }

  async uploadPlatformLogo(file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await api.post<{ logoUrl: string }>(
        '/api/global-settings/upload-logo',
        formData
      );

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      let errorMessage = 'Error al subir el logo de la plataforma';

      if (error instanceof Error) {
        if (error.name === 'AxiosError') {
          const axiosError = error as AxiosError<{ message?: string; title?: string }>;
          if (axiosError.response?.status === 401) {
            errorMessage =
              'No autorizado. Solo SUPER_ADMIN puede cambiar el logo de la plataforma.';
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

  async deletePlatformLogo(): Promise<ApiResponse<void>> {
    return this.request<void>('/api/global-settings/delete-logo', {
      method: 'POST',
    });
  }

  // Company Settings (ADMIN and above)
  async getCompanySettings(): Promise<ApiResponse<CompanySettings>> {
    return this.request<CompanySettings>('/api/company/settings', { method: 'GET' });
  }

  async updateCompanySettings(data: UpdateCompanyRequest): Promise<ApiResponse<CompanySettings>> {
    return this.request<CompanySettings>('/api/company/settings', {
      method: 'PUT',
      data,
    });
  }

  async uploadLogo(file: File): Promise<ApiResponse<{ logoUrl: string }>> {
    try {
      const formData = new FormData();
      formData.append('logo', file);

      // Direct call to api.post to ensure headers are properly handled
      const response = await api.post<{ logoUrl: string }>('/api/company/upload-logo', formData, {
        headers: {
          // Let axios/browser set Content-Type with boundary for multipart/form-data
          // The Authorization header will be added by the interceptor
        },
      });

      return {
        success: true,
        data: response.data,
        error: null,
      };
    } catch (error) {
      let errorMessage = 'Error al subir el logo';

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

  async deleteLogo(): Promise<ApiResponse<CompanySettings>> {
    return this.request<CompanySettings>('/api/company/settings/logo', {
      method: 'DELETE',
    });
  }
}

export const companyService = new CompanyService();
