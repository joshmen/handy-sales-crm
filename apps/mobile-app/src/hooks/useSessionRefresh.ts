import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { secureStorage } from '@/utils/storage';
import { useAuthStore } from '@/stores';
import { STORAGE_KEYS } from '@/utils/constants';
import { coalesceRefresh } from '@/api/client';

const LAST_ACTIVITY_KEY = '@auth/lastActivityAt';

/**
 * Silent refresh on AppState='active'. Cuando la app vuelve a foreground tras
 * estar en background >5 min, intenta renovar el token silenciosamente para
 * evitar el flow de 401 → refresh → posible force-logout transient.
 *
 * Audit 2026-05-19: ahora usa `coalesceRefresh()` del interceptor en lugar
 * de raw `axios.post('/refresh')`. Eso evita que dos refresh paralelos (hook
 * mount + interceptor 401 simultáneos) terminen creando 2 requests al server
 * que generaban orphan tokens (incident vendedor@jeyma 2026-05-19).
 *
 * Si hay un refresh in-flight, esta función espera al mismo promise. Si no,
 * dispara uno nuevo. Sólo 1 POST /refresh al backend sin importar cuántos
 * triggers paralelos.
 */
export function useSessionRefresh() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const lastRefreshAt = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const REFRESH_THROTTLE_MS = 5 * 60 * 1000; // 5 min — no spam refresh

    const trySilentRefresh = async () => {
      // Throttle: no más de 1 refresh per 5 min para evitar spam.
      const now = Date.now();
      if (now - lastRefreshAt.current < REFRESH_THROTTLE_MS) return;

      const refreshToken = await secureStorage.get(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) return;

      try {
        const newToken = await coalesceRefresh();
        if (newToken) {
          lastRefreshAt.current = now;
          await secureStorage.set(LAST_ACTIVITY_KEY, String(now));
        }
      } catch {
        // Soft fail: logout NO se dispara aquí. El próximo request real
        // hará el flow normal (interceptor 401 → coalesceRefresh → si falla
        // ahí sí emite sessionRevoked legítimo).
      }
    };

    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        trySilentRefresh();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);

    // También al montar (caso cold-start con sesión persistida).
    trySilentRefresh();

    return () => sub.remove();
  }, [isAuthenticated]);
}
