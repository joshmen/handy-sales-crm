# Validación SQLCipher on-device

Sprint correctivo 2026-06-06. Este documento es el playbook para
verificar que el encryption SQLCipher activado en commit `1213d756`
realmente funciona en EAS build native.

## Por qué este playbook existe

El cableado del passphrase (`apps/mobile-app/src/db/database.ts`) compila
y type-checks en local, pero Expo Go usa LokiJS (JS puro) y NO ejecuta
SQLCipher nativo. La única forma de validar es:

1. EAS dev/preview build.
2. APK/AAB instalado en device físico (o Android emulador con APK).
3. Pull del archivo `.db` desde el device.
4. Inspección con `sqlite3` para confirmar que NO es plaintext.

## Pasos de validación

### 1. EAS preview build

```bash
cd apps/mobile-app
npx eas build --platform android --profile preview
```

Espera ~15-25 minutos. Descarga el APK al terminar.

### 2. Instalar en device + crear sesión

```bash
adb install -r <ruta-al-apk>
adb shell am start -n com.handysuites.mobile/.MainActivity
```

Login con usuario de staging (`admin@jeyma.com` / la password de
staging). Espera el primer sync.

### 3. Pull del archivo .db

```bash
# Habilitar adb root si el device lo permite (emulador SI, device fisico NO)
adb root  # opcional
adb shell run-as com.handysuites.mobile cat databases/handysuites.db > /tmp/handysuites_extracted.db
```

Si `run-as` falla en el device físico (release build firmado con
release keystore), usar el emulador para esta validación.

### 4. Verificar que el archivo NO es plaintext

```bash
# Si es plaintext, sqlite3 abre y lista tablas
sqlite3 /tmp/handysuites_extracted.db ".tables"

# Esperado con SQLCipher activado: ERROR
# Mensaje: "Error: file is not a database" o
#          "Error: database disk image is malformed"
# Ese error CONFIRMA que el archivo esta cifrado.
```

### 5. Verificar que SI se puede abrir con la passphrase

```bash
# Obtener la passphrase del SecureStore (solo en dev/staging build).
# En un emulador con root, esta en:
adb shell run-as com.handysuites.mobile cat shared_prefs/handysuites_db_encryption_key_v1.xml

# Abrir con sqlcipher cli (instalar: brew install sqlcipher)
sqlcipher /tmp/handysuites_extracted.db
sqlite> PRAGMA key = 'hex-passphrase-aqui';
sqlite> .tables
# Debe listar: clientes, pedidos, cobros, visitas, etc.
```

### 6. Verificar tracking via crashReporter

En el dashboard de crashReporter / Seq, buscar eventos:

```
event_name: "db_encryption_status"
```

Esperado:
```json
{
  "encrypted": true,
  "reset_needed": false
}
```

Si `encrypted: false`, la passphrase no se cableo (Expo Go o SecureStore
fail). Si `reset_needed: true`, la migración plaintext→encrypted disparó
en este boot (esperado en el primer boot tras update; bug si se repite).

## Tests xUnit del key generation (server-side)

El archivo `apps/mobile-app/src/db/dbEncryptionKey.ts` NO tiene tests
xUnit (es código JS, vive en el RN runtime). Lo testeable es:

1. **Format de la key**: 64 chars hex (32 bytes random).
2. **Idempotencia**: llamadas subsecuentes retornan la misma key.
3. **Persistencia**: tras app restart, recupera la key del SecureStore.

Esto se prueba via Jest tests en el mobile-app. Como tampoco tenemos
fixture de SecureStore mockeado, sugerencia: agregar test al backlog
mobile sprint cuando se haga la migration a unit-tested storage layer.

## Bloqueadores conocidos

- **Expo Go no funciona**: el adapter SQLite no se carga, cae al LokiJS
  fallback. Verificación SOLO en EAS build.
- **Production keystore + run-as bloqueado**: en device físico con APK
  firmado de prod, `adb run-as` no funciona. Usar emulador con preview
  build para validación. Alternativa: agregar endpoint `/debug/db-stat`
  protegido por flag dev-only que retorne `isDatabaseEncrypted`.
- **Migration plaintext→encrypted destruye data offline**: si un
  vendedor tenía pedidos pendientes de sync en build pre-SQLCipher, al
  actualizar al build con SQLCipher se hace `unsafeResetDatabase()` y
  los pedidos se pierden. Mitigación: forzar sync ANTES del rollout del
  build con SQLCipher.

## Estado actual

- ✅ Código cableado (`database.ts`, `_layout.tsx`, `dbEncryptionKey.ts`)
- ✅ Type-check + tsc clean
- ✅ Tracking event `db_encryption_status` agregado al boot
- ⏳ **PENDIENTE**: EAS preview build + validación on-device
- ⏳ **PENDIENTE**: documentar resultado de la inspección sqlcipher
