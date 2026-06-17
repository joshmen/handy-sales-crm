import type { NextAuthConfig } from 'next-auth';

/**
 * Config Auth.js v5 EDGE-SAFE (sin axios ni APIs de Node) — la usa el middleware,
 * que corre en el Edge Runtime de Next.js. El config COMPLETO (providers
 * Credentials/Google con authorize via axios, callback jwt con refresh, callback
 * signIn social-login) vive en `auth.ts` (Node Runtime, route handler). Asi el
 * bundle del middleware NO arrastra axios (`setImmediate` no existe en Edge).
 *
 * El middleware solo necesita LEER el JWT de sesion: el callback `session` mapea
 * los campos del token (role, isImpersonating, id) a `req.auth`. No requiere
 * providers ni el callback `jwt` (que solo corre en login/refresh, lado Node).
 */
export const authConfig = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/auth/error',
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? session.user.id;
        session.user.role = token.role;
        if (token.name) {
          session.user.name = token.name;
        }
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.tenantId = token.tenantId;
      session.companyId = token.companyId;
      session.isImpersonating = token.isImpersonating;
      session.onboardingCompleted = token.onboardingCompleted;
      session.error = token.error;
      return session;
    },
  },
  // v5: AUTH_SECRET (aliased a NEXTAUTH_SECRET por compat — mismas cookies/JWT, sin logout masivo).
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Necesario fuera de Vercel (local/Railway) para no rechazar el host.
  trustHost: true,
} satisfies NextAuthConfig;
