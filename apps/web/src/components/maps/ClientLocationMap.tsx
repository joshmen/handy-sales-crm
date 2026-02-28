'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  GoogleMap,
  useJsApiLoader,
  Marker as GMarker,
  Circle as GCircle,
} from '@react-google-maps/api';
import { Loader2, AlertTriangle } from 'lucide-react';

const DEFAULT_CENTER = { lat: 20.6597, lng: -103.3496 }; // Guadalajara, México
const MAPS_LIBRARIES: ('places')[] = ['places'];

export interface ZoneGeo {
  id: number;
  nombre: string;
  centroLatitud?: number | null;
  centroLongitud?: number | null;
  radioKm?: number | null;
  color?: string;
}

interface ClientLocationMapProps {
  lat: number;
  lng: number;
  onLocationChange: (lat: number, lng: number) => void;
  onOutOfZone?: (isOutside: boolean) => void;
  selectedZone?: ZoneGeo | null;
  autoGeolocate?: boolean;
  height?: number;
}

/** Haversine distance in km */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function ClientLocationMap({
  lat,
  lng,
  onLocationChange,
  onOutOfZone,
  selectedZone,
  autoGeolocate = false,
  height = 260,
}: ClientLocationMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: MAPS_LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const [markerPos, setMarkerPos] = useState<{ lat: number; lng: number }>(
    lat !== 0 || lng !== 0 ? { lat, lng } : DEFAULT_CENTER
  );
  const [hasMarker, setHasMarker] = useState(lat !== 0 || lng !== 0);
  const [isOutside, setIsOutside] = useState(false);
  const geoRequested = useRef(false);

  // Check if marker is inside zone
  const checkZoneBounds = useCallback(
    (mLat: number, mLng: number) => {
      if (
        !selectedZone?.centroLatitud ||
        !selectedZone?.centroLongitud ||
        !selectedZone?.radioKm
      ) {
        setIsOutside(false);
        onOutOfZone?.(false);
        return;
      }
      const dist = haversineKm(
        mLat,
        mLng,
        selectedZone.centroLatitud,
        selectedZone.centroLongitud
      );
      const outside = dist > selectedZone.radioKm;
      setIsOutside(outside);
      onOutOfZone?.(outside);
    },
    [selectedZone, onOutOfZone]
  );

  const moveMarkerTo = useCallback(
    (newLat: number, newLng: number) => {
      setMarkerPos({ lat: newLat, lng: newLng });
      setHasMarker(true);
      onLocationChange(newLat, newLng);
      checkZoneBounds(newLat, newLng);
    },
    [onLocationChange, checkZoneBounds]
  );

  // Sync from parent props (edit page loads client data)
  useEffect(() => {
    if (lat !== 0 || lng !== 0) {
      setMarkerPos({ lat, lng });
      setHasMarker(true);
      checkZoneBounds(lat, lng);
    }
  }, [lat, lng, checkZoneBounds]);

  // Pan to zone center when zone selection changes
  useEffect(() => {
    if (
      selectedZone?.centroLatitud &&
      selectedZone?.centroLongitud
    ) {
      const zCenter = {
        lat: selectedZone.centroLatitud,
        lng: selectedZone.centroLongitud,
      };
      mapRef.current?.panTo(zCenter);

      // Fit zoom to show the circle
      if (selectedZone.radioKm && mapRef.current) {
        const bounds = new google.maps.LatLngBounds();
        // Approximate bounds from center + radius
        const latDelta = selectedZone.radioKm / 111;
        const lngDelta = selectedZone.radioKm / (111 * Math.cos((zCenter.lat * Math.PI) / 180));
        bounds.extend({ lat: zCenter.lat + latDelta, lng: zCenter.lng + lngDelta });
        bounds.extend({ lat: zCenter.lat - latDelta, lng: zCenter.lng - lngDelta });
        // If there's a marker, include it too
        if (hasMarker) {
          bounds.extend(markerPos);
        }
        mapRef.current.fitBounds(bounds, 40);
      }

      // Re-check bounds if marker exists
      if (hasMarker) {
        checkZoneBounds(markerPos.lat, markerPos.lng);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZone?.id]);

  // Auto-geolocate on mount for new client
  useEffect(() => {
    if (!autoGeolocate || geoRequested.current) return;
    if (lat !== 0 || lng !== 0) return;
    geoRequested.current = true;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => moveMarkerTo(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { timeout: 5000 }
      );
    }
  }, [autoGeolocate, lat, lng, moveMarkerTo]);

  const handleMapDblClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        moveMarkerTo(e.latLng.lat(), e.latLng.lng());
      }
    },
    [moveMarkerTo]
  );

  const zoneHasGeo =
    selectedZone?.centroLatitud &&
    selectedZone?.centroLongitud &&
    selectedZone?.radioKm;

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <p className="text-sm text-gray-500">
          Google Maps no configurado. Agrega{' '}
          <code className="bg-gray-200 px-1 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> en
          .env.local
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <p className="text-sm text-red-500">Error al cargar Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded-lg"
        style={{ height }}
      >
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-500">Cargando mapa...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Map */}
      <div
        className={`rounded-lg overflow-hidden border ${isOutside ? 'border-red-400' : 'border-gray-200'}`}
        style={{ height }}
      >
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={markerPos}
          zoom={14}
          onLoad={(map) => {
            mapRef.current = map;
          }}
          onDblClick={handleMapDblClick}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
            zoomControl: true,
            disableDoubleClickZoom: true,
          }}
        >
          {/* Zone circle */}
          {zoneHasGeo && (
            <GCircle
              center={{
                lat: selectedZone!.centroLatitud!,
                lng: selectedZone!.centroLongitud!,
              }}
              radius={selectedZone!.radioKm! * 1000}
              options={{
                fillColor: selectedZone?.color || '#3B82F6',
                fillOpacity: 0.1,
                strokeColor: selectedZone?.color || '#3B82F6',
                strokeOpacity: 0.5,
                strokeWeight: 2,
                clickable: false,
              }}
            />
          )}

          {/* Client marker */}
          {hasMarker && (
            <GMarker
              position={markerPos}
              draggable
              onDragEnd={(e) => {
                if (e.latLng) {
                  moveMarkerTo(e.latLng.lat(), e.latLng.lng());
                }
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Status messages */}
      {isOutside ? (
        <p className="text-xs text-red-600 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          El cliente está fuera de la zona &quot;{selectedZone?.nombre}&quot;. Mueve el marcador
          dentro del área o selecciona otra zona.
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          Haz doble clic en el mapa o arrastra el marcador para ubicar al cliente.
        </p>
      )}
    </div>
  );
}
