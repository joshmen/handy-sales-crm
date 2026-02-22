import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { authApi } from '@/api';
import type { LoginRequest } from '@/types';

export function useLogin() {
  const { login, setLoggingIn } = useAuthStore();

  return useMutation({
    mutationFn: (creds: LoginRequest) =>
      authApi.login(creds.email, creds.password),
    onMutate: () => setLoggingIn(true),
    onSuccess: async (data) => {
      await login(data.user, data.token, data.refreshToken);
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
