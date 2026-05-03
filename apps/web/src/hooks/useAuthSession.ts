'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useAppStore } from '@/stores/useAppStore';
import { setApiAccessToken, resetAuthState } from '@/lib/api';
import { useEffect, useRef } from 'react';
import { UserRole } from '@/types';

export function useAuthSession() {
  const { data: session, status } = useSession();
  const { setUser, setLoading } = useAppStore();
  const isSigningOut = useRef(false);

  // SYNC durante render (NO en useEffect): React corre useEffects child-first →
  // parent-last. Si seteamos el token en useEffect aquí (parent — HydrationProvider),
  // los providers hijos (GlobalSettings/Company/Profile) ya dispararon sus fetches
  // en su propio useEffect SIN el header Authorization → 401 silencioso (que el
  // response interceptor reintenta, pero queda en consola). Escribir al cache
  // módulo-level durante render es safe: no triggea re-renders.
  if (typeof window !== 'undefined') {
    if (status === 'authenticated' && session?.accessToken) {
      setApiAccessToken(session.accessToken);
    } else if (status === 'unauthenticated') {
      setApiAccessToken(null);
    }
  }

  useEffect(() => {
    if (status === 'loading') {
      setLoading('auth', true);
    } else {
      setLoading('auth', false);

      // Handle refresh token failure or session expiration — sign out ONCE only
      if (session?.error === 'RefreshAccessTokenError' || session?.error === 'SessionExpired') {
        if (!isSigningOut.current) {
          isSigningOut.current = true;
          signOut({ callbackUrl: '/login' });
        }
        return;
      }

      // Reset the guard once we have a valid session (fresh login)
      isSigningOut.current = false;
      resetAuthState();

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
        // Token cache ya seteado arriba en el sync render path.
      } else {
        setUser(null);
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
