import axios, {
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosError,
} from 'axios';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Crypto from 'expo-crypto';
import { API_CONFIG, STORAGE_KEYS } from '@/utils/constants';
import { secureStorage } from '@/utils/storage';

// TODO [CRIT-4 / SEC-M2]: SSL/TLS public-key pinning.
// PRIORIDAD: HIGH — vector real de MITM en WiFi público (cafetería, evento).
// Vendedor con tablet en ruta es target.
//
// IMPLEMENTACIÓN REAL (paso a paso, requiere acceso a producción):
//
// 1. Extraer SHA-256 SPKI pins del cert prod:
//    openssl s_client -servername api.handysuites.com -connect api.handysuites.com:443 \
//      < /dev/null 2>/dev/null \
//      | openssl x509 -pubkey -noout \
//      | openssl pkey -pubin -outform der \
//      | openssl dgst -sha256 -binary \
//      | openssl enc -base64
//    Repetir para `*.railway.app` (backup pin durante rotación).
//
// 2. Instalar el paquete:
//    npx expo install react-native-ssl-public-key-pinning
//    (NO `react-native-ssl-pinning` — esa es legacy y no soporta SDK 52).
//
// 3. Config en `app.config.ts` plugins:
//    plugins: [..., 'react-native-ssl-public-key-pinning']
//    + EAS build (es native module, NO ota update sirve).
//
// 4. Config los pins ANTES de crear el axios instance:
//    import { addSslPinningConfig } from 'react-native-ssl-public-key-pinning';
//    await addSslPinningConfig({
//      'api.handysuites.com': {
//        includeSubdomains: false,
//        publicKeyHashes: [
//          'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // primary cert SPKI
//          'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // backup (next rotation)
//        ],
//      },
//    });
//
// 5. ROTATION PROCEDURE (DOCUMENTAR antes de prod):
//    - Pre-rotation: incluir el cert nuevo en pins ANTES de rotar (overlap window).
//    - Post-rotation: remover el cert viejo en siguiente EAS build.
//    - Si se rompe: app no puede conectar; única recuperación es nuevo APK con
//      pins actualizados. NO hay forma de "deshacer" via OTA.
//
// 6. Monitoring: alerta cuando el cert prod esté a <30 días de expirar.
//
// IMPACT si se omite: vendedores con plan corporativo en hotspot maliciosa
// pueden ver tokens JWT, datos de cliente, ubicaciones GPS interceptados.

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
  // Login fresh / refresh exitoso: limpiar state in-flight de la sesión
  // vieja. Sin esto, una refreshPromise iniciada con el refresh_token
  // viejo (cuando la sesión previa expiró) puede resolver con
  // SESSION_REVOKED segundos después del login y disparar forceLogout —
  // matando la sesión recién emitida. Reportado 2026-05-05 (Mazatlán
  // 6:38pm): user veía logout automático ~1s post-login.
  if (token) {
    isRefreshing = false;
    refreshPromise = null;
    // Resolver requests en queue con el nuevo token (no rejectar — el
    // login ya validó que el token es bueno).
    failedQueue.forEach(({ resolve }) => resolve(token));
    failedQueue = [];
  }
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

// --- Device ID (hardware-based, persists across reinstalls) ---
let _deviceId: string | null = null;
let _deviceFingerprint: string | null = null;

async function getPlatformDeviceId(): Promise<string> {
  if (Platform.OS === 'android') {
    // Application.getAndroidId() returns a unique ID per device+app signing key.
    // Persists across reinstalls (unlike random UUIDs).
    const androidId = Application.getAndroidId();
    return androidId || `android-${Device.modelName}-fallback`;
  }
  if (Platform.OS === 'ios') {
    const vendorId = await Application.getIosIdForVendorAsync();
    return vendorId || `ios-${Device.modelName}-fallback`;
  }
  return `${Device.modelName || 'device'}-${Platform.OS}`;
}

async function getDeviceId(): Promise<string> {
  if (_deviceId) return _deviceId;
  _deviceId = await getPlatformDeviceId();
  // Also persist to secure storage for backward compat
  await secureStorage.set(STORAGE_KEYS.DEVICE_ID, _deviceId);
  return _deviceId;
}

async function getDeviceFingerprint(): Promise<string> {
  if (_deviceFingerprint) return _deviceFingerprint;
  const platformId = await getDeviceId();
  const raw = `${platformId}|${Device.brand || ''}|${Device.modelName || ''}|${Platform.OS}`;
  _deviceFingerprint = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    raw
  );
  return _deviceFingerprint;
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
  config.headers['X-Device-Fingerprint'] = await getDeviceFingerprint();
  config.headers['X-App-Version'] =
    Application.nativeApplicationVersion || '1.0.0';

  return config;
});

// --- Response interceptor: 401 handling with token refresh + device binding ---
apiInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 401) {
      const errorCode = error.response.data?.code;
      // Capturamos el token con el que se mandó la request original.
      // Si entre el envío y recibir el 401, el user hizo login fresh,
      // _cachedAccessToken cambió — el 401 corresponde a la sesión vieja
      // y NO debe disparar forceLogout sobre la sesión nueva.
      const tokenAtRequest = (originalRequest.headers?.Authorization as string | undefined)
        ?.replace('Bearer ', '');

      // Device was revoked by admin — force logout with specific message
      if (errorCode === 'DEVICE_REVOKED' || errorCode === 'SESSION_REVOKED') {
        // Guard: si el JWT actual ya es uno nuevo, ignorar — el revoke
        // aplicaba a la sesión previa, ya superada por login fresh.
        if (tokenAtRequest && _cachedAccessToken && tokenAtRequest !== _cachedAccessToken) {
          if (__DEV__) console.log('[API] 401 SESSION_REVOKED on stale token — ignoring (user re-logged in)');
          return Promise.reject(error);
        }
        authEventEmitter.emit('deviceRevoked');
        return Promise.reject(error);
      }

      if (!originalRequest._retry) {
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
        } catch (e) {
          // fall through
          if (__DEV__) console.warn('[API]', e);
        }

        // Guard: si el cliente ya tiene un token válido distinto del que
        // falló (login fresh ocurrió mientras hacíamos refresh), no
        // forzamos logout — la sesión nueva es válida.
        if (tokenAtRequest && _cachedAccessToken && tokenAtRequest !== _cachedAccessToken) {
          if (__DEV__) console.log('[API] refresh fail on stale token — ignoring (user re-logged in)');
          return Promise.reject(error);
        }

        processQueueError(new Error('Token refresh failed'));
        authEventEmitter.emit('forceLogout');
      }
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
  } catch (e) {
    // Token expired or revoked
    if (__DEV__) console.warn('[API]', e);
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
