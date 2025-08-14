// Base types
export interface BaseEntity {
  id: string
  createdAt: Date
  updatedAt: Date
}

// User types
export interface User extends BaseEntity {
  name: string
  email: string
  role: UserRole
  avatar?: string
  phone?: string
  territory?: string
  isActive: boolean
  lastLogin?: Date
}

export enum UserRole {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VENDEDOR = 'VENDEDOR'
}

// Client types
export interface Client extends BaseEntity {
  code: string
  name: string
  email?: string
  phone?: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  latitude?: number
  longitude?: number
  type: ClientType
  isActive: boolean
  creditLimit?: number
  paymentTerms?: number // days
  notes?: string
  
  // Relations
  visits?: Visit[]
  orders?: Order[]
  deliveries?: Delivery[]
}

export enum ClientType {
  MINORISTA = 'MINORISTA',
  MAYORISTA = 'MAYORISTA',
  DISTRIBUIDOR = 'DISTRIBUIDOR'
}

// Product types
export interface Product extends BaseEntity {
  code: string
  name: string
  description?: string
  category: string
  brand?: string
  unit: string
  price: number
  cost?: number
  stock: number
  minStock: number
  maxStock?: number
  isActive: boolean
  images: string[]
  
  // Relations
  orderItems?: OrderItem[]
}

// Route types
export interface Route extends BaseEntity {
  name: string
  description?: string
  userId: string
  isActive: boolean
  
  // Relations
  user?: User
  clients?: RouteClient[]
  assignments?: RouteAssignment[]
}

export interface RouteClient {
  id: string
  routeId: string
  clientId: string
  order: number
  isActive: boolean
  createdAt: Date
  
  // Relations
  route?: Route
  client?: Client
}

export interface RouteAssignment extends BaseEntity {
  routeId: string
  userId: string
  date: Date
  status: AssignmentStatus
  startTime?: Date
  endTime?: Date
  notes?: string
  
  // Relations
  route?: Route
  user?: User
}

export enum AssignmentStatus {
  PROGRAMADA = 'PROGRAMADA',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
  CANCELADA = 'CANCELADA'
}

// Visit types
export interface Visit extends BaseEntity {
  clientId: string
  userId: string
  scheduledAt: Date
  visitedAt?: Date
  status: VisitStatus
  latitude?: number
  longitude?: number
  notes?: string
  photos: string[]
  
  // Relations
  client?: Client
  user?: User
  orders?: Order[]
}

export enum VisitStatus {
  PROGRAMADA = 'PROGRAMADA',
  EN_PROGRESO = 'EN_PROGRESO',
  COMPLETADA = 'COMPLETADA',
  NO_REALIZADA = 'NO_REALIZADA',
  REAGENDADA = 'REAGENDADA'
}

// Order types
export interface Order extends BaseEntity {
  number: string
  clientId: string
  userId: string
  visitId?: string
  status: OrderStatus
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string
  orderDate: Date
  deliveryDate?: Date
  
  // Relations
  client?: Client
  user?: User
  visit?: Visit
  items?: OrderItem[]
  deliveries?: Delivery[]
}

export interface OrderItem {
  id: string
  orderId: string
  productId: string
  quantity: number
  price: number
  discount: number
  total: number
  
  // Relations
  order?: Order
  product?: Product
}

export enum OrderStatus {
  PENDIENTE = 'PENDIENTE',
  CONFIRMADA = 'CONFIRMADA',
  EN_PREPARACION = 'EN_PREPARACION',
  LISTA_ENVIO = 'LISTA_ENVIO',
  ENVIADA = 'ENVIADA',
  ENTREGADA = 'ENTREGADA',
  CANCELADA = 'CANCELADA'
}

// Delivery types
export interface Delivery extends BaseEntity {
  number: string
  orderId: string
  clientId: string
  status: DeliveryStatus
  scheduledDate: Date
  deliveredDate?: Date
  driverId?: string
  vehicle?: string
  notes?: string
  signature?: string
  photos: string[]
  
  // Relations
  order?: Order
  client?: Client
}

export enum DeliveryStatus {
  PROGRAMADA = 'PROGRAMADA',
  EN_TRANSITO = 'EN_TRANSITO',
  ENTREGADA = 'ENTREGADA',
  FALLIDA = 'FALLIDA',
  CANCELADA = 'CANCELADA'
}

// Dashboard types
export interface DashboardMetrics {
  visits: {
    total: number
    effectiveness: number
    scheduled: number
    completed: number
  }
  sales: {
    total: number
    target: number
    percentage: number
  }
  products: {
    total: number
    withoutSales: number
  }
  clients: {
    total: number
    withoutOrders: number
    withScheduledVisits: number
  }
  users: {
    total: number
    withoutOrders: number
  }
}

export interface ChartData {
  name: string
  value: number
  date?: string
  [key: string]: unknown
}

// Form types
export interface FormOption {
  label: string
  value: string | number
  disabled?: boolean
}

export interface SelectOption extends FormOption {
  icon?: React.ReactNode
  description?: string
}

// API Response types
export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  success: boolean
  errors?: string[]
}

export interface ApiError {
  message: string
  status: number
  errors?: string[]
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

// Filter and Search types
export interface BaseFilters {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface ClientFilters extends BaseFilters {
  type?: ClientType
  city?: string
  state?: string
  isActive?: boolean
}

export interface ProductFilters extends BaseFilters {
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  isActive?: boolean
}

export interface OrderFilters extends BaseFilters {
  status?: OrderStatus
  clientId?: string
  userId?: string
  startDate?: string
  endDate?: string
}

export interface VisitFilters extends BaseFilters {
  status?: VisitStatus
  clientId?: string
  userId?: string
  date?: string
  startDate?: string
  endDate?: string
}

// UI State types
export interface LoadingState {
  [key: string]: boolean
}

export interface ErrorState {
  [key: string]: string | null
}

// File upload types
export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: Date
}

// Notification types
export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
  createdAt: Date
}

export interface NotificationAction {
  label: string
  action: () => void
  variant?: 'primary' | 'secondary'
}

// Settings types
export interface UserSettings {
  theme: 'light' | 'dark'
  language: 'es' | 'en'
  timezone: string
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    desktop: boolean
  }
  dashboard: {
    defaultDateRange: string
    refreshInterval: number
  }
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type EntityWithRelations<T, R = Record<string, unknown>> = T & R

// Component prop types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface TableColumn<T = unknown> {
  key: keyof T | string
  title: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: unknown, record: T, index: number) => React.ReactNode
}

export interface TableProps<T = unknown> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
  onRowClick?: (record: T, index: number) => void
  rowKey?: keyof T | string
  className?: string
}

// Menu and Navigation types
export interface MenuItem {
  key: string
  label: string
  icon?: React.ReactNode
  path?: string
  children?: MenuItem[]
  disabled?: boolean
  badge?: string | number
  permission?: string | string[]
}

export interface BreadcrumbItem {
  title: string
  path?: string
}

// Chart types
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area'
  data: ChartData[]
  xAxisKey?: string
  yAxisKey?: string
  colors?: string[]
  height?: number
  showLegend?: boolean
  showTooltip?: boolean
}

// Map types
export interface MapLocation {
  latitude: number
  longitude: number
  title?: string
  description?: string
}

export interface MapProps {
  center: MapLocation
  zoom?: number
  markers?: MapLocation[]
  onLocationSelect?: (location: MapLocation) => void
  height?: string | number
  className?: string
}
