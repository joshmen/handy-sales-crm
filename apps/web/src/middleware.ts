import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { UserRole, PERMISSIONS, ROLE_PERMISSIONS } from '@/types/users';

// Rutas y sus permisos requeridos
const ROUTE_PERMISSIONS = {
  '/users': [PERMISSIONS.USER_READ],
  '/users/create': [PERMISSIONS.USER_CREATE],
  '/users/edit': [PERMISSIONS.USER_UPDATE],
  '/settings/company': [PERMISSIONS.SETTINGS_COMPANY],
  '/settings/billing': [PERMISSIONS.SETTINGS_BILLING],
  '/reports/sales': [PERMISSIONS.REPORT_SALES],
  '/reports/financial': [PERMISSIONS.REPORT_FINANCIAL],
  '/routes/admin': [PERMISSIONS.ROUTE_CREATE, PERMISSIONS.ROUTE_ASSIGN],
  '/products/prices': [PERMISSIONS.PRODUCT_PRICE_EDIT],
};

// Rutas que requieren roles específicos
const ROLE_RESTRICTED_ROUTES = {
  '/admin': [UserRole.SUPER_ADMIN], // Gestión de Empresas + Dashboard Sistema
  '/users': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  '/settings': [UserRole.ADMIN], // Solo ADMIN puede acceder a configuración de empresa
  '/global-settings': [UserRole.SUPER_ADMIN], // Solo SUPER_ADMIN puede acceder a configuración global
  '/reports/financial': [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  '/routes/admin': [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.SUPER_ADMIN],
};

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const pathname = req.nextUrl.pathname;

    // Páginas públicas
    const isPublicPage =
      pathname === '/' ||
      pathname.startsWith('/invite') ||
      pathname === '/tenant-suspended' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname === '/register' ||
      pathname === '/verify-email';
    const isAuthPage = pathname.startsWith('/login') || pathname === '/register' || pathname === '/verify-email';
    const isApiRoute = pathname.startsWith('/api');
    const isMobileApiRoute = pathname.startsWith('/api/mobile');

    // Si es una ruta de API móvil, aplicar autenticación específica
    if (isMobileApiRoute) {
      const authHeader = req.headers.get('authorization');

      // Permitir acceso a login móvil
      if (pathname === '/api/mobile/auth' && req.method === 'POST') {
        return NextResponse.next();
      }

      // Verificar token para otras rutas móviles
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Token no proporcionado' }, { status: 401 });
      }

      return NextResponse.next();
    }

    // Si es una ruta de API regular, dejar que pase (se maneja auth en cada endpoint)
    if (isApiRoute) {
      return NextResponse.next();
    }

    // Si está en login y ya está autenticado, redirigir a dashboard
    if (isAuthPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Si es página pública, permitir acceso
    if (isPublicPage) {
      return NextResponse.next();
    }

    // Si no está autenticado, redirigir a login
    if (!isAuth) {
      let from = pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(new URL(`/login?from=${encodeURIComponent(from)}`, req.url));
    }

    // Subscription enforcement is handled by the backend:
    // - SessionValidationMiddleware returns 403 TENANT_DEACTIVATED for inactive tenants
    // - SubscriptionMonitor auto-deactivates tenants with expired subscriptions
    // - api.ts interceptor catches 403 and redirects to /tenant-suspended
    // - ExpirationBanner shows warnings for expiring/expired subscriptions in the UI

    // Verificación de permisos basados en rol
    const userRole = token.role as UserRole;

    // SuperAdmin sin impersonar: solo puede acceder a rutas de administración
    // isImpersonating is stored in the signed JWT token (tamper-proof)
    if (userRole === UserRole.SUPER_ADMIN && !token.isImpersonating) {
      const isSuperAdminRoute =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/global-settings') ||
        pathname === '/dashboard'; // dashboard redirige a system-dashboard via page logic

      if (!isSuperAdminRoute) {
        // Redirigir a página de acceso no disponible
        return NextResponse.redirect(new URL('/admin/access-denied', req.url));
      }
    }

    // Verificar restricciones de rol para rutas específicas
    for (const [route, allowedRoles] of Object.entries(ROLE_RESTRICTED_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!allowedRoles.includes(userRole)) {
          // Redirigir a dashboard con mensaje de error
          return NextResponse.redirect(new URL('/dashboard?error=unauthorized', req.url));
        }
      }
    }

    // Verificar permisos específicos
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];

    for (const [route, requiredPermissions] of Object.entries(ROUTE_PERMISSIONS)) {
      if (pathname.startsWith(route)) {
        const hasPermission = requiredPermissions.some(permission =>
          userPermissions.includes(permission)
        );

        if (!hasPermission) {
          return NextResponse.redirect(new URL('/dashboard?error=no_permission', req.url));
        }
      }
    }

    // Los vendedores solo pueden ver sus propias rutas y datos
    if (userRole === UserRole.VENDEDOR) {
      // Estas restricciones se manejan en los componentes con filtros
      // pero podemos agregar headers para identificar al usuario
      const response = NextResponse.next();
      response.headers.set('x-user-id', token.id as string);
      response.headers.set('x-user-role', userRole);
      return response;
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: () => true,
      //authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - static assets (svg, png, jpg, etc.)
     * - login page
     */
    '/((?!api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|css|js|map)$|login|register|verify-email).*)',
  ],
};
