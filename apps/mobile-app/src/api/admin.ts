import api from './client';

/** Empresa (tenant) en el picker del super admin. */
export interface AdminTenant {
  id: number;
  nombre: string;
  plan: string | null;
  activo: boolean;
  estadoSuscripcion: string;
  usuarios: number;
}

/** Resultado de entrar a un tenant en modo soporte READ_ONLY. */
export interface ImpersonateResult {
  token: string;
  sessionId: string;
  tenantId: number;
  tenantName: string;
  accessLevel: string;
  expiresAt: string;
}

/**
 * API del super admin móvil (Parte B). Sólo el SUPER_ADMIN puede llamar estos
 * endpoints; el backend valida el rol. `startImpersonation` devuelve un JWT
 * temporal scopeado al tenant elegido (READ_ONLY).
 */
export const adminApi = {
  listTenants: async (q?: string): Promise<AdminTenant[]> => {
    const res = await api.get<{ success: boolean; data: AdminTenant[] }>(
      '/api/mobile/admin/tenants',
      q ? { params: { q } } : undefined,
    );
    return res.data?.data ?? [];
  },

  startImpersonation: async (targetTenantId: number, reason?: string): Promise<ImpersonateResult> => {
    const res = await api.post<ImpersonateResult & { success: boolean }>(
      '/api/mobile/admin/impersonate',
      { targetTenantId, reason },
    );
    return res.data;
  },

  stopImpersonation: async (sessionId: string): Promise<void> => {
    await api.post('/api/mobile/admin/stop-impersonation', { sessionId });
  },
};
