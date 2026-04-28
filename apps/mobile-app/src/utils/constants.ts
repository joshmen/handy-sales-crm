import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// API URL: Use EXPO_PUBLIC_API_URL for preview/production builds,
// fall back to local dev server for development.
// Detection: physical device via WiFi uses the host IP from Expo's debuggerHost,
// emulator uses 10.0.2.2, iOS simulator uses localhost.
const getApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Explicit override from .env
  if (process.env.EXPO_PUBLIC_BACKEND_IP) {
    return `http://${process.env.EXPO_PUBLIC_BACKEND_IP}:1052`;
  }

  // Auto-detect: physical device gets the dev server host IP (same machine running Metro)
  if (Device.isDevice) {
    const debuggerHost = Constants.expoConfig?.hostUri
      ?? Constants.experienceUrl?.match(/\/\/([\d.]+):/)?.[1];
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      return `http://${ip}:1052`;
    }
  }

  // Emulator/simulator fallback
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  let url = `http://${host}:1052`;

  // Security: force HTTPS in production builds
  if (!__DEV__ && url.startsWith('http://')) {
    console.warn('SECURITY: HTTP not allowed in production. Forcing HTTPS.');
    url = url.replace('http://', 'https://');
  }

  return url;
};

// Main API (puerto 1050) hospeda el hub SignalR en /hubs/notifications.
// En dev/local usa el mismo host del Mobile API cambiando puerto. En builds EAS
// (preview/production) hay que pasar EXPO_PUBLIC_MAIN_API_URL explícito porque
// las URLs de Railway no tienen puerto y el `.replace(:1052,:1050)` queda no-op
// (terminaba apuntando al Mobile API por error → SignalR notifications rotas).
const getMainApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_MAIN_API_URL) {
    return process.env.EXPO_PUBLIC_MAIN_API_URL;
  }
  const mobile = getApiUrl();
  // Local dev: sustituye el puerto 1052 → 1050. Sin efecto en URLs Railway.
  return mobile.replace(/:1052(\b|$)/, ':1050');
};

export const API_CONFIG = {
  BASE_URL: getApiUrl(),
  MAIN_BASE_URL: getMainApiUrl(),
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
  1: 'Confirmado', // Legacy — mapped to Confirmado for backwards compat
  2: 'Confirmado',
  3: 'Confirmado', // Legacy — mapped to Confirmado for backwards compat
  4: 'En Ruta',
  5: 'Entregado',
  6: 'Cancelado',
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
  4: 'Pend. aceptar',
  5: 'Carga aceptada',
  6: 'Cerrada',
};

export const ROUTE_STATUS_COLORS: Record<number, string> = {
  0: '#3b82f6', // blue — Planificada
  1: '#f59e0b', // amber — En Curso
  2: '#22c55e', // green — Completada
  3: '#ef4444', // red — Cancelada
  4: '#d97706', // orange — Pend. aceptar
  5: '#2563eb', // blue — Carga aceptada
  6: '#16a34a', // green — Cerrada
};

/**
 * Re-export the design system COLORS as the single source of truth.
 * Import from '@/theme/colors' for the canonical version.
 */
export { COLORS } from '@/theme/colors';
