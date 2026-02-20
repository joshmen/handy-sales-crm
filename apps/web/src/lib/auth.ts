import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { serverApiCall, serverApiInstance } from '@/lib/server-api';
import { API_CONFIG } from '@/lib/constants';

// —— Usuarios mock para desarrollo (coinciden con seed de BD) ——
// Password: test123 para todos
// Solo se usan si el backend es inalcanzable
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@jeyma.com',
    password: 'test123',
    name: 'Administrador Jeyma',
    role: 'ADMIN',
    tenantId: 3,
    companyId: 3,
  },
  {
    id: '2',
    email: 'admin@huichol.com',
    password: 'test123',
    name: 'Administrador Huichol',
    role: 'ADMIN',
    tenantId: 4,
    companyId: 4,
  },
  {
    id: '4',
    email: 'vendedor1@jeyma.com',
    password: 'test123',
    name: 'Vendedor 1 Jeyma',
    role: 'VENDEDOR',
    tenantId: 3,
    companyId: 3,
  },
  {
    id: '5',
    email: 'vendedor1@huichol.com',
    password: 'test123',
    name: 'Vendedor 1 Huichol',
    role: 'VENDEDOR',
    tenantId: 4,
    companyId: 4,
  },
];

// —— Tipos de respuesta esperada del backend ——
interface ApiUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

type ApiLoginSuccessWrapped = {
  success: true;
  data: {
    user: ApiUser;
    token: string;
    refreshToken?: string;
  };
};

type ApiLoginSuccessFlat = {
  user: ApiUser;
  token: string;
  refreshToken?: string;
};

type ApiLoginFail = { success: false; message?: string };

type ApiLoginResponse = ApiLoginSuccessWrapped | ApiLoginSuccessFlat | ApiLoginFail | undefined;

// arriba del file
const isDevLike = () =>
  process.env.ALLOW_DEV_LOGIN === 'true' || 
  process.env.NODE_ENV === 'development';

// —— Type guards ——
function isWrappedSuccess(r: unknown): r is ApiLoginSuccessWrapped {
  return (
    typeof r === 'object' &&
    r !== null &&
    'success' in r &&
    (r as { success?: unknown }).success === true &&
    'data' in r &&
    typeof (r as { data?: unknown }).data === 'object' &&
    (r as { data?: { user?: unknown; token?: unknown } }).data !== null
  );
}

function isFlatSuccess(r: unknown): r is ApiLoginSuccessFlat {
  return typeof r === 'object' && r !== null && 'user' in r && 'token' in r;
}

