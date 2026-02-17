// Tipos de Organización/Empresa
export interface Organization {
  id: string;
  name: string;
  slug: string; // URL única: handysales.com/org/mi-empresa
  logo?: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  taxId?: string; // RFC en México
  
  // Información de suscripción
  subscription: {
    plan: 'basic' | 'pro' | 'enterprise';
    status: 'active' | 'trial' | 'suspended' | 'cancelled';
    startDate: Date;
    endDate: Date;
    trialEndsAt?: Date;
    maxUsers: number;
    maxClients: number;
    maxProducts: number;
    features: string[];
  };
  
  // Configuración
  settings: {
    currency: string;
    timezone: string;
    language: string;
    fiscalYearStart: number; // Mes del año
    allowNegativeStock: boolean;
    requireClientSignature: boolean;
    autoSendReports: boolean;
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

// Tipos de Usuario mejorados
export interface User {
  id: string;
  organizationId: string; // Relación con la organización
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  
  // Rol y permisos
  role: 'OWNER' | 'ADMIN' | 'SUPERVISOR' | 'VENDEDOR';
  permissions: Permission[];
  
  // Estado
  status: 'active' | 'invited' | 'suspended' | 'inactive';
  emailVerified: boolean;
  phoneVerified: boolean;
  lastLogin?: Date;
  
  // Configuración personal
  settings: {
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    defaultRoute?: string;
    language: string;
  };
  
  // Para vendedores
  salesInfo?: {
    code: string; // Código único del vendedor
    zones: string[]; // Zonas asignadas
    supervisor?: string; // ID del supervisor
    commission: number; // Porcentaje de comisión
    dailyTarget: number; // Meta diaria
    monthlyTarget: number; // Meta mensual
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  invitedBy?: string;
  invitedAt?: Date;
  acceptedAt?: Date;
}

// Permisos del sistema
export interface Permission {
  id: string;
  resource: Resource;
  action: Action;
}

export type Resource = 
  | 'dashboard'
  | 'clients'
  | 'products'
  | 'orders'
  | 'routes'
  | 'inventory'
  | 'reports'
  | 'users'
  | 'settings'
  | 'billing';

export type Action = 
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'export'
  | 'import';

// Invitación de usuario
export interface UserInvitation {
  id: string;
  organizationId: string;
  email: string;
  role: User['role'];
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string; // Token único para aceptar invitación
}

// Planes de suscripción
export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: {
    maxUsers: number;
    maxClients: number;
    maxProducts: number;
    maxOrders: number;
    hasAPI: boolean;
    hasMobileApp: boolean;
    hasReports: boolean;
    hasSupport: boolean;
    supportLevel: 'basic' | 'priority' | '24/7';
    customIntegrations: boolean;
    dataExport: boolean;
  };
  popular?: boolean;
  description: string;
}

// Sesión de dispositivo (para app móvil)
export interface DeviceSession {
  id: string;
  userId: string;
  organizationId: string;
  deviceId: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  platform: 'ios' | 'android' | 'web';
  appVersion?: string;
  fcmToken?: string; // Para notificaciones push
  lastActivity: Date;
  isActive: boolean;
  location?: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: Date;
  };
}

// Log de actividad
export interface ActivityLog {
  id: string;
  organizationId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}
