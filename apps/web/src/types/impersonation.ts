// src/types/impersonation.ts

/**
 * Request para iniciar impersonación
 */
export interface StartImpersonationRequest {
  targetTenantId: number;
  reason: string;
  ticketNumber?: string;
  accessLevel?: 'READ_ONLY' | 'READ_WRITE';
}

/**
 * Response al iniciar impersonación
 */
export interface StartImpersonationResponse {
  sessionId: string;
  impersonationToken: string;
  tenantName: string;
  accessLevel: string;
  expiresAt: string;
}

/**
 * Estado actual de impersonación
 */
export interface CurrentImpersonationState {
  isImpersonating: boolean;
  sessionId?: string;
  tenant?: ImpersonatedTenantInfo;
  minutesRemaining?: number;
  accessLevel?: 'READ_ONLY' | 'READ_WRITE';
}

/**
 * Info del tenant impersonado
 */
export interface ImpersonatedTenantInfo {
  id: number;
  name: string;
  logoUrl?: string;
}

/**
 * Sesión de impersonación (historial)
 */
export interface ImpersonationSession {
  id: string;
  superAdminId: number;
  superAdminEmail: string;
  superAdminName: string;
  targetTenantId: number;
  targetTenantName: string;
  reason: string;
  ticketNumber?: string;
  accessLevel: string;
  startedAt: string;
  endedAt?: string;
  expiresAt: string;
  status: 'ACTIVE' | 'ENDED' | 'EXPIRED';
  actionsCount: number;
  pagesVisitedCount: number;
  durationFormatted: string;
}

/**
 * Filtros para historial
 */
export interface ImpersonationHistoryFilter {
  superAdminId?: number;
  targetTenantId?: number;
  fromDate?: string;
  toDate?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Response paginado del historial
 */
export interface ImpersonationHistoryResponse {
  sessions: ImpersonationSession[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Request para registrar acción
 */
export interface LogImpersonationActionRequest {
  sessionId: string;
  actionType: string;
  description: string;
  path?: string;
}

/**
 * Niveles de acceso
 */
export const ImpersonationAccessLevel = {
  READ_ONLY: 'READ_ONLY',
  READ_WRITE: 'READ_WRITE',
} as const;

/**
 * Estados de sesión
 */
export const ImpersonationStatus = {
  ACTIVE: 'ACTIVE',
  ENDED: 'ENDED',
  EXPIRED: 'EXPIRED',
} as const;
