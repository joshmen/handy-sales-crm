import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { serverApiCall } from '@/lib/server-api';

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

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
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
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },

  callbacks: {
    // token <-> user
    async jwt({ token, user }) {
      if (user) {
        // Gracias a los augmentations, estas props existen tipadas:
        token.id = user.id;
        token.role = user.role;
        token.name = user.name || undefined;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
        token.tenantId = user.tenantId;
        token.companyId = user.companyId;
      }
      return token;
    },

    // session <-> token
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? session.user.id;
        session.user.role = token.role;
        // Solo actualizar name si está en el token
        if (token.name) {
          session.user.name = token.name;
        }
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.tenantId = token.tenantId;
      session.companyId = token.companyId;
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
