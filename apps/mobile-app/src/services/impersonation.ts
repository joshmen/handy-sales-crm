import { adminApi } from '@/api/admin';
import { useAuthStore } from '@/stores';

/**
 * Orquestación del modo soporte del super admin móvil (Parte B).
 *
 * enterTenant: pide un token impersonado READ_ONLY al backend y lo activa.
 * El AdminDashboard que verá el super admin es HTTP (React Query); como
 * enterImpersonation limpia el query cache, las queries refetchean con el token
 * impersonado → datos del tenant elegido. NO hace falta re-sync de WatermelonDB
 * (el super admin no usa vistas offline del vendedor).
 *
 * exitTenant: restaura el token original del super admin PRIMERO y luego termina
 * la sesión en el server con ese token — el endpoint busca la ImpersonationSession
 * en el contexto del super admin (sin el filtro por tenant del token impersonado).
 */
export async function enterTenant(tenant: { id: number; nombre: string }): Promise<void> {
  const result = await adminApi.startImpersonation(tenant.id);
  await useAuthStore.getState().enterImpersonation(result.token, {
    tenantId: result.tenantId,
    tenantName: result.tenantName || tenant.nombre,
    sessionId: result.sessionId,
  });
}

export async function exitTenant(): Promise<void> {
  const sessionId = useAuthStore.getState().impersonation?.sessionId;
  await useAuthStore.getState().exitImpersonation();
  if (sessionId) {
    // Best-effort: si falla, la sesión expira sola (máx 60 min). El super admin
    // ya volvió a su contexto, así que no bloqueamos la UX por esto.
    try { await adminApi.stopImpersonation(sessionId); } catch { /* noop */ }
  }
}
