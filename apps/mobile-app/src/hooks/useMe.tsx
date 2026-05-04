import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores';

const STALE_TIME_MS = 30 * 1000; // 30s — el avatar puede cambiar desde web sin notif
export const ME_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Refresca el snapshot del usuario logueado (avatar, nombre, role, tenantLogo)
 * desde el backend mobile. La query se hidrata al montar, se invalida al volver
 * al foreground (vía `focusManager` montado en `app/_layout.tsx`), y propaga
 * los cambios al `useAuthStore` vía `setUser(partial)`.
 *
 * Razón de existir:
 * - Cuando un admin/vendedor actualiza su foto de perfil desde la web (Cloudinary),
 *   el mobile mostraba iniciales hasta el próximo re-login (o hasta que el silent
 *   refresh de `useSessionRefresh` se ejecutara — y ese está throttled a 5 min).
 *   Este hook cierra esa brecha sin agregar SignalR ni polling pesado.
 *
 * Patrón: TanStack Query con `staleTime: 30s` + `refetchOnWindowFocus: true`.
 * El bridge `AppState → focusManager.setFocused` vive en `_layout.tsx` (es la
 * forma idiomática que recomienda la doc oficial de TanStack Query para RN).
 */
export function useMe() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const setUser = useAuthStore(s => s.setUser);

  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: () => authApi.getMe(),
    staleTime: STALE_TIME_MS,
    enabled: isAuthenticated,
    // refetchOnWindowFocus=true es el default; con focusManager bridged a
    // AppState (en _layout.tsx) cubre el caso "volver al foreground".
    refetchOnWindowFocus: true,
    // No retry agresivo — si falla un fetch (e.g. perdiste red por 1s), el
    // próximo focus re-intentará automáticamente.
    retry: 1,
  });

  // Propaga el snapshot al authStore SOLO si trae diferencias (evita re-renders
  // innecesarios y escrituras a secureStorage en cada poll).
  useEffect(() => {
    if (!query.data?.user) return;
    const fresh = query.data.user;
    const stored = useAuthStore.getState().user;
    if (!stored) return;
    const same =
      stored.avatarUrl === fresh.avatarUrl &&
      stored.name === fresh.name &&
      stored.role === fresh.role &&
      stored.tenantLogo === fresh.tenantLogo;
    if (!same) {
      setUser({
        avatarUrl: fresh.avatarUrl ?? null,
        name: fresh.name,
        role: fresh.role,
        tenantLogo: fresh.tenantLogo ?? null,
      });
    }
  }, [query.data, setUser]);

  return query;
}

/** Helper para forzar refresh externo (e.g. tras recibir push de cambio de perfil). */
export function invalidateMe(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ME_QUERY_KEY });
}
