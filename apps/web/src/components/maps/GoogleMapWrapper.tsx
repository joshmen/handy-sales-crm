'use client';

import React, { useCallback, useState } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  InfoWindow,
  Circle,
} from '@react-google-maps/api';

export { Circle };
import { Loader2 } from 'lucide-react';

const DEFAULT_CENTER = { lat: 20.6597, lng: -103.3496 }; // Guadalajara, México
const DEFAULT_ZOOM = 12;

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  label?: string;
  title?: string;
  color?: string;
  info?: React.ReactNode;
}

interface GoogleMapWrapperProps {
  markers?: MapMarker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  children?: React.ReactNode;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

const PIN_COLORS: Record<string, string> = {
  green: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
  red: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
  blue: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
  yellow: 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
  purple: 'https://maps.google.com/mapfiles/ms/icons/purple-dot.png',
  orange: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
};

export function GoogleMapWrapper({
  markers = [],
  center,
  zoom = DEFAULT_ZOOM,
  height = '400px',
  onMarkerClick,
  children,
}: GoogleMapWrapperProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'] as ('places')[],
  });

  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [_map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend({ lat: m.lat, lng: m.lng }));
      map.fitBounds(bounds, 50);
    }
  }, [markers]);

  const onUnmount = useCallback(() => {
    setMap(void 0 as unknown as null);
  }, []);

  const mapCenter = center || (markers.length === 1
    ? { lat: markers[0].lat, lng: markers[0].lng }
    : DEFAULT_CENTER);

  if (loadError) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <p className="text-sm text-red-500">Error al cargar Google Maps. Verifica tu API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Cargando mapa...</span>
      </div>
    );
  }

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <p className="text-sm text-gray-500">
          Google Maps no configurado. Agrega <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en .env.local
        </p>
      </div>
    );
  }

  return (
    <div style={{ height }} className="rounded-lg overflow-hidden border border-gray-200">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapCenter}
        zoom={markers.length > 1 ? undefined : zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          zoomControl: true,
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            title={marker.title || marker.label}
            icon={marker.color && PIN_COLORS[marker.color] ? PIN_COLORS[marker.color] : undefined}
            onClick={() => {
              setSelectedMarker(marker);
              onMarkerClick?.(marker);
            }}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="text-sm">
              {selectedMarker.info || (
                <p className="font-medium">{selectedMarker.title || selectedMarker.label}</p>
              )}
            </div>
          </InfoWindow>
        )}

        {children}
      </GoogleMap>
    </div>
  );
}
