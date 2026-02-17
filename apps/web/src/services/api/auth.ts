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
 * Legacy auth service — NOT used by main auth flow (NextAuth handles auth).
 * Kept for API type exports and potential future direct API calls.
 */
class AuthService {
  private basePath = '/auth';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>(
        `${this.basePath}/login`,
        credentials
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

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

  async logout(): Promise<void> {
    try {
      await api.post(`${this.basePath}/logout`);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }

  async getCurrentUser(): Promise<User> {
    try {
      const response = await api.get<ApiResponse<User>>(`${this.basePath}/me`);
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    try {
      const response = await api.put<ApiResponse<User>>(
        `${this.basePath}/profile`,
        data
      );
      return handleApiResponse(response);
    } catch (error) {
      throw handleApiError(error);
    }
  }

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
}

export const authService = new AuthService();
