import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasPermission, hasAnyPermission, hasAllPermissions, type User } from "@/types/users";
import { toast } from "@/hooks/useToast";

interface UsePermissionsOptions {
  requiredPermissions?: string[];
  requireAll?: boolean;
  redirectTo?: string;
  showError?: boolean;
}

export function usePermissions(options: UsePermissionsOptions = {}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const user = session?.user as User | undefined;

  const checkPermission = (permission: string): boolean => {
    if (!user) return false;
    return hasPermission(user, permission);
  };

  const checkAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    return hasAnyPermission(user, permissions);
  };

  const checkAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    return hasAllPermissions(user, permissions);
  };

  useEffect(() => {
    if (status === "loading") return;

    if (options.requiredPermissions && options.requiredPermissions.length > 0) {
      const hasRequiredPermissions = options.requireAll
        ? checkAllPermissions(options.requiredPermissions)
        : checkAnyPermission(options.requiredPermissions);

      if (!hasRequiredPermissions) {
        if (options.showError) {
          toast({
            title: "Acceso denegado",
            description: "No tienes permisos para acceder a esta sección",
            variant: "destructive",
          });
        }

        if (options.redirectTo) {
          router.push(options.redirectTo);
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [status, user, options.requiredPermissions, options.requireAll, options.redirectTo]);

  return {
    user,
    isLoading: status === "loading",
    isAuthenticated: !!session,
    checkPermission,
    checkAnyPermission,
    checkAllPermissions,
    hasPermission: (permission: string) => checkPermission(permission),
    hasAnyPermission: (permissions: string[]) => checkAnyPermission(permissions),
    hasAllPermissions: (permissions: string[]) => checkAllPermissions(permissions),
  };
}

// Hook para componentes que requieren permisos específicos
export function useRequirePermission(
  permission: string | string[],
  options: Omit<UsePermissionsOptions, "requiredPermissions"> = {}
) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  return usePermissions({
    ...options,
    requiredPermissions: permissions,
    showError: options.showError ?? true,
  });
}

// Hook para páginas de admin
export function useRequireAdmin() {
  return useRequirePermission(["user.create", "user.update", "user.delete"], {
    requireAll: false,
    redirectTo: "/dashboard",
    showError: true,
  });
}

// Hook para páginas de supervisor
export function useRequireSupervisor() {
  return useRequirePermission(["route.assign", "user.update"], {
    requireAll: false,
    redirectTo: "/dashboard",
    showError: true,
  });
}
