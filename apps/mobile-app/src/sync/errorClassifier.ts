/**
 * Clasificador de errores de sync. Extrae el patron antes inline en
 * sync.tsx (translateSyncError) y syncStore.ts (isNetworkError regex) para
 * que UI + store usen la misma fuente de verdad sobre que tipo de error
 * vio el usuario y como debe presentarse.
 *
 * Sprint 1 (audit code-quality): el botón sync mostraba feedback genérico
 * sin diferenciar entre transient (red caida, server 5xx) y permanent
 * (auth 401, validation 4xx). El usuario quedaba a ciegas — "le doy click
 * y no se sabe si ocurrio algo". Con esta clasificacion:
 *  - network/server -> banner ambar + countdown de retry + boton "Reintentar ahora"
 *  - auth -> banner rojo + CTA "Iniciar sesion" (mismo handler que SessionExpiredBanner)
 *  - client -> banner rojo + "Contacta soporte" + mensaje tecnico
 *  - unknown -> mensaje raw como fallback
 */

export type SyncErrorType = 'network' | 'auth' | 'server' | 'client' | 'unknown';

export interface ClassifiedSyncError {
  type: SyncErrorType;
  userMessage: string;
  isTransient: boolean;
}

/**
 * Clasifica el error y produce un mensaje accionable para el vendedor en campo.
 * isOnline se considera para distinguir "Network Error" genuino offline vs
 * race condition con tokens (puede pasar online si el refresh falla).
 */
export function classifyError(rawError: string, isOnline: boolean): ClassifiedSyncError {
  const msg = rawError.toLowerCase();

  if (msg.includes('401') || msg.includes('session_revoked') || msg.includes('unauthorized')) {
    return {
      type: 'auth',
      userMessage: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
      isTransient: false,
    };
  }

  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) {
    return {
      type: 'server',
      userMessage: 'Servidor temporalmente no disponible. Reintentaremos en unos segundos.',
      isTransient: true,
    };
  }

  if (msg.includes('network error') && isOnline) {
    return {
      type: 'network',
      userMessage: 'Reintentando conexión con el servidor...',
      isTransient: true,
    };
  }

  if (msg.includes('network error') || msg.includes('timeout') || msg.includes('econn') || msg.includes('fetch') || msg.includes('abort')) {
    return {
      type: 'network',
      userMessage: 'Sin conexión estable. Reintentaremos cuando haya señal.',
      isTransient: true,
    };
  }

  if (msg.includes('400') || msg.includes('422') || msg.includes('validation')) {
    return {
      type: 'client',
      userMessage: 'Error de validación. Contacta a tu administrador si persiste.',
      isTransient: false,
    };
  }

  return {
    type: 'unknown',
    userMessage: rawError,
    isTransient: true, // por default asumimos transient para no bloquear retry
  };
}
