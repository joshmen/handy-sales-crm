import { useMemo } from 'react'
import { useUser } from '@/stores/useAppStore'
import { USER_ROLES } from '@/lib/constants'

export type Permission = 
  | 'view_dashboard'
  | 'view_clients' 
  | 'create_client'
  | 'edit_client'
  | 'delete_client'
  | 'view_products'
  | 'create_product'
  | 'edit_product'
  | 'delete_product'
  | 'view_orders'
  | 'create_order'
  | 'edit_order'
  | 'delete_order'
  | 'view_routes'
  | 'create_route'
  | 'edit_route'
  | 'delete_route'
  | 'view_deliveries'
  | 'create_delivery'
  | 'edit_delivery'
  | 'delete_delivery'
  | 'view_users'
  | 'create_user'
  | 'edit_user'
  | 'delete_user'
  | 'view_settings'
  | 'edit_settings'
  | 'view_reports'
  | 'export_data'
  | 'manage_system'

export type Role = keyof typeof USER_ROLES

// Define permissions for each role
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [USER_ROLES.ADMIN]: [
    // Dashboard
    'view_dashboard',
    
    // Clients
    'view_clients',
    'create_client',
    'edit_client',
    'delete_client',
    
    // Products
    'view_products',
    'create_product',
    'edit_product',
    'delete_product',
    
    // Orders
    'view_orders',
    'create_order',
    'edit_order',
    'delete_order',
    
    // Routes
    'view_routes',
    'create_route',
    'edit_route',
    'delete_route',
    
    // Deliveries
    'view_deliveries',
    'create_delivery',
    'edit_delivery',
    'delete_delivery',
    
    // Users
    'view_users',
    'create_user',
    'edit_user',
    'delete_user',
    
    // Settings
    'view_settings',
    'edit_settings',
    
    // Reports
    'view_reports',
    'export_data',
    
    // System
    'manage_system',
  ],
  
  [USER_ROLES.SUPERVISOR]: [
    // Dashboard
    'view_dashboard',
    
    // Clients
    'view_clients',
    'create_client',
    'edit_client',
    
    // Products
    'view_products',
    'create_product',
    'edit_product',
    
    // Orders
    'view_orders',
    'create_order',
    'edit_order',
    
    // Routes
    'view_routes',
    'create_route',
    'edit_route',
    
    // Deliveries
    'view_deliveries',
    'create_delivery',
    'edit_delivery',
    
    // Users (limited)
    'view_users',
    
    // Settings (limited)
    'view_settings',
    
    // Reports
    'view_reports',
    'export_data',
  ],
  
  [USER_ROLES.VENDEDOR]: [
    // Dashboard
    'view_dashboard',
    
    // Clients
    'view_clients',
    'create_client',
    'edit_client',
    
    // Products
    'view_products',
    
    // Orders
    'view_orders',
    'create_order',
    'edit_order',
    
    // Routes
    'view_routes',
    
    // Deliveries
    'view_deliveries',
    
    // Settings (personal only)
    'view_settings',
  ],
}

export function usePermissions() {
  const user = useUser()
  
  const userRole = user?.role as Role
  const userPermissions = useMemo(() => {
    if (!userRole || !ROLE_PERMISSIONS[userRole]) {
      return []
    }
    return ROLE_PERMISSIONS[userRole]
  }, [userRole])
  
  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission)
  }
  
  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => hasPermission(permission))
  }
  
  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => hasPermission(permission))
  }
  
  const canViewDashboard = () => hasPermission('view_dashboard')
  
  const canManageClients = () => hasAnyPermission([
    'create_client', 'edit_client', 'delete_client'
  ])
  
  const canManageProducts = () => hasAnyPermission([
    'create_product', 'edit_product', 'delete_product'
  ])
  
  const canManageOrders = () => hasAnyPermission([
    'create_order', 'edit_order', 'delete_order'
  ])
  
  const canManageRoutes = () => hasAnyPermission([
    'create_route', 'edit_route', 'delete_route'
  ])
  
  const canManageDeliveries = () => hasAnyPermission([
    'create_delivery', 'edit_delivery', 'delete_delivery'
  ])
  
  const canManageUsers = () => hasAnyPermission([
    'create_user', 'edit_user', 'delete_user'
  ])
  
  const canViewReports = () => hasPermission('view_reports')
  
  const canExportData = () => hasPermission('export_data')
  
  const canManageSystem = () => hasPermission('manage_system')
  
  const isAdmin = () => userRole === USER_ROLES.ADMIN
  
  const isSupervisor = () => userRole === USER_ROLES.SUPERVISOR
  
  const isVendedor = () => userRole === USER_ROLES.VENDEDOR
  
  // Resource ownership checks
  const canEditOwnData = (resourceUserId?: string) => {
    if (!user || !resourceUserId) return false
    return user.id === resourceUserId || isAdmin() || isSupervisor()
  }
  
  const canViewOwnData = (resourceUserId?: string) => {
    if (!user || !resourceUserId) return false
    return user.id === resourceUserId || isAdmin() || isSupervisor()
  }
  
  return {
    user,
    userRole,
    userPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Specific permission checks
    canViewDashboard,
    canManageClients,
    canManageProducts,
    canManageOrders,
    canManageRoutes,
    canManageDeliveries,
    canManageUsers,
    canViewReports,
    canExportData,
    canManageSystem,
    
    // Role checks
    isAdmin,
    isSupervisor,
    isVendedor,
    
    // Ownership checks
    canEditOwnData,
    canViewOwnData,
  }
}

// HOC for protecting components based on permissions
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions: Permission[],
  fallback?: React.ComponentType
) {
  return function ProtectedComponent(props: P) {
    const { hasAnyPermission } = usePermissions()
    
    if (!hasAnyPermission(requiredPermissions)) {
      if (fallback) {
        const FallbackComponent = fallback
        return <FallbackComponent />
      }
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900">Acceso denegado</h3>
            <p className="text-sm text-gray-500 mt-1">
              No tienes permisos para acceder a esta sección.
            </p>
          </div>
        </div>
      )
    }
    
    return <Component {...props} />
  }
}

// Hook for conditional rendering based on permissions
export function useConditionalRender() {
  const permissions = usePermissions()
  
  const renderIf = (permission: Permission | Permission[], component: React.ReactNode) => {
    const hasAccess = Array.isArray(permission)
      ? permissions.hasAnyPermission(permission)
      : permissions.hasPermission(permission)
    
    return hasAccess ? component : null
  }
  
  const renderIfRole = (roles: Role | Role[], component: React.ReactNode) => {
    const userRole = permissions.userRole
    const hasRole = Array.isArray(roles)
      ? roles.includes(userRole)
      : userRole === roles
    
    return hasRole ? component : null
  }
  
  return {
    renderIf,
    renderIfRole,
    ...permissions,
  }
}
