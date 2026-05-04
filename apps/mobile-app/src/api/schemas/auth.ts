import { z } from 'zod';

export const AuthUserSchema = z
  .object({
    id: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'VENDEDOR']),
    avatarUrl: z.string().nullable().optional(),
    tenantName: z.string().nullable().optional(),
    tenantLogo: z.string().nullable().optional(),
    /**
     * True cuando el usuario fue creado por admin con password temporal
     * (vendedor de campo sin email) y debe cambiar contraseña en su primer
     * login. AuthGate (`app/_layout.tsx`) fuerza navegación a
     * `/(auth)/cambiar-password` antes de cualquier otra pantalla.
     */
    mustChangePassword: z.boolean().optional().default(false),
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

// GET /api/mobile/auth/me — solo retorna el snapshot del usuario, sin tokens.
export const MeResponseSchema = z
  .object({
    user: AuthUserSchema,
  })
  .passthrough();

export type MeResponse = z.infer<typeof MeResponseSchema>;

// Request types (no Zod needed — outgoing, not validated)
export interface LoginRequest {
  email: string;
  password: string;
  /** Código TOTP (6 dígitos) o recovery code (XXXX-XXXX) si el usuario tiene 2FA. */
  totpCode?: string;
}

export interface RefreshRequest {
  RefreshToken: string;
}
