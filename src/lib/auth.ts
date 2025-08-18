import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { serverApiCall } from '@/lib/server-api';

// —— Usuarios mock para desarrollo ——
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@handysales.com',
    password: 'admin123',
    name: 'Admin Usuario',
    role: 'ADMIN',
  },
  {
    id: '2',
    email: 'vendedor@handysales.com',
    password: 'vendedor123',
    name: 'Vendedor Usuario',
    role: 'VENDEDOR',
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
  process.env.ALLOW_DEV_LOGIN === 'true' || // bandera explícita
  process.env.VERCEL_ENV === 'preview'; // habilitar también en previews si quieres

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

        // Desarrollo: mock directo
        //if (process.env.NODE_ENV === 'development') {
        if (isDevLike()) {
          const user = MOCK_USERS.find(
            u => u.email === credentials.email && u.password === credentials.password
          );
          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accessToken: `mock-jwt-token-${user.id}`,
              refreshToken: `mock-refresh-token-${user.id}`,
            };
          }
        }

        // Producción: backend real
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

          // Fallo o formato no reconocido
          return null;
        } catch (error) {
          // Desarrollo: fallback a mock si backend no responde
          if (process.env.NODE_ENV === 'development') {
            const user = MOCK_USERS.find(
              u => u.email === credentials.email && u.password === credentials.password
            );
            if (user) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accessToken: `mock-jwt-token-${user.id}`,
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
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },

    // session <-> token
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? session.user.id;
        session.user.role = token.role;
      }
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
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
