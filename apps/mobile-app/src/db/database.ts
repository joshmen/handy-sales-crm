// TODO [SEC-M1]: Enable SQLCipher encryption for WatermelonDB
// Steps:
// 1. Install: npx expo install @nozbe/watermelondb react-native-quick-crypto
// 2. Android: Add SQLCipher to build.gradle (implementation 'net.zetetic:android-database-sqlcipher:4.5.4')
// 3. iOS: Add pod 'SQLCipher' to Podfile
// 4. Generate key via expo-secure-store and pass to adapter: { encrypt: true, encryptionKey: key }
// 5. Handle migration of existing unencrypted data on first launch after update
// Priority: CRITICAL — customer data (names, orders, prices) stored unencrypted on device

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
