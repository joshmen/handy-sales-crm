import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from './schema';
import { migrations } from './migrations';
import { modelClasses } from './models';

// LokiJSAdapter works in Expo Go (no native modules needed).
// When switching to Expo Dev Client for production, replace with:
//   import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
//   const adapter = new SQLiteAdapter({ schema, migrations, dbName: 'handysuites', jsi: true });
const adapter = new LokiJSAdapter({
  schema,
  migrations,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
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
