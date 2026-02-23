import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

// Initial schema is version 1 — no migrations needed yet.
// When the schema changes, add migration steps here and bump schema version.
export const migrations = schemaMigrations({
  migrations: [],
});
