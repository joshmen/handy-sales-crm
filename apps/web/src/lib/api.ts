import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '@/lib/constants';
import { getSession, signOut } from 'next-auth/react';
import { translateError } from '@/lib/translateError';

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
      // Skip auth token injection on public pages (no session available)
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
      const isPublicPage = publicPaths.some(p => window.location.pathname.includes(p));

      if (!isPublicPage) {
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

// Flags to prevent multiple simultaneous refreshes/logouts
let isLoggingOut = false;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let refreshFailCount = 0;
const MAX_REFRESH_FAILURES = 2;

/** Reset auth state after successful login (call from useAuthSession) */
export function resetAuthState() {
  isLoggingOut = false;
  isRefreshing = false;
  refreshPromise = null;
  refreshFailCount = 0;
}

async function tryRefreshSession(): Promise<string | null> {
  // Circuit breaker: stop trying after repeated failures
  if (refreshFailCount >= MAX_REFRESH_FAILURES) {
    return null;
  }
  try {
    const session = await getSession();
    if (session?.accessToken && !session.error) {
      _cachedAccessToken = session.accessToken;
      refreshFailCount = 0; // Reset on success
      return session.accessToken;
    }
    refreshFailCount++;
    return null;
  } catch {
    refreshFailCount++;
    return null;
  }
}

// Response interceptor with token refresh retry
apiInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async error => {
    const status = error.response?.status;
    const originalRequest = error.config;

    if (error.code === 'ECONNABORTED') {
      console.error('API timeout:', error.config?.url);
      return Promise.reject(error);
    }

    if (status !== 404 && status !== 400) {
      if (process.env.NODE_ENV === 'development' && status >= 500) {
        console.error('API Error:', status, error.config?.url);
      }
    }

    // MAINTENANCE_MODE: server is in maintenance, block write operations
    if (status === 503 && error.response?.data?.code === 'MAINTENANCE_MODE') {
      // Don't reject silently — let the calling code know
      return Promise.reject(error);
    }

    // TENANT_DEACTIVATED: tenant was deactivated by SuperAdmin — redirect to suspended page
    if (status === 403 && typeof window !== 'undefined') {
      const code = error.response?.data?.code;
      if (code === 'TENANT_DEACTIVATED') {
        if (!isLoggingOut && !window.location.pathname.includes('/tenant-suspended')) {
          isLoggingOut = true;
          _cachedAccessToken = null;
          try {
            await signOut({ redirect: false });
          } catch { /* ignore */ }
          window.location.href = '/tenant-suspended';
        }
        return Promise.reject(error);
      }
    }

    if (status === 401 && typeof window !== 'undefined') {
      // On login/register/public pages, never attempt refresh or redirect — just reject silently
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
      if (publicPaths.some(p => window.location.pathname.includes(p))) {
        return Promise.reject(error);
      }

      const responseCode = error.response?.data?.code;

      // SESSION_REPLACED: another device took the session — immediate redirect, no refresh
      if (responseCode === 'SESSION_REPLACED') {
        if (!isLoggingOut && !window.location.pathname.includes('/login')) {
          isLoggingOut = true;
          _cachedAccessToken = null;
          try {
            sessionStorage.setItem('session_replaced', 'true');
          } catch { /* ignore */ }
          try {
            await signOut({ callbackUrl: '/login', redirect: true });
          } catch {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      const authHeader = originalRequest?.headers?.Authorization;
      const isMockToken = authHeader && typeof authHeader === 'string' && authHeader.includes('mock-');

      if (isMockToken && process.env.NODE_ENV === 'development') {
        console.warn('API 401 with mock token - skipping logout redirect');
        return Promise.reject(error);
      }

      // Try refresh once per failed request
      if (!originalRequest._retry && !isLoggingOut) {
        originalRequest._retry = true;

        // Coalesce multiple 401s into a single refresh
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = tryRefreshSession().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
        }

        const newToken = await (refreshPromise ?? tryRefreshSession());
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiInstance(originalRequest);
        }
      }

      // Refresh failed or already retried: sign out
      if (!isLoggingOut) {
        const isFileOrLogoOperation = originalRequest?.url?.includes('upload') ||
                                      originalRequest?.url?.includes('/logo') ||
                                      originalRequest?.data instanceof FormData;

        if (!isFileOrLogoOperation && !window.location.pathname.includes('/login')) {
          isLoggingOut = true;
          try {
            await signOut({ callbackUrl: '/login', redirect: true });
          } catch {
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

/** Sanitize backend error messages — never show technical details to the user */
const sanitizeMessage = (msg: string | undefined, fallback: string): string => {
  if (!msg || typeof msg !== 'string') return fallback;
  const technicalPatterns = /Exception|Stack[Tt]race|at\s+\w+\.\w+|NullReference|Npgsql|System\.|Microsoft\.|BCrypt|Salt/i;
  if (technicalPatterns.test(msg)) return fallback;
  return msg;
};

// Helper function to handle API errors
export const handleApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

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

    const rawMessage = responseData?.message || responseData?.error;
    const fallback = getApiFallbackMessage();
    return {
      message: translateError(sanitizeMessage(rawMessage, fallback)),
      status: error.response?.status || 0,
      errors: responseData?.errors || [],
      validationErrors,
    };
  }

  return {
    message: translateError(getApiFallbackMessage()),
    status: 0,
  };
};

export default apiInstance;
