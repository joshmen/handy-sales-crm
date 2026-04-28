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

  /**
   * Sanitiza errores de axios a mensajes amigables para mostrar en Toast.
   * Reportado 2026-04-28: antes mostraba "Request failed with status code 401"
   * crudo. Ahora mensajes claros + marca DEVICE_BOUND con `code` para que la UI
   * abra modal de force-login en lugar de toast.
   */
  private sanitizeAuthError(error: unknown, contextLabel = 'iniciar sesión'): never {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const code = error.response?.data?.code;
      const backendMessage = error.response?.data?.message;

      if (status === 403 && code === 'DEVICE_BOUND') {
        const err = new Error(backendMessage || 'Tu cuenta está activa en otro dispositivo.');
        (err as any).code = 'DEVICE_BOUND';
        throw err;
      }
      if (status === 401) throw new Error('Correo o contraseña incorrectos');
      if (status === 400 && backendMessage) throw new Error(backendMessage);
      if (status === 429) throw new Error('Demasiados intentos. Espera un momento e intenta de nuevo.');
      if (status && status >= 500) throw new Error('Error del servidor. Intenta más tarde.');
      if (!error.response) throw new Error('Sin conexión a internet. Verifica tu red.');
    }
    if (error instanceof Error) throw new Error(error.message || `No se pudo ${contextLabel}`);
    throw new Error(`No se pudo ${contextLabel}`);
  }

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
      this.sanitizeAuthError(error);
    }
  }

  /**
   * Force-login: cierra otras sesiones activas y crea nueva. El cliente lo
   * invoca tras confirmar en modal "¿Desconectar otro dispositivo?".
   */
  async forceLogin(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/force-login`,
        { email, password }
      );
      const validated = validateResponse(
        LoginResponseWrapperSchema,
        response.data,
        'POST /api/mobile/auth/force-login'
      );
      if (!validated.success) {
        throw new Error(validated.message || 'Error al iniciar sesión');
      }
      return validated.data;
    } catch (error) {
      this.sanitizeAuthError(error);
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
