import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi } from '@/api';
import { prefetchCatalogos } from '@/api/prefetchCatalogos';
import type { LoginRequest } from '@/types';

// Sprint 3 audit: prefetchCatalogos extraido a src/api/prefetchCatalogos.ts
// para eliminar duplicacion con app/_layout.tsx (AuthGate).

export function useLogin() {
  const { login, setLoggingIn } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: LoginRequest) =>
      authApi.login(creds.email, creds.password, creds.totpCode),
    onMutate: () => setLoggingIn(true),
    onSuccess: async (data) => {
      await login(data.user, data.token, data.refreshToken);
      prefetchCatalogos(queryClient);
    },
    onError: () => setLoggingIn(false),
  });
}

/**
 * Force-login: cierra otras sesiones del usuario y crea nueva. UI lo invoca
 * tras confirmar en modal "¿Desconectar otro dispositivo?".
 */
export function useForceLogin() {
  const { login, setLoggingIn } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: LoginRequest) =>
      authApi.forceLogin(creds.email, creds.password, creds.totpCode),
    onMutate: () => setLoggingIn(true),
    onSuccess: async (data) => {
      await login(data.user, data.token, data.refreshToken);
      prefetchCatalogos(queryClient);
    },
    onError: () => setLoggingIn(false),
  });
}

export function useLogout() {
  const { logout } = useAuthStore();

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => logout(),
  });
}
