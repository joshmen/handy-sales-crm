import { Platform } from 'react-native';

// API URL: Use EXPO_PUBLIC_API_URL for preview/production builds,
// fall back to local dev server for development
const getApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = process.env.EXPO_PUBLIC_BACKEND_IP || (
    Platform.OS === 'android' ? '10.0.2.2' : 'localhost'
  );
  return `http://${host}:1052`;
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  TIMEOUT: 15000,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  DEVICE_ID: 'device_id',
} as const;

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  VENDEDOR: 'VENDEDOR',
} as const;

export const ORDER_STATUS: Record<number, string> = {
  0: 'Borrador',
  1: 'Enviado',
  2: 'Confirmado',
  3: 'En Preparación',
  4: 'En Ruta',
  5: 'Entregado',
  6: 'Cancelado',
};

export const ORDER_STATUS_COLORS: Record<number, string> = {
  0: '#6b7280', // gray
  1: '#3b82f6', // blue
  2: '#8b5cf6', // violet
  3: '#f59e0b', // amber
  4: '#0891b2', // cyan
  5: '#22c55e', // green
  6: '#ef4444', // red
};

export const VISIT_RESULT: Record<number, string> = {
  0: 'Pendiente',
  1: 'Con Venta',
  2: 'Sin Venta',
  3: 'No Encontrado',
  4: 'Reagendada',
};

export const VISIT_RESULT_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#22c55e',
  2: '#f59e0b',
  3: '#ef4444',
  4: '#8b5cf6',
};

export const ROUTE_STATUS: Record<number, string> = {
  0: 'Planificada',
  1: 'En Curso',
  2: 'Completada',
  3: 'Cancelada',
};

export const ROUTE_STATUS_COLORS: Record<number, string> = {
  0: '#3b82f6',
  1: '#f59e0b',
  2: '#22c55e',
  3: '#ef4444',
};

export const COLORS = {
  primary: '#2563eb',
  primaryLight: '#eff6ff',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#6b7280',
  grayLight: '#f3f4f6',
  white: '#ffffff',
  black: '#111827',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
} as const;
