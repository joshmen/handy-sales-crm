import { api, handleApiResponse, handleApiError, ApiResponse } from '@/lib/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    permissions: string[];
  };
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  company?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: string[];
  avatar?: string;
  phone?: string;
  company?: string;
}

/**
 * Servicio de autenticación para conectar con el backend .NET
 */
class AuthService {
  private basePath = '/auth';

  /**
   * Iniciar sesión
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/login`,
        credentials
      );
      const data = handleApiResponse(response);
      
      // Guardar token en localStorage (solo en cliente)
      if (typeof window !== 'undefined' && data.token) {
        localStorage.setItem('auth-token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refresh-token', data.refreshToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
      }
      
      return data;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Registrar nuevo usuario
   */
  async register(data: RegisterRequest): Promise<User> {
    try {
      const response = await api.post<ApiResponse<User>>(
        `${this.basePath}/register`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('auth-token');
        if (token) {
          await api.post(`${this.basePath}/logout`);
        }
      }
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Limpiar localStorage (solo en cliente)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('refresh-token');
        localStorage.removeItem('user');
        
        // Redirigir a login
        window.location.href = '/login';
      }
    }
  }

  /**
   * Refrescar token
   */
  async refreshToken(): Promise<LoginResponse> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('Cannot refresh token on server side');
      }
      
      const refreshToken = localStorage.getItem('refresh-token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/refresh`,
        { refreshToken }
      );
      const data = handleApiResponse(response);
      
      // Actualizar tokens (solo en cliente)
      if (data.token) {
        localStorage.setItem('auth-token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('refresh-token', data.refreshToken);
        }
      }
      
      return data;
    } catch (error) {
      // Si falla el refresh, hacer logout
      this.logout();
      throw handleApiError(error);
    }
  }

  /**
   * Obtener usuario actual
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>(`${this.basePath}/me`);
      const user = handleApiResponse(response);
      
      // Actualizar usuario en localStorage (solo en cliente)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return user;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Actualizar perfil
   */
  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await api.put<ApiResponse<User>>(
        `${this.basePath}/profile`,
        data
      );
      const user = handleApiResponse(response);
      
      // Actualizar usuario en localStorage (solo en cliente)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      return user;
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Cambiar contraseña
   */
  async changePassword(data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> {
    try {
      const response = await api.post<ApiResponse<void>>(
        `${this.basePath}/change-password`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Solicitar restablecimiento de contraseña
   */
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse<void>>(
        `${this.basePath}/forgot-password`,
        { email }
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Restablecer contraseña
   */
  async resetPassword(data: {
    token: string;
    newPassword: string;
  }): Promise<void> {
    try {
      const response = await api.post<ApiResponse<void>>(
        `${this.basePath}/reset-password`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Verificar email
   */
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await api.post<ApiResponse<void>>(
        `${this.basePath}/verify-email`,
        { token }
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('auth-token');
  }

  /**
   * Obtener token actual
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth-token');
  }

  /**
   * Obtener usuario del localStorage
   */
  getLocalUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Verificar si el usuario tiene un permiso específico
   */
  hasPermission(permission: string): boolean {
    const user = this.getLocalUser();
    if (!user || !user.permissions) return false;
    return user.permissions.includes(permission);
  }

  /**
   * Verificar si el usuario tiene un rol específico
   */
  hasRole(role: string): boolean {
    const user = this.getLocalUser();
    if (!user) return false;
    return user.role === role;
  }
}

export const authService = new AuthService();
