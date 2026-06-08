import { useMemo } from 'react';
import Toast from 'react-native-toast-message';

/**
 * Sprint 3 audit code-quality: helper centralizado para Toast.show.
 *
 * Antes: 90+ instancias de Toast.show({ type: 'error', text1: '...',
 * text2: '...', visibilityTime: N, position: 'X' }) distribuidas en 50+
 * archivos sin consistencia de tipo, duracion o posicion.
 *
 * Ahora: hook que retorna helpers tipados con defaults sensatos. Cambiar
 * duracion/posicion globalmente toca un solo lugar.
 *
 * Pattern recomendado por react-native-toast-message: wrappear en custom
 * hook para que el llamador no tenga que recordar los nombres exactos de
 * los props (text1/text2/visibilityTime/position).
 *
 * Defaults:
 *  - error: 5000ms bottom
 *  - success: 4000ms bottom
 *  - info: 3500ms bottom
 *  - warning: 4000ms bottom (tipo 'info' del lib con texto amarillo no
 *    nativo, fallback a 'info')
 */

interface ToastOpts {
  /** Duracion en ms. Override del default por tipo. */
  visibilityTime?: number;
  /** Posicion. Default 'bottom'. */
  position?: 'top' | 'bottom';
}

interface ToastApi {
  showError(title: string, message?: string, opts?: ToastOpts): void;
  showSuccess(title: string, message?: string, opts?: ToastOpts): void;
  showInfo(title: string, message?: string, opts?: ToastOpts): void;
  showWarning(title: string, message?: string, opts?: ToastOpts): void;
  /** Cierra cualquier toast activo. */
  hide(): void;
}

export function useToastNotifications(): ToastApi {
  return useMemo(() => ({
    showError: (title, message, opts) => Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      visibilityTime: opts?.visibilityTime ?? 5000,
      position: opts?.position ?? 'bottom',
    }),
    showSuccess: (title, message, opts) => Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      visibilityTime: opts?.visibilityTime ?? 4000,
      position: opts?.position ?? 'bottom',
    }),
    showInfo: (title, message, opts) => Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      visibilityTime: opts?.visibilityTime ?? 3500,
      position: opts?.position ?? 'bottom',
    }),
    showWarning: (title, message, opts) => Toast.show({
      type: 'info', // react-native-toast-message no tiene 'warning' nativo
      text1: title,
      text2: message,
      visibilityTime: opts?.visibilityTime ?? 4000,
      position: opts?.position ?? 'bottom',
    }),
    hide: () => Toast.hide(),
  }), []);
}
