'use client';

import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { EventoGpsDelDia } from '@/services/api/teamLocation';
import { useFormatters } from '@/hooks/useFormatters';

interface GpsActivityMapProps {
  eventos: EventoGpsDelDia[];
}

const COLOR_BY_TYPE: Record<string, string> = {
  visita: '#16a34a',
  pedido: '#2563eb',
  cobro: '#7c3aed',
  parada: '#f59e0b',
  checkpoint: '#94a3b8',
  inicio_ruta: '#10b981',
  fin_ruta: '#ef4444',
};

const ICON_BY_TYPE: Record<string, string> = {
  visita: '👥',
  pedido: '🛒',
  cobro: '💰',
  parada: '🛣️',
  checkpoint: '📍',
  inicio_ruta: '▶️',
  fin_ruta: '⏹️',
};

/**
 * Mapa Leaflet con polyline del recorrido del día y marcadores por tipo
 * de evento. Tile provider OpenStreetMap (gratis, sin token).
 *
 * Cargado vía dynamic import desde el componente padre para evitar SSR
 * (Leaflet manipula `window` directamente — falla en server-render).
 */
export default function GpsActivityMap({ eventos }: GpsActivityMapProps) {
  const { formatDate } = useFormatters();

  if (eventos.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-surface-3 rounded-lg text-sm text-muted-foreground">
        Sin puntos para mostrar en el mapa.
      </div>
    );
  }

  // Centroide simple (promedio) — basta para encuadrar el primer load.
  // Después fitBounds del polyline será más preciso si se quiere.
  const center: [number, number] = [
    eventos.reduce((sum, e) => sum + e.latitud, 0) / eventos.length,
    eventos.reduce((sum, e) => sum + e.longitud, 0) / eventos.length,
  ];

  const polylinePoints: [number, number][] = eventos.map(e => [e.latitud, e.longitud]);

  return (
    <div className="h-96 rounded-lg overflow-hidden border border-border-subtle">
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline positions={polylinePoints} pathOptions={{ color: '#3b82f6', weight: 3, opacity: 0.7 }} />
        {eventos.map((ev, i) => {
          const color = COLOR_BY_TYPE[ev.tipo] ?? '#94a3b8';
          const icon = ICON_BY_TYPE[ev.tipo] ?? '📍';
          const hora = formatDate(ev.cuando, { hour: '2-digit', minute: '2-digit' });
          return (
            <CircleMarker
              key={`${ev.tipo}-${ev.referenciaId ?? 'np'}-${i}`}
              center={[ev.latitud, ev.longitud]}
              radius={8}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.8 }}
            >
              <Tooltip>
                <div className="text-xs">
                  <div className="font-semibold">{icon} {hora}</div>
                  <div className="text-muted-foreground capitalize">{ev.tipo.replace('_', ' ')}</div>
                  {ev.clienteNombre && <div>{ev.clienteNombre}</div>}
                </div>
              </Tooltip>
              <Popup>
                <div className="text-xs space-y-1">
                  <div className="font-semibold">{icon} {hora}</div>
                  <div className="capitalize">{ev.tipo.replace('_', ' ')}</div>
                  {ev.clienteNombre && <div>Cliente: {ev.clienteNombre}</div>}
                  <div className="font-mono text-muted-foreground">
                    {ev.latitud.toFixed(5)}, {ev.longitud.toFixed(5)}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
