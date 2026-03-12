// src/stores/useImpersonationStore.ts
import { create } from 'zustand';
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
  (set, get) => ({
    // Estado inicial — ephemeral (no persist to localStorage)
    isImpersonating: false,
    sessionId: null,
    tenant: null,
    accessLevel: null,
    expiresAt: null,
    originalToken: null,
    impersonationToken: null,

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
      return originalToken;
    },

    updateTimeRemaining: () => {
      const { expiresAt } = get();
      if (!expiresAt) return 0;
      const now = new Date();
      const expires = new Date(expiresAt);
      const diffMs = expires.getTime() - now.getTime();
      return Math.max(0, Math.floor(diffMs / 60000));
    },

    setFromState: (state: CurrentImpersonationState) => {
      if (state.isImpersonating && state.tenant && state.sessionId) {
        set({
          isImpersonating: true,
          sessionId: state.sessionId,
          tenant: state.tenant,
          accessLevel: state.accessLevel || 'READ_ONLY',
          expiresAt: state.expiresAt,
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
  })
);
