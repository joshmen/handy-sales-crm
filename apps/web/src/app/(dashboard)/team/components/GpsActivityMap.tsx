'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin, ShoppingCart, Wallet, Users, Play, StopCircle, Moon,
  Navigation, Flag, MapPinned, Radar,
  type LucideIcon,
} from 'lucide-react';
import type { EventoGpsDelDia } from '@/services/api/teamLocation';
import { useFormatters } from '@/hooks/useFormatters';

export interface GpsActivityMapHandle {
  /** Pan + zoom + abre el popup del marker correspondiente al índice del evento. */
  focusEvent: (index: number) => void;
}

interface GpsActivityMapProps {
  eventos: EventoGpsDelDia[];
  /** Si se pasa, oculta marcadores cuyo tipo no esté en el set. Default: todos visibles. */
  visibleTypes?: Set<string>;
  /** Si true, usa altura completa del contenedor padre (para layout split). Default false (h-96). */
  fullHeight?: boolean;
  /** Si true, agrega tooltip permanente con el número de secuencia cronológica. */
  showSequenceNumbers?: boolean;
}

const COLOR_BY_TYPE: Record<string, string> = {
  visita: '#16a34a',
  pedido: '#2563eb',
  cobro: '#7c3aed',
  parada: '#f59e0b',
  checkpoint: '#94a3b8',
  inicio_ruta: '#10b981',
  fin_ruta: '#ef4444',
  inicio_jornada: '#22c55e',
  fin_jornada: '#dc2626',
  stop_automatico: '#64748b',
};

// Lucide icons por tipo — reemplazó el map de emoji previo. Mantengo
// el mismo set de tipos que en page.tsx para consistencia visual.
const ICON_BY_TYPE: Record<string, LucideIcon> = {
  visita: Users,
  pedido: ShoppingCart,
  cobro: Wallet,
  parada: MapPin,
  checkpoint: MapPinned,
  inicio_ruta: Navigation,
  fin_ruta: Flag,
  inicio_jornada: Play,
  fin_jornada: StopCircle,
  stop_automatico: Moon,
  tracking: Radar,
};

/**
 * Componente interno que reencuadra el mapa cuando cambian los puntos.
 * `MapContainer` solo lee `center/zoom` en mount inicial — al filtrar por
 * tipo o cambiar preset Hoy/Ayer/7d, sin esto el mapa se queda mostrando
 * la zona vieja. Reportado por context7 (react-leaflet 5).
 */
function FitBoundsOnChange({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
  }, [points, map]);
  return null;
}

/**
 * Helper interno que expone via ref un handle imperativo para focar un
 * evento desde el componente padre (botón "Ver en mapa" del timeline).
 * Necesita estar DENTRO del MapContainer para acceder al `useMap()`.
 */
function MapImperativeBridge({
  handleRef,
  eventos,
  markerRefs,
}: {
  handleRef: React.MutableRefObject<GpsActivityMapHandle | null>;
  eventos: EventoGpsDelDia[];
  markerRefs: React.MutableRefObject<Array<L.CircleMarker | null>>;
}) {
  const map = useMap();
  // Hotfix prod: el setTimeout(..., 750) sin cleanup causaba crash
  // "Cannot read properties of undefined (reading '_leaflet_pos')" cuando
  // el usuario navegaba dentro de la ventana de animación. Guardamos el
  // timeout id para limpiar en unmount.
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    handleRef.current = {
      focusEvent: (index: number) => {
        const ev = eventos[index];
        if (!ev) return;
        map.flyTo([ev.latitud, ev.longitud], 17, { duration: 0.7 });
        // Cancelar timeout pendiente si el user dispara focusEvent múltiples
        // veces antes de que el primero cumpla.
        if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = setTimeout(() => {
          const marker = markerRefs.current[index];
          // Defense-in-depth: verificar que el marker exista Y tenga
          // _leaflet_pos (i.e., sigue agregado al map). Sin esto Leaflet
          // crashea durante la zoom transition end.
          if (marker && (marker as unknown as { _leaflet_pos?: unknown })._leaflet_pos) {
            try {
              marker.openPopup();
            } catch {
              // El marker puede haber sido destruido entre el check y el
              // call (race muy improbable pero defensa total).
            }
          }
        }, 750);
      },
    };
    return () => {
      handleRef.current = null;
      // Crítico: si el componente desmonta dentro de la ventana de 750ms,
      // limpiar el timeout — sino dispara sobre marker destroyed → crash.
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
        popupTimeoutRef.current = null;
      }
    };
  }, [map, eventos, markerRefs, handleRef]);
  return null;
}

/**
 * Mapa Leaflet con polyline del recorrido del día y marcadores por tipo
 * de evento. Tile provider OpenStreetMap (gratis, sin token).
 *
 * Cargado vía dynamic import desde el componente padre para evitar SSR
 * (Leaflet manipula `window` directamente — falla en server-render).
 *
 * Expone via ref un handle `focusEvent(index)` que el timeline usa para
 * panear+abrir popup cuando el user clickea "Ver en mapa".
 */
