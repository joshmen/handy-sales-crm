// src/stores/useImpersonationStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CurrentImpersonationState, ImpersonatedTenantInfo } from '@/types/impersonation';

interface ImpersonationStore {
  // Estado
  isImpersonating: boolean;
  sessionId: string | null;
  tenant: ImpersonatedTenantInfo | null;
  accessLevel: 'READ_ONLY' | 'READ_WRITE' | null;
  expiresAt: Date | null;
  originalToken: string | null;
  impersonationToken: string | null;

  // Acciones
  startImpersonation: (
    sessionId: string,
    tenant: ImpersonatedTenantInfo,
    accessLevel: 'READ_ONLY' | 'READ_WRITE',
    expiresAt: Date,
    impersonationToken: string,
    originalToken: string
  ) => void;
  endImpersonation: () => void;
  updateTimeRemaining: () => number;
  setFromState: (state: CurrentImpersonationState) => void;
  clear: () => void;
}

export const useImpersonationStore = create<ImpersonationStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      isImpersonating: false,
      sessionId: null,
      tenant: null,
      accessLevel: null,
      expiresAt: null,
      originalToken: null,
      impersonationToken: null,

      // Iniciar impersonación
      startImpersonation: (sessionId, tenant, accessLevel, expiresAt, impersonationToken, originalToken) => {
        set({
          isImpersonating: true,
          sessionId,
          tenant,
          accessLevel,
          expiresAt,
          impersonationToken,
          originalToken,
        });
      },

      // Terminar impersonación
      endImpersonation: () => {
        const { originalToken } = get();
        set({
          isImpersonating: false,
          sessionId: null,
          tenant: null,
          accessLevel: null,
          expiresAt: null,
          impersonationToken: null,
          originalToken: null,
        });
        // Retornar el token original para restaurar la sesión
        return originalToken;
      },

      // Calcular tiempo restante en minutos
      updateTimeRemaining: () => {
        const { expiresAt } = get();
        if (!expiresAt) return 0;
        const now = new Date();
        const expires = new Date(expiresAt);
        const diffMs = expires.getTime() - now.getTime();
        return Math.max(0, Math.floor(diffMs / 60000));
      },

      // Actualizar desde respuesta del servidor
      setFromState: (state: CurrentImpersonationState) => {
        if (state.isImpersonating && state.tenant && state.sessionId) {
          set({
            isImpersonating: true,
            sessionId: state.sessionId,
            tenant: state.tenant,
            accessLevel: state.accessLevel || 'READ_ONLY',
          });
        } else {
          set({
            isImpersonating: false,
            sessionId: null,
            tenant: null,
            accessLevel: null,
          });
        }
      },

      // Limpiar todo
      clear: () => {
        set({
          isImpersonating: false,
          sessionId: null,
          tenant: null,
          accessLevel: null,
          expiresAt: null,
          originalToken: null,
          impersonationToken: null,
        });
      },
    }),
    {
      name: 'impersonation-storage',
      // Solo persistir si es necesario para recuperar sesión
      partialize: (state) => ({
        isImpersonating: state.isImpersonating,
        sessionId: state.sessionId,
        tenant: state.tenant,
        accessLevel: state.accessLevel,
        expiresAt: state.expiresAt,
      }),
    }
  )
);
