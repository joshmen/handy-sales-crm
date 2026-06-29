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

/**
 * Token de acceso en memoria (mismo JWT que usa el Main API). Lo consumen clientes
 * que apuntan a OTROS servicios con el secreto JWT compartido (ej. el chatbot :1054).
 */
export function getApiAccessToken(): string | null {
  return _cachedAccessToken;
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

/**
 * Error de API como instancia REAL de Error (antes era un objeto plano, lo que
 * rompía los `catch` con `err instanceof Error` → mostraban "Error" genérico en
 * vez del mensaje real del backend). Lleva status/errors/validationErrors para
 * los consumidores existentes (ClientForm, useApi). `err.message` = mensaje real.
 */
export class ApiException extends Error {
  status: number;
  errors?: string[];
  validationErrors?: Record<string, string[]>;
  constructor(init: ApiError) {
    super(init.message);
    this.name = 'ApiException';
    this.status = init.status;
    this.errors = init.errors;
    this.validationErrors = init.validationErrors;
  }
}

// Helper function to handle API responses
export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.success) {
    return response.data.data;
  } else {
    throw new Error(response.data.message || 'API request failed');
  }
};

/** Get locale-aware fallback error message */
const getApiFallbackMessage = (): string => {
  try {
    const settings = JSON.parse(localStorage.getItem('company_settings') || '{}');
    return settings.language === 'en'
      ? 'An error occurred. Please try again.'
      : 'Ocurrió un error. Intenta nuevamente.';
  } catch {
    return 'Ocurrió un error. Intenta nuevamente.';
  }
};

/** Sanitize backend error messages — never show technical details to the user */
const sanitizeMessage = (msg: string | undefined, fallback: string): string => {
  if (!msg || typeof msg !== 'string') return fallback;
  const technicalPatterns = /Exception|Stack[Tt]race|at\s+\w+\.\w+|NullReference|Npgsql|System\.|Microsoft\.|BCrypt|Salt/i;
  if (technicalPatterns.test(msg)) return fallback;
  return msg;
};

/** Primer mensaje de un objeto de validación FluentValidation { Campo: ["err"] }. */
const firstValidationMessage = (data: Record<string, unknown>): string | undefined => {
  for (const key of Object.keys(data)) {
    if (key === 'errors' || key === 'message') continue;
    const arr = data[key];
    if (Array.isArray(arr) && arr.length && typeof arr[0] === 'string') return arr[0];
  }
  return undefined;
};

// Helper function to handle API errors → siempre una instancia de ApiException (Error).
export const handleApiError = (error: unknown): ApiException => {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    // FluentValidation devuelve errores como { "FieldName": ["error1", "error2"] }
    let validationErrors: Record<string, string[]> | undefined;
    let validationFirst: string | undefined;

    if (responseData && typeof responseData === 'object') {
      const hasValidationFormat = Object.keys(responseData).some(key =>
        Array.isArray(responseData[key]) &&
        key !== 'errors' &&
        key !== 'message'
      );
      if (hasValidationFormat) {
        validationErrors = responseData as Record<string, string[]>;
        validationFirst = firstValidationMessage(responseData as Record<string, unknown>);
      }
    }

    // Cubre TODAS las formas de error del backend (auditadas):
    // { message }, { error }, { code, message }, { success, message }, validación FluentValidation, ProblemDetails { detail/title }.
    const rawMessage =
      responseData?.message ||
      responseData?.error ||
      validationFirst ||
      responseData?.detail ||
      responseData?.title;
    const fallback = getApiFallbackMessage();
    return new ApiException({
      message: translateError(sanitizeMessage(rawMessage, fallback)),
      status: error.response?.status || 0,
      errors: responseData?.errors || [],
      validationErrors,
    });
  }

  return new ApiException({
    message: translateError(getApiFallbackMessage()),
    status: 0,
  });
};

/**
 * Extrae el mensaje de error de cualquier forma (para contextos sin el hook
 * useApiErrorToast): ApiException/Error → su message; axios crudo → message/error/
 * validación/detail; si no hay nada → fallback por locale. Filtra el boilerplate
 * "Request failed with status...".
 */
export const getApiErrorMessage = (err: unknown, fallback?: string): string => {
  const fb = fallback || getApiFallbackMessage();
  const isGeneric = (m?: string) =>
    !m || /^request failed with status/i.test(m) || m.toLowerCase() === 'network error';

  if (err instanceof ApiException) return isGeneric(err.message) ? fb : err.message;
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as Record<string, unknown> | undefined;
    const msg =
      (data?.message as string) ||
      (data?.error as string) ||
      (data && firstValidationMessage(data)) ||
      (data?.detail as string) ||
      (data?.title as string);
    return isGeneric(msg) ? fb : (msg as string);
  }
  if (err instanceof Error) return isGeneric(err.message) ? fb : err.message;
  return fb;
};

export default apiInstance;
