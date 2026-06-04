// SEC-M1 — SQLCipher encryption for WatermelonDB (parcial: 2026-04-26)
//
// Estado actual: la clave AES-256 ya se genera y guarda en Keystore/Keychain
// (`src/db/dbEncryptionKey.ts`). El cableado al adapter requiere refactor del
// bootstrap a async porque expo-secure-store NO tiene API síncrona.
//
// Pasos restantes para activar SQLCipher en producción:
//   1. EAS build (`eas build --platform android --profile preview`). Expo Go usa
//      LokiJS (JS puro, sin encryption nativa) — SOLO el APK/AAB nativo soporta
//      SQLCipher.
//   2. Agregar plugin SQLCipher al `app.json`:
//        "plugins": ["@nozbe/watermelondb/plugin"]
//      (o el equivalente de WatermelonDB v0.27 que linkea SQLCipher).
//   3. Refactor `_layout.tsx` para `await initDatabase()` antes de renderizar
//      el Stack root, y exportar `database` desde un Promise/Context.
//   4. En el adapter SQLite, pasar `passphrase: await getOrCreateDbEncryptionKey()`.
//   5. Migración one-shot: detectar DB plaintext en primer launch post-update y
//      re-encrypt. WatermelonDB no soporta esto out-of-the-box; mejor hacer
//      `unsafeResetDatabase()` y forzar full sync (acepta perder cambios offline
//      pendientes; documentar al usuario).
// Priority: CRITICAL — customer data (names, orders, prices) stored unencrypted
// on device. Bloqueador hoy: requiere EAS build (sale del flow Expo Go).

import { Database } from '@nozbe/watermelondb';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAsync, getInfoAsync } from 'expo-file-system';
import { schema } from './schema';
import { migrations } from './migrations';
import { modelClasses } from './models';

const isExpoGo = Constants.appOwnership === 'expo';

// Expo Go: LokiJS (no native modules). APK/EAS: SQLiteAdapter (native, fast).
const adapter = isExpoGo
  ? new (require('@nozbe/watermelondb/adapters/lokijs').default)({
      schema,
      migrations,
      useWebWorker: false,
      useIncrementalIndexedDB: true,
    })
  : new (require('@nozbe/watermelondb/adapters/sqlite').default)({
      schema,
      migrations,
      dbName: 'handysuites',
      jsi: true,
      // passphrase: ... ← cablear acá tras refactor async (ver TODO arriba)
    });


export const database = new Database({
  adapter,
  modelClasses,
});

/**
 * C.2 hardening (fix prod 2026-06-04 post-incidente Rodrigo):
 * Reset atomico de TODO el estado persistente del cliente, NO solo WDB.
 *
 * El reset debe limpiar:
 *  - WDB (`unsafeResetDatabase`): tablas pedidos/cobros/visitas/clientes/
 *    productos/attachments/ubicaciones_vendedor/etc.
 *  - syncCursors (AsyncStorage `@hs:cursor:*`): `lastPulledAt` referencia
 *    rows que ya no existen. Sin esto, el primer pull post-wipe seria
 *    incremental vacio en vez de full re-pull.
 *  - EVIDENCE_DIR (FileSystem): fotos/firmas referenciadas por attachments
 *    rows que estamos borrando. Sin limpiar, quedan huerfanas en disco hasta
 *    que el usuario desinstale la app (storage leak).
 *  - AsyncStorage selectos (jornada activa, notifications cache, empresa
 *    config snapshot): metadata que referencia estado WDB inexistente.
 *
 * IMPORTANTE: NO toca SecureStore. El JWT, deviceId y config de impresora
 * sobreviven porque el restore NO es un logout — el usuario sigue identificado
 * con su mismo deviceId y session, solo le bajamos el dataset fresh del server.
 *
 * Cada paso se ejecuta con try/catch para que un fallo parcial (ej. permisos
 * FileSystem) no bloquee el reset principal. Los errores se reportan via
 * crashReporter sin re-throw para no romper la UX post-wipe.
 */
async function safeDeleteEvidenceDir(): Promise<void> {
  try {
    const { EVIDENCE_DIR } = await import('@/services/evidenceManager');
    const info = await getInfoAsync(EVIDENCE_DIR);
    if (info.exists) {
      await deleteAsync(EVIDENCE_DIR, { idempotent: true });
    }
  } catch {
    // Sin permisos / disco read-only: leak aceptable post-wipe.
  }
}

async function safeClearAsyncStorage(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      'jornada_state_v2',
      '@notifications:history',
      'empresa_config_snapshot_v1',
    ]);
  } catch {
    // Aceptable: estos AsyncStorage keys son cache, no source-of-truth.
  }
}

async function safeClearSyncCursors(): Promise<void> {
  try {
    const { syncCursors } = await import('@/sync/cursors');
    syncCursors.clear();
  } catch {
    // Aceptable: sin cursors el proximo sync sera full pull (deseado).
  }
}

export async function resetDatabase() {
  // 1. WDB wipe (puede tardar segundos)
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });

  // 2-4. Side effects (paralelos: independientes entre si)
  await Promise.all([
    safeClearSyncCursors(),
    safeDeleteEvidenceDir(),
    safeClearAsyncStorage(),
  ]);
}

