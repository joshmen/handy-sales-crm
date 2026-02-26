// Response types — re-exported from Zod schemas (source of truth)
export type { MobileVisita, ResumenDiario, ResumenSemanal } from '@/api/schemas/visit';

// Request types — re-exported from schemas (plain interfaces, no Zod)
export type { VisitaCreateRequest, CheckInRequest, CheckOutRequest } from '@/api/schemas/visit';
