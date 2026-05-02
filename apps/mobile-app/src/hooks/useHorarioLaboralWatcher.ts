import { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { useEmpresa } from './useEmpresa';
import { useJornadaStore } from '@/stores';

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

/**
 * Devuelve true si "ahora" cae dentro del horario configurado.
 * - Sin horaInicio ni horaFin → permitido (no hay rango horario).
 * - Sin diasLaborables → permitido cualquier día.
 * - Con uno o ambos → respeta lo que esté configurado.
 *
 * Day mapping: 1=Lun, 2=Mar, ..., 7=Dom (ISO).
 * `Date.getDay()` retorna 0=Dom, 1=Lun..6=Sáb → convertir a ISO.
 */
function enHorarioLaboral(
  horaInicio: string | null | undefined,
  horaFin: string | null | undefined,
  diasLaborables: string | null | undefined,
): boolean {
  const ahora = new Date();
  const dowJs = ahora.getDay();              // 0=Dom..6=Sáb
  const dowIso = dowJs === 0 ? 7 : dowJs;    // 1=Lun..7=Dom

  if (diasLaborables) {
    const setDias = new Set(diasLaborables.split(',').map(s => s.trim()));
    if (setDias.size > 0 && !setDias.has(String(dowIso))) {
      return false;
    }
  }

  if (horaInicio || horaFin) {
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const inicioMin = horaInicio ? toMin(horaInicio) : 0;
    const finMin = horaFin ? toMin(horaFin) : 24 * 60;
    if (minutosAhora < inicioMin || minutosAhora >= finMin) return false;
  }

  return true;
}

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}
