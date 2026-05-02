'use client';

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import type { EventoGpsDelDia } from '@/services/api/teamLocation';
import { useFormatters } from '@/hooks/useFormatters';

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

const ICON_BY_TYPE: Record<string, string> = {
  visita: '👥',
  pedido: '🛒',
  cobro: '💰',
  parada: '🛣️',
  checkpoint: '📍',
  inicio_ruta: '▶️',
  fin_ruta: '⏹️',
  inicio_jornada: '🟢',
  fin_jornada: '🔴',
  stop_automatico: '🌙',
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
 * Mapa Leaflet con polyline del recorrido del día y marcadores por tipo
 * de evento. Tile provider OpenStreetMap (gratis, sin token).
 *
 * Cargado vía dynamic import desde el componente padre para evitar SSR
 * (Leaflet manipula `window` directamente — falla en server-render).
 */
export default function GpsActivityMap({
  eventos,
  visibleTypes,
  fullHeight = false,
  showSequenceNumbers = false,
}: GpsActivityMapProps) {
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
        <Polyline positions={polylinePoints} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }} />
        {eventosVisibles.map((ev, i) => {
          const color = COLOR_BY_TYPE[ev.tipo] ?? '#94a3b8';
          const icon = ICON_BY_TYPE[ev.tipo] ?? '📍';
          const hora = formatDate(ev.cuando, { hour: '2-digit', minute: '2-digit' });
          const tieneRef = ev.referenciaId != null && (ev.tipo === 'pedido' || ev.tipo === 'cobro');
          const refLabel = ev.tipo === 'pedido' ? 'Pedido' : 'Cobro';
          const refHref = ev.tipo === 'pedido' ? `/orders/${ev.referenciaId}` : `/cobranza/${ev.referenciaId}`;
          return (
            <CircleMarker
              key={`${ev.tipo}-${ev.referenciaId ?? 'np'}-${i}`}
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
                <div className="text-xs space-y-0.5">
                  <div className="font-semibold">{icon} #{i + 1} · {hora}</div>
                  <div className="text-muted-foreground capitalize">{ev.tipo.replace(/_/g, ' ')}</div>
                  {ev.clienteNombre && <div>{ev.clienteNombre}</div>}
                  {tieneRef && (
                    <div className="text-muted-foreground/70">{refLabel} #{ev.referenciaId}</div>
                  )}
                </div>
              </Tooltip>
              <Popup minWidth={180}>
                <div className="text-xs space-y-1.5 min-w-[160px]">
                  <div className="font-semibold text-slate-800">{icon} #{i + 1} · {hora}</div>
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
}
