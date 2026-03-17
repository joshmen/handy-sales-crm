import { z } from 'zod';

export const AuthUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'VENDEDOR']),
    tenantName: z.string().nullable().optional(),
    tenantLogo: z.string().nullable().optional(),
  })
  .passthrough();

export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LoginResponseSchema = z
  .object({
    user: AuthUserSchema,
    token: z.string(),
    refreshToken: z.string(),
  })
  .passthrough();

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// Request types (no Zod needed — outgoing, not validated)
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  RefreshToken: string;
}
