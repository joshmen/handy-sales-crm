import { useEffect, useRef } from 'react';
import { useOfflineRutaHoy } from './useOfflineRoutes';
import { useJornadaStore } from '@/stores';

/**
 * Sincroniza el estado de jornada con el estado de la ruta del día (si existe).
 *
 * Transiciones disparadas:
 *  - Ruta a `EnProgreso` (estado=1) sin jornada activa → iniciarJornada('ruta')
 *  - Ruta a `Completada` (estado=2) con jornada activa → finalizarJornada('ruta')
 *
 * No interfiere con jornadas iniciadas manualmente: si el vendedor presionó
 * "Iniciar jornada" antes de aceptar la ruta, no re-disparamos. Si la ruta
 * pasa a Completada y la jornada estaba activa por motivo manual, igual la
 * cerramos (la ruta es la señal más fuerte de "terminé").
 *
 * Mounted desde `app/_layout.tsx`.
 */

const ESTADO_EN_PROGRESO = 1;
const ESTADO_COMPLETADA = 2;

export function useRutaJornadaWatcher() {
  const rutas = useOfflineRutaHoy();
  const jornadaActiva = useJornadaStore(s => s.activa);
  const hidratada = useJornadaStore(s => s.hidratada);
  const iniciarJornada = useJornadaStore(s => s.iniciarJornada);
  const finalizarJornada = useJornadaStore(s => s.finalizarJornada);

  // Memoria del último estado evaluado para detectar transiciones reales
  // (evita re-disparar si el observable emite el mismo estado varias veces).
  const lastEstadoRef = useRef<number | null>(null);

  useEffect(() => {
    // HYDRATION GUARD: si el store de jornada aún no terminó de hidratar de
    // AsyncStorage, `jornadaActiva` puede ser su default `false` aunque en
    // disco ya esté `true`. Saltar la evaluación hasta que hidratemos evita
    // que el watcher dispare `iniciarJornada('ruta')` un segundo InicioRuta
    // duplicado en el mismo día (reportado prod 2026-05-26 — Rodrigo, pings
    // #88 y #89 a 5:21pm y 5:27pm).
    if (!hidratada) return;

    const ruta = rutas?.data?.[0];
    if (!ruta) {
      lastEstadoRef.current = null;
      return;
    }

    const estadoActual = ruta.estado;
    const estadoPrev = lastEstadoRef.current;
    lastEstadoRef.current = estadoActual;

    // Solo actuamos en transiciones (no en re-emisiones del mismo estado)
    if (estadoPrev === estadoActual) return;

    if (estadoActual === ESTADO_EN_PROGRESO && !jornadaActiva) {
      iniciarJornada('ruta');
    } else if (estadoActual === ESTADO_COMPLETADA && jornadaActiva) {
      finalizarJornada('ruta');
    }
  }, [rutas, jornadaActiva, hidratada, iniciarJornada, finalizarJornada]);
}
