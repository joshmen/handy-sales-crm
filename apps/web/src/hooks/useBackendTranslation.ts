import { useTranslations } from 'next-intl';
import { useCallback } from 'react';

/**
 * Dynamic patterns for backend messages that contain variables.
 * Each entry: [regex to match Spanish message, English replacement pattern]
 */
const DYNAMIC_PATTERNS: Array<[RegExp, string]> = [
  [/^No se puede eliminar la zona porque tiene (\d+) cliente\(s\) asociado\(s\).*$/, 'Cannot delete zone because it has $1 associated client(s). Reassign or remove the clients first.'],
  [/^No se puede desactivar la zona porque tiene (\d+) cliente\(s\) activo\(s\).*$/, 'Cannot deactivate zone because it has $1 active client(s). Deactivate or reassign the clients first.'],
  [/^No se pueden desactivar las siguientes zonas porque tienen clientes activos: (.+)$/, 'Cannot deactivate the following zones because they have active clients: $1'],
  [/^La zona '(.+)' se traslapa con la zona '(.+)' \(distancia: (.+) km, solapamiento: (.+) km\)$/, "Zone '$1' overlaps with zone '$2' (distance: $3 km, overlap: $4 km)"],
  [/^La latitud debe estar entre .+ Valor recibido: (.+)$/, 'Latitude must be between 14.0 and 33.0 (Mexico limits). Received value: $1'],
  [/^La longitud debe estar entre .+ Valor recibido: (.+)$/, 'Longitude must be between -118.0 and -86.0 (Mexico limits). Received value: $1'],
  [/^Ya existe una zona con nombre '(.+)'$/, "A zone with name '$1' already exists"],
  [/^Zona '(.+)' no encontrada\. Zonas disponibles: (.+)$/, "Zone '$1' not found. Available zones: $2"],
  // Automation handler messages with interpolation
  [/^Alerta enviada: (\d+) productos con stock bajo$/, 'Alert sent: $1 products with low stock'],
  [/^Alerta enviada: (\d+) productos sin inventario$/, 'Alert sent: $1 products with zero inventory'],
  [/^Se generaron (\d+) rutas para la semana del (.+)\. Ver rutas →$/, '$1 routes generated for the week of $2. View routes →'],
  [/^Se renovaron (\d+) meta.* automáticamente\.$/, '$1 goal(s) renewed automatically.'],
  [/^Cobro registrado: (.+) — (.+)$/, 'Payment registered: $1 — $2'],
  [/^Todos los vendedores están al ≥(\d+)% de su meta$/, 'All vendors are at ≥$1% of their goal'],
  [/^Resumen enviado: (\d+) ventas, (\d+) cobros, (\d+) visitas$/, 'Summary sent: $1 sales, $2 collections, $3 visits'],
  [/^(\d+) clientes? nuevos? notificados?$/, '$1 new client(s) notified'],
  [/^(\d+) recordatorios? enviados? a (\d+) clientes?$/, '$1 reminder(s) sent to $2 client(s)'],
  [/^(\d+) visitas? agendadas? para (\d+) clientes? inactivos?$/, '$1 visit(s) scheduled for $2 inactive client(s)'],
  [/^(\d+) oportunidades? de reorden detectadas?$/, '$1 reorder opportunity(ies) detected'],
  [/^(\d+) alertas? de meta enviadas?$/, '$1 goal alert(s) sent'],
  [/^Se generó tu ruta para el (.+) con (\d+) paradas?.*$/, 'Your route for $1 with $2 stop(s) has been generated.'],
];

/**
 * Hook that provides a function to translate backend API messages.
 * Backend sends messages in Spanish; this maps them to the user's locale.
 *
 * Usage:
 *   const { tApi } = useBackendTranslation();
 *   toast.error(tApi(response.data.message) || t('fallback'));
 */
export function useBackendTranslation() {
  const t = useTranslations('backendMessages');

  const tApi = useCallback(
    (message: string | undefined | null): string => {
      if (!message) return '';

      // 1. Try exact match in translation dictionary
      try {
        const translated = t(message);
        // next-intl returns "namespace.key" when not found — detect and skip
        if (!translated.startsWith('backendMessages.') && translated !== message) {
          return translated;
        }
      } catch {
        // Key not found — continue to dynamic patterns
      }

      // 2. Try dynamic pattern matching (for messages with variables)
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
