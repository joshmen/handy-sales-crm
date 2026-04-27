# Google Maps API Key — Setup para mobile

> **Por qué**: las pantallas de mapas (`/(tabs)/mapa`, `/(tabs)/equipo/mapa`,
> mini-map en `/(tabs)/ruta`) usan `react-native-maps` que en Android requiere
> Google Maps API key en build time. Sin la key, MapView crashea silenciosamente
> al renderizar el primer tile y la app cierra. Reportado 2026-04-27.
>
> **Mitigación temporal** (commit `<este>`): si la key no está configurada, las
> pantallas muestran un placeholder con instrucciones en vez de crashear. La
> funcionalidad de mapas queda inhabilitada hasta que se configure la key.

## Pasos para obtener la API key

### 1. Crear proyecto en Google Cloud (si no existe)
- https://console.cloud.google.com → seleccionar/crear proyecto.

### 2. Habilitar APIs requeridas
- **APIs & Services → Library** → habilitar:
  - **Maps SDK for Android**
  - **Maps SDK for iOS** (si usarás iOS también)

### 3. Crear API key
- **APIs & Services → Credentials** → **Create Credentials** → **API Key**.
- Copiar la key generada (formato `AIzaSy...`).

### 4. Restringir la key (CRÍTICO — sin esto cualquiera puede usarla)

**Application restrictions**:
- **Android apps**:
  - Package name: `com.handysuites.app`
  - SHA-1 fingerprint:
    ```bash
    # Para builds EAS, el fingerprint es del keystore de Expo. Obtenerlo con:
    cd apps/mobile-app
    npx eas credentials
    # Seleccionar Android → preview/production → ver SHA1 fingerprint
    ```
- **iOS apps**:
  - Bundle ID: `com.handysuites.app`

**API restrictions**:
- Restringir a "Maps SDK for Android" + "Maps SDK for iOS" únicamente.
  Sin esto la key puede usarse para Geocoding/Places y se cobra.

### 5. Configurar la key — usar EAS Secrets (NUNCA commitear)

La key NO debe estar en `eas.json` porque ese archivo se commitea. Usamos **EAS Secrets**: la key se guarda en servidores de Expo, ningún commit la toca, y EAS la inyecta automáticamente al build cuando no está definida en `eas.json env`.

```bash
cd apps/mobile-app

# Crear la secret (una sola vez)
npx eas secret:create \
  --scope project \
  --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value AIzaSyXXXXX...la_key_real...

# Verificar que quedó registrada
npx eas secret:list

# Si rotaste la key y necesitas actualizarla:
npx eas secret:delete --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
npx eas secret:create --scope project \
  --name EXPO_PUBLIC_GOOGLE_MAPS_API_KEY \
  --value AIzaSy...nueva...
```

**Importante**: en `eas.json` la variable NO debe aparecer en el bloque `env`. Si aparece (aunque sea como `""`), sobrescribe la EAS Secret y vuelve a romper los mapas.

### 6. Para desarrollo local (Expo Go)

EAS Secrets solo aplican a builds de EAS. Para correr `npx expo start --go` localmente con mapas funcionales, crear `apps/mobile-app/.env.local` (gitignoreado por `.env*.local`):

```bash
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyXXXXX...la_key_real...
```

Expo lee `.env.local` automáticamente al iniciar Metro. Este archivo NO se commitea (`apps/mobile-app/.gitignore` ya lo excluye).

### 7. Rebuild APK

```bash
cd apps/mobile-app
npx eas build --platform android --profile preview
```

EAS detecta la secret + la inyecta como env var en build time. Una vez instalado el APK nuevo, las pantallas de mapas funcionan.

## Validación post-instalación

1. Abrir la app → tab **Mapa** → debe ver Google Maps con tu ubicación.
2. Si abre y muestra "Mapas no disponibles en esta versión" → la key no
   está en eas.json del profile usado para el build, o el SHA fingerprint
   del keystore no coincide con el restringido en Google Cloud.

## Costo

Google Maps SDK for Android tiene tier gratuito generoso (~28k loads/mes).
Para una app de ventas con ~50 vendedores activos, no debería exceder.
Configurar **alertas de billing** en Google Cloud para evitar sorpresas.
