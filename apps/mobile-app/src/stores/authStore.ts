import { create } from 'zustand';
import { Alert } from 'react-native';
import type { AuthUser } from '@/types';
import { secureStorage } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/constants';
import { setAccessToken, authEventEmitter } from '@/api/client';
import { queryClient } from '@/providers/QueryProvider';
import { syncCursors } from '@/sync/cursors';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingIn: boolean;
  /**
   * Audit 2026-05-18 — soft signal: sesión revocada server-side (otro device
   * tomó la sesión, admin revoke, expiración). UI muestra banner persistente
   * "Tu sesión fue cerrada, presiona aquí para iniciar sesión". Mientras
   * tanto, tokens locales NO se borran y WDB conserva pending data
   * (pedidos, clientes capturados offline). User decide cuándo re-loguear.
   */
  sessionExpired: boolean;

  login: (user: AuthUser, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  setLoggingIn: (loading: boolean) => void;
  setSessionExpired: (expired: boolean) => void;
  /**
   * Actualiza campos del usuario logueado (merge parcial). Persiste el
   * snapshot en secureStorage. Usado por `useMe` cuando refresca el perfil
   * desde el backend (e.g. avatar cambiado desde web).
   */
  setUser: (partial: Partial<AuthUser>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoggingIn: false,
  sessionExpired: false,

  login: async (user, token, refreshToken) => {
    setAccessToken(token);
    await Promise.all([
      secureStorage.set(STORAGE_KEYS.ACCESS_TOKEN, token),
      secureStorage.set(STORAGE_KEYS.REFRESH_TOKEN, refreshToken),
      secureStorage.set(STORAGE_KEYS.USER_DATA, JSON.stringify({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        tenantName: user.tenantName ?? null,
        tenantLogo: user.tenantLogo ?? null,
        mustChangePassword: user.mustChangePassword ?? false,
      })),
    ]);
    // Clear sessionExpired flag al hacer login fresh.
    set({ user, isAuthenticated: true, isLoading: false, isLoggingIn: false, sessionExpired: false });
  },

  setSessionExpired: (expired: boolean) => set({ sessionExpired: expired }),

  logout: async () => {
    setAccessToken(null);
    // Cancelar mutations en flight ANTES de limpiar el cache. Si una mutation
    // termina post-logout, su onSuccess intenta setear state en componente
    // unmounted o accede a queryClient ya limpio → warning + posible crash.
    await queryClient.cancelQueries();
    queryClient.clear();
    // CRÍTICO: limpiar sync cursors. Sin esto, si user A logea, sincroniza, hace
    // logout, y luego user B (mismo device, distinto tenant) logea, los cursores
    // de A persisten → próximo pull pasaría lastPulledAt de A al backend, que
    // depende del filter por tenant del server. Defense-in-depth: borrar cursors.
    syncCursors.clear();
    await secureStorage.clear([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_DATA,
    ]);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  restoreSession: async () => {
    try {
      const [token, userData] = await Promise.all([
        secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN),
        secureStorage.get(STORAGE_KEYS.USER_DATA),
      ]);
      if (token && userData) {
        setAccessToken(token);
        const parsed = JSON.parse(userData);
        // Ensure restored user has at minimum the essential fields
        const user: AuthUser = {
          id: parsed.id,
          email: parsed.email,
          name: parsed.name,
          role: parsed.role,
          avatarUrl: parsed.avatarUrl ?? null,
          tenantName: parsed.tenantName ?? null,
          tenantLogo: parsed.tenantLogo ?? null,
          mustChangePassword: parsed.mustChangePassword ?? false,
        };
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  setLoggingIn: (loading) => set({ isLoggingIn: loading }),

  setUser: async (partial) => {
    const current = useAuthStore.getState().user;
    if (!current) return;
    const merged: AuthUser = { ...current, ...partial };
    set({ user: merged });
    try {
      await secureStorage.set(STORAGE_KEYS.USER_DATA, JSON.stringify({
        id: merged.id,
        email: merged.email,
        name: merged.name,
        role: merged.role,
        avatarUrl: merged.avatarUrl ?? null,
        tenantName: merged.tenantName ?? null,
        tenantLogo: merged.tenantLogo ?? null,
        mustChangePassword: merged.mustChangePassword ?? false,
      }));
    } catch {
      // Persistencia best-effort. State en memoria ya está actualizado.
    }
  },
}));

// Listen for force logout from API interceptor
authEventEmitter.on('forceLogout', () => {
  useAuthStore.getState().logout();
});

// Listen for device revocation by admin
authEventEmitter.on('deviceRevoked', () => {
  Alert.alert(
    'Dispositivo Desvinculado',
    'Tu administrador ha desvinculado este dispositivo. Contacta a tu administrador para volver a acceder.',
    [{ text: 'Aceptar', onPress: () => useAuthStore.getState().logout() }]
  );
});

// Audit 2026-05-18 — soft session revoked. Backend devolvió 401
// SESSION_REVOKED en algún endpoint (sesión cerrada en otro device,
// admin revoke, refresh agotado). NO hacer auto-logout que limpie
// tokens — eso destruye pending data path en WDB y confunde al user.
// Solo marcar state.sessionExpired = true; UI muestra banner persistente
// con tap → login screen.
//
// Beneficios vs viejo flow (deviceTakeoverRequired/forceLogout):
// 1. WDB local intacto — pedidos/clientes pendientes no se pierden
// 2. User decide cuándo re-loguear (no forzado)
// 3. No race conditions durante mutations en flight
// 4. Si vuelve la sesión válida (race con otra app session activa),
//    el siguiente request natural sucede sin interrupciones
authEventEmitter.on('sessionRevoked', () => {
  useAuthStore.getState().setSessionExpired(true);
});

// Backward-compat listeners: handlers viejos siguen disparando si el bundle
// recibe eventos legacy. Mismo comportamiento soft (no clear tokens).
authEventEmitter.on('forceLogout', () => {
  useAuthStore.getState().setSessionExpired(true);
});
authEventEmitter.on('deviceTakeoverRequired', () => {
  useAuthStore.getState().setSessionExpired(true);
});
