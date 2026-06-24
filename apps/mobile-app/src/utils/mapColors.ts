// Semantic marker colors for map
export const MAP_COLORS = {
  VISITED_TODAY: '#22c55e',    // green
  PENDING_ROUTE: '#f59e0b',    // amber
  SCHEDULED_TODAY: '#0ea5e9',  // sky blue — visita agendada hoy pendiente
  ACTIVE_STOP: '#4338CA',      // indigo (primary)
  COMPLETED_STOP: '#22c55e',   // green
  SKIPPED_STOP: '#94a3b8',     // gray
  INACTIVE: '#94a3b8',         // gray
  DEFAULT: '#4338CA',          // indigo (primary)
  CLUSTER: '#4338CA',          // indigo (primary)
  GEOFENCE_OK: '#22c55e',      // green
  GEOFENCE_WARN: '#f59e0b',    // amber
  GEOFENCE_FAR: '#ef4444',     // red
};

// Stop estado constants (from RutaDetalle model)
export const STOP_ESTADO = {
  PENDIENTE: 0,
  EN_VISITA: 1,
  COMPLETADA: 2,
  OMITIDA: 4,
} as const;

// Route estado constants
export const ROUTE_ESTADO = {
  PLANIFICADA: 0,
  EN_PROGRESO: 1,
  COMPLETADA: 2,
} as const;

/**
 * Determines the marker color for a client on the map.
 * Priority: inactive → active stop → pending route → scheduled today → visited today → default
 *
 * `scheduledTodaySet` (opcional) son clientes con una visita agendada para hoy
 * (ClienteVisita.FechaProgramada) que aún no tienen check-in. Se colorean en azul
 * "Agendado hoy" para que el vendedor las distinga de clientes regulares. Rankea
 * por debajo de las paradas de ruta (la ruta manda) pero por encima de "visitado
 * hoy" sería incorrecto: si ya hay check-in la visita deja de ser pendiente y no
 * está en el set, así que el orden visitado-hoy → default queda intacto.
 */
export function getClientMarkerColor(
  clienteId: string,
  routeStopMap: Map<string, number>,
  todayVisitSet: Set<string>,
  isActive: boolean,
  scheduledTodaySet?: Set<string>
): string {
  if (!isActive) return MAP_COLORS.INACTIVE;

  const stopEstado = routeStopMap.get(clienteId);
  if (stopEstado !== undefined) {
    switch (stopEstado) {
      case STOP_ESTADO.EN_VISITA:
        return MAP_COLORS.ACTIVE_STOP;
      case STOP_ESTADO.COMPLETADA:
        return MAP_COLORS.COMPLETED_STOP;
      case STOP_ESTADO.OMITIDA:
        return MAP_COLORS.SKIPPED_STOP;
      case STOP_ESTADO.PENDIENTE:
        return MAP_COLORS.PENDING_ROUTE;
    }
  }

  if (scheduledTodaySet?.has(clienteId)) return MAP_COLORS.SCHEDULED_TODAY;

  if (todayVisitSet.has(clienteId)) return MAP_COLORS.VISITED_TODAY;

  return MAP_COLORS.DEFAULT;
}

/**
 * Returns the geofence color based on distance in meters.
 */
export function getGeofenceColor(distanceMeters: number): string {
  if (distanceMeters <= 200) return MAP_COLORS.GEOFENCE_OK;
  if (distanceMeters <= 500) return MAP_COLORS.GEOFENCE_WARN;
  return MAP_COLORS.GEOFENCE_FAR;
}

/**
 * Returns the stop marker color based on its estado.
 */
export function getStopMarkerColor(estado: number): string {
  switch (estado) {
    case STOP_ESTADO.EN_VISITA:
      return MAP_COLORS.ACTIVE_STOP;
    case STOP_ESTADO.COMPLETADA:
      return MAP_COLORS.COMPLETED_STOP;
    case STOP_ESTADO.OMITIDA:
      return MAP_COLORS.SKIPPED_STOP;
    case STOP_ESTADO.PENDIENTE:
    default:
      return MAP_COLORS.PENDING_ROUTE;
  }
}
