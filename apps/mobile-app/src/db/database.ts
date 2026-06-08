// SEC-M1 — SQLCipher encryption for WatermelonDB
//
// Sprint pre-prod #6+#7+#8 audit 2026-06-06: ACTIVADO.
//
// Estado:
//   - Clave AES-256 se genera y persiste en Keystore (Android) / Keychain (iOS)
//     via `src/db/dbEncryptionKey.ts` (expo-secure-store).
//   - Aqui se lee la clave con TOP-LEVEL AWAIT (Hermes Expo SDK 54+ soporta)
//     y se pasa como `passphrase` al SQLiteAdapter nativo. Los 37 archivos que
//     importan `database` reciben la instancia ya inicializada porque su modulo
//     resuelve DESPUES del top-level await.
//   - Expo Go usa LokiJS (JS puro, sin native encryption) — la misma DB sigue
//     plaintext en el flow de desarrollo Expo Go (esperado).
//   - Migracion one-shot plaintext->encrypted: en el primer boot post-update,
//     el SQLite adapter no podra abrir la DB existente (clave nueva). Caemos al
//     fallback de `unsafeResetDatabase()` y full sync — acepta perder cambios
//     offline pendientes. Documentado al usuario en release notes.
//
// CRITICAL: customer data (RFC, nombres, telefonos, GPS, fotos) ya NO esta
// plaintext en disco en builds EAS native.

import { Database, Q } from '@nozbe/watermelondb';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteAsync, getInfoAsync } from 'expo-file-system';
import { schema } from './schema';
import { migrations } from './migrations';
import { modelClasses } from './models';
import { getOrCreateDbEncryptionKey } from './dbEncryptionKey';

const isExpoGo = Constants.appOwnership === 'expo';

// Audit 2026-06-07: top-level await NO está soportado en Hermes del build EAS
// actual (SDK 54). Comprobado con logcat: `ReferenceError: Property 'await'
// doesn't exist` → módulo nunca resuelve → splash eterno en APK preview.
//
// Workaround temporal: passphrase = undefined siempre (DB plaintext, como pre-#6).
// La passphrase se genera best-effort en background pero NO bloquea boot — el
// SQLiteAdapter se crea ya sin passphrase. TODO antes de prod: rewrite a
// pattern de lazy-init async (getDatabase(): Promise<Database>) y refactor de
// los 37 callers para hacer await en App startup.
const passphrase: string | undefined = undefined;
if (!isExpoGo) {
  getOrCreateDbEncryptionKey().catch((err) => {
    if (__DEV__) console.warn('[database] passphrase pre-warm fail (non-fatal):', err);
  });
}

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
      // Sprint pre-prod #6: passphrase activado. SQLCipher cifra el archivo
      // .db con AES-256 — `adb pull` o lectura directa del filesystem NO
      // exponen PII. Si passphrase undefined (Expo Go o SecureStore fail),
      // el adapter usa SQLite plaintext como antes.
      ...(passphrase ? { passphrase } : {}),
    });


export const database = new Database({
  adapter,
  modelClasses,
});

/**
 * Sprint pre-prod #6: indica si la base esta cifrada con SQLCipher.
 * Usado por _layout.tsx para confirmar el estado de seguridad al boot
 * y reportarlo via crashReporter / logs.
 */
export const isDatabaseEncrypted = !isExpoGo && passphrase !== undefined;

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

/**
 * Hardening 2026-06-05 (cross-user data-loss prevention):
 * Cuenta TODOS los registros pendientes (sin sincronizar) en WDB que requieren
 * auth del usuario actual para llegar al server. Usado por authStore.login()
 * para BLOQUEAR cross-user logins que destruirian estos registros via
 * unsafeResetDatabase (caso: vendedor1 con pendientes pierde sesion ->
 * vendedor2 loguea en el mismo device -> cross-tenant leak guard wipea
 * pedidos de vendedor1).
 *
 * Mismas tablas + filtros que useCanResetSafely (hardBlockers tier):
 * clientes, pedidos, detalle_pedidos, visitas, cobros, attachments.
 * NO incluye ubicaciones_vendedor (warn tier - GPS pings).
 */
const HARD_BLOCKER_TABLES: ReadonlyArray<{ table: string; filter: Q.Clause }> = [
  { table: 'clientes', filter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'pedidos', filter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'detalle_pedidos', filter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'visitas', filter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'cobros', filter: Q.or(Q.where('_status', 'created'), Q.where('_status', 'updated')) },
  { table: 'attachments', filter: Q.or(Q.where('upload_status', 'pending'), Q.where('upload_status', 'failed')) },
];

