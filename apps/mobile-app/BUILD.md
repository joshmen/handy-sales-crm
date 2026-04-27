# HandySuites Mobile — Build & Release Guide

## Profiles configurados (`eas.json`)

| Profile | Apunta a | Output | Cuándo usar |
|---|---|---|---|
| `development` | local Docker (`10.0.2.2`) | dev client | Solo Expo Go local con Metro |
| `preview` | **STAGING** Railway | APK instalable | QA interno antes de production |
| `production` | **PRODUCTION** Railway | AAB (Play Store bundle) | Release real al Play Store |

**Único entry point por profile** — la app NO permite override en runtime; la URL queda compilada en el binary. Esto evita que un usuario apunte una build de production a staging por error.

## Comandos

### Build de producción (App Bundle .aab para Play Store)

```bash
cd apps/mobile-app
npx eas build --platform android --profile production
```

- **Apunta a**: `https://mobile-api-production-f934.up.railway.app` + `https://main-api-production-7566.up.railway.app`
- **Output**: `.aab` (Android App Bundle) — el formato que Play Store requiere
- **Build se hace en servidores EAS**: no necesitas Android Studio local. Tarda ~15-25 min.
- **Al terminar**: EAS te da una URL de descarga del `.aab` + opción de submit directo al Play Console.

### Build APK preview (instalable directo, apunta a STAGING)

```bash
cd apps/mobile-app
npx eas build --platform android --profile preview
```

- **Apunta a**: STAGING (no producción) — para QA seguro sin tocar datos reales
- **Output**: `.apk` instalable directo en cualquier dispositivo Android sin Play Store
- **Comparte la URL del APK** con QA team

### iOS (cuando tengas Apple Developer account)

```bash
npx eas build --platform ios --profile production
```

## Pre-requisitos para el primer build

1. **EAS CLI autenticado**:
   ```bash
   npx eas whoami
   # Si no estás: npx eas login
   ```

2. **Sin cambios sin commit** (`requireCommit: true` en `eas.json`):
   ```bash
   git status  # debe estar limpio
   ```

3. **`expo-secure-store` y `expo-crypto` ya están en `package.json`** — usados por `dbEncryptionKey.ts` (SEC-M1). Cuando se haga el primer build native con SQLCipher, se cablea con `passphrase: await getOrCreateDbEncryptionKey()`.

## Submit al Play Store

```bash
npx eas submit --platform android --profile production
```

Requiere:
- Cuenta Google Play Developer ($25 USD una vez)
- Service account JSON configurado en `eas.json` `submit.production.android.serviceAccountKeyPath`
- App ya creada en Play Console con el package `com.handysuites.app`

## Verificación post-build

Cuando se instale la APK/AAB de producción, hacer login con un usuario real y validar:

- [ ] La pantalla de splash carga
- [ ] Login con usuario producción funciona (xjoshmenx@gmail.com SUPER_ADMIN)
- [ ] El JWT recibido tiene claim `role: "SUPER_ADMIN"` (NO `es_admin`/`es_super_admin` — refactor abril 2026)
- [ ] Sync inicial trae datos reales del tenant de producción
- [ ] Crear un cliente offline → reaparece tras pull-to-refresh
- [ ] Push notifications llegan (requiere Expo push tokens setup)

## URLs de Production (confirmadas 2026-04-26)

| Servicio | URL |
|---|---|
| Main API | `https://main-api-production-7566.up.railway.app` |
| Mobile API | `https://mobile-api-production-f934.up.railway.app` |
| Billing API | _(pendiente — agregar cuando esté en Railway prod)_ |

## URLs de Staging (verificadas 2026-04-26)

| Servicio | URL | Estado |
|---|---|---|
| Mobile API staging | `https://mobile-api-staging.up.railway.app` | ✅ HTTP 200 |
| Main API staging | _(no deployed)_ | ⚠️ no existe servicio |

**Nota**: Railway staging solo tiene Mobile API. El profile `preview` apunta:
- Mobile API → staging (DB staging, datos de prueba)
- Main API → **production** (no hay alternativa)

Esto significa que en preview build, las funciones de SignalR notifications + endpoints exclusivos de Main API **tocan producción**. Si se quiere aislamiento total staging, deployar un servicio Main API staging en Railway y actualizar `EXPO_PUBLIC_MAIN_API_URL` del profile `preview`.

## Bloqueado / Pending para futuras builds

- **SEC-M1 SQLCipher**: el helper `src/db/dbEncryptionKey.ts` genera la clave AES-256 y la guarda en Keystore/Keychain, pero falta cablear `passphrase` al adapter SQLite. Requiere refactor del database init a async (expo-secure-store no tiene API síncrona).
- **SEC-M2 cert pinning**: TODO en `src/api/client.ts:13`.
- **Crash reports auth**: hoy es anónimo (`AllowAnonymous`). Cambiar a `RequireAuthorization()` cuando se recompile el APK; los crashes pre-login se encolan en AsyncStorage.
