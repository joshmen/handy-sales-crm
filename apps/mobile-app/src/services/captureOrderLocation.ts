import * as Location from 'expo-location';

export type LocationSource = 'device-fresh' | 'device-lastKnown' | 'cliente';

export interface CapturedLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
}

/** Timeout del intento de GPS fresco (5s — UX no debe bloquear más). */
const FRESH_GPS_TIMEOUT_MS = 5_000;

/** Edad máxima aceptable del lastKnown del OS (30 min — vendedor estuvo en zona). */
const LAST_KNOWN_MAX_AGE_MS = 30 * 60 * 1000;

/** Precisión requerida del lastKnown (100m — alineado con el ejemplo
 *  oficial de expo-location SDK 54; 200m sería demasiado laxo y plotear
 *  un pedido a 200m del cliente real es esencialmente ruido). */
const LAST_KNOWN_REQUIRED_ACCURACY_M = 100;

/**
 * Cascada de fallbacks para capturar GPS al crear pedido. Diseñada
 * offline-friendly: ninguno de estos pasos requiere red.
 *
 * Orden:
 *  1. **Device GPS fresco** — `getCurrentPositionAsync` con timeout 5s.
 *     Funciona si el vendedor tiene GPS activo y signal del satélite
 *     (incluso sin red — GPS es independiente del cell tower).
 *  2. **Last known del OS** — `getLastKnownPositionAsync`. Cache nativo
 *     mantenido por Android/iOS hasta ~30 min después del último fix.
 *     Funciona offline 100%.
 *  3. **Cliente coords** — si el cliente seleccionado tiene
 *     `latitud`/`longitud` (admin las configuró previamente). El
 *     vendedor está creando pedido para ESE cliente, así que asumimos
 *     que está cerca de él.
 *  4. **null** — todos los fallbacks fallaron. Permite crear el pedido
 *     sin coords (no bloquear ventas en zonas sin signal/GPS).
 *
 * El consumidor (`createPedidoOffline`) decide UX cuando el resultado
 * es null (Toast informativo "pedido sin ubicación GPS").
 *
 * NO lanza excepciones — siempre retorna un objeto o null.
 */
export async function captureOrderLocation(
  cliente: { latitud?: number | null; longitud?: number | null }
): Promise<CapturedLocation | null> {
  // 1. Device GPS fresco — accuracy=Balanced reduce drain de batería sin
  //    sacrificar mucho. Promise.race para timeout custom (la API nativa
  //    de expo-location no expone timeout en getCurrentPositionAsync).
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      const fresh = await Promise.race<Location.LocationObject | null>([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<null>(resolve => setTimeout(() => resolve(null), FRESH_GPS_TIMEOUT_MS)),
      ]);
      if (fresh && fresh.coords) {
        return {
          latitude: fresh.coords.latitude,
          longitude: fresh.coords.longitude,
          source: 'device-fresh',
        };
      }
    }
  } catch {
    // permiso denegado / GPS hardware off / etc — sigue al fallback
  }

  // 2. Last known cacheado por OS (no requiere red ni signal nuevo).
  try {
    const last = await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
      requiredAccuracy: LAST_KNOWN_REQUIRED_ACCURACY_M,
    });
    if (last && last.coords) {
      return {
        latitude: last.coords.latitude,
        longitude: last.coords.longitude,
        source: 'device-lastKnown',
      };
    }
  } catch {
    // sigue al cliente fallback
  }

  // 3. Cliente coords — el cliente tiene una ubicación conocida; si el
  //    vendedor le está creando pedido, está físicamente cerca de él.
  if (cliente.latitud != null && cliente.longitud != null) {
    return {
      latitude: cliente.latitud,
      longitude: cliente.longitud,
      source: 'cliente',
    };
  }

  // 4. null — pedido se crea sin coords (NO bloquear ventas en zonas
  //    sin signal). El consumidor muestra Toast informativo.
  return null;
}
