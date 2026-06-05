/**
 * Sprint 6 audit code-quality: staleTime defaults centralizados.
 *
 * Antes: cada hook (useEmpresa, useMe, useSupervisor, QueryProvider global)
 * definia su propio staleTime sin justificacion explicita ni consistencia
 * entre features:
 *  - Empresa: 1h (cambia raramente — OK)
 *  - Me: 30s (profile changes — OK)
 *  - Supervisor: 1min (live metrics — OK)
 *  - QueryProvider default: 5min (catch-all — demasiado largo para
 *    pedidos/cobros en uso activo)
 *
 * Ahora: matriz documentada en un solo lugar. Cambios de politica tocan
 * un solo archivo en lugar de N hooks.
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.empresa(), queryFn: ..., staleTime: STALE_TIMES.empresa });
 */

export const STALE_TIMES = {
  /** Empresa/tenant config — cambia raramente (admin via web). */
  empresa: 60 * 60 * 1000, // 1h

  /** Catalogos read-only (zonas, categorias, familias). Admin web los actualiza. */
  catalogos: 30 * 60 * 1000, // 30min

  /** Pedidos — uso activo del vendedor, live. */
  pedidos: 60 * 1000, // 1min

  /** Cobros — user-visible inmediatamente despues de crear. */
  cobros: 30 * 1000, // 30s

  /** Profile del usuario logueado (avatar, nombre, rol). */
  me: 30 * 1000, // 30s

  /** Supervisor metrics (live dashboard equipo). */
  supervisor: 60 * 1000, // 1min

  /** Dashboard metrics (home). */
  dashboard: 2 * 60 * 1000, // 2min

  /** Inventario — cambia con cada venta. Live pero no critico para UI. */
  inventario: 30 * 1000, // 30s

  /** Pricing (descuentos, promociones). Tipicamente diario. */
  pricing: 5 * 60 * 1000, // 5min

  /** Notificaciones — push SignalR las invalida cuando llegan. */
  notificaciones: 5 * 60 * 1000, // 5min

  /** Sync counts (pendings, attachments). Reactivos a WDB observables. */
  sync: 10 * 1000, // 10s

  /** Default catch-all. Conservador para data sin politica explicita. */
  default: 60 * 1000, // 1min
} as const;

/**
 * gcTime (antes cacheTime en v4): cuanto tiempo mantener en memoria post-
 * unmount antes de garbage-collect. Default TanStack es 5min, usualmente OK.
 * Para catalogos largos los queremos mas tiempo en cache.
 */
export const GC_TIMES = {
  catalogos: 60 * 60 * 1000, // 1h - eviten re-fetch al cambiar de pantalla
  empresa: 60 * 60 * 1000, // 1h
  default: 5 * 60 * 1000, // 5min - TanStack default
} as const;
