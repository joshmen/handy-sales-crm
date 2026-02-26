import { AxiosError } from 'axios';
import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  LoginResponseSchema,
} from './schemas';
import type { ApiResponse, LoginResponse } from '@/types';

const LoginResponseWrapperSchema = ApiResponseSchema(LoginResponseSchema);

class MobileAuthApi {
  private basePath = '/api/mobile/auth';

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/login`,
        { email, password }
      );
      const validated = validateResponse(
        LoginResponseWrapperSchema,
        response.data,
        'POST /api/mobile/auth/login'
      );
      if (!validated.success) {
        throw new Error(validated.message || 'Error al iniciar sesión');
      }
      return validated.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 403) {
        const code = error.response.data?.code;
        if (code === 'DEVICE_BOUND') {
          throw new Error(
            error.response.data?.message ||
            'Esta cuenta está vinculada a otro dispositivo. Contacta a tu administrador.'
          );
        }
      }
      if (error instanceof Error) throw error;
      throw new Error('Error al iniciar sesión');
    }
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      `${this.basePath}/refresh`,
      { RefreshToken: refreshToken }
    );
    const validated = validateResponse(
      LoginResponseWrapperSchema,
      response.data,
      'POST /api/mobile/auth/refresh'
    );
    if (!validated.success) {
      throw new Error('Error al renovar sesión');
    }
    return validated.data;
  }

  async logout(): Promise<void> {
    try {
      await api.post(`${this.basePath}/logout`);
    } catch {
      // Ignore — always clear local state
    }
  }
}

export const authApi = new MobileAuthApi();
