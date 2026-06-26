'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from '@/hooks/useToast';
import { useImpersonationStore } from '@/stores/useImpersonationStore';
import { impersonationService } from '@/services/api/impersonation';

/**
 * Logout completo del chrome. Extraído de Header.handleLogout para reusarlo desde
 * la página de perfil (donde ahora vive "Cerrar sesión", tras quitar el menú del
 * avatar). Hace, en orden: terminar la ImpersonationSession activa (auditoría),
 * cerrar la DeviceSession en backend, NextAuth signOut, limpiar localStorage +
 * cache PWA, volver a light mode y navegar a la landing.
 *
 * NO usar `useAuthSession.logout` para esto: ese solo hace `signOut` y no limpia
 * impersonation / device session / cache.
 */
export function useLogout() {
  const router = useRouter();
  const tc = useTranslations('common');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      // SECURITY: terminar cualquier impersonation activa ANTES del logout para que
      // el backend marque la ImpersonationSession como Ended (auditoría completa) y
      // el SUPER_ADMIN no deje una sesión de tenant abierta al salir.
      try {
        const { isImpersonating, sessionId } = useImpersonationStore.getState();
        if (isImpersonating && sessionId) {
          await impersonationService.endSession(sessionId).catch(() => {});
        }
        useImpersonationStore.getState().clear();
      } catch { /* best-effort — seguir con el logout aunque falle la limpieza */ }

      // Cerrar la DeviceSession en backend (marca la sesión como LoggedOut)
      try {
        const { api: apiClient } = await import('@/lib/api');
        await apiClient.post('/auth/logout', {});
      } catch { /* best-effort — seguir con el logout aunque falle la API */ }

      await signOut({ redirect: false, callbackUrl: '/' });
      if (typeof window !== 'undefined') {
        // Reset a light mode antes de limpiar: la landing nunca debe verse en dark
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        localStorage.clear();
        // Limpiar el cache PWA para evitar data de tenant stale en dispositivos compartidos
        caches?.delete('api-cache').catch(() => {});
      }
      router.push('/');
    } catch {
      toast({ title: tc('error'), description: tc('logoutError'), variant: 'destructive' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout, isLoggingOut };
}
