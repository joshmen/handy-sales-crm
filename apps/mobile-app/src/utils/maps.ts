/**
 * Detecta si Google Maps está configurado para este build.
 *
 * react-native-maps usa la API key inyectada al APK nativo via
 * `app.config.ts:android.config.googleMaps.apiKey` (build-time). Esa key
 * proviene de `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` en EAS Build.
 *
 * BUG REPORTADO admin@jeyma.com 2026-05-04: este check leía
 * `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` desde el JS bundle. En EAS
 * Dashboard, la env var está marcada como **secret** — las secrets NO se
 * inlinean al JS bundle de OTA updates (sí al APK build). Por eso el APK
 * tenía la key (mapas nativos funcionaban) pero el JS check fallaba →
 * pantallas de mapa mostraban "configurar API Google".
 *
 * Solución: trust the native build. Si el APK fue construido con la env
 * var presente, los mapas funcionan. Si no, MapView simplemente queda en
 * blanco — UX peor en ese edge case pero las pantallas de mapa no quedan
 * inutilizables tras un OTA update.
 *
 * Si en el futuro se quiere recuperar el check de runtime, cambiar la env
 * var de "secret" a "plain text" en EAS Dashboard (`eas env:create
 * --visibility plaintext`) y revertir esta función al check anterior.
 */
export function isGoogleMapsConfigured(): boolean {
  return true;
}
