import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useEmpresa } from './useEmpresa';
import { useJornadaStore } from '@/stores';
import { enHorarioLaboral } from '@/utils/horarioLaboral';

const CHECK_INTERVAL_MS = 60_000; // 1 min

/**
 * Si el admin configuró horario laboral en /settings y el vendedor sigue con
 * jornada activa al pasar la hora de fin (o al estar en un día no laborable),
 * cierra la jornada automáticamente con ping `StopAutomatico`.
 *
 * Si la config viene null → no-op (vendedor controla manualmente).
 *
 * Mounted desde `app/_layout.tsx` (un solo lugar). Se ejecuta cada 60s.
 */
export function useHorarioLaboralWatcher() {
  const { data: empresa } = useEmpresa();
  const jornadaActiva = useJornadaStore(s => s.activa);
  const finalizarJornada = useJornadaStore(s => s.finalizarJornada);

  useEffect(() => {
    if (!empresa) return;
    const horaInicio = empresa.horaInicioJornada;
    const horaFin = empresa.horaFinJornada;
    const diasLaborables = empresa.diasLaborables;

    // Sin config → no aplicar restricción.
    const configActiva = !!(horaInicio || horaFin || diasLaborables);
    if (!configActiva || !jornadaActiva) return;

    const evaluar = async () => {
      if (!useJornadaStore.getState().activa) return;
      if (!enHorarioLaboral(horaInicio, horaFin, diasLaborables)) {
        await finalizarJornada('horario');
        Toast.show({
          type: 'info',
          text1: 'Jornada cerrada',
          text2: 'Tu jornada se cerró automáticamente al salir del horario laboral.',
          visibilityTime: 5000,
        });
      }
    };

    // Evaluar inmediato + cada 60s
    evaluar();
    const handle = setInterval(evaluar, CHECK_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [empresa, jornadaActiva, finalizarJornada]);
}

// Helper `enHorarioLaboral` extraído a `@/utils/horarioLaboral` para que
// `recordPing` también pueda evaluarlo sin acoplarse a React.
