// Roles del sistema
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Dueño del sistema (tú)
  ADMIN = 'ADMIN',             // Cliente que paga membresía
  SUPERVISOR = 'SUPERVISOR',   // Supervisor de vendedores
  VENDEDOR = 'VENDEDOR',       // Vendedor/Repartidor
  VIEWER = 'VIEWER'            // Solo lectura
}

// Estados de usuario
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',         // Pendiente de activación
  TRIAL = 'TRIAL'              // En periodo de prueba
}

// Plan de membresía
export enum MembershipPlan {
  TRIAL = 'TRIAL',             // 14 días gratis
  BASIC = 'BASIC',             // Hasta 5 vendedores
  PROFESSIONAL = 'PROFESSIONAL', // Hasta 20 vendedores
  ENTERPRISE = 'ENTERPRISE'     // Vendedores ilimitados
}

// Tipo de empresa/cuenta
export interface Company {
  id: string;
  name: string;
  rfc?: string;
  address?: string;
  phone: string;
  email: string;
  logo?: string;
  plan: MembershipPlan;
  planExpiresAt: Date;
  maxUsers: number;
  currentUsers: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Configuraciones específicas
  settings?: {
    currency: string;
    timezone: string;
    language: string;
    allowMobileApp: boolean;
    allowMultipleDevices: boolean;
  };
}

// Usuario del sistema
export interface User {
  id: string;
  companyId: string;          // Relación con la empresa
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  
  // Control de acceso
  permissions?: string[];
  lastLogin?: Date;
  loginAttempts?: number;
  isLocked?: boolean;
  mustChangePassword?: boolean;
  
  // Para vendedores
  code?: string;               // Código único del vendedor
  zone?: string;               // Zona asignada
  supervisor?: string;         // ID del supervisor
  commissionRate?: number;     // Porcentaje de comisión
  dailyTarget?: number;        // Meta diaria
  
  // Dispositivos (para app móvil)
  devices?: Device[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  invitedAt?: Date;
  activatedAt?: Date;
}

// Dispositivo registrado
export interface Device {
  id: string;
  userId: string;
  deviceId: string;           // ID único del dispositivo
  deviceName: string;         // Ej: "iPhone 12 de Carlos"
  platform: 'ios' | 'android' | 'web';
  lastActive: Date;
  pushToken?: string;         // Para notificaciones push
  isActive: boolean;
}

// Invitación de usuario
export interface UserInvitation {
  id: string;
  companyId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}

// Permisos del sistema
export const PERMISSIONS = {
  // Usuarios
  USER_CREATE: 'user.create',
  USER_READ: 'user.read',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_SUSPEND: 'user.suspend',
  
  // Clientes
  CLIENT_CREATE: 'client.create',
  CLIENT_READ: 'client.read',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',
  
  // Productos
  PRODUCT_CREATE: 'product.create',
  PRODUCT_READ: 'product.read',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  PRODUCT_PRICE_EDIT: 'product.price.edit',
  
  // Pedidos
  ORDER_CREATE: 'order.create',
  ORDER_READ: 'order.read',
  ORDER_UPDATE: 'order.update',
  ORDER_DELETE: 'order.delete',
  ORDER_CANCEL: 'order.cancel',
  
  // Rutas
  ROUTE_CREATE: 'route.create',
  ROUTE_READ: 'route.read',
  ROUTE_UPDATE: 'route.update',
  ROUTE_DELETE: 'route.delete',
  ROUTE_ASSIGN: 'route.assign',
  
  // Reportes
  REPORT_SALES: 'report.sales',
  REPORT_INVENTORY: 'report.inventory',
  REPORT_ROUTES: 'report.routes',
  REPORT_FINANCIAL: 'report.financial',
  
  // Configuración
  SETTINGS_COMPANY: 'settings.company',
  SETTINGS_BILLING: 'settings.billing',
  SETTINGS_INTEGRATIONS: 'settings.integrations',
} as const;

// Permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: Object.values(PERMISSIONS), // Todos los permisos
  
  [UserRole.ADMIN]: [
    // Gestión completa menos billing
    ...Object.values(PERMISSIONS).filter(p => !p.includes('billing')),
  ],
  
  [UserRole.SUPERVISOR]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_READ,
    PERMISSIONS.CLIENT_UPDATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ORDER_UPDATE,
    PERMISSIONS.ROUTE_CREATE,
    PERMISSIONS.ROUTE_READ,
    PERMISSIONS.ROUTE_UPDATE,
    PERMISSIONS.ROUTE_ASSIGN,
    PERMISSIONS.REPORT_SALES,
    PERMISSIONS.REPORT_ROUTES,
  ],
  
  [UserRole.VENDEDOR]: [
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_READ,
    PERMISSIONS.CLIENT_UPDATE,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.ORDER_CREATE,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ROUTE_READ,
  ],
  
  [UserRole.VIEWER]: [
    PERMISSIONS.CLIENT_READ,
    PERMISSIONS.PRODUCT_READ,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.ROUTE_READ,
  ],
};

// Helper para verificar permisos
export function hasPermission(user: User, permission: string): boolean {
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes(permission) || 
         (user.permissions?.includes(permission) ?? false);
}

// Helper para verificar múltiples permisos
export function hasAnyPermission(user: User, permissions: string[]): boolean {
  return permissions.some(permission => hasPermission(user, permission));
}

// Helper para verificar todos los permisos
export function hasAllPermissions(user: User, permissions: string[]): boolean {
  return permissions.every(permission => hasPermission(user, permission));
}
