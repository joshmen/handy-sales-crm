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

### 5. Pegar la key en `eas.json`

Editar `apps/mobile-app/eas.json` y reemplazar `""` con la key real en los
profiles `preview` y `production`:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "AIzaSyXXXXX..."
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_GOOGLE_MAPS_API_KEY": "AIzaSyXXXXX..."
      }
    }
  }
}
```

> **Alternativa más segura**: usar **EAS Secrets** en vez de hardcodear en
> eas.json (que se commitea). Setear vía `npx eas secret:create --name
> EXPO_PUBLIC_GOOGLE_MAPS_API_KEY --value AIzaSy...` y referenciar desde
> eas.json. La key restringida ya es segura porque no funciona fuera del
> package + SHA, pero igual es buena práctica no commitear secretos.

### 6. Rebuild APK

```bash
cd apps/mobile-app
npx eas build --platform android --profile preview
```

Una vez instalado el APK nuevo, las pantallas de mapas funcionan.

## Validación post-instalación

1. Abrir la app → tab **Mapa** → debe ver Google Maps con tu ubicación.
2. Si abre y muestra "Mapas no disponibles en esta versión" → la key no
   está en eas.json del profile usado para el build, o el SHA fingerprint
   del keystore no coincide con el restringido en Google Cloud.

## Costo

Google Maps SDK for Android tiene tier gratuito generoso (~28k loads/mes).
Para una app de ventas con ~50 vendedores activos, no debería exceder.
Configurar **alertas de billing** en Google Cloud para evitar sorpresas.
