// Helper puro reusable para evaluar si "ahora" cae dentro del horario
// laboral configurado por el admin (CompanySetting.horaInicioJornada,
// horaFinJornada, diasLaborables). Sin red. Independiente de React.
//
// Usado por:
//  - useHorarioLaboralWatcher (cierra jornada al salir del rango)
//  - recordPing (evita auto-start de jornada en día/hora no laborable
//    para no spam'ear pings InicioJornada+StopAutomatico simultáneos
//    que reportó Jeyma sábado 2026-05-02)

/**
 * Devuelve true si "ahora" cae dentro del horario configurado.
 * - Sin horaInicio ni horaFin → permitido (no hay rango horario).
 * - Sin diasLaborables → permitido cualquier día.
 * - Con uno o ambos → respeta lo que esté configurado.
 *
 * Day mapping: 1=Lun..7=Dom (ISO).
 * `Date.getDay()` retorna 0=Dom..6=Sáb → convertir a ISO.
 */
export function enHorarioLaboral(
  horaInicio: string | null | undefined,
  horaFin: string | null | undefined,
  diasLaborables: string | null | undefined,
  now: Date = new Date(),
): boolean {
  const dowJs = now.getDay();              // 0=Dom..6=Sáb
  const dowIso = dowJs === 0 ? 7 : dowJs;  // 1=Lun..7=Dom

  if (diasLaborables) {
    const setDias = new Set(diasLaborables.split(',').map(s => s.trim()));
    if (setDias.size > 0 && !setDias.has(String(dowIso))) {
      return false;
    }
  }

  if (horaInicio || horaFin) {
    const minutosAhora = now.getHours() * 60 + now.getMinutes();
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
