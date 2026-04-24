import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi, catalogosApi } from '@/api';
import type { LoginRequest } from '@/types';

export function useLogin() {
  const { login, setLoggingIn } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (creds: LoginRequest) =>
      authApi.login(creds.email, creds.password),
    onMutate: () => setLoggingIn(true),
    onSuccess: async (data) => {
      await login(data.user, data.token, data.refreshToken);

      // Prefetch catálogos (zonas, categorías, familias) para que estén
      // disponibles offline. Sin esto, crear cliente offline falla porque
      // los pickers de Zona/Categoría no tienen data. Ejecuta en paralelo
      // y silencioso (no bloquea login si algún catálogo falla).
      queryClient.prefetchQuery({
        queryKey: ['catalogos', 'zonas'],
        queryFn: () => catalogosApi.getZonas(),
      });
      queryClient.prefetchQuery({
        queryKey: ['catalogos', 'categorias-cliente'],
        queryFn: () => catalogosApi.getCategoriasCliente(),
      });
      queryClient.prefetchQuery({
        queryKey: ['catalogos', 'categorias-producto'],
        queryFn: () => catalogosApi.getCategoriasProducto(),
      });
      queryClient.prefetchQuery({
        queryKey: ['catalogos', 'familias-producto'],
        queryFn: () => catalogosApi.getFamiliasProducto(),
      });
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
