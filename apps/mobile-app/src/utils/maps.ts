/**
 * Detecta si Google Maps está configurado correctamente para este build.
 *
 * react-native-maps requiere `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en build time
 * (lee `app.config.ts:android.config.googleMaps.apiKey`). Sin la key, MapView
 * carga pero crashea al renderizar el primer tile en Android.
 *
 * Reportado 2026-04-27: vendedor abre pantalla de mapa → app cierra silenciosa.
 *
 * Uso: las pantallas que renderizan MapView consultan este helper. Si retorna
 * false, muestran un fallback (EmptyState con instrucción) en vez de intentar
 * renderizar el mapa y crashear la app.
 *
 * Para builds con maps habilitados: setear `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
 * en `eas.json` env del profile correspondiente (preview/production), o como
 * EAS Secret. La key debe estar restringida en Google Cloud Console por
 * package name `com.handysuites.app` + SHA fingerprint del keystore.
 */
export function isGoogleMapsConfigured(): boolean {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}