// —— Token refresh helpers ——
function getTokenExpiry(accessToken: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString()
    );
    return (payload.exp as number) * 1000;
  } catch {
    return 0;
  }
}

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    if (!token.refreshToken || token.refreshToken.startsWith('mock-')) {
      return { ...token, error: 'RefreshAccessTokenError' };
    }

    const response = (await serverApiCall('post', '/auth/refresh', {
      refreshToken: token.refreshToken,
    })) as ApiLoginSuccessFlat | undefined;

    if (response && 'token' in response) {
      return {
        ...token,
        accessToken: response.token,
        refreshToken: response.refreshToken ?? token.refreshToken,
        accessTokenExpires: getTokenExpiry(response.token),
        error: undefined,
      };
    }

    return { ...token, error: 'RefreshAccessTokenError' };
  } catch {
    console.error('[Auth] Failed to refresh access token');
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        loginResponse: { label: 'Login Response', type: 'text' },
      },
      async authorize(credentials) {
        // Mode 1: Pre-authenticated (after 2FA verify or force-login)
        // The login page already called the API and got tokens — just establish the session
        if (credentials?.loginResponse) {
          try {
            const data = JSON.parse(credentials.loginResponse);
            if (data.user && data.token) {
              return {
                id: data.user.id,
                email: data.user.email,
                name: data.user.name,
                role: data.user.role,
                accessToken: data.token,
                refreshToken: data.refreshToken,
                rememberMe: data.rememberMe === true,
              };
            }
          } catch {
            return null;
          }
          return null;
        }

        // Mode 2: Standard email/password login
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // ALWAYS try backend first (even in development)
        // This ensures we get real JWT tokens that the backend can validate
        try {
          const response = (await serverApiCall('post', '/auth/login', {
            email: credentials.email,
            password: credentials.password,
          })) as ApiLoginResponse;

          // Caso 1: { success: true, data: { user, token, refreshToken } }
          if (isWrappedSuccess(response)) {
            const { user, token, refreshToken } = response.data;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accessToken: token,
              refreshToken,
            };
          }

          // Caso 2: { user, token, refreshToken }
          if (isFlatSuccess(response)) {
            const { user, token, refreshToken } = response;
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accessToken: token,
              refreshToken,
            };
          }

          // Backend responded but login failed - only fall back to mock in dev
          if (isDevLike()) {
            const user = MOCK_USERS.find(
              u => u.email === credentials.email && u.password === credentials.password
            );
            if (user) {
              console.log('[Auth] Backend login failed, using mock auth for:', user.email);
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                companyId: user.companyId,
                accessToken: `mock-jwt-token-${user.id}-tenant-${user.tenantId}`,
                refreshToken: `mock-refresh-token-${user.id}`,
              };
            }
          }

          return null;
        } catch (error) {
          // Backend unreachable - fall back to mock in development
          if (isDevLike()) {
            console.log('[Auth] Backend unreachable, trying mock auth...');
            const user = MOCK_USERS.find(
              u => u.email === credentials.email && u.password === credentials.password
            );
            if (user) {
              console.log('[Auth] Using mock auth for:', user.email);
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                tenantId: user.tenantId,
                companyId: user.companyId,
                accessToken: `mock-jwt-token-${user.id}-tenant-${user.tenantId}`,
                refreshToken: `mock-refresh-token-${user.id}`,
              };
            }
          }
          return null;
        }
      },
    }),

    // Google OAuth provider (active only when env vars are set)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    async signIn({ user, account }) {
      // For credentials provider, always allow (handled in authorize)
      if (account?.provider === 'credentials') return true;

      // For OAuth providers (Google, etc.), verify user exists in our backend
      if (account?.provider && user?.email) {
        try {
          const sharedSecret = process.env.SOCIAL_LOGIN_SECRET || process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || '';
          const response = await serverApiInstance.post('/auth/social-login', {
            email: user.email,
            provider: account.provider,
          }, {
            headers: { 'X-Social-Login-Secret': sharedSecret },
          });

          const data = response.data;

          // User not registered — redirect to /register with pre-filled data
          if (data.needsRegistration) {
            const params = new URLSearchParams({
              email: user.email || '',
              name: user.name || '',
              avatar: user.image || '',
              provider: account.provider,
            });
            return `/register?${params.toString()}`;
          }

          // Store backend tokens on the user object for the jwt callback
          if (data.user && data.token) {
            user.id = data.user.id;
            user.role = data.user.role;
            user.accessToken = data.token;
            user.refreshToken = data.refreshToken;
            return true;
          }

          // 2FA required — redirect to login with temp token
          if (data.requires2FA) {
            return `/login?requires2FA=true&tempToken=${data.tempToken}&provider=${account.provider}`;
          }

          return false; // User deactivated or other error
        } catch {
          return false; // Backend error — reject login
        }
      }

      return false;
    },

    async jwt({ token, user, trigger, session: updateData, account }) {
      // Initial login: store user data + token expiry
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name || undefined;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.tenantId = user.tenantId;
        token.companyId = user.companyId;
        token.isImpersonating = false;
        token.rememberMe = user.rememberMe === true;
        token.accessTokenExpires = user.accessToken
          ? getTokenExpiry(user.accessToken)
          : 0;
        // Set session expiry: 30 days if "Recordarme", 24 hours if not
        token.sessionExpires = user.rememberMe
          ? Date.now() + 30 * 24 * 60 * 60 * 1000
          : Date.now() + 24 * 60 * 60 * 1000;
        return token;
      }

      // Client-side session update (e.g. impersonation start/stop)
      if (trigger === 'update' && updateData) {
        if (typeof updateData.isImpersonating === 'boolean') {
          token.isImpersonating = updateData.isImpersonating;

          // Starting impersonation: swap to impersonation token
          if (updateData.isImpersonating && updateData.impersonationToken) {
            token.originalAccessToken = token.accessToken;
            token.accessToken = updateData.impersonationToken as string;
            token.accessTokenExpires = getTokenExpiry(updateData.impersonationToken as string);
          }

          // Ending impersonation: restore original token
          if (!updateData.isImpersonating && token.originalAccessToken) {
            token.accessToken = token.originalAccessToken;
            token.accessTokenExpires = getTokenExpiry(token.originalAccessToken);
            token.originalAccessToken = undefined;
          }
        }
        return token;
      }

      // During impersonation, don't refresh - let the session expire naturally
      // Refreshing would restore the original token and break impersonation
      if (token.isImpersonating) {
        return token;
      }

      // Check "Recordarme" session expiry (24h without, 30d with)
      if (token.sessionExpires && Date.now() > (token.sessionExpires as number)) {
        return { ...token, error: 'SessionExpired' };
      }

      // Token still valid (> 5 min remaining): return as-is
      const fiveMinutes = 5 * 60 * 1000;
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - fiveMinutes) {
        return token;
      }

      // Token expired or about to expire: refresh it
      return refreshAccessToken(token);
    },

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
      session.error = token.error;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/auth/error',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
