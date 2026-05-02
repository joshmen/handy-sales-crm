import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useJornadaStore } from '@/stores';
import { getLastPingAt } from '@/services/locationCheckpoint';

const CHECK_INTERVAL_MS = 60_000;        // chequea cada 1 min
const INACTIVITY_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 horas sin pings

/**
 * Red de seguridad: si la jornada lleva activa más de 4h SIN ningún ping
 * (sin venta, cobro, visita, ni checkpoint del timer), asumimos que el
 * vendedor olvidó cerrar la app y cerramos jornada con `StopAutomatico`.
 *
 * Cubre el caso "vendedor configura horario laboral 24/7 o sin horario, hace
 * una venta a las 9am, cierra app, no vuelve hasta el día siguiente". Sin
 * este watcher, el tracking continuaría hasta el próximo `StopAutomatico` por
 * horario (que en algunos tenants nunca llega).
 *
 * El threshold considera el último ping (`lastPingAt`) o el inicio de jornada
 * si nunca hubo ping aún (caso recién iniciada).
 *
 * Mounted desde `app/_layout.tsx` (un solo lugar).
 */
export function useInactividadJornadaWatcher() {
  const jornadaActiva = useJornadaStore(s => s.activa);
  const iniciadaEn = useJornadaStore(s => s.iniciadaEn);
  const finalizarJornada = useJornadaStore(s => s.finalizarJornada);

  useEffect(() => {
    if (!jornadaActiva) return;

    const evaluar = async () => {
      if (!useJornadaStore.getState().activa) return;
      const lastPingAt = getLastPingAt();
      const referencia = lastPingAt > 0 ? lastPingAt : (iniciadaEn ?? Date.now());
      const inactivo = Date.now() - referencia >= INACTIVITY_THRESHOLD_MS;
      if (inactivo) {
        await finalizarJornada('inactividad');
        Toast.show({
          type: 'info',
          text1: 'Jornada cerrada',
          text2: 'Tu jornada se cerró por inactividad (sin movimiento por 4 horas).',
          visibilityTime: 5000,
        });
      }
    };

    const handle = setInterval(evaluar, CHECK_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [jornadaActiva, iniciadaEn, finalizarJornada]);
}
