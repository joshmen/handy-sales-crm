// Response types — re-exported from Zod schemas (source of truth)
export type { AuthUser, LoginResponse } from '@/api/schemas/auth';

// Request types — re-exported from schemas (plain interfaces, no Zod)
export type { LoginRequest, RefreshRequest } from '@/api/schemas/auth';
