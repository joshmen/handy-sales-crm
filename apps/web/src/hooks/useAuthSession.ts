'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useAppStore } from '@/stores/useAppStore';
import { setApiAccessToken } from '@/lib/api';
import { useEffect } from 'react';
import { UserRole } from '@/types';

export function useAuthSession() {
  const { data: session, status } = useSession();
  const { setUser, setLoading } = useAppStore();

  useEffect(() => {
    if (status === 'loading') {
      setLoading('auth', true);
    } else {
      setLoading('auth', false);

      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.name || '',
          role: session.user.role as UserRole,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        // Sincronizar token al caché del API client (0ms, en memoria)
        setApiAccessToken(session.accessToken || null);
      } else {
        setUser(null);
        setApiAccessToken(null);
      }
    }
  }, [session, status, setUser, setLoading]);

  const login = async (email: string, password: string) => {
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      throw new Error(result.error);
    }

    return result;
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  return {
    session,
    status,
    isAuthenticated: !!session,
    isLoading: status === 'loading',
    login,
    logout,
  };
}
