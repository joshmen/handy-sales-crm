import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * Dynamic patterns for backend messages that contain dynamic variables
 * and can't be mapped as exact dictionary keys (e.g., zone names, counts).
 * Keep this list SMALL — prefer exact matches in backendMessages JSON.
 */
const DYNAMIC_PATTERNS: Array<[RegExp, string]> = [
  // Zone errors with dynamic names/values
  [/^No se puede eliminar la zona porque tiene (\d+) cliente\(s\) asociado\(s\).*$/, 'Cannot delete zone because it has $1 associated client(s). Reassign or remove the clients first.'],
  [/^No se puede desactivar la zona porque tiene (\d+) cliente\(s\) activo\(s\).*$/, 'Cannot deactivate zone because it has $1 active client(s). Deactivate or reassign the clients first.'],
  [/^No se pueden desactivar las siguientes zonas porque tienen clientes activos: (.+)$/, 'Cannot deactivate the following zones because they have active clients: $1'],
  [/^La zona '(.+)' se traslapa con la zona '(.+)' \(distancia: (.+) km, solapamiento: (.+) km\)$/, "Zone '$1' overlaps with zone '$2' (distance: $3 km, overlap: $4 km)"],
  [/^La latitud debe estar entre .+ Valor recibido: (.+)$/, 'Latitude must be between 14.0 and 33.0 (Mexico limits). Received: $1'],
  [/^La longitud debe estar entre .+ Valor recibido: (.+)$/, 'Longitude must be between -118.0 and -86.0 (Mexico limits). Received: $1'],
  [/^Ya existe una zona con nombre '(.+)'$/, "A zone with name '$1' already exists"],
  [/^Zona '(.+)' no encontrada\. Zonas disponibles: (.+)$/, "Zone '$1' not found. Available zones: $2"],
];

/**
 * Hook that provides a function to translate backend API messages.
 * Backend sends messages in Spanish; this maps them to the user's locale
 * using exact matches in the backendMessages JSON dictionary.
 *
 * For messages with dynamic variables that can't be exact-matched,
 * falls back to regex DYNAMIC_PATTERNS (kept minimal).
 */
export function useBackendTranslation() {
  const t = useTranslations('backendMessages');

  const tApi = useCallback(
    (message: string | undefined | null): string => {
      if (!message) return '';

      // 1. Try exact match in backendMessages dictionary
      try {
        const translated = t(message);
        if (!translated.startsWith('backendMessages.')) {
          return translated;
        }
      } catch {
        // Key not found
      }

      // 2. Try dynamic pattern matching (zone errors with names/coords)
      for (const [pattern, replacement] of DYNAMIC_PATTERNS) {
        if (pattern.test(message)) {
          return message.replace(pattern, replacement);
        }
      }

      // 3. Return original message as-is
      return message;
    },
    [t]
  );

  return { tApi };
}
