import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi, catalogosApi } from '@/api';
import type { LoginRequest } from '@/types';

function prefetchCatalogos(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.prefetchQuery({ queryKey: ['catalogos', 'zonas'], queryFn: () => catalogosApi.getZonas() });
  queryClient.prefetchQuery({ queryKey: ['catalogos', 'categorias-cliente'], queryFn: () => catalogosApi.getCategoriasCliente() });
  queryClient.prefetchQuery({ queryKey: ['catalogos', 'categorias-producto'], queryFn: () => catalogosApi.getCategoriasProducto() });
  queryClient.prefetchQuery({ queryKey: ['catalogos', 'familias-producto'], queryFn: () => catalogosApi.getFamiliasProducto() });
}

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