const GpsActivityMap = forwardRef<GpsActivityMapHandle, GpsActivityMapProps>(function GpsActivityMap(
  { eventos, visibleTypes, fullHeight = false, showSequenceNumbers = false },
  ref,
) {
  const { formatDate } = useFormatters();

  // Filtramos por tipo visible (si el padre lo pasa). El polyline también
  // se construye sólo con los eventos visibles para que la línea siga el
  // recorrido filtrado.
  const eventosVisibles = useMemo(
    () => visibleTypes ? eventos.filter(e => visibleTypes.has(e.tipo)) : eventos,
    [eventos, visibleTypes],
  );

  const polylinePoints = useMemo<[number, number][]>(
    () => eventosVisibles.map(e => [e.latitud, e.longitud]),
    [eventosVisibles],
  );

  // Refs por marker para poder abrir popup imperativamente.
  const markerRefs = useRef<Array<L.CircleMarker | null>>([]);
  // Bridge expone el handle al padre via forwardRef.
  const handleRef = useRef<GpsActivityMapHandle | null>(null);
  useImperativeHandle(
    ref,
    () => ({
      focusEvent: (index: number) => handleRef.current?.focusEvent(index),
    }),
    [],
  );

  // Reset markerRefs cuando cambia la lista — evita refs stale a markers
  // que ya no existen tras filtrar.
  useEffect(() => {
    markerRefs.current = markerRefs.current.slice(0, eventosVisibles.length);
  }, [eventosVisibles.length]);

  if (eventosVisibles.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-surface-3 rounded-lg text-center px-6 ${fullHeight ? 'h-full' : 'h-64'}`}>
        <MapPin className="w-10 h-10 text-muted-foreground/30" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-muted-foreground">Sin ubicaciones para este período</p>
          <p className="text-[11px] text-muted-foreground/60 mt-0.5">
            Activa más tipos de evento o cambia el rango de fecha
          </p>
        </div>
      </div>
    );
  }

  // Centro inicial — el FitBoundsOnChange ajusta después al rango real.
  const initialCenter: [number, number] = [
    eventosVisibles[0].latitud,
    eventosVisibles[0].longitud,
  ];

  return (
    <div className={`rounded-lg overflow-hidden border border-border-subtle ${fullHeight ? 'h-full' : 'h-96'}`}>
      <MapContainer center={initialCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBoundsOnChange points={polylinePoints} />
        <MapImperativeBridge handleRef={handleRef} eventos={eventosVisibles} markerRefs={markerRefs} />
        <Polyline positions={polylinePoints} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }} />
        {eventosVisibles.map((ev, i) => {
          const color = COLOR_BY_TYPE[ev.tipo] ?? '#94a3b8';
          const Icon = ICON_BY_TYPE[ev.tipo] ?? MapPin;
          const hora = formatDate(ev.cuando, { hour: '2-digit', minute: '2-digit' });
          const tieneRef = ev.referenciaId != null && (ev.tipo === 'pedido' || ev.tipo === 'cobro');
          const refLabel = ev.tipo === 'pedido' ? 'Pedido' : 'Cobro';
          const refHref = ev.tipo === 'pedido' ? `/orders/${ev.referenciaId}` : `/cobranza/${ev.referenciaId}`;
          return (
            <CircleMarker
              key={`${ev.tipo}-${ev.referenciaId ?? 'np'}-${i}`}
              ref={(el) => {
                markerRefs.current[i] = (el as unknown as L.CircleMarker | null);
              }}
              center={[ev.latitud, ev.longitud]}
              radius={showSequenceNumbers ? 12 : 8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
            >
              {showSequenceNumbers && (
                <Tooltip permanent direction="center" offset={[0, 0]} className="!bg-transparent !border-0 !shadow-none">
                  <span className="text-[10px] font-bold text-white">{i + 1}</span>
                </Tooltip>
              )}
              <Tooltip>
                <div className="text-xs space-y-0.5 min-w-[140px]">
                  <div className="font-semibold flex items-center gap-1">
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    #{i + 1} · {hora}
                  </div>
                  <div className="text-muted-foreground capitalize">{ev.tipo.replace(/_/g, ' ')}</div>
                  {ev.clienteNombre && <div className="font-medium">{ev.clienteNombre}</div>}
                  {tieneRef && (
                    <div className="text-muted-foreground/70">{refLabel} #{ev.referenciaId}</div>
                  )}
                  {tieneRef && (
                    <div className="text-blue-600 text-[10px] mt-1">Click para abrir detalles →</div>
                  )}
                </div>
              </Tooltip>
              <Popup minWidth={180}>
                <div className="text-xs space-y-1.5 min-w-[160px]">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    #{i + 1} · {hora}
                  </div>
                  <div className="capitalize text-slate-500">{ev.tipo.replace(/_/g, ' ')}</div>
                  {ev.clienteNombre && (
                    <div className="font-medium text-slate-700">{ev.clienteNombre}</div>
                  )}
                  <div className="font-mono text-slate-400 text-[10px]">
                    {ev.latitud.toFixed(5)}, {ev.longitud.toFixed(5)}
                  </div>
                  {ev.distanciaCliente != null && (
                    <div className="text-slate-400 text-[10px]">
                      A {Math.round(ev.distanciaCliente)} m del cliente
                    </div>
                  )}
                  {tieneRef && (
                    <div className="pt-1 border-t border-slate-200">
                      <a
                        href={refHref}
                        className="inline-flex items-center gap-1 text-blue-600 font-medium hover:underline"
                      >
                        Ver {refLabel.toLowerCase()} #{ev.referenciaId}
                        <span aria-hidden>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
});

export default GpsActivityMap;
