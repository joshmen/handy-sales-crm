import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { API_CONFIG, STORAGE_KEYS } from '@/utils/constants';
import { secureStorage } from '@/utils/storage';

// --- Axios instance ---
const apiInstance: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// --- In-memory token cache (same pattern as web) ---
let _cachedAccessToken: string | null = null;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: Error) => void;
}> = [];

export function setAccessToken(token: string | null) {
  _cachedAccessToken = token;
}

export function getAccessToken(): string | null {
  return _cachedAccessToken;
}

// --- Simple event emitter for force logout (avoids circular import with store) ---
type Listener = () => void;

class AuthEventEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: string, fn: Listener) {
    (this.listeners[event] ||= []).push(fn);
  }

  off(event: string, fn: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter(
      (f) => f !== fn
    );
  }

  emit(event: string) {
    (this.listeners[event] || []).forEach((fn) => fn());
  }
}

export const authEventEmitter = new AuthEventEmitter();

// --- Device ID (persistent, generated once) ---
let _deviceId: string | null = null;

async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  _deviceId = await secureStorage.get(STORAGE_KEYS.DEVICE_ID);
  if (!_deviceId) {
    _deviceId = `${Device.modelName || 'device'}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await secureStorage.set(STORAGE_KEYS.DEVICE_ID, _deviceId);
  }
  return _deviceId;
}

// --- Request interceptor: Bearer token + device headers ---
apiInstance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let token = _cachedAccessToken;
  if (!token) {
    token = await secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) _cachedAccessToken = token;
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers['X-Device-Id'] = await getDeviceId();
  config.headers['X-App-Version'] =
    Application.nativeApplicationVersion || '1.0.0';

  return config;
});

// --- Response interceptor: 401 handling with token refresh ---
apiInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = tryRefreshToken();
        refreshPromise.finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(newToken);
          return apiInstance(originalRequest);
        }
      } catch {
        // fall through
      }

      processQueueError(new Error('Token refresh failed'));
      authEventEmitter.emit('forceLogout');
    }

    return Promise.reject(error);
  }
);

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = await secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;

  try {
    // Direct axios.post (not through interceptor) to avoid infinite loop
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}/api/mobile/auth/refresh`,
      { RefreshToken: refreshToken }
    );

    if (response.data?.success && response.data?.data) {
      const { token, refreshToken: newRefresh } = response.data.data;
      _cachedAccessToken = token;
      await secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, token);
      await secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, newRefresh);
      return token;
    }
  } catch {
    // Token expired or revoked
  }

  return null;
}

function processQueue(token: string) {
  failedQueue.forEach((p) => p.resolve(token));
  failedQueue = [];
}

function processQueueError(err: Error) {
  failedQueue.forEach((p) => p.reject(err));
  failedQueue = [];
}

// --- Typed API wrapper ---
export const api = {
  get: <T = unknown>(url: string, config?: object) =>
    apiInstance.get<T>(url, config),
  post: <T = unknown>(url: string, data?: unknown, config?: object) =>
    apiInstance.post<T>(url, data, config),
  put: <T = unknown>(url: string, data?: unknown, config?: object) =>
    apiInstance.put<T>(url, data, config),
  patch: <T = unknown>(url: string, data?: unknown, config?: object) =>
    apiInstance.patch<T>(url, data, config),
  delete: <T = unknown>(url: string, config?: object) =>
    apiInstance.delete<T>(url, config),
};

export default api;
