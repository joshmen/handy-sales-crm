import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Platform } from 'react-native';
import { schema } from './schema';
import { migrations } from './migrations';
import { modelClasses } from './models';

const adapter = new SQLiteAdapter({
  schema,
  migrations,
  dbName: 'handysuites',
  jsi: Platform.OS !== 'web',
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
