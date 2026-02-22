import { api } from './client';
import type { ApiResponse, LoginResponse } from '@/types';

class MobileAuthApi {
  private basePath = '/api/mobile/auth';

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      `${this.basePath}/login`,
      { email, password }
    );
    if (!response.data.success) {
      throw new Error(response.data.message || 'Error al iniciar sesión');
    }
    return response.data.data;
  }

  async refresh(refreshToken: string): Promise<LoginResponse> {
    const response = await api.post<ApiResponse<LoginResponse>>(
      `${this.basePath}/refresh`,
      { RefreshToken: refreshToken }
    );
    if (!response.data.success) {
      throw new Error('Error al renovar sesión');
    }
    return response.data.data;
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
