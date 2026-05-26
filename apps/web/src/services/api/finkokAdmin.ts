import { billingApi } from '@/lib/billingApi';

/**
 * Cliente API para el panel SuperAdmin Finkok.
 * Todos los endpoints requieren JWT con role=SUPER_ADMIN — el backend valida.
 * BILL-1 extensión (2026-05-26).
 */

export interface EmitterRow {
  rfc: string;
  razonSocial?: string | null;
  status: string | null;
  /** 'P' (prepago) | 'O' (ilimitado) | null */
  typeUser: string | null;
  creditsRemaining: number | null;
  registeredAt: string | null;
  /** ID interno de tenant en HandySales (puede ser null si Finkok lo tiene pero nosotros no) */
  tenantId: string | null;
}

export interface EmitterDetail {
  rfc: string;
  status: string | null;
  typeUser: string | null;
  creditsRemaining: number | null;
  creditsConsumedMonth: number | null;
  tenantId: string | null;
  razonSocial: string | null;
  registeredAt: string | null;
}

export interface EmittersListResponse {
  page: number;
  items: EmitterRow[];
}

export async function listEmitters(page = 1): Promise<EmittersListResponse> {
  const { data } = await billingApi.get<EmittersListResponse>('/api/admin/finkok/emitters', {
    params: { page },
  });
  return data;
}

export async function getEmitter(rfc: string): Promise<EmitterDetail> {
  const { data } = await billingApi.get<EmitterDetail>(`/api/admin/finkok/emitters/${rfc}`);
  return data;
}

export async function suspendEmitter(rfc: string): Promise<void> {
  await billingApi.post(`/api/admin/finkok/emitters/${rfc}/suspend`);
}

export async function reactivateEmitter(rfc: string): Promise<void> {
  await billingApi.post(`/api/admin/finkok/emitters/${rfc}/reactivate`);
}

export async function switchEmitterMode(rfc: string, typeUser: 'P' | 'O'): Promise<void> {
  await billingApi.post(`/api/admin/finkok/emitters/${rfc}/switch-mode`, { typeUser });
}

export async function assignCredits(rfc: string, credits: number): Promise<{ creditsAssigned: number; creditsTotal: number | null }> {
  const { data } = await billingApi.post<{ creditsAssigned: number; creditsTotal: number | null }>(
    `/api/admin/finkok/emitters/${rfc}/assign-credits`,
    { credits },
  );
  return data;
}
