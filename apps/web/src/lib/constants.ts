// API Configuration
// Server-side uses API_URL, client-side uses NEXT_PUBLIC_API_URL
export const API_CONFIG = {
  BASE_URL: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:1050",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
}

// Routes
export const ROUTES = {
  HOME: "/",
  DASHBOARD: "/dashboard",
  CLIENTS: "/clients",
  PRODUCTS: "/products",
  ROUTES: "/routes",
  CALENDAR: "/calendar",
  FORMS: "/forms",
  ORDERS: "/orders",
  DELIVERIES: "/deliveries",
  USERS: "/users",
  SETTINGS: "/settings",
} as const

// User Roles
export const USER_ROLES = {
  ADMIN: "ADMIN",
  SUPERVISOR: "SUPERVISOR", 
  VENDEDOR: "VENDEDOR",
} as const

// Status Types
export const ORDER_STATUS = {
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  EN_PREPARACION: "EN_PREPARACION",
  LISTA_ENVIO: "LISTA_ENVIO",
  ENVIADA: "ENVIADA",
  ENTREGADA: "ENTREGADA",
  CANCELADA: "CANCELADA",
} as const

export const VISIT_STATUS = {
  PROGRAMADA: "PROGRAMADA",
  EN_PROGRESO: "EN_PROGRESO",
  COMPLETADA: "COMPLETADA",
  NO_REALIZADA: "NO_REALIZADA",
  REAGENDADA: "REAGENDADA",
} as const

export const DELIVERY_STATUS = {
  PROGRAMADA: "PROGRAMADA",
  EN_TRANSITO: "EN_TRANSITO",
  ENTREGADA: "ENTREGADA",
  FALLIDA: "FALLIDA",
  CANCELADA: "CANCELADA",
} as const

export const CLIENT_TYPES = {
  MINORISTA: "MINORISTA",
  MAYORISTA: "MAYORISTA",
  DISTRIBUIDOR: "DISTRIBUIDOR",
} as const

// UI Constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const

export const TOAST_DURATION = 5000

// Validation Constants
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
} as const

// Date Formats
export const DATE_FORMATS = {
  DISPLAY: "dd/MM/yyyy",
  DISPLAY_WITH_TIME: "dd/MM/yyyy HH:mm",
  API: "yyyy-MM-dd",
  API_WITH_TIME: "yyyy-MM-dd'T'HH:mm:ss",
} as const

// Colors for charts and UI
export const CHART_COLORS = {
  PRIMARY: "#3b82f6",
  SUCCESS: "#10b981", 
  WARNING: "#f59e0b",
  ERROR: "#ef4444",
  INFO: "#06b6d4",
  GRAY: "#6b7280",
} as const

export const STATUS_COLORS = {
  [ORDER_STATUS.PENDIENTE]: "#f59e0b",
  [ORDER_STATUS.CONFIRMADA]: "#06b6d4", 
  [ORDER_STATUS.EN_PREPARACION]: "#8b5cf6",
  [ORDER_STATUS.LISTA_ENVIO]: "#3b82f6",
  [ORDER_STATUS.ENVIADA]: "#f97316",
  [ORDER_STATUS.ENTREGADA]: "#10b981",
  [ORDER_STATUS.CANCELADA]: "#ef4444",
} as const
