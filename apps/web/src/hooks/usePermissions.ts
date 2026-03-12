import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ROLE_PERMISSIONS } from '@/lib/permissions';

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

  const isAdminValue = status !== 'loading' && session && (hasRole('ADMIN') || hasRole('SUPER_ADMIN'));
  const isSuperAdminValue = status !== 'loading' && session && hasRole('SUPER_ADMIN');
  const isVendedorValue = status !== 'loading' && session && hasRole('VENDEDOR');

  return {
    hasPermission,
    hasRole,
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