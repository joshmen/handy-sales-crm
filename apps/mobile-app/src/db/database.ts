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
