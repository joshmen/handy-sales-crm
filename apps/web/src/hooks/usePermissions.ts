import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Mapeo de permisos por rol (mismo que en Sidebar.tsx)
const ROLE_PERMISSIONS: Record<string, string[]> = {
  'SUPER_ADMIN': [
    'view_dashboard',
    'view_clients',
    'view_products', 
    'view_discounts',
    'view_promotions',
    'view_inventory',
    'view_routes',
    'view_zones',
    'view_orders',
    'view_deliveries',
    'view_users',
    'view_settings',
    'manage_tenants',
    'manage_all_users',
    'view_all_data'
  ],
  'ADMIN': [
    'view_dashboard',
    'view_clients',
    'view_products', 
    'view_discounts',
    'view_promotions',
    'view_inventory',
    'view_routes',
    'view_zones',
    'view_orders',
    'view_deliveries',
    'view_users',
    'view_settings'
  ],
  'VENDEDOR': [
    'view_dashboard',
    'view_clients',
    'view_products',
    'view_orders',
    'view_deliveries',
    'view_routes'
  ]
};

export const usePermissions = () => {
  const { data: session, status } = useSession();
  
  const hasPermission = (permission: string | string[]): boolean => {
    if (!session?.user?.role) return false;
    
    const userRole = session.user.role;
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    
    if (Array.isArray(permission)) {
      return permission.some(p => userPermissions.includes(p));
    }
    
    return userPermissions.includes(permission);
  };

  const hasRole = (role: string): boolean => {
    return session?.user?.role === role;
  };

  // Devolver valores booleanos directamente
  const isAdminValue = status !== 'loading' && session && (hasRole('ADMIN') || hasRole('SUPER_ADMIN'));
  const isSuperAdminValue = status !== 'loading' && session && hasRole('SUPER_ADMIN');
  const isVendedorValue = status !== 'loading' && session && hasRole('VENDEDOR');

  // También conservar las funciones para compatibilidad
  const isAdmin = (): boolean => {
    if (status === 'loading' || !session) return false;
    return hasRole('ADMIN') || hasRole('SUPER_ADMIN');
  };

  const isSuperAdmin = (): boolean => {
    if (status === 'loading' || !session) return false;
    return hasRole('SUPER_ADMIN');
  };

  const isVendedor = (): boolean => {
    if (status === 'loading' || !session) return false;
    return hasRole('VENDEDOR');
  };

  return {
    hasPermission,
    hasRole,
    // Funciones
    isAdmin,
    isSuperAdmin,
    isVendedor,
    // Valores booleanos
    isAdminValue,
    isSuperAdminValue, 
    isVendedorValue,
    userRole: session?.user?.role,
    userName: session?.user?.name,
    userEmail: session?.user?.email,
    isLoading: status === 'loading'
  };
};

export const useRequireAdmin = () => {
  const { isAdminValue, isLoading } = usePermissions();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdminValue) {
      router.push('/dashboard');
    }
  }, [isAdminValue, isLoading, router]);

  return { isAuthorized: isAdminValue, isLoading };
};