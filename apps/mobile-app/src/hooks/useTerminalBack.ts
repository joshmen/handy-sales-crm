import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Para pantallas TERMINALES (ticket/recibo, éxito de pedido, resumen de jornada):
 * el back de hardware (Android) NO debe regresar al flujo ya completado
 * (formulario, carrito, pago) — debe ir a la principal o al destino contextual,
 * el mismo del botón explícito de la pantalla.
 *
 * Intercepta el `hardwareBackPress` SOLO mientras la pantalla está enfocada
 * (`useFocusEffect`, patrón oficial RN/expo-router), ejecuta `onExit` y devuelve
 * `true` para cancelar el back por default. El `ref` evita que el caller tenga
 * que memoizar `onExit`.
 *
 * iOS no tiene back de hardware; esas pantallas ya usan `gestureEnabled:false`
 * (sin swipe-back) + botón explícito, así que quedan cubiertas.
 */
export function useTerminalBack(onExit: () => void): void {
  const ref = useRef(onExit);
  ref.current = onExit;

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        ref.current();
        return true;
      });
      return () => sub.remove();
    }, [])
  );
}
