import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getSession } from 'next-auth/react';

const BILLING_API_URL = process.env.NEXT_PUBLIC_BILLING_API_URL || 'http://localhost:1051';

// Billing API axios instance — mirrors lib/api.ts patterns
const billingInstance: AxiosInstance = axios.create({
  baseURL: BILLING_API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token cache (same pattern as main API)
let _cachedAccessToken: string | null = null;

export function setBillingApiAccessToken(token: string | null) {
  _cachedAccessToken = token;
}

// Request interceptor — JWT auth + tenant header
billingInstance.interceptors.request.use(
  async config => {
    if (typeof window !== 'undefined') {
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];
      const isPublicPage = publicPaths.some(p => window.location.pathname.includes(p));

      if (!isPublicPage) {
        if (_cachedAccessToken) {
          config.headers.Authorization = `Bearer ${_cachedAccessToken}`;
        } else {
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

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor — basic error logging (no redirect/refresh, delegates to main api.ts)
billingInstance.interceptors.response.use(
  (response: AxiosResponse) => response,
  error => {
    const status = error.response?.status;
    if (process.env.NODE_ENV === 'development' && status && status >= 500) {
      console.error('Billing API Error:', status, error.config?.url);
    }
    return Promise.reject(error);
  }
);

export const billingApi = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    billingInstance.get(url, config),

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    billingInstance.post(url, data, config),

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    billingInstance.put(url, data, config),

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    billingInstance.patch(url, data, config),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> =>
    billingInstance.delete(url, config),
};

export default billingInstance;
