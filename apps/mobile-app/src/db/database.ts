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

export async function resetDatabase() {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
}
