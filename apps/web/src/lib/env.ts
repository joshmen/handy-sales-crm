import { z } from 'zod';

/**
 * Validación de env vars al startup. Si falta alguna requerida o tiene
 * formato inválido, fail-fast en build/dev en lugar de fallar runtime
 * con errores crípticos.
 *
 * En prod (Vercel): variables faltantes hacen que `next build` falle
 * con mensaje claro. Mejor que descubrirlo via `_cachedAccessToken
 * undefined` o `Access-Control-Allow-Origin: invalid-no-nextauth-url-set`.
 *
 * Patrón inspirado en @t3-oss/env-nextjs, implementado inline para no
 * añadir dep nueva (~10KB gzipped no se justifica para 6 vars).
 *
 * Uso:
 *   import { env } from '@/lib/env';
 *   const apiUrl = env.NEXT_PUBLIC_API_URL;
 *
 * Si querés validar en build sin runtime cost en client bundles, se
 * puede mover el `parse()` a un script de pre-build con `node -r ts-node ...`.
 */

const serverEnvSchema = z.object({
  // NextAuth — sin secret válido, JWT sign/verify rompe.
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET debe ser ≥32 chars (usá `openssl rand -base64 32`)'),
  NEXTAUTH_URL: z
    .string()
    .url('NEXTAUTH_URL debe ser URL absoluta (ej. https://app.handysuites.com)'),

  // JWT secret compartido con backend (verificación de firma de tokens).
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET debe ser ≥32 chars'),

  // Social login (Google OAuth) — opcional pero si está, debe tener su propio secret.
  // Antes había fallback a JWT_SECRET (vector reportado en línea 263 auth.ts).
  SOCIAL_LOGIN_SECRET: z
    .string()
    .min(32)
    .optional(),

  // Backend URL — fallback a localhost permitido en dev.
  BACKEND_API_URL: z.string().url().default('http://localhost:1050'),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClientEnv = z.infer<typeof clientEnvSchema>;

let cachedServer: ServerEnv | undefined;
let cachedClient: ClientEnv | undefined;

/**
 * Server-side env (no expuesta a browser bundles).
 * Llamar en server components, route handlers, server actions.
 * En client component este throw — usar `clientEnv()` en su lugar.
 */
export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() llamada desde client. Usá clientEnv() o move el código a server.');
  }
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Env vars inválidas o faltantes:\n${issues}\n\nVerificá tu .env / Vercel Project Settings.`
    );
  }
  cachedServer = parsed.data;
  return cachedServer;
}

/**
 * Client-side env (solo NEXT_PUBLIC_*). Safe para usar en cualquier
 * lado pero solo expone vars que ya están en el bundle JS.
 */
export function clientEnv(): ClientEnv {
  if (cachedClient) return cachedClient;
  // process.env en client es replaced en build time por Next.js; solo
  // funciona para `NEXT_PUBLIC_*` keys.
  const raw = {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  };
  cachedClient = clientEnvSchema.parse(raw);
  return cachedClient;
}
