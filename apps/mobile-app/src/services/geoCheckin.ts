import * as Location from 'expo-location';

const MAX_CHECKIN_DISTANCE_METERS = 200;

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface CheckInResult {
  coords: Coordinates;
  distance: number;
  withinGeofence: boolean;
  timestamp: Date;
}

export async function getCurrentPosition(): Promise<Coordinates> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
}

export async function performCheckIn(
  clientCoords: Coordinates
): Promise<CheckInResult> {
  const currentPos = await getCurrentPosition();
  const distance = haversineDistance(currentPos, clientCoords);
  const withinGeofence = distance <= MAX_CHECKIN_DISTANCE_METERS;

  return {
    coords: currentPos,
    distance: Math.round(distance),
    withinGeofence,
    timestamp: new Date(),
  };
}

export function haversineDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) *
      Math.cos(toRadians(point2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export async function watchPosition(
  callback: (coords: Coordinates) => void,
  intervalMs = 10000
): Promise<Location.LocationSubscription> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permiso de ubicación denegado');
  }

  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: intervalMs,
      distanceInterval: 20, // Minimum 20m movement
    },
    (location) => {
      callback({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  );
}
