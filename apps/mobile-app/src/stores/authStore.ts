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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isLoggingIn: false,
  sessionExpired: false,

  login: async (user, token, refreshToken) => {
    // Audit 2026-06-01 (v4) — cross-user leak guard. Si el login() entra con un
    // user.id distinto al previo (caso: sesión soft-revoked → user tappea
    // banner → login pantalla → ingresa credenciales de OTRO usuario, posibly
    // de otro tenant), el WatermelonDB local todavía contiene clientes /
    // pedidos / catálogos del user A. Sin reset, el nuevo user B vería el
    // pull diferencial encima de datos ajenos hasta que el server invalide.
    // Es un leak multi-tenant CRÍTICO. Soft-logout normal (mismo user
    // re-loguea) NO entra a esta rama: prevUser.id === user.id → skip reset
    // y conservamos pending offline data como manda el diseño Netflix-style.
    const prevUser = get().user;
    const isDifferentUser = !!prevUser && prevUser.id !== user.id;

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

    // Persistir SESSION_EXPIRED=false (login fresh limpia el flag persistido).
    secureStorage.set(STORAGE_KEYS.SESSION_EXPIRED, 'false').catch(() => {});

    if (isDifferentUser) {
      // Full reset: query cache, sync cursors y WDB local. El nuevo user
      // pulleará desde cero al primer sync. Las exceptions silenciosas son
      // intencionales — no queremos bloquear el set() del nuevo user si
      // alguno de los clears falla; preferimos sesión válida con stale cache
      // antes que loop de error que deje al user fuera.
      try { await queryClient.cancelQueries(); queryClient.clear(); } catch {}
      try { syncCursors.clear(); } catch {}
      try {
        const { database } = await import('@/db/database');
        await database.write(async () => {
          await database.unsafeResetDatabase();
        });
      } catch (e) {
        // Si el reset falla, loggeamos pero NO abortamos el login —
        // siguiente sync server-side filtrará por tenant. Stale cache
        // ≪ que dejar al user sin poder entrar.
        if (__DEV__) console.warn('[authStore] WDB reset failed:', e);
      }
    }

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
    // Audit 2026-06-01 (v4) — limpiar también el flag persistido. Si quedaba
    // SESSION_EXPIRED='true' de una soft-revoke previa, el siguiente cold-start
    // entraría a login (correcto), pero al loguear se sentaba el flag en false
    // por la persistencia de login(); de todas formas escribimos explícitamente
    // aquí como defense-in-depth para el hard logout path.
    secureStorage.set(STORAGE_KEYS.SESSION_EXPIRED, 'false').catch(() => {});
    // Audit 2026-06-01 (v5) — SEC CRIT: replicar el patrón de B1 del v4 (login()).
    // logout() es la otra vía por la que un device puede cambiar de user (caso:
    // admin desvincula device → Alert → logout(); o user tappea "Cerrar sesión"
    // y entra otro user al mismo device). Sin reset del WDB local, los datos
    // (clientes, pedidos, catálogos) del user anterior quedan accesibles para
    // el siguiente login → cross-user/cross-tenant leak idéntico al de B1.
    // Dynamic import para evitar circular (database → stores → authStore);
    // try/catch silencioso para no abortar el logout si el reset falla
    // (preferimos sesión cerrada con stale WDB que loop de error que deje al
    // user con sesión abierta).
    try {
      const { database } = await import('@/db/database');
      await database.write(async () => { await database.unsafeResetDatabase(); });
    } catch (e) {
      if (__DEV__) console.warn('[authStore] WDB reset on logout failed:', e);
    }
    // Audit 2026-06-01 — incluir sessionExpired: false en el reset. Sin esto,
    // si el user llegó a login screen vía banner (sessionExpired=true) y
    // ejecuta logout() manual desde un endpoint duro, el flag se quedaba
    // pegado y el siguiente login fresh lo arrastraba (banner aparecía mid-
    // sesión nueva). login() también lo resetea, pero defense-in-depth.
    set({ user: null, isAuthenticated: false, isLoading: false, sessionExpired: false });
  },

  restoreSession: async () => {
    try {
      const [token, userData, sessionExpiredFlag] = await Promise.all([
        secureStorage.get(STORAGE_KEYS.ACCESS_TOKEN),
        secureStorage.get(STORAGE_KEYS.USER_DATA),
        secureStorage.get(STORAGE_KEYS.SESSION_EXPIRED),
      ]);
      // Audit 2026-06-01 (v4) — persistencia de sessionExpired entre cold-starts.
      // Si la última corrida marcó la sesión como revocada (soft) y el user
      // mató la app antes de re-loguear, NO debemos volver a montar (tabs) al
      // siguiente launch: tokens locales pueden seguir presentes en SecureStore
      // (por diseño soft-logout), pero el server ya los rechaza. Mostrar tabs
      // = flash + 401-storm + bounce. Forzar al user al login screen
      // directamente (isAuthenticated=false). El flag se limpia en login()
      // o logout().
      // (v5) — la const `sessionExpired` ahora se declara dentro del if/else
      // para gatear setAccessToken (ver fix C1 abajo); ambos branches la
      // re-derivan del mismo `sessionExpiredFlag`.

      if (token && userData) {
        // Audit 2026-06-01 (v5) — CODE C1: no cachear el token in-memory si el
        // flag persistido marca la sesión como revocada. setAccessToken()
        // pondría un token ya rechazado por el server en el cache que usan
        // useRealtime/useSessionRefresh/cualquier request que dispare antes
        // del re-login → 401 storm + bounce. El token sigue en SecureStore
        // (no lo borramos: el diseño soft-logout lo conserva); simplemente
        // no lo cargamos a memoria. Al hacer login fresh, ese flow llamará
        // setAccessToken() con el nuevo token y el cache se inicializa
        // limpio.
        const sessionExpired = sessionExpiredFlag === 'true';
        if (!sessionExpired) {
          setAccessToken(token);
        }
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
          // Si el flag persistido dice expired, mantener al user fuera de (tabs)
          // hasta que complete su re-login. Sin isAuthenticated=true ni
          // (tabs) montado evitamos el flash y el 401-storm en cold-start.
          isAuthenticated: !sessionExpired,
          sessionExpired,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, sessionExpired: sessionExpiredFlag === 'true' });
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

// Audit 2026-06-01 — el listener 'forceLogout' que hacía logout() (hard:
// limpiar tokens, queryClient.clear(), syncCursors.clear()) fue eliminado.
// Quedaba un duplicado más abajo que solo seteaba sessionExpired=true (soft).
// Mantener AMBOS handlers para el MISMO evento dispara los dos: primero
// el hard logout destruía pending data en WDB y luego el soft no servía.
// El comportamiento canónico desde el redesign Netflix-style (audit
// 2026-05-18) es SOFT — preservar WDB pending data. Ver listener
// 'sessionRevoked' abajo y el listener 'forceLogout' (soft) que ya
// existía como backward-compat.
//
// Audit 2026-06-01 (v4) — los códigos 'SESSION_REVOKED' y 'DEVICE_REVOKED'
// ahora se separan en el interceptor:
//   - SESSION_REVOKED → emit('sessionRevoked')   → soft (banner, WDB intacto)
//   - DEVICE_REVOKED  → emit('deviceRevoked')    → hard (Alert + logout())
// DEVICE_REVOKED es un admin action irreversible: el dispositivo fue desvinculado
// y el user NO debe seguir trabajando offline. Por eso este listener SÍ hace
// logout() completo (clear tokens, cancel queries, clear WDB cursors).

// Listen for device revocation by admin — HARD logout (irreversible admin action).
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
//
// Audit 2026-06-01 (rev 3) — MINIMAL fix preservando el diseño soft-logout
// original. La rev 2 bajaba `isAuthenticated=false` para "arreglar" el
// bounce loop, pero eso rompía el contrato del rediseño 2026-05-18:
//   - (tabs) se desmontaba → SessionExpiredBanner (mount-point dentro
//     de (tabs)/_layout) nunca llegaba a verse
//   - GPS checkpoint timer, SignalR, jornada watchers, React Query active
//     queries y draft state de Zustand se cancelaban abruptamente
//   - incident vendedor@jeyma 2026-05-19 (12 pedidos pendientes con flag
//     activa) reaparecería: el user nunca ve el banner, sale al login
//     forzado y pierde contexto
// En rev 3 SOLO levantamos `sessionExpired=true`. `isAuthenticated`
// permanece intacto → (tabs) sigue montado → banner visible → user
// sigue trabajando offline (WDB + queries cache) hasta que decida
// tappear "Iniciar sesión". El bounce loop se resuelve en AuthGate
// gateando el redirect-to-tabs con `&& !sessionExpired`.
authEventEmitter.on('sessionRevoked', () => {
  useAuthStore.setState({ sessionExpired: true });
  // Audit 2026-06-01 (v4) — persistir el flag para que cold-start respete el
  // estado revocado y no monte (tabs) con tokens stale (ver restoreSession).
  secureStorage.set(STORAGE_KEYS.SESSION_EXPIRED, 'true').catch(() => {});
});

// Backward-compat: handler legacy 'forceLogout' redirige a soft signal
// (no clear de tokens). Mantiene compatibilidad con cualquier callsite que
// todavía emita el evento viejo — debería tratarse igual que sessionRevoked.
//
// Audit 2026-06-01 — listener 'deviceTakeoverRequired' eliminado: dead path.
// Nadie lo emite desde el rediseño 2026-05-18 (interceptor solo emite
// 'sessionRevoked' / 'deviceRevoked'). El key PENDING_TAKEOVER_EMAIL y su
// useEffect en login.tsx también fueron removidos en el mismo PR.
//
// Audit 2026-06-01 (rev 3) — alineado con `sessionRevoked` minimal: solo
// `sessionExpired=true`, NO tocamos `isAuthenticated` (preservamos soft).
authEventEmitter.on('forceLogout', () => {
  useAuthStore.setState({ sessionExpired: true });
  secureStorage.set(STORAGE_KEYS.SESSION_EXPIRED, 'true').catch(() => {});
});
