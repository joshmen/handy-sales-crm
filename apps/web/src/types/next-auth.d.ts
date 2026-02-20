import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role?: string;
    tenantId?: number;
    companyId?: number;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      tenantId?: number;
      companyId?: number;
    };
    accessToken?: string;
    refreshToken?: string;
    tenantId?: number;
    companyId?: number;
    isImpersonating?: boolean;
    error?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: string;
    tenantId?: number;
    companyId?: number;
    name?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    isImpersonating?: boolean;
    originalAccessToken?: string;
    error?: string;
  }
}
