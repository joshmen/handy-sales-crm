// Distancia Haversine entre 2 puntos lat/lng en metros. Radio tierra 6371000m.
// Usado offline para ordenar clientes por proximidad sin tocar el backend.

const EARTH_RADIUS_METERS = 6371000;

export interface LatLng {
  latitud: number;
  longitud: number;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.latitud);
  const lat2 = toRad(b.latitud);
  const dLat = toRad(b.latitud - a.latitud);
  const dLng = toRad(b.longitud - a.longitud);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Pre-filtro bounding-box: descarta puntos que claramente NO están en el radio
 * antes de hacer Haversine. ~10x más rápido para tablas grandes (>2000 records).
 *
 * 1° latitud ≈ 111km, 1° longitud ≈ 111km · cos(lat).
 */
export function withinBoundingBox(center: LatLng, target: LatLng, radiusMeters: number): boolean {
  const latDeg = radiusMeters / 111000;
  const lngDeg = radiusMeters / (111000 * Math.cos(toRad(center.latitud)));
  return (
    Math.abs(target.latitud - center.latitud) <= latDeg &&
    Math.abs(target.longitud - center.longitud) <= lngDeg
  );
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
