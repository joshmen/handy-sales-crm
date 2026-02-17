import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/lib/constants';
import { getSession, signOut } from 'next-auth/react';

// Create axios instance
const apiInstance: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Token cache en memoria (seguro: no persiste, no accesible por XSS) ---
let _cachedAccessToken: string | null = null;

/** Llamado por useAuthSession() para sincronizar el token de sesión */
export function setApiAccessToken(token: string | null) {
  _cachedAccessToken = token;
}

// Request interceptor for auth token and content type handling
apiInstance.interceptors.request.use(
  async config => {
    if (typeof window !== 'undefined') {
      if (_cachedAccessToken) {
        // Token en memoria (sincronizado por useAuthSession) — 0ms
        config.headers.Authorization = `Bearer ${_cachedAccessToken}`;
      } else {
        // Fallback: primer request antes de que React monte useAuthSession
        try {
          const session = await getSession();
          if (session?.accessToken) {
            _cachedAccessToken = session.accessToken;
            config.headers.Authorization = `Bearer ${session.accessToken}`;
          }
        } catch {
          // Silently handle session retrieval errors
        }
      }
    }

    // Handle FormData - remove Content-Type to let browser set it with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Flag to prevent multiple simultaneous logout redirects
let isLoggingOut = false;

// Response interceptor for error handling
apiInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async error => {
    const status = error.response?.status;

    // Suppress 404 errors - these are expected for optional endpoints
    // Only log actual errors (5xx, network errors, etc.)
    if (status !== 404 && status !== 400) {
      // Log non-404 errors for debugging (in development only)
      if (process.env.NODE_ENV === 'development' && status >= 500) {
        console.error('API Error:', status, error.config?.url);
      }
    }

    if (status === 401) {
      if (typeof window !== 'undefined' && !isLoggingOut) {
        // Check if we're using mock auth (development mode with mock tokens)
        const authHeader = error.config?.headers?.Authorization;
        const isMockToken = authHeader && typeof authHeader === 'string' && authHeader.includes('mock-');

        // In development with mock tokens, don't trigger logout on 401
        // The mock tokens are not valid JWTs for the backend
        if (isMockToken && process.env.NODE_ENV === 'development') {
          console.warn('API 401 with mock token - skipping logout redirect');
          return Promise.reject(error);
        }

        // Only redirect to login for non-upload/logo endpoints
        const isFileOrLogoOperation = error.config?.url?.includes('upload') ||
                                      error.config?.url?.includes('/logo') ||
                                      error.config?.data instanceof FormData;

        if (!isFileOrLogoOperation && !window.location.pathname.includes('/login')) {
          isLoggingOut = true;
          try {
            await signOut({ callbackUrl: '/login', redirect: true });
          } catch {
            // signOut failed - force redirect as fallback
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Generic API methods
export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.get(url, config);
  },

  post: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiInstance.post(url, data, config);
  },

  put: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiInstance.put(url, data, config);
  },

  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> => {
    return apiInstance.patch(url, data, config);
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
    return apiInstance.delete(url, config);
  },
};

// Response wrapper for consistent API responses
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[];
}

// Error response type
export interface ApiError {
  message: string;
  status: number;
  errors?: string[];
  validationErrors?: Record<string, string[]>; // FluentValidation format: { "FieldName": ["error"] }
}

// Helper function to handle API responses
export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error(response.data.message || 'API request failed');
  }
};

// Helper function to handle API errors
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    // Log para debug
    if (process.env.NODE_ENV === 'development') {
      console.log('API Error Response:', responseData);
    }

    // FluentValidation devuelve errores como { "FieldName": ["error1", "error2"] }
    // Detectar si es un objeto de validación (no tiene propiedad 'message' o 'errors')
    let validationErrors: Record<string, string[]> | undefined;

    if (responseData && typeof responseData === 'object') {
      // Si es un objeto con campos como keys (FluentValidation format)
      const hasValidationFormat = Object.keys(responseData).some(key =>
        Array.isArray(responseData[key]) &&
        key !== 'errors' &&
        key !== 'message'
      );

      if (hasValidationFormat) {
        validationErrors = responseData as Record<string, string[]>;
      }
    }

    return {
      message: responseData?.message || 'Error de validación',
      status: error.response?.status || 0,
      errors: responseData?.errors || [],
      validationErrors, // Nuevo campo para errores de FluentValidation
    };
  }

  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
    status: 0,
  };
};

export default apiInstance;
