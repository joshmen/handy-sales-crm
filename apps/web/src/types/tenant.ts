export interface Tenant {
  id: number;
  nombreEmpresa: string;
  rfc: string | null;
  activo: boolean;
  planTipo: string | null;
  usuarioCount: number;
  fechaExpiracion: string | null;
  suscripcionActiva: boolean;
}

export interface TenantDetail {
  id: number;
  nombreEmpresa: string;
  rfc: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  logoUrl: string | null;
  cloudinaryFolder: string | null;
  activo: boolean;
  planTipo: string | null;
  maxUsuarios: number;
  fechaSuscripcion: string | null;
  fechaExpiracion: string | null;
  suscripcionActiva: boolean;
  creadoEn: string;
  stats: TenantStats;
}

export interface TenantStats {
  usuarios: number;
  clientes: number;
  productos: number;
  pedidos: number;
}

export interface TenantCreateRequest {
  nombreEmpresa: string;
  rfc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  planTipo?: string;
  maxUsuarios: number;
  fechaSuscripcion?: string;
  fechaExpiracion?: string;
}

export interface TenantUpdateRequest {
  nombreEmpresa: string;
  rfc?: string;
  contacto?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  logoUrl?: string;
  planTipo?: string;
  maxUsuarios: number;
  fechaSuscripcion?: string;
  fechaExpiracion?: string;
}

export interface TenantUser {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

export interface TenantCreateUserRequest {
  nombre: string;
  email: string;
  password: string;
  rol: string;
}

export interface TopTenant {
  id: number;
  nombreEmpresa: string;
  pedidos: number;
  ventas: number;
}

export interface SystemMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsuarios: number;
  totalClientes: number;
  totalProductos: number;
  totalPedidos: number;
  totalVentas: number;
  tenantsRecientes: Tenant[];
  topTenants: TopTenant[];
}
