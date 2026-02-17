/**
 * Centralized role display names mapping
 * This ensures consistent role naming across the entire application
 */

export type RoleType = 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'VENDEDOR' | 'USER';

export const ROLE_DISPLAY_NAMES: Record<RoleType, string> = {
  'SUPER_ADMIN': 'Super Administrador',
  'ADMIN': 'Administrador',
  'SUPERVISOR': 'Supervisor',
  'VENDEDOR': 'Vendedor',
  'USER': 'Usuario',
};

/**
 * Get the display name for a role
 */
export const getRoleDisplayName = (role: string): string => {
  const normalizedRole = role.toUpperCase() as RoleType;
  return ROLE_DISPLAY_NAMES[normalizedRole] || role;
};

/**
 * Get the role color for UI display
 */
export const getRoleColor = (role: string): string => {
  const normalizedRole = role.toUpperCase() as RoleType;
  
  const colors: Record<RoleType, string> = {
    'SUPER_ADMIN': 'bg-red-100 text-red-800',
    'ADMIN': 'bg-blue-100 text-blue-800',
    'SUPERVISOR': 'bg-green-100 text-green-800',
    'VENDEDOR': 'bg-yellow-100 text-yellow-800',
    'USER': 'bg-gray-100 text-gray-800',
  };
  
  return colors[normalizedRole] || 'bg-gray-100 text-gray-800';
};

/**
 * Check if a role has admin privileges
 */
export const isAdminRole = (role: string): boolean => {
  const normalizedRole = role.toUpperCase();
  return normalizedRole === 'SUPER_ADMIN' || normalizedRole === 'ADMIN';
};

/**
 * Check if a role has super admin privileges
 */
export const isSuperAdminRole = (role: string): boolean => {
  return role.toUpperCase() === 'SUPER_ADMIN';
};