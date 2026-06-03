import type { DirtyRaw } from '@nozbe/watermelondb/RawRecord';

/**
 * Dedupe del changeset por `id` antes de pasarlo a WDB.synchronize().
 *
 * BUG prod 2026-06-03 ("Cannot update a record with pending changes
 * pedidos#qQyLko2m8rS8z4fb"): WDB llama prepareUpdate sobre cada raw en
 * `updated[]`. Si el mismo id aparece dos veces, el segundo prepareUpdate
 * dispara el invariant porque el record ya tiene `_hasPendingUpdate=true`
 * del primero — y el batch entero se aborta. Eso atascaba 39 pendientes en
 * el celular del vendedor en una sola APK.
 *
 * Causas posibles de duplicados:
 *  - Backend emite el mismo pedido dos veces en `/sync/pull` (joins sin DISTINCT)
 *  - `pedidoMap` (server_id -> local_id) colisiona si hay records locales
 *    corruptos con el mismo server_id
 *  - `p.localId` y `pedidoMap.get(p.id)` resuelven al mismo string desde dos
 *    iteraciones diferentes
 *
 * Estrategia: el ULTIMO write gana en `updated[]` y `created[]` (los items
 * suelen venir ordenados por `actualizado_en` ASC, asi que el ultimo es el
 * mas reciente). Para `deleted[]` basta un Set.
 *
 * Importante: NO toca el `_status` local del record. WDB sigue resolviendo
 * conflictos en sus internals (per-column client-wins) y los pending locales
 * se pushean en el siguiente pushChanges.
 *
 * Extraido a su propio archivo para poder testearlo unitariamente sin pull-in
 * de `db/database.ts` (que importa expo-constants y rompe ts-jest puro).
 */
export function dedupeChangeset(
  changeset: { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] }
): { created: DirtyRaw[]; updated: DirtyRaw[]; deleted: string[] } {
  const updatedById = new Map<string, DirtyRaw>();
  for (const raw of changeset.updated) {
    const id = String(raw.id);
    if (!id) continue;
    updatedById.set(id, raw); // last write wins
  }
  const createdById = new Map<string, DirtyRaw>();
  for (const raw of changeset.created) {
    const id = String(raw.id);
    if (!id) continue;
    createdById.set(id, raw);
  }
  const deletedSet = new Set<string>(changeset.deleted.filter(Boolean));
  return {
    created: Array.from(createdById.values()),
    updated: Array.from(updatedById.values()),
    deleted: Array.from(deletedSet),
  };
}