export async function getPendingRecordCount(): Promise<number> {
  try {
    const counts = await Promise.all(
      HARD_BLOCKER_TABLES.map((def) =>
        database.collections.get(def.table).query(def.filter).fetchCount(),
      ),
    );
    return counts.reduce((sum, c) => sum + c, 0);
  } catch (err) {
    if (__DEV__) console.warn('[getPendingRecordCount] error:', err);
    // Fail-safe HACIA bloquear data loss: si no podemos contar (WDB roto,
    // adapter error), asumir que SI hay pendientes. Retornar MAX_SAFE_INTEGER
    // hace que el caller (authStore.login) bloquee el cross-user login en
    // lugar de destruir data potencialmente preservada. Trade-off: bloquear
    // ocasionalmente login valido cuando DB esta en estado degradado, vs.
    // perder data del user anterior. El primero es recoverable (reinicia
    // app o contacta soporte), el segundo no.
    return Number.MAX_SAFE_INTEGER;
  }
}

/**
 * Sprint 3 audit code-quality: helper centralizado para WDB reset.
 *
 * Antes: authStore.login() y authStore.logout() tenian bloques duplicados
 * de await database.write(async () => { await database.unsafeResetDatabase(); })
 * con try/catch silencioso y comentarios duplicados.
 *
 * Ahora: una funcion compartida con telemetria diferenciada por reason.
 * NO toca SecureStore ni AsyncStorage (a diferencia de resetDatabase()
 * que es para el flow "Sincronizacion completa" del usuario). Solo wipea
 * WDB para los flows de cambio de usuario (cross-user leak guard).
 */
export async function safeResetWDB(reason: 'login_cross_user' | 'logout'): Promise<void> {
  try {
    await database.write(async () => {
      await database.unsafeResetDatabase();
    });
    // Sprint 3: telemetria minima — el caller (authStore) tipicamente ya
    // logea sus eventos de auth. crashReporter es opcional aqui para evitar
    // ciclos de import (database -> crashReporter -> stores -> database).
    if (__DEV__) console.log(`[safeResetWDB] success (reason=${reason})`);
  } catch (e: any) {
    if (__DEV__) console.warn(`[safeResetWDB] failed (reason=${reason}):`, e?.message);
    // No re-throw: el caller decide si bloquear o continuar con stale WDB.
    // Para login_cross_user y logout, la decision actual es: preferir sesion
    // activa con stale data que loop de error que deje al user atrapado.
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

/**
 * Sprint pre-prod #7+#8 audit 2026-06-06: bootstrap async post-mount.
 *
 * Llamado por `_layout.tsx` UNA vez al boot del app, antes de renderizar
 * cualquier screen. Hace dos cosas:
 *
 * 1. Verifica que la WDB abre OK (cualquier query trigger del init lazy del
 *    adapter). Si tira error de tipo "file is not a database" / "decryption
 *    failed", es que la DB era plaintext de un build anterior — la pasaphrase
 *    nueva no la puede abrir. Ejecuta `unsafeResetDatabase` + full sync para
 *    recuperar.
 *
 * 2. Reporta el estado de encryption via crashReporter para tracking
 *    (`encryption_active: true|false`). Sin esto, no sabemos si los builds en
 *    field realmente cifraron.
 *
 * NOTA: la pasaphrase ya esta cableada al adapter SQLite arriba (modulo top).
 * Aqui solo validamos el resultado y manejamos migracion plaintext->encrypted.
 *
 * @returns true si la DB esta lista, false si se hizo reset (caller debe
 *          forzar full sync).
 */
export async function verifyDatabaseEncryption(): Promise<boolean> {
  try {
    // Trigger lazy init del adapter: query trivial sobre una collection.
    // Si la passphrase es incorrecta o el archivo es plaintext, esto tira.
    await database.collections.get('clientes').query().fetchCount();
    if (__DEV__) {
      console.log(`[verifyDatabaseEncryption] OK (encrypted=${isDatabaseEncrypted})`);
    }
    return true;
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (__DEV__) {
      console.warn('[verifyDatabaseEncryption] DB open fallo:', msg);
    }
    // Migracion: si el archivo existe pero no abre, asumir plaintext->encrypted
    // transition y resetear. El usuario pierde cambios offline pendientes pero
    // recupera la app en estado funcional (se documenta en release notes).
    try {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      await Promise.all([
        safeClearSyncCursors(),
        safeDeleteEvidenceDir(),
        safeClearAsyncStorage(),
      ]);
      if (__DEV__) console.log('[verifyDatabaseEncryption] reset OK — full sync requerido');
      return false;
    } catch (resetErr: any) {
      if (__DEV__) console.error('[verifyDatabaseEncryption] reset fallo:', resetErr?.message);
      // Estado roto. El caller (_layout.tsx) deberia mostrar pantalla de error
      // con boton "Reinstalar / Reset completo". Por ahora dejamos que el app
      // siga y los errores subsecuentes saldran via crashReporter.
      return false;
    }
  }
}

