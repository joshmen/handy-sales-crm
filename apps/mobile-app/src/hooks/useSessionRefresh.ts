import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import axios from 'axios';
import { secureStorage } from '@/utils/storage';
import { useAuthStore } from '@/stores';
import { API_CONFIG, STORAGE_KEYS } from '@/utils/constants';

const LAST_ACTIVITY_KEY = '@auth/lastActivityAt';

/**
 * Silent refresh on AppState='active'. Cuando la app vuelve a foreground tras
 * estar en background >5 min, intenta renovar el token silenciosamente para
 * evitar el flow de 401 → refresh → posible force-logout transient.
 *
 * Funciona en conjunto con JWT TTL extendido a 8h en backend (appsettings.json).
 * Antes: TTL 30 min hacía que la app pidiera credenciales tras 30+ min en
 * background. Ahora: TTL 8h cubre toda la jornada laboral; este hook hace pre-
 * emptive refresh por si el user dejó la app abierta toda la noche.
 *
 * Si el refresh falla (network/auth), NO fuerza logout — la próxima request
 * real cae al interceptor de axios que maneja 401 con su flow normal. Esto
 * evita logouts inesperados por errores transients de red al volver a la app.
 */
export function useSessionRefresh() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const login = useAuthStore(s => s.login);
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
        const response = await axios.post(
          `${API_CONFIG.BASE_URL}/api/mobile/auth/refresh`,
          { RefreshToken: refreshToken },
          { timeout: 10000 },
        );
        if (response.data?.success && response.data?.data) {
          const { user, token, refreshToken: newRefresh } = response.data.data;
          await login(user, token, newRefresh);
          lastRefreshAt.current = now;
          await secureStorage.set(LAST_ACTIVITY_KEY, String(now));
        }
      } catch {
        // Soft fail: logout NO se dispara aquí. El próximo request real
        // hará el flow normal (interceptor 401 → tryRefreshToken → si falla
        // ahí sí logout legítimo).
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
  }, [isAuthenticated, login]);
}
