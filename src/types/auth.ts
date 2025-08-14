// Tipos de Usuario y Autenticación
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId?: string;
  company?: Company;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  permissions?: Permission[];
  avatar?: string;
  phone?: string;
  // Para vendedores
  assignedRoutes?: string[];
  supervisor?: string;
  // Metadata
  deviceToken?: string; // Para notificaciones push de React Native
  appVersion?: string;
  platform?: 'web' | 'ios' | 'android';
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN', // Sistema HandySales
  ADMIN = 'ADMIN',             // Admin de la empresa (cliente que paga)
  SUPERVISOR = 'SUPERVISOR',    // Supervisor de vendedores
  VENDEDOR = 'VENDEDOR',       // Vendedor de ruta
  VIEWER = 'VIEWER',           // Solo lectura
}

export interface Company {
  id: string;
  name: string;
  rfc?: string;
  email: string;
  phone: string;
  address: string;
  logo?: string;
  // Membresía
  subscription: Subscription;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Límites
  maxUsers: number;
  maxRoutes: number;
  maxClients: number;
  // Configuración
  settings?: CompanySettings;
}

export interface Subscription {
  id: string;
  companyId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  // Pagos
  lastPaymentDate?: Date;
  nextPaymentDate?: Date;
  paymentMethod?: string;
  // Features
  features: string[];
}

export enum SubscriptionPlan {
  BASIC = 'BASIC',           // 1-5 vendedores
  PROFESSIONAL = 'PROFESSIONAL', // 6-20 vendedores
  ENTERPRISE = 'ENTERPRISE',     // 21+ vendedores
  CUSTOM = 'CUSTOM',            // Plan personalizado
}

export enum SubscriptionStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELLED = 'CANCELLED',
  SUSPENDED = 'SUSPENDED',
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface CompanySettings {
  // Configuración general
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  // Configuración de rutas
  requirePhotoOnVisit: boolean;
  requireSignatureOnDelivery: boolean;
  requireLocationOnCheckIn: boolean;
  maxDistanceFromClient: number; // metros
  // Configuración de inventario
  allowNegativeStock: boolean;
  requireStockCount: boolean;
  // Notificaciones
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

// Para crear/editar usuarios
export interface CreateUserInput {
  email: string;
  name: string;
  password?: string; // Opcional, se puede autogenerar
  role: UserRole;
  phone?: string;
  assignedRoutes?: string[];
  supervisor?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserInput {
  id: string;
  name?: string;
  email?: string;
  role?: UserRole;
  phone?: string;
  isActive?: boolean;
  assignedRoutes?: string[];
  supervisor?: string;
}

// Para sincronización con React Native
export interface SyncRequest {
  userId: string;
  lastSyncDate: Date;
  deviceInfo: {
    platform: 'ios' | 'android';
    version: string;
    deviceId: string;
    appVersion: string;
  };
  dataTypes: ('clients' | 'products' | 'routes' | 'orders')[];
}

export interface SyncResponse {
  success: boolean;
  lastSyncDate: Date;
  data: {
    clients?: Client[];
    products?: Product[];
    routes?: Route[];
    orders?: Order[];
  };
  deletedIds?: {
    clients?: string[];
    products?: string[];
    routes?: string[];
    orders?: string[];
  };
  settings?: CompanySettings;
}

// Permisos por rol
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.SUPER_ADMIN]: ['*'], // Todo
  [UserRole.ADMIN]: [
    'users:*',
    'company:*',
    'routes:*',
    'clients:*',
    'products:*',
    'orders:*',
    'reports:*',
    'settings:*',
  ],
  [UserRole.SUPERVISOR]: [
    'users:read',
    'users:update:subordinates',
    'routes:*',
    'clients:*',
    'products:read',
    'orders:*',
    'reports:read',
  ],
  [UserRole.VENDEDOR]: [
    'routes:read:assigned',
    'routes:update:assigned',
    'clients:read:assigned',
    'clients:create',
    'clients:update:assigned',
    'products:read',
    'orders:create',
    'orders:read:own',
    'orders:update:own',
  ],
  [UserRole.VIEWER]: [
    'routes:read',
    'clients:read',
    'products:read',
    'orders:read',
    'reports:read',
  ],
};
