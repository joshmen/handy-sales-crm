import { AxiosError } from 'axios';
import { api } from './client';
import { validateResponse } from './validateResponse';
import {
  ApiResponseSchema,
  LoginResponseSchema,
  MeResponseSchema,
} from './schemas';
import type { ApiResponse, LoginResponse } from '@/types';
import type { MeResponse } from './schemas';

const LoginResponseWrapperSchema = ApiResponseSchema(LoginResponseSchema);
const MeResponseWrapperSchema = ApiResponseSchema(MeResponseSchema);

/**
 * Audit 2026-05-18 — sesión activa según endpoint /my-sessions y datos del
 * picker en SESSION_LIMIT_REACHED.
 */
export interface MySession {
  id: number;
  deviceName: string;
  deviceType: string;
  lastActivity: string;
  loggedInAt: string;
  appVersion: string;
  osVersion: string;
  ipCity: string;
  isCurrent: boolean;
}

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

      // Legacy: DEVICE_BOUND seguía siendo usado por /force-login (deprecated).
      // Nuevo flow LoginAsync (audit 2026-05-18) usa SESSION_LIMIT_REACHED.
      if (status === 403 && code === 'DEVICE_BOUND') {
        const err = new Error(backendMessage || 'Tu cuenta está activa en otro dispositivo.');
        (err as any).code = 'DEVICE_BOUND';
        throw err;
      }
      // VULN-M03 fix: 2FA enforcement.
      if (status === 401 && code === 'TOTP_REQUIRED') {
        const err = new Error(backendMessage || 'Se requiere código de autenticación 2FA');
        (err as any).code = 'TOTP_REQUIRED';
        throw err;
      }
      // Audit 2026-05-18 — session revoked durante refresh attempt o explicit
      // (admin revoke, otro device tomó la sesión, etc.). Cliente debe mostrar
      // mensaje claro pero sin auto-logout brusco.
      if (status === 401 && (code === 'SESSION_REVOKED' || code === 'DEVICE_REVOKED')) {
        const err = new Error(backendMessage || 'Tu sesión fue cerrada. Por favor inicia sesión de nuevo.');
        (err as any).code = 'SESSION_REVOKED';
        throw err;
      }
      // Fix prod 2026-06-03 — política estricta single-session. El user ya
      // tiene sesión activa en otro device y el plan no permite picker. Debe
      // cerrar manualmente la otra sesión antes de entrar. NO auto-logout —
      // este device no está logueado todavía.
      if (status === 409 && code === 'SESSION_BLOCKED') {
        const err = new Error(backendMessage || 'Ya tienes una sesión activa en otro dispositivo.');
        (err as any).code = 'SESSION_BLOCKED';
        (err as any).activeDevice = error.response?.data?.data?.activeDevice ?? null;
        (err as any).activeSessions = error.response?.data?.data?.activeSessions ?? [];
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

  async login(email: string, password: string, totpCode?: string): Promise<LoginResponse> {
    try {
      const response = await api.post<any>(
        `${this.basePath}/login`,
        { email, password, totpCode }
      );

      // Audit 2026-05-18: nuevo flow Netflix-style. Si el user alcanzó el
      // límite de sesiones del plan, el backend devuelve 200 con
      // success=false + code=SESSION_LIMIT_REACHED + data.activeSessions.
      // Throw error con code para que useLogin lo propague a la pantalla
      // de session-limit (picker).
      const body = response.data;
      if (body && body.success === false && body.code === 'SESSION_LIMIT_REACHED') {
        const err = new Error(body.message || 'Has alcanzado el límite de sesiones');
        (err as any).code = 'SESSION_LIMIT_REACHED';
        (err as any).activeSessions = body.data?.activeSessions ?? [];
        (err as any).maxSessions = body.data?.maxSessions ?? 1;
        throw err;
      }

      const validated = validateResponse(
        LoginResponseWrapperSchema,
        body,
        'POST /api/mobile/auth/login'
      );
      if (!validated.success) {
        throw new Error(validated.message || 'Error al iniciar sesión');
      }
      return validated.data;
    } catch (error) {
      // Re-throw si ya viene un Error CUSTOM enriquecido en el try (ej:
      // SESSION_LIMIT_REACHED que parseamos del body 200). Esos NO son
      // AxiosError — son `new Error(...)` que hicimos manualmente.
      //
      // Fix prod 2026-06-04: ANTES la chequeo era `(error as any).code`,
      // pero AxiosError también tiene `.code` (ej: "ERR_BAD_REQUEST" para 4xx).
      // Eso hacía que respuestas 409 SESSION_BLOCKED se re-throwearan SIN pasar
      // por sanitizeAuthError, terminando como Toast genérico "Request failed
      // with status code 409" en lugar de "Sesión activa en otro dispositivo".
      // Detectado por Maestro E2E flow session-blocked.yaml.
      if (
        error instanceof Error &&
        !(error as any).isAxiosError &&
        (error as any).code
      ) {
        throw error;
      }
      this.sanitizeAuthError(error);
    }
  }

  /**
   * Audit 2026-05-18 — flow nuevo Netflix-style. User llegó aquí desde
   * la pantalla session-limit (picker) tras tocar el límite en login normal.
   * Atomic: revoca la sesión que user eligió + crea nueva + emite tokens.
   */
  async revokeAndLogin(email: string, password: string, revokeSessionId: number, totpCode?: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/revoke-and-login`,
        { email, password, totpCode, revokeSessionId }
      );
      const validated = validateResponse(
        LoginResponseWrapperSchema,
        response.data,
        'POST /api/mobile/auth/revoke-and-login'
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
   * Audit 2026-05-18 — pantalla "Mis sesiones".
   */
  async getMySessions(): Promise<MySession[]> {
    const response = await api.get<{ success: boolean; data: MySession[] }>(
      `${this.basePath}/my-sessions`
    );
    return response.data?.data ?? [];
  }

  /**
   * Audit 2026-05-18 — revocar una sesión propia (self-service). Si revoca
   * la actual, el siguiente request devuelve 401 SESSION_REVOKED.
   */
  async revokeMySession(sessionId: number): Promise<void> {
    await api.post(`${this.basePath}/revoke-session/${sessionId}`);
  }

  /**
   * Force-login: deprecated (audit 2026-05-18). Reemplazado por flow
   * SESSION_LIMIT_REACHED + revokeAndLogin. Mantenido como fallback durante
   * window de compat para clientes pre-OTA. Será removido en 60 días.
   * @deprecated Use revokeAndLogin con sessionId del picker.
   */
  async forceLogin(email: string, password: string, totpCode?: string): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/force-login`,
        { email, password, totpCode }
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

  /**
   * Snapshot del usuario actual desde JWT claims. Se invoca al volver al
   * foreground para detectar cambios de avatar/nombre hechos desde web.
   * NO retorna tokens — sólo `{ user }`.
   */
  async getMe(): Promise<MeResponse> {
    const response = await api.get<ApiResponse<MeResponse>>(`${this.basePath}/me`);
    const validated = validateResponse(
      MeResponseWrapperSchema,
      response.data,
      'GET /api/mobile/auth/me'
    );
    if (!validated.success) {
      throw new Error('No se pudo obtener el perfil');
    }
    return validated.data;
  }

  /**
   * Cambia la contraseña del usuario logueado. Se invoca:
   * - Forzado al primer login si `mustChangePassword=true`
     (vendedor de campo creado por admin con password temporal).
   * - Cambio voluntario desde la pantalla de configuración (futuro).
   *
   * Backend: revoca refresh tokens del usuario en otros devices al cambiar.
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await api.post(`${this.basePath}/change-password`, { oldPassword, newPassword });
    } catch (error) {
      if (error instanceof AxiosError) {
        const msg = error.response?.data?.error;
        if (msg) throw new Error(msg);
      }
      throw new Error('No se pudo cambiar la contraseña');
    }
  }
}

export const authApi = new MobileAuthApi();
