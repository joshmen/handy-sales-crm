import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { serverApiCall } from "@/lib/server-api";

// Mock users para desarrollo
const MOCK_USERS = [
  {
    id: "1",
    email: "admin@handysales.com",
    password: "admin123",
    name: "Admin Usuario",
    role: "ADMIN",
  },
  {
    id: "2",
    email: "vendedor@handysales.com",
    password: "vendedor123",
    name: "Vendedor Usuario",
    role: "VENDEDOR",
  },
];

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Modo desarrollo - usar usuarios mock
        if (process.env.NODE_ENV === "development") {
          const user = MOCK_USERS.find(
            u => u.email === credentials.email && u.password === credentials.password
          );
          
          if (user) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accessToken: "mock-jwt-token-" + user.id,
              refreshToken: "mock-refresh-token-" + user.id,
            };
          }
        }

        // Modo producción - llamar al backend real
        try {
          // Llamar al backend .NET sin usar localStorage
          const response = await serverApiCall('post', '/auth/login', {
            email: credentials.email,
            password: credentials.password,
          });

          if (response?.success && response?.data) {
            const { user, token, refreshToken } = response.data;
            
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              accessToken: token,
              refreshToken: refreshToken,
            };
          }
          
          // Si no hay success pero sí hay user directamente (para APIs simples)
          if (response?.user && response?.token) {
            return {
              id: response.user.id,
              email: response.user.email,
              name: response.user.name,
              role: response.user.role,
              accessToken: response.token,
              refreshToken: response.refreshToken,
            };
          }
          
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          
          // En desarrollo, si el backend no está disponible, usar mock
          if (process.env.NODE_ENV === "development") {
            console.log("Backend no disponible, usando usuarios mock");
            const user = MOCK_USERS.find(
              u => u.email === credentials.email && u.password === credentials.password
            );
            
            if (user) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                accessToken: "mock-jwt-token-" + user.id,
                refreshToken: "mock-refresh-token-" + user.id,
              };
            }
          }
          
          return null;
        }
      },
    }),
  ],
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
      }
      return session;
    },
  },
  
  pages: {
    signIn: "/login",
    signOut: "/",
    error: "/auth/error",
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};
