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

// Bug #1 (audit 2026-05-07): tokens explícitamente superados por un
// login/force-login fresh. Cualquier 401 que regrese con uno de estos
// tokens en la Authorization debe ser ignorado — pertenece a la sesión
// vieja revocada, no a la sesión nueva válida. Sin este Set, un 401
// que regresa después del setAccessToken pero ANTES de que `_cachedAccessToken`
// haya sido leído por el interceptor (race del orden de microtasks)
// dispara refresh con el token viejo (revocado por force-login) →
// retry loop → rate limit 429 → toast "demasiados reintentos" + forceLogout.
const _staleTokens = new Set<string>();
const STALE_TOKEN_TTL_MS = 30_000;

export function setAccessToken(token: string | null) {
  const previousToken = _cachedAccessToken;
  _cachedAccessToken = token;
  // Login fresh / refresh exitoso: limpiar state in-flight de la sesión
  // vieja. Sin esto, una refreshPromise iniciada con el refresh_token
  // viejo (cuando la sesión previa expiró) puede resolver con
  // SESSION_REVOKED segundos después del login y disparar forceLogout —
  // matando la sesión recién emitida. Reportado 2026-05-05 (Mazatlán
  // 6:38pm): user veía logout automático ~1s post-login.
  if (token) {
    // Marcar el token previo como stale por 30s (suficiente para que
    // requests en vuelo terminen sin matar la sesión nueva). Cubre el
    // bug de session takeover reportado 2026-05-07.
    if (previousToken && previousToken !== token) {
      _staleTokens.add(previousToken);
      setTimeout(() => _staleTokens.delete(previousToken), STALE_TOKEN_TTL_MS);
    }
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
// Audit 2026-06-01 (v4) — eventos canónicos:
//   - 'sessionRevoked'  → SOFT signal (banner, WDB intacto). Backend codes:
//                          SESSION_REVOKED, refresh exhausted.
//   - 'deviceRevoked'   → HARD signal (Alert + logout()). Backend code:
//                          DEVICE_REVOKED (admin unbinding device).
//   - 'forceLogout'     → backward-compat (= sessionRevoked).
type AuthEvent = 'sessionRevoked' | 'deviceRevoked' | 'forceLogout';

class AuthEventEmitter {
  private listeners: Record<string, Listener[]> = {};

  on(event: AuthEvent, fn: Listener) {
    (this.listeners[event] ||= []).push(fn);
  }

  off(event: AuthEvent, fn: Listener) {
    this.listeners[event] = (this.listeners[event] || []).filter(
      (f) => f !== fn
    );
  }

  emit(event: AuthEvent) {
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

// --- Response interceptor: 401 handling with token refresh ---
// Audit 2026-05-18 — rediseño Netflix/Spotify-style:
// Backend ahora responde 1 solo código de session error: SESSION_REVOKED (401).
// Cliente: emite 'sessionRevoked' como SOFT signal (no auto-logout). El
// authStore listener muestra banner persistente; user decide cuándo
// re-loguear. Tokens locales SE CONSERVAN hasta que user vaya a login
// screen. Pending data en WDB intacto.
//
// Para AUTH endpoints (login/refresh/revoke-and-login), NO emitir eventos
// porque el caller (useLogin/auth.ts) maneja directamente.
apiInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const requestUrl = originalRequest?.url || '';
    // Audit 2026-06-01 — antes era `requestUrl.includes('/api/mobile/auth/')`,
    // que excluía TODA la familia /auth/ del banner. Eso ocultaba problemas
    // reales como /me, /change-password, /logout, /device-token, /my-sessions,
    // /revoke-session: si esos devolvían 401 SESSION_REVOKED el user quedaba
    // confundido viendo el screen pero sin feedback. Solo los endpoints
    // estrictamente de adquisición/renovación de token deben quedar exentos
    // (sus callers ya manejan errores directo).
    const AUTH_EXEMPT_PATHS = [
      '/api/mobile/auth/login',
      '/api/mobile/auth/force-login',
      '/api/mobile/auth/revoke-and-login',
      '/api/mobile/auth/refresh',
      '/api/mobile/auth/ack-unbind',
      // Audit 2026-06-01 — change-password: el caller (cambiar-password
      // screen) maneja sus errores directamente con Toast/inline. Si el
      // backend devuelve 401 SESSION_REVOKED mientras el user está mid-
      // change-password, no debemos disparar el banner — la pantalla ya
      // está en (auth) y el flujo natural es que el caller muestre el
      // error y route al user a login si corresponde.
      '/api/mobile/auth/change-password',
    ];
    // Audit 2026-06-01 (v4) — antes era `requestUrl.includes(p)`, demasiado
    // laxo: `/api/mobile/auth/login` matchearía un hipotético endpoint
    // `/api/mobile/auth/login-history` y lo dejaría exento del banner por
    // accidente. Comparamos el pathname strict: igual, con query (`?…`), o
    // con sub-segmento (`/…`). Si parsear la URL falla (URL relativa sin
    // origen base), fallback a comparar el final del string contra el path
    // (sin sufijos sospechosos). Hermes/RN 0.81 trae `URL` nativo.
    const isAuthEndpoint = AUTH_EXEMPT_PATHS.some((p) => {
      try {
        const u = new URL(requestUrl, API_CONFIG.BASE_URL);
        const path = u.pathname;
        return path === p || path.startsWith(p + '?') || path.startsWith(p + '/');
      } catch {
        // Fallback: requestUrl no parseable como URL absoluta o relativa
        // a BASE_URL. Hacer un match más estricto que `includes`: el path
        // debe terminar exactamente en `p`, o seguirle `?` o `/`.
        const re = new RegExp(
          `(^|/)${p.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\?|$|/)`
        );
        return re.test(requestUrl);
      }
    });

    if (error.response?.status === 401) {
      const errorCode = error.response.data?.code;
      const tokenAtRequest = (originalRequest.headers?.Authorization as string | undefined)
        ?.replace('Bearer ', '');

      // Guard race: si el token de la request fue superado por login fresh,
      // ignorar el 401 sin emitir nada (la sesión nueva es válida).
      if (tokenAtRequest && _staleTokens.has(tokenAtRequest)) {
        if (__DEV__) console.log('[API] 401 on stale token — ignoring (superseded by fresh login)');
        return Promise.reject(error);
      }

      // Audit 2026-06-01 (v4) — separar SESSION_REVOKED (soft) de DEVICE_REVOKED
      // (hard). Antes ambos códigos compartían el path soft; eso era un bug
      // semántico: DEVICE_REVOKED es una acción admin irreversible que
      // requiere logout completo + Alert (lo emite el backend cuando el admin
      // desvincula el dispositivo). SESSION_REVOKED es transient (sesión
      // específica revocada — otro device tomó la sesión, refresh expirado,
      // etc.) y mantiene el flow soft con banner + WDB intacta.
      //
      // Audit 2026-06-01 (v5) — SEC MOD: DEVICE_REVOKED debe emitirse SIEMPRE,
      // incluso si la request salió de un endpoint exempt (login/refresh/
      // change-password). Antes el guard isAuthEndpoint silenciaba el evento
      // y los tokens revocados se quedaban en SecureStore sin Alert ni
      // logout: el user podía seguir en /change-password tipeando sin saber
      // que el admin ya lo desvinculó. Stale-token guard se mantiene (no
      // emitir si la request iba con un token superado por login fresh).
      if (errorCode === 'DEVICE_REVOKED') {
        if (tokenAtRequest && _cachedAccessToken && tokenAtRequest !== _cachedAccessToken) {
          if (__DEV__) console.log('[API] 401 DEVICE_REVOKED on stale token — ignoring (user re-logged in)');
          return Promise.reject(error);
        }
        if (__DEV__) console.log('[API] 401 DEVICE_REVOKED — emitting deviceRevoked (hard, bypassing exempt guard)');
        authEventEmitter.emit('deviceRevoked');
        return Promise.reject(error);
      }

      // SESSION_REVOKED es soft; los endpoints exempt (login/refresh/...)
      // manejan sus 401s inline sin necesidad del banner global.
      if (errorCode === 'SESSION_REVOKED') {
        if (tokenAtRequest && _cachedAccessToken && tokenAtRequest !== _cachedAccessToken) {
          if (__DEV__) console.log('[API] 401 SESSION_REVOKED on stale token — ignoring (user re-logged in)');
          return Promise.reject(error);
        }
        if (!isAuthEndpoint) {
          if (__DEV__) console.log('[API] 401 SESSION_REVOKED — emitting sessionRevoked (soft)');
          authEventEmitter.emit('sessionRevoked');
        }
        return Promise.reject(error);
      }

      // 401 sin code conocido: intentar token refresh una vez.
      if (!originalRequest._retry && !isAuthEndpoint) {
        originalRequest._retry = true;

        // Coalesce: si useSessionRefresh u otro 401 ya disparó refresh,
        // reusamos el mismo promise. Sin esto teníamos 2 fuentes paralelas
        // (interceptor + hook) hitting /refresh server-side al mismo tiempo
        // → orphan tokens (incident vendedor@jeyma 2026-05-19).
        try {
          const newToken = await coalesceRefresh();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            processQueue(newToken);
            return apiInstance(originalRequest);
          }
        } catch (e) {
          if (__DEV__) console.warn('[API] refresh failed', e);
        }

        // Refresh fail: si el cliente ya tiene token nuevo distinto, no
        // hacer logout (race con login fresh).
        if (tokenAtRequest && _cachedAccessToken && tokenAtRequest !== _cachedAccessToken) {
          if (__DEV__) console.log('[API] refresh fail on stale token — ignoring');
          return Promise.reject(error);
        }

        // Refresh definitivamente falló → tratar como sesión revocada (soft).
        // NO emit 'forceLogout' (legacy hard logout). Emit sessionRevoked
        // para que UI muestre banner y user decida.
        processQueueError(new Error('Token refresh failed'));
        if (__DEV__) console.log('[API] refresh exhausted — emitting sessionRevoked (soft)');
        authEventEmitter.emit('sessionRevoked');
      }
    }

    // Network errors (axios sin response): marcar específicamente para que
    // callers diferencien "sin conexión" vs "401 sin procesar".
    if (!error.response) {
      (error as AxiosError & { isNetworkError?: boolean }).isNetworkError = true;
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

/**
 * Audit 2026-05-19: coalesce de refresh calls cross-source.
 *
 * Antes: `useSessionRefresh` hook hacía raw `axios.post('/refresh')` paralelo
 * al interceptor, causando dos /refresh server-side simultáneas que producían
 * orphan tokens (incident vendedor@jeyma 2026-05-19). El backend ahora atrapa
 * el race con DbUpdateConcurrencyException, pero igual queremos coalescer
 * client-side para ahorrar request + ancho de banda.
 *
 * Esta función reusa el mismo `refreshPromise` que el interceptor cuando hay
 * un refresh in-flight; si no, lo dispara. Result: 1 sola POST a /refresh
 * sin importar cuántos callers paralelos (hook + interceptor + N requests).
 */
export async function coalesceRefresh(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = tryRefreshToken();
  refreshPromise.finally(() => {
    isRefreshing = false;
    refreshPromise = null;
  });
  return refreshPromise;
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
